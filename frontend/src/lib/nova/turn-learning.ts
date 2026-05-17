import type { SupabaseClient } from "@supabase/supabase-js";
import { generateLegalEmbedding } from "@/lib/rag/legal/embeddings";

export type NovaTurnLearningInput = {
  userId: string;
  organizationId?: string | null;
  companyWorkspaceId?: string | null;
  question: string;
  answer: string;
  sources?: unknown[];
  sessionId?: string | null;
  gatewayMode?: string | null;
  contextSurface?: string | null;
  language?: string | null;
};

export type NovaTurnLearningResult = {
  learned: boolean;
  mode?: "inserted" | "updated" | "skipped";
  reason?: string;
};

const STRONG_DUPLICATE_THRESHOLD = 0.94;

export function shouldSkipNovaTurnLearning(input: {
  question: string;
  answer: string;
  gatewayMode?: string | null;
}): string | null {
  const question = input.question.trim();
  const answer = input.answer.trim();

  if (question.length < 8) return "question_too_short";
  if (answer.length < 30) return "answer_too_short";
  if (input.gatewayMode === "safety_refusal") return "safety_refusal";
  if (/yardımcı olamam|yardimci olamam/i.test(answer)) return "safety_refusal";
  if (
    /alanina yonlendiriyorum|sayfaya git/i.test(answer) &&
    answer.length < 220 &&
    !/\d+\./.test(answer)
  ) {
    return "navigation_only";
  }
  if (/cevap üretemiyorum|tekrar deneyin|üzgünüm, şu an/i.test(answer)) return "fallback_error";

  return null;
}

export async function persistNovaTurnLearning(
  service: SupabaseClient,
  input: NovaTurnLearningInput,
): Promise<NovaTurnLearningResult> {
  const skipReason = shouldSkipNovaTurnLearning({
    question: input.question,
    answer: input.answer,
    gatewayMode: input.gatewayMode,
  });
  if (skipReason) {
    return { learned: false, mode: "skipped", reason: skipReason };
  }

  const question = input.question.trim();
  const answer = input.answer.trim();
  const sources = Array.isArray(input.sources) ? input.sources : [];
  const answerSources = {
    items: sources,
    gateway_mode: input.gatewayMode ?? null,
    context_surface: input.contextSurface ?? null,
    language: input.language ?? "tr",
    learned_at: new Date().toISOString(),
  };

  const embedding = await generateLegalEmbedding(question);

  if (embedding) {
    const { data: matches, error: searchError } = await service.rpc("search_qa_cache", {
      query_embedding: embedding,
      similarity_threshold: STRONG_DUPLICATE_THRESHOLD,
      max_results: 1,
    });

    if (!searchError && Array.isArray(matches) && matches.length > 0) {
      const match = matches[0] as { id: string; usage_count?: number | null };
      await service
        .from("ai_qa_learning")
        .update({
          answer,
          answer_sources: answerSources,
          usage_count: (match.usage_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id);

      await recordLearningSignal(service, input, "updated", match.id);
      return { learned: true, mode: "updated" };
    }
  }

  const { data: inserted, error: insertError } = await service
    .from("ai_qa_learning")
    .insert({
      question,
      question_embedding: embedding,
      answer,
      answer_sources: answerSources,
      usage_count: 1,
      success_rate: 0.5,
    })
    .select("id")
    .single();

  if (insertError) {
    return { learned: false, mode: "skipped", reason: "insert_failed" };
  }

  await recordLearningSignal(service, input, "inserted", inserted?.id ?? null);
  return { learned: true, mode: "inserted" };
}

async function recordLearningSignal(
  service: SupabaseClient,
  input: NovaTurnLearningInput,
  mode: "inserted" | "updated",
  qaId: string | null,
) {
  await service.from("nova_learning_signals").insert({
    user_id: input.userId,
    organization_id: input.organizationId ?? null,
    company_workspace_id: input.companyWorkspaceId ?? null,
    signal_source: "memory",
    signal_key: `turn:${mode}`,
    signal_label: mode === "inserted" ? "Yeni soru-cevap öğrenildi" : "Benzer soru-cevap güçlendirildi",
    outcome: "positive",
    confidence_score: 0.78,
    payload: {
      qa_id: qaId,
      question_preview: input.question.slice(0, 400),
      answer_preview: input.answer.slice(0, 400),
      gateway_mode: input.gatewayMode ?? null,
      session_id: input.sessionId ?? null,
      context_surface: input.contextSurface ?? null,
    },
  });
}

/** Fire-and-forget: widget / client tarafından her tur sonrası çağrılır. */
export function recordNovaTurnLearningClient(payload: {
  question: string;
  answer: string;
  sources?: unknown[];
  session_id?: string | null;
  gateway_mode?: string | null;
  context_surface?: string | null;
  language?: string | null;
  company_workspace_id?: string | null;
}) {
  if (typeof window === "undefined") return;

  void fetch("/api/nova/learn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
    cache: "no-store",
  }).catch(() => {
    /* öğrenme isteği UI'ı bloklamamalı */
  });
}
