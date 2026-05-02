import {
  BILLING_ACTION_LABEL_EN,
  INDIVIDUAL_BILLING_PLAN_DEFS,
  PLAN_KEY_DISPLAY_EN,
  type BillingAction,
} from "@/lib/billing/plans";

/** Ayarlarda ve admin API ile senkron; politika metni güncellenince artırın. */
export const AI_COST_POLICY_VERSION = "2026-05-01";

export type AiCostPolicyRow = {
  endpoint: string;
  purposeTr: string;
  models: string;
  maxOutputTokens: number;
  inputLimitsTr: string;
  billingAction: BillingAction | null;
  expensiveVision: boolean;
};

/**
 * Üretimde kullanılan model / çıktı tavanları ve kota anahtarları — tek kaynak özeti.
 * (Gerçek doğrulama route şemalarında ve billing RPC'de.)
 */
export const AI_COST_POLICY_ROWS: readonly AiCostPolicyRow[] = [
  {
    endpoint: "/api/analyze-risk",
    purposeTr: "Görsel risk analizi (OpenAI sahne/KKD tespiti → Claude yöntem çıktısı)",
    models: "gpt-4o + claude-sonnet-4-20250514",
    maxOutputTokens: 6000,
    inputLimitsTr:
      "Base64 görsel şema üst sınırı ~20M karakter; MIME: jpeg, png, gif, webp",
    billingAction: "risk_analysis",
    expensiveVision: true,
  },
  {
    endpoint: "/api/ai/analysis",
    purposeTr: "Olay / kök neden (Ishikawa, 5N, FTA, …)",
    models: "claude-sonnet-4-20250514",
    maxOutputTokens: 2000,
    inputLimitsTr: "Başlık ≤400 karakter; açıklama ≤16000; bağlam JSON ≤80KB serileştirilmiş",
    billingAction: "incident_analysis",
    expensiveVision: false,
  },
  {
    endpoint: "/api/ai/ishikawa",
    purposeTr: "Ishikawa (6M) JSON çıktısı",
    models: "claude-sonnet-4-20250514",
    maxOutputTokens: 2000,
    inputLimitsTr: "Olay metni şema: narrative ≤8000 vb. (incidents/ai)",
    billingAction: "incident_analysis",
    expensiveVision: false,
  },
  {
    endpoint: "/api/ai/generate-corrective-actions",
    purposeTr: "DÖF önerileri",
    models: "claude-sonnet-4-20250514",
    maxOutputTokens: 2000,
    inputLimitsTr: "Kök neden listesi şema ile sınırlı (≤48 madde)",
    billingAction: "incident_analysis",
    expensiveVision: false,
  },
  {
    endpoint: "/api/document-ai",
    purposeTr: "ISG doküman taslağı",
    models: "claude-sonnet-4-20250514",
    maxOutputTokens: 4096,
    inputLimitsTr: "Kullanıcı promptu ≤8000 karakter",
    billingAction: "document_generation",
    expensiveVision: false,
  },
  {
    endpoint: "/api/training-ai",
    purposeTr: "Eğitim içeriği",
    models: "claude-sonnet-4-20250514",
    maxOutputTokens: 4096,
    inputLimitsTr: "İstek gövdesi route şeması ile",
    billingAction: "training_slide",
    expensiveVision: false,
  },
  {
    endpoint: "/api/training-slides-ai",
    purposeTr: "Çoklu eğitim slaytı",
    models: "claude-sonnet-4-20250514",
    maxOutputTokens: 8192,
    inputLimitsTr: "İstek gövdesi route şeması ile",
    billingAction: "training_slide",
    expensiveVision: false,
  },
  {
    endpoint: "/api/slide-single-ai",
    purposeTr: "Tek slayt üretimi",
    models: "claude-sonnet-4-20250514",
    maxOutputTokens: 2048,
    inputLimitsTr: "İstek gövdesi route şeması ile",
    billingAction: "training_slide",
    expensiveVision: false,
  },
  {
    endpoint: "/api/admin-ai",
    purposeTr: "Platform süper admin asistanı",
    models: "claude-sonnet-4-20250514",
    maxOutputTokens: 4096,
    inputLimitsTr: "Mesaj + opsiyonel görsel; günlük AI rate limit",
    billingAction: null,
    expensiveVision: false,
  },
];

export const AI_RESILIENCE_NOTE_TR =
  "document-ai vb. `executeWithResilience`: geçici ağ/model arızasında sınırlı yeniden deneme. 400/401/403/429 gibi istemci/kota hatalarında tekrar denenmez (gereksiz maliyet önlenir).";

export type AiMonthlyLimitRow = {
  planKey: string;
  planName: string;
  entries: Array<{ action: BillingAction; label: string; monthlyLimit: number }>;
};

/** Paket kartlarıyla uyumlu — abonelik kotası `consume_subscription_quota` ile uygulanır. */
export function getAiMonthlyLimitsSnapshot(): AiMonthlyLimitRow[] {
  const keys: BillingAction[] = [
    "nova_message",
    "ai_analysis",
    "document_generation",
    "risk_analysis",
    "field_inspection",
    "incident_analysis",
    "training_slide",
    "export",
  ];

  return INDIVIDUAL_BILLING_PLAN_DEFS.map((plan) => ({
    planKey: plan.key,
    planName: PLAN_KEY_DISPLAY_EN[plan.key],
    entries: keys.map((action) => ({
      action,
      label: BILLING_ACTION_LABEL_EN[action],
      monthlyLimit: plan.limits[action],
    })),
  }));
}
