import { createClient } from './client';

// ============================================================
// Survey/Exam API — CRUD for surveys, questions, tokens, responses
// ============================================================

export interface SurveyRecord {
  id: string;
  organizationId: string;
  companyId: string;
  createdBy: string;
  title: string;
  description: string;
  type: 'survey' | 'exam';
  status: 'draft' | 'active' | 'closed' | 'archived';
  settings: Record<string, unknown>;
  passScore: number | null;
  timeLimitMinutes: number | null;
  shuffleQuestions: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SurveyQuestionRecord {
  id: string;
  surveyId: string;
  questionText: string;
  questionType: 'multiple_choice' | 'open_ended' | 'scale' | 'yes_no' | 'multi_select';
  options: QuestionOption[] | null;
  required: boolean;
  sortOrder: number;
  points: number;
  createdAt: string;
}

export interface QuestionOption {
  label: string;
  value: string;
  isCorrect?: boolean;
}

export interface SurveyTokenRecord {
  id: string;
  surveyId: string;
  personnelId: string | null;
  token: string;
  personName: string;
  personEmail: string | null;
  personPhone: string | null;
  status: 'pending' | 'started' | 'completed' | 'expired';
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface SurveyResponseRecord {
  id: string;
  surveyId: string;
  tokenId: string;
  questionId: string;
  answer: Record<string, unknown>;
  isCorrect: boolean | null;
  score: number;
  createdAt: string;
}

// ---- Row types (DB snake_case) ----
type SurveyRow = {
  id: string;
  organization_id: string;
  company_id: string;
  created_by: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  settings: Record<string, unknown>;
  pass_score: number | null;
  time_limit_minutes: number | null;
  shuffle_questions: boolean;
  created_at: string;
  updated_at: string;
};

type QuestionRow = {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: string;
  options: QuestionOption[] | null;
  required: boolean;
  sort_order: number;
  points: number;
  created_at: string;
};

type TokenRow = {
  id: string;
  survey_id: string;
  personnel_id: string | null;
  token: string;
  person_name: string | null;
  person_email: string | null;
  person_phone: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  created_at: string;
};

type ResponseRow = {
  id: string;
  survey_id: string;
  token_id: string;
  question_id: string;
  answer: Record<string, unknown>;
  is_correct: boolean | null;
  score: number;
  created_at: string;
};

// ---- Mappers ----
function dbToSurvey(r: SurveyRow): SurveyRecord {
  return {
    id: r.id,
    organizationId: r.organization_id,
    companyId: r.company_id,
    createdBy: r.created_by,
    title: r.title,
    description: r.description || '',
    type: r.type as SurveyRecord['type'],
    status: r.status as SurveyRecord['status'],
    settings: r.settings || {},
    passScore: r.pass_score,
    timeLimitMinutes: r.time_limit_minutes,
    shuffleQuestions: r.shuffle_questions,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function dbToQuestion(r: QuestionRow): SurveyQuestionRecord {
  return {
    id: r.id,
    surveyId: r.survey_id,
    questionText: r.question_text,
    questionType: r.question_type as SurveyQuestionRecord['questionType'],
    options: r.options,
    required: r.required,
    sortOrder: r.sort_order,
    points: r.points,
    createdAt: r.created_at,
  };
}

function dbToToken(r: TokenRow): SurveyTokenRecord {
  return {
    id: r.id,
    surveyId: r.survey_id,
    personnelId: r.personnel_id,
    token: r.token,
    personName: r.person_name || '',
    personEmail: r.person_email,
    personPhone: r.person_phone,
    status: r.status as SurveyTokenRecord['status'],
    startedAt: r.started_at,
    completedAt: r.completed_at,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  };
}

function dbToResponse(r: ResponseRow): SurveyResponseRecord {
  return {
    id: r.id,
    surveyId: r.survey_id,
    tokenId: r.token_id,
    questionId: r.question_id,
    answer: r.answer,
    isCorrect: r.is_correct,
    score: r.score,
    createdAt: r.created_at,
  };
}

// ============================================================
// SURVEYS CRUD
// ============================================================

export async function fetchSurveys(orgId: string, companyId?: string): Promise<SurveyRecord[]> {
  const supabase = createClient();
  if (!supabase) return [];
  let query = supabase.from('surveys').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) { console.error('fetchSurveys error:', error); return []; }
  return (data as SurveyRow[]).map(dbToSurvey);
}

export async function fetchSurveyById(id: string): Promise<SurveyRecord | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('surveys').select('*').eq('id', id).single();
  if (error || !data) return null;
  return dbToSurvey(data as SurveyRow);
}

export async function createSurvey(survey: Partial<SurveyRecord>): Promise<SurveyRecord | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const row = {
    organization_id: survey.organizationId,
    company_id: survey.companyId,
    created_by: survey.createdBy,
    title: survey.title,
    description: survey.description || null,
    type: survey.type,
    status: survey.status || 'draft',
    settings: survey.settings || {},
    pass_score: survey.passScore ?? null,
    time_limit_minutes: survey.timeLimitMinutes ?? null,
    shuffle_questions: survey.shuffleQuestions ?? false,
  };
  const { error: insertError } = await supabase.from('surveys').insert(row);
  if (insertError) { console.error('createSurvey error:', insertError.message, insertError.code); return null; }
  // Fetch the newly created survey
  const { data, error: fetchError } = await supabase
    .from('surveys')
    .select('*')
    .eq('organization_id', survey.organizationId)
    .eq('title', survey.title!)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (fetchError || !data) { console.error('createSurvey fetch error:', fetchError?.message); return null; }
  return dbToSurvey(data as SurveyRow);
}

export async function updateSurvey(id: string, updates: Partial<SurveyRecord>): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.passScore !== undefined) row.pass_score = updates.passScore;
  if (updates.timeLimitMinutes !== undefined) row.time_limit_minutes = updates.timeLimitMinutes;
  if (updates.shuffleQuestions !== undefined) row.shuffle_questions = updates.shuffleQuestions;
  if (updates.settings !== undefined) row.settings = updates.settings;
  const { error } = await supabase.from('surveys').update(row).eq('id', id);
  if (error) { console.error('updateSurvey error:', error); return false; }
  return true;
}

