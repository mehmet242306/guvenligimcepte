// Shared survey row ↔ domain mappers (browser API + server-side public routes).

export interface SurveyRecord {
  id: string;
  organizationId: string;
  companyId: string;
  createdBy: string;
  title: string;
  description: string;
  type: "survey" | "exam";
  status: "draft" | "active" | "closed" | "archived";
  /** Şablon sınav: katılımcı linki önerilmez; yayına alınırken otomatik kalkar */
  isTemplate: boolean;
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
  questionType: "multiple_choice" | "open_ended" | "scale" | "yes_no" | "multi_select";
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
  status: "pending" | "started" | "completed" | "expired";
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

export type SurveyRow = {
  id: string;
  organization_id: string;
  company_id: string;
  created_by: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  is_template?: boolean;
  settings: Record<string, unknown>;
  pass_score: number | null;
  time_limit_minutes: number | null;
  shuffle_questions: boolean;
  created_at: string;
  updated_at: string;
};

export type QuestionRow = {
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

export type TokenRow = {
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

export type ResponseRow = {
  id: string;
  survey_id: string;
  token_id: string;
  question_id: string;
  answer: Record<string, unknown>;
  is_correct: boolean | null;
  score: number;
  created_at: string;
};

export function dbToSurvey(r: SurveyRow): SurveyRecord {
  return {
    id: r.id,
    organizationId: r.organization_id,
    companyId: r.company_id,
    createdBy: r.created_by,
    title: r.title,
    description: r.description || "",
    type: r.type as SurveyRecord["type"],
    status: r.status as SurveyRecord["status"],
    isTemplate: Boolean(r.is_template),
    settings: r.settings || {},
    passScore: r.pass_score,
    timeLimitMinutes: r.time_limit_minutes,
    shuffleQuestions: r.shuffle_questions,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function dbToQuestion(r: QuestionRow): SurveyQuestionRecord {
  return {
    id: r.id,
    surveyId: r.survey_id,
    questionText: r.question_text,
    questionType: r.question_type as SurveyQuestionRecord["questionType"],
    options: r.options,
    required: r.required,
    sortOrder: r.sort_order,
    points: r.points,
    createdAt: r.created_at,
  };
}

export function dbToToken(r: TokenRow): SurveyTokenRecord {
  return {
    id: r.id,
    surveyId: r.survey_id,
    personnelId: r.personnel_id,
    token: r.token,
    personName: r.person_name || "",
    personEmail: r.person_email,
    personPhone: r.person_phone,
    status: r.status as SurveyTokenRecord["status"],
    startedAt: r.started_at,
    completedAt: r.completed_at,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  };
}

export function dbToResponse(r: ResponseRow): SurveyResponseRecord {
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
