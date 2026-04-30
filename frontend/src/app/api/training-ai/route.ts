import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { logAiUsage, logErrorEvent } from "@/lib/admin-observability/server";
import { requireAuth } from "@/lib/supabase/api-auth";
import {
  enforceRateLimit,
  logSecurityEvent,
  parseJsonBody,
  resolveAiDailyLimit,
} from "@/lib/security/server";
import {
  buildManualFallbackResponse,
  executeWithResilience,
} from "@/lib/self-healing/resilience";
import { consumeEntitlement } from "@/lib/billing/entitlements";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

const trainingAiSchema = z.object({
  topic: z.string().min(3).max(300),
  questionCount: z.number().int().min(1).max(50).optional().default(10),
  optionCount: z.number().int().min(2).max(6).optional().default(4),
  type: z.enum(["exam", "survey"]).optional().default("exam"),
  description: z.string().max(2000).optional().default(""),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const plan = await resolveAiDailyLimit(auth.userId);
    const rateLimitResponse = await enforceRateLimit(request, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      endpoint: "/api/training-ai",
      scope: "ai",
      limit: plan.dailyLimit,
      windowSeconds: 24 * 60 * 60,
      planKey: plan.planKey,
      metadata: { feature: "training_ai" },
    });
    if (rateLimitResponse) return rateLimitResponse;

    const parsedBody = await parseJsonBody(request, trainingAiSchema);
    if (!parsedBody.ok) return parsedBody.response;

    const { topic, questionCount, optionCount, type, description } = parsedBody.data;

    const entitlementResponse = await consumeEntitlement(auth, "training_slide");
    if (entitlementResponse) return entitlementResponse;

    const isExam = type === "exam";
    const qCount = Math.min(Math.max(questionCount || 10, 1), 50);
    const oCount = Math.min(Math.max(optionCount || 4, 2), 6);

    const prompt = `Sen ISG egitim uzmanisin. Asagidaki konu icin ${isExam ? "sinav sorulari" : "anket sorulari"} olustur.

KONU: ${topic}
${description ? `ACIKLAMA: ${description}` : ""}
SORU SAYISI: ${qCount}
${isExam ? `SIK SAYISI: ${oCount}` : ""}

${isExam ? `SINAV KURALLARI:
- Tum sorular coktan secmeli olmali
- Her soruda tam olarak ${oCount} secenek bulunmali
- Her soruda yalnizca 1 dogru cevap olmali
- Sorular Turk ISG uygulamalarina uygun olmali
- Kolay, orta ve zor dagilimi dengeli olmali` : `ANKET KURALLARI:
- Sorular coktan secmeli, olcek, evet-hayir veya acik uclu olabilir
- Sorular tarafsiz ve yonlendirici olmayan dil kullanmali`}

CIKTI FORMATI:
[
  {
    "questionText": "Soru metni",
    "questionType": "${isExam ? "multiple_choice" : "mixed"}",
    "options": [
      {"label": "Secenek", "value": "A", "isCorrect": ${isExam ? "true/false" : "false"}}
    ],
    "points": 1
  }
]

${!isExam ? `Anketlerde questionType su degerlerden biri olmali: "multiple_choice", "scale", "yes_no", "open_ended"` : ""}

Sadece JSON dizisi dondur.`;

    const resilientResponse = await executeWithResilience({
      serviceKey: "anthropic.api",
      displayName: "Anthropic API",
      serviceType: "external_api",
      operationName: "training_ai_generate",
      endpoint: request.nextUrl.pathname,
      userId: auth.userId,
      organizationId: auth.organizationId,
      fallbackMessage:
        "AI egitim servisi gecici olarak kullanilamiyor. Sorulari manuel olarak ekleyebilir veya istegi kuyruga birakabilirsiniz.",
      queueTask: {
        taskType: "ai.training.generate",
        payload: {
          topic,
          questionCount: qCount,
          optionCount: oCount,
          type,
          description,
        },
        organizationId: auth.organizationId,
        createdBy: auth.userId,
        maxRetries: 5,
      },
      operation: () =>
        client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        }),
    });

    if (!resilientResponse.ok) {
      await logAiUsage({
        userId: auth.userId,
        organizationId: auth.organizationId,
        model: "claude-sonnet-4-20250514",
        endpoint: "/api/training-ai",
        success: false,
        metadata: {
          fallback: true,
          queueTaskId: resilientResponse.queuedTaskId ?? null,
          type,
          topic,
        },
      });
      return buildManualFallbackResponse({
        message: resilientResponse.fallbackMessage,
        queueTaskId: resilientResponse.queuedTaskId,
        manualActionLabel: "Sorulari manuel olustur",
      });
    }

    const message = resilientResponse.data;

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      await logAiUsage({
        userId: auth.userId,
        organizationId: auth.organizationId,
        model: "claude-sonnet-4-20250514",
        endpoint: "/api/training-ai",
        promptTokens: message.usage.input_tokens,
        completionTokens: message.usage.output_tokens,
        cachedTokens: Number(
          (
            message.usage as {
              cache_read_input_tokens?: number;
            } | undefined
          )?.cache_read_input_tokens ?? 0,
        ),
        success: false,
        metadata: { reason: "json_payload_not_found", type, topic },
      });
      await logErrorEvent({
        level: "error",
        source: "training-ai",
        endpoint: "/api/training-ai",
        message: "AI yanitindan soru dizisi ayrıştırılamadı.",
        context: { type, topic, questionCount: qCount },
        userId: auth.userId,
        organizationId: auth.organizationId,
      });
      return NextResponse.json(
        { error: "AI yanitindan sorular cikarilamadi" },
        { status: 500 },
      );
    }

    const questions = JSON.parse(jsonMatch[0]);
    await logAiUsage({
      userId: auth.userId,
      organizationId: auth.organizationId,
      model: "claude-sonnet-4-20250514",
      endpoint: "/api/training-ai",
      promptTokens: message.usage.input_tokens,
      completionTokens: message.usage.output_tokens,
      cachedTokens: Number(
        (
          message.usage as {
            cache_read_input_tokens?: number;
          } | undefined
        )?.cache_read_input_tokens ?? 0,
      ),
      success: true,
      metadata: {
        type,
        topic,
        questionCount: Array.isArray(questions) ? questions.length : 0,
      },
    });
    return NextResponse.json({ questions });
  } catch (error) {
    console.error(`[training-ai] [${new Date().toISOString()}] [user=${auth.userId}] error:`, error);
    await logAiUsage({
      userId: auth.userId,
      organizationId: auth.organizationId,
      model: "claude-sonnet-4-20250514",
      endpoint: "/api/training-ai",
      success: false,
      metadata: {
        error: error instanceof Error ? error.message.slice(0, 300) : "unknown",
      },
    });
    await logErrorEvent({
      level: "error",
      source: "training-ai",
      endpoint: "/api/training-ai",
      message: error instanceof Error ? error.message : "AI soru olusturma hatasi",
      stackTrace: error instanceof Error ? error.stack : null,
      context: { feature: "training_question_generation" },
      userId: auth.userId,
      organizationId: auth.organizationId,
    });
    await logSecurityEvent(request, "ai.training.failed", {
      severity: "warning",
      userId: auth.userId,
      organizationId: auth.organizationId,
      details: {
        message: error instanceof Error ? error.message.slice(0, 300) : "unknown",
      },
    });
    return NextResponse.json({ error: "AI soru olusturma hatasi" }, { status: 500 });
  }
}
