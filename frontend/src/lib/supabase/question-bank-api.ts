/**
 * question-bank-api — Tekrar kullanılabilir İSG soruları
 *
 * Tablo: question_bank
 */

import { createClient } from "./client";

export type QuestionType = "multiple_choice" | "true_false" | "short_answer" | "multi_select";
export type Difficulty = "easy" | "medium" | "hard";

export type QuestionOption = {
  label: string;
  text: string;
  is_correct: boolean;
};

export type BankQuestion = {
  id: string;
  organization_id: string;
  created_by: string;
  question_text: string;
  question_type: QuestionType;
  options: QuestionOption[] | null;
  correct_answer: string | null;
  explanation: string | null;
  category: string | null;
  difficulty: Difficulty | null;
  tags: string[] | null;
  points: number;
  language: string;
  is_active: boolean;
  times_used: number;
  correct_rate: number | null;
  created_at: string;
  updated_at: string;
};

export async function fetchBankQuestions(filters?: {
  category?: string;
  difficulty?: Difficulty;
  search?: string;
}): Promise<BankQuestion[]> {
  const supabase = createClient();
  if (!supabase) return [];

  let q = supabase
    .from("question_bank")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (filters?.category) q = q.eq("category", filters.category);
  if (filters?.difficulty) q = q.eq("difficulty", filters.difficulty);
  if (filters?.search) q = q.ilike("question_text", `%${filters.search}%`);

  const { data, error } = await q;
  if (error) {
    console.warn("fetchBankQuestions error:", error.message);
    return [];
  }
  return (data || []) as BankQuestion[];
}

export async function createBankQuestion(input: {
  question_text: string;
  question_type: QuestionType;
  options?: QuestionOption[];
  correct_answer?: string;
  explanation?: string;
  category?: string;
  difficulty?: Difficulty;
  tags?: string[];
  points?: number;
}): Promise<BankQuestion | null> {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase bağlantısı yok");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum yok");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile?.organization_id) throw new Error("Organizasyon bulunamadı");

  const payload = {
    organization_id: profile.organization_id,
    created_by: user.id,
    question_text: input.question_text,
    question_type: input.question_type,
    options: input.options || null,
    correct_answer: input.correct_answer || null,
    explanation: input.explanation || null,
    category: input.category || null,
    difficulty: input.difficulty || null,
    tags: input.tags || null,
    points: input.points || 1,
    language: "tr",
    is_active: true,
  };

  const { data, error } = await supabase
    .from("question_bank")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as BankQuestion;
}

export async function updateBankQuestion(id: string, patch: Partial<BankQuestion>): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const { error } = await supabase.from("question_bank").update(patch).eq("id", id);
  if (error) {
    console.warn("updateBankQuestion error:", error.message);
    return false;
  }
  return true;
}

export async function deleteBankQuestion(id: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("question_bank")
    .update({ is_active: false })
    .eq("id", id);
  if (error) {
    console.warn("deleteBankQuestion error:", error.message);
    return false;
  }
  return true;
}

export async function bulkCreateFromAI(
  questions: Array<{
    question_text: string;
    question_type: QuestionType;
    options?: QuestionOption[];
    explanation?: string;
  }>,
  category: string,
  difficulty: Difficulty = "medium"
): Promise<number> {
  const supabase = createClient();
  if (!supabase) return 0;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile?.organization_id) return 0;

  const rows = questions.map((q) => ({
    organization_id: profile.organization_id,
    created_by: user.id,
    question_text: q.question_text,
    question_type: q.question_type,
    options: q.options || null,
    explanation: q.explanation || null,
    category,
    difficulty,
    points: 1,
    language: "tr",
    is_active: true,
  }));

  const { data, error } = await supabase.from("question_bank").insert(rows).select("id");
  if (error) {
    console.warn("bulkCreateFromAI error:", error.message);
    return 0;
  }
  return data?.length || 0;
}