export async function deleteSurvey(id: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const { error } = await supabase.from('surveys').delete().eq('id', id);
  if (error) { console.error('deleteSurvey error:', error); return false; }
  return true;
}

// ============================================================
// QUESTIONS CRUD
// ============================================================

export async function fetchQuestions(surveyId: string): Promise<SurveyQuestionRecord[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('survey_questions').select('*').eq('survey_id', surveyId).order('sort_order');
  if (error) { console.error('fetchQuestions error:', error); return []; }
  return (data as QuestionRow[]).map(dbToQuestion);
}

export async function saveQuestions(surveyId: string, questions: Partial<SurveyQuestionRecord>[]): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  // Delete existing and re-insert
  await supabase.from('survey_questions').delete().eq('survey_id', surveyId);

  if (questions.length === 0) return true;

  const rows = questions.map((q, i) => ({
    survey_id: surveyId,
    question_text: q.questionText || '',
    question_type: q.questionType || 'multiple_choice',
    options: q.options || null,
    required: q.required ?? true,
    sort_order: q.sortOrder ?? i,
    points: q.points ?? 1,
  }));

  const { error } = await supabase.from('survey_questions').insert(rows);
  if (error) { console.error('saveQuestions error:', error); return false; }
  return true;
}

// ============================================================
// TOKENS (Kisiye ozel dampali linkler)
// ============================================================

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 12; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export async function createTokens(
  surveyId: string,
  people: { personnelId?: string; name: string; email?: string; phone?: string }[],
  expiresAt?: string
): Promise<SurveyTokenRecord[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const rows = people.map(p => ({
    survey_id: surveyId,
    personnel_id: p.personnelId || null,
    token: generateToken(),
    person_name: p.name,
    person_email: p.email || null,
    person_phone: p.phone || null,
    status: 'pending',
    expires_at: expiresAt || null,
  }));

  const tokenValues = rows.map(r => r.token);
  const { error: insertError } = await supabase.from('survey_tokens').insert(rows);
  if (insertError) { console.error('createTokens error:', insertError.message, insertError.code); return []; }
  // Fetch the created tokens
  const { data, error: fetchError } = await supabase.from('survey_tokens').select('*').in('token', tokenValues);
  if (fetchError || !data) return [];
  return (data as TokenRow[]).map(dbToToken);
}

export async function fetchTokens(surveyId: string): Promise<SurveyTokenRecord[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('survey_tokens').select('*').eq('survey_id', surveyId).order('created_at', { ascending: false });
  if (error) return [];
  return (data as TokenRow[]).map(dbToToken);
}

export async function validateToken(token: string): Promise<{
  valid: boolean;
  tokenRecord?: SurveyTokenRecord;
  survey?: SurveyRecord;
  questions?: SurveyQuestionRecord[];
} | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data: tokenData, error: tokenError } = await supabase
    .from('survey_tokens').select('*').eq('token', token).single();
  if (tokenError || !tokenData) return { valid: false };

  const tokenRecord = dbToToken(tokenData as TokenRow);

  // Check expiry
  if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) {
    return { valid: false, tokenRecord };
  }
  // Already completed
  if (tokenRecord.status === 'completed') {
    return { valid: false, tokenRecord };
  }

  // Get survey
  const { data: surveyData } = await supabase.from('surveys').select('*').eq('id', tokenRecord.surveyId).single();
  if (!surveyData) return { valid: false, tokenRecord };
  const survey = dbToSurvey(surveyData as SurveyRow);

  // Survey must be active
  if (survey.status !== 'active') return { valid: false, tokenRecord, survey };

  // Get questions
  const { data: qData } = await supabase.from('survey_questions').select('*').eq('survey_id', survey.id).order('sort_order');
  const questions = ((qData || []) as QuestionRow[]).map(dbToQuestion);

  // Mark token as started
  if (tokenRecord.status === 'pending') {
    await supabase.from('survey_tokens').update({ status: 'started', started_at: new Date().toISOString() }).eq('id', tokenRecord.id);
  }

  return { valid: true, tokenRecord, survey, questions };
}

