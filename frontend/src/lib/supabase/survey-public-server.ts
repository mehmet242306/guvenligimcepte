import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dbToQuestion,
  dbToSurvey,
  dbToToken,
  type QuestionRow,
  type SurveyQuestionRecord,
  type SurveyRecord,
  type SurveyRow,
  type SurveyTokenRecord,
  type TokenRow,
} from "@/lib/supabase/survey-mappers";

/** Same contract as `validateToken` in survey-api (used by public fill UI). */
export type PublicSurveyValidatePayload =
  | {
      valid: true;
      tokenRecord: SurveyTokenRecord;
      survey: SurveyRecord;
      questions: SurveyQuestionRecord[];
    }
  | {
      valid: false;
      tokenRecord?: SurveyTokenRecord;
      survey?: SurveyRecord;
      questions?: SurveyQuestionRecord[];
    };

export async function validateSurveyTokenWithServiceRole(
  admin: SupabaseClient,
  token: string,
): Promise<PublicSurveyValidatePayload> {
  const { data: tokenData, error: tokenError } = await admin
    .from("survey_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (tokenError || !tokenData) return { valid: false };

  const tokenRecord = dbToToken(tokenData as TokenRow);

  if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) {
    return { valid: false, tokenRecord };
  }
  if (tokenRecord.status === "completed") {
    return { valid: false, tokenRecord };
  }

  const { data: surveyData } = await admin.from("surveys").select("*").eq("id", tokenRecord.surveyId).single();
  if (!surveyData) return { valid: false, tokenRecord };
  const survey = dbToSurvey(surveyData as SurveyRow);

  if (survey.status !== "active") return { valid: false, tokenRecord, survey };

  const { data: qData } = await admin
    .from("survey_questions")
    .select("*")
    .eq("survey_id", survey.id)
    .order("sort_order");
  const questions = ((qData || []) as QuestionRow[]).map(dbToQuestion);

  if (tokenRecord.status === "pending") {
    await admin
      .from("survey_tokens")
      .update({ status: "started", started_at: new Date().toISOString() })
      .eq("id", tokenRecord.id);
  }

  return { valid: true, tokenRecord, survey, questions };
}

export type SurveySubmitAnswer = {
  questionId: string;
  answer: Record<string, unknown>;
  isCorrect?: boolean | null;
  score?: number;
};

export async function submitSurveyResponsesWithServiceRole(
  admin: SupabaseClient,
  token: string,
  answers: SurveySubmitAnswer[],
): Promise<{ ok: true } | { ok: false; code: "invalid" | "conflict" | "server" }> {
  const { data: tokenData, error: tokenError } = await admin
    .from("survey_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (tokenError || !tokenData) return { ok: false, code: "invalid" };

  const tokenRecord = dbToToken(tokenData as TokenRow);

  if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) {
    return { ok: false, code: "invalid" };
  }
  if (tokenRecord.status === "completed") {
    return { ok: false, code: "conflict" };
  }

  const { data: surveyData } = await admin.from("surveys").select("*").eq("id", tokenRecord.surveyId).single();
  if (!surveyData) return { ok: false, code: "invalid" };
  const survey = dbToSurvey(surveyData as SurveyRow);
  if (survey.status !== "active") return { ok: false, code: "invalid" };

  const { data: qData } = await admin.from("survey_questions").select("id").eq("survey_id", survey.id);
  const allowedIds = new Set((qData ?? []).map((r: { id: string }) => r.id));
  for (const a of answers) {
    if (!allowedIds.has(a.questionId)) return { ok: false, code: "invalid" };
  }

  const rows = answers.map((a) => ({
    survey_id: survey.id,
    token_id: tokenRecord.id,
    question_id: a.questionId,
    answer: a.answer,
    is_correct: a.isCorrect ?? null,
    score: a.score ?? 0,
  }));

  const { error: insertError } = await admin.from("survey_responses").insert(rows);
  if (insertError) return { ok: false, code: "server" };

  const { error: updError } = await admin
    .from("survey_tokens")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", tokenRecord.id);

  if (updError) return { ok: false, code: "server" };

  return { ok: true };
}
