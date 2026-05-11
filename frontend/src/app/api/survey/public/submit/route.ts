import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient, parseJsonBody } from "@/lib/security/server";
import { submitSurveyResponsesWithServiceRole } from "@/lib/supabase/survey-public-server";

// POST /api/survey/public/submit
// Public anket/sınav gönderimi — yanıtlar service role ile yazılır.

const answerSchema = z.object({
  questionId: z.string().uuid(),
  answer: z.record(z.string(), z.unknown()),
  isCorrect: z.boolean().optional().nullable(),
  score: z.number().optional(),
});

const bodySchema = z.object({
  token: z.string().trim().min(6).max(80),
  answers: z.array(answerSchema).min(1).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, bodySchema);
    if (!parsed.ok) return parsed.response;

    const admin = createServiceClient();
    const result = await submitSurveyResponsesWithServiceRole(admin, parsed.data.token, parsed.data.answers);

    if (!result.ok) {
      const status =
        result.code === "invalid" ? 400 : result.code === "conflict" ? 409 : 500;
      return NextResponse.json({ ok: false, code: result.code }, { status });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("survey public submit:", e);
    return NextResponse.json({ ok: false, code: "server" }, { status: 503 });
  }
}