export async function updateTokenStatus(tokenId: string, status: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const updates: Record<string, unknown> = { status };
  if (status === 'completed') updates.completed_at = new Date().toISOString();
  if (status === 'started') updates.started_at = new Date().toISOString();
  const { error } = await supabase.from('survey_tokens').update(updates).eq('id', tokenId);
  return !error;
}

// ============================================================
// RESPONSES
// ============================================================

export async function submitResponses(
  surveyId: string,
  tokenId: string,
  answers: { questionId: string; answer: Record<string, unknown>; isCorrect?: boolean; score?: number }[]
): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  const rows = answers.map(a => ({
    survey_id: surveyId,
    token_id: tokenId,
    question_id: a.questionId,
    answer: a.answer,
    is_correct: a.isCorrect ?? null,
    score: a.score ?? 0,
  }));

  const { error } = await supabase.from('survey_responses').insert(rows);
  if (error) { console.error('submitResponses error:', error); return false; }

  // Mark token as completed
  await updateTokenStatus(tokenId, 'completed');
  return true;
}

export async function fetchResponses(surveyId: string): Promise<SurveyResponseRecord[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('survey_responses').select('*').eq('survey_id', surveyId);
  if (error) return [];
  return (data as ResponseRow[]).map(dbToResponse);
}

// ============================================================
// RESULTS / ANALYTICS
// ============================================================

export interface SurveyResultSummary {
  totalParticipants: number;
  completedCount: number;
  pendingCount: number;
  averageScore: number | null;
  passCount: number;
  failCount: number;
  questionStats: {
    questionId: string;
    questionText: string;
    questionType: string;
    answerDistribution: Record<string, number>;
    correctRate: number | null;
  }[];
}

export async function getSurveyResults(surveyId: string): Promise<SurveyResultSummary | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const [tokensRes, responsesRes, questionsRes, surveyRes] = await Promise.all([
    supabase.from('survey_tokens').select('*').eq('survey_id', surveyId),
    supabase.from('survey_responses').select('*').eq('survey_id', surveyId),
    supabase.from('survey_questions').select('*').eq('survey_id', surveyId).order('sort_order'),
    supabase.from('surveys').select('*').eq('id', surveyId).single(),
  ]);

  const tokens = ((tokensRes.data || []) as TokenRow[]).map(dbToToken);
  const responses = ((responsesRes.data || []) as ResponseRow[]).map(dbToResponse);
  const questions = ((questionsRes.data || []) as QuestionRow[]).map(dbToQuestion);
  const survey = surveyRes.data ? dbToSurvey(surveyRes.data as SurveyRow) : null;

  const completedTokens = tokens.filter(t => t.status === 'completed');
  const pendingTokens = tokens.filter(t => t.status === 'pending' || t.status === 'started');

  // Calculate per-participant scores
  let averageScore: number | null = null;
  let passCount = 0;
  let failCount = 0;

  if (survey?.type === 'exam' && completedTokens.length > 0) {
    const totalPoints = questions.reduce((s, q) => s + q.points, 0);
    const scores: number[] = [];
    for (const token of completedTokens) {
      const tokenResponses = responses.filter(r => r.tokenId === token.id);
      const earned = tokenResponses.reduce((s, r) => s + r.score, 0);
      const pct = totalPoints > 0 ? Math.round((earned / totalPoints) * 100) : 0;
      scores.push(pct);
      if (survey.passScore && pct >= survey.passScore) passCount++;
      else failCount++;
    }
    averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  }

  // Question-level stats
  const questionStats = questions.map(q => {
    const qResponses = responses.filter(r => r.questionId === q.id);
    const distribution: Record<string, number> = {};
    for (const r of qResponses) {
      const val = String(r.answer?.value ?? r.answer?.text ?? 'N/A');
      distribution[val] = (distribution[val] || 0) + 1;
    }
    const correctCount = qResponses.filter(r => r.isCorrect).length;
    return {
      questionId: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      answerDistribution: distribution,
      correctRate: qResponses.length > 0 ? Math.round((correctCount / qResponses.length) * 100) : null,
    };
  });

  return {
    totalParticipants: tokens.length,
    completedCount: completedTokens.length,
    pendingCount: pendingTokens.length,
    averageScore,
    passCount,
    failCount,
    questionStats,
  };
}
