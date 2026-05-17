import { NextRequest, NextResponse } from "next/server";
import { logAiUsage, logErrorEvent } from "@/lib/admin-observability/server";
import { consumeEntitlement } from "@/lib/billing/entitlements";
import { normalizeNovaAgentResponse, novaChatRequestSchema } from "@/lib/nova/agent";
import { assertNovaFeatureEnabled } from "@/lib/nova/governance";
import { buildNovaHardGateResponse, buildUnsafeNovaRefusal } from "@/lib/nova/behavior-prompt";
import { formatNovaDisplayText } from "@/lib/nova/format-answer";
import { answerWithLegalRag } from "@/lib/rag/legal/answer-with-rag";
import { enforceRateLimit, parseJsonBody, resolveAiDailyLimit } from "@/lib/security/server";
import { requireAuth } from "@/lib/supabase/api-auth";
import { createServiceClient } from "@/lib/security/server";
import { getAccountContextForUser, shouldBypassNovaBillingLimits } from "@/lib/account/account-routing";
import { persistNovaTurnLearning } from "@/lib/nova/turn-learning";

export const maxDuration = 120;

/**
 * Nova read gateway — resmi mevzuat indeksinden hibrit RAG + yorumlayıcı cevap.
 */
export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, novaChatRequestSchema);
  if (!parsed.ok) return parsed.response;

  const payload = parsed.data;
  const hardGateAnswer = buildNovaHardGateResponse(payload.message);
  if (hardGateAnswer) {
    const isSafety = Boolean(buildUnsafeNovaRefusal(payload.message));
    return NextResponse.json(
      normalizeNovaAgentResponse({
        type: "message",
        answer: formatNovaDisplayText(hardGateAnswer),
        session_id: payload.session_id ?? null,
        as_of_date: payload.as_of_date ?? new Date().toISOString().slice(0, 10),
        answer_mode: payload.answer_mode ?? "extractive",
        jurisdiction_code: payload.jurisdiction_code ?? "TR",
        sources: [],
        telemetry: {
          gateway_mode: isSafety ? "safety_refusal" : "behavior_prompt",
          context_surface: payload.context_surface,
          legal_rag_bypassed: true,
        },
      }),
    );
  }

  const unsafeRefusal = buildUnsafeNovaRefusal(payload.message);
  if (unsafeRefusal) {
    return NextResponse.json(
      normalizeNovaAgentResponse({
        type: "message",
        answer: formatNovaDisplayText(unsafeRefusal),
        session_id: payload.session_id ?? null,
        as_of_date: payload.as_of_date ?? new Date().toISOString().slice(0, 10),
        answer_mode: payload.answer_mode ?? "extractive",
        jurisdiction_code: payload.jurisdiction_code ?? "TR",
        sources: [],
        telemetry: { gateway_mode: "safety_refusal", context_surface: payload.context_surface },
      }),
    );
  }

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const accountContext = await getAccountContextForUser(auth.userId);
  const bypassNovaLimitsForAdmin = shouldBypassNovaBillingLimits(accountContext);
  const plan = await resolveAiDailyLimit(auth.userId);

  if (!bypassNovaLimitsForAdmin) {
    const rateLimitResponse = await enforceRateLimit(request, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      endpoint: "/api/nova/legal-chat",
      scope: "ai",
      limit: plan.dailyLimit,
      windowSeconds: 24 * 60 * 60,
      planKey: plan.planKey,
      metadata: { feature: "nova_legal_chat_rag" },
    });
    if (rateLimitResponse) return rateLimitResponse;

    const entitlementResponse = await consumeEntitlement(auth, "nova_message");
    if (entitlementResponse) return entitlementResponse;
  }

  const rolloutResponse = await assertNovaFeatureEnabled({
    featureKey: "nova.agent.chat",
    userId: auth.userId,
    organizationId: auth.organizationId,
    workspaceId: payload.company_workspace_id ?? null,
    fallbackMessage: "Nova bu hesap icin su anda kapali. Lutfen daha sonra tekrar deneyin.",
  });
  if (rolloutResponse) return rolloutResponse;

  const service = createServiceClient();

  try {
    const rag = await answerWithLegalRag({
      service,
      query: payload.message,
      language: payload.language,
      jurisdictionCode: payload.jurisdiction_code ?? "TR",
      workspaceId: payload.company_workspace_id ?? null,
      organizationId: auth.organizationId,
      polish: payload.answer_mode === "polish",
    });

    await logAiUsage({
      userId: auth.userId,
      organizationId: auth.organizationId,
      model: "legal-rag-hybrid",
      endpoint: "/api/nova/legal-chat",
      promptTokens: 0,
      completionTokens: 0,
      success: true,
      metadata: {
        gateway_mode: "read_rag",
        retrieval_mode: rag.retrievalMode,
        confidence: rag.confidence,
        source_count: rag.sources.length,
        context_surface: payload.context_surface,
        company_workspace_id: payload.company_workspace_id ?? null,
      },
    });

    void persistNovaTurnLearning(service, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      companyWorkspaceId: payload.company_workspace_id ?? null,
      question: payload.message,
      answer: rag.answer,
      sources: rag.sources,
      sessionId: payload.session_id ?? null,
      gatewayMode: "read_rag",
      contextSurface: payload.context_surface,
      language: payload.language,
    });

    return NextResponse.json(
      normalizeNovaAgentResponse({
        type: "message",
        answer: formatNovaDisplayText(rag.answer),
        sources: rag.sources,
        session_id: payload.session_id ?? null,
        as_of_date: payload.as_of_date ?? new Date().toISOString().slice(0, 10),
        answer_mode: payload.answer_mode ?? "extractive",
        jurisdiction_code: payload.jurisdiction_code ?? "TR",
        cached: false,
        telemetry: {
          gateway_mode: "read_rag",
          retrieval_mode: rag.retrievalMode,
          confidence: rag.confidence,
          context_surface: payload.context_surface,
          current_page: payload.current_page ?? null,
          company_workspace_id: payload.company_workspace_id ?? null,
        },
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    await logErrorEvent({
      level: "error",
      source: "nova-legal-chat",
      endpoint: "/api/nova/legal-chat",
      message,
      userId: auth.userId,
      organizationId: auth.organizationId,
    });

    return NextResponse.json(
      { message: "Nova su anda yanit uretirken hata aldi. Lutfen bir kez daha deneyin." },
      { status: 500 },
    );
  }
}
