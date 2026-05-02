export type BillingCycle = "monthly" | "yearly";

export type BillingPlanKey =
  | "free"
  | "starter"
  | "plus"
  | "professional"
  | "professional_149"
  | "professional_199";

export type BillingAction =
  | "nova_message"
  | "ai_analysis"
  | "document_generation"
  | "risk_analysis"
  | "field_inspection"
  | "incident_analysis"
  | "training_slide"
  | "export";

/** Limits and pricing only; marketing strings live in next-intl messages under the pricing namespace. */
export type BillingPlanDefinition = {
  key: BillingPlanKey;
  priceUsd: number;
  recommended?: boolean;
  /** Badge copy comes from next-intl namespace "pricing", keys planHighlights.* */
  highlightKey?: "mostPopular" | "premium";
  limits: Record<BillingAction, number>;
};

/** English labels for APIs, admin snapshots, entitlements JSON (not marketing UI). */
export const BILLING_ACTION_LABEL_EN: Record<BillingAction, string> = {
  nova_message: "Nova messages",
  ai_analysis: "AI analyses",
  document_generation: "Document generation",
  risk_analysis: "Risk analyses",
  field_inspection: "Field inspections",
  incident_analysis: "Incident / root cause analyses",
  training_slide: "Training slides",
  export: "Exports",
};

/** @deprecated use BILLING_ACTION_LABEL_EN */
export const BILLING_ACTION_LABELS = BILLING_ACTION_LABEL_EN;

export const PLAN_KEY_DISPLAY_EN: Record<BillingPlanKey, string> = {
  free: "Free",
  starter: "Starter",
  plus: "Plus",
  professional: "Professional 99",
  professional_149: "Professional 149",
  professional_199: "Professional 199",
};

export const INDIVIDUAL_BILLING_PLAN_DEFS: BillingPlanDefinition[] = [
  {
    key: "free",
    priceUsd: 0,
    limits: {
      nova_message: 10,
      ai_analysis: 3,
      document_generation: 1,
      risk_analysis: 1,
      field_inspection: 1,
      incident_analysis: 0,
      training_slide: 0,
      export: 1,
    },
  },
  {
    key: "starter",
    priceUsd: 29,
    limits: {
      nova_message: 100,
      ai_analysis: 50,
      document_generation: 10,
      risk_analysis: 10,
      field_inspection: 10,
      incident_analysis: 3,
      training_slide: 0,
      export: 10,
    },
  },
  {
    key: "plus",
    priceUsd: 59,
    limits: {
      nova_message: 250,
      ai_analysis: 100,
      document_generation: 20,
      risk_analysis: 25,
      field_inspection: 25,
      incident_analysis: 8,
      training_slide: 2,
      export: 25,
    },
  },
  {
    key: "professional",
    priceUsd: 99,
    limits: {
      nova_message: 500,
      ai_analysis: 200,
      document_generation: 30,
      risk_analysis: 50,
      field_inspection: 50,
      incident_analysis: 15,
      training_slide: 5,
      export: 50,
    },
  },
  {
    key: "professional_149",
    priceUsd: 149,
    recommended: true,
    highlightKey: "mostPopular",
    limits: {
      nova_message: 1000,
      ai_analysis: 500,
      document_generation: 75,
      risk_analysis: 150,
      field_inspection: 150,
      incident_analysis: 50,
      training_slide: 20,
      export: 150,
    },
  },
  {
    key: "professional_199",
    priceUsd: 199,
    highlightKey: "premium",
    limits: {
      nova_message: 2000,
      ai_analysis: 1000,
      document_generation: 150,
      risk_analysis: 300,
      field_inspection: 300,
      incident_analysis: 100,
      training_slide: 50,
      export: 300,
    },
  },
];

/** Legacy shape for checkout / backwards compatibility (English-only fallback fields). */
export type PublicBillingPlan = BillingPlanDefinition & {
  name: string;
  whoFor: string;
  upgradeHint: string;
  description: string;
  highlight?: string;
  features: string[];
};

export function getBillingPlanDef(planKey: string | null | undefined) {
  return INDIVIDUAL_BILLING_PLAN_DEFS.find((plan) => plan.key === planKey) ?? null;
}

export function getBillingPlan(planKey: string | null | undefined): PublicBillingPlan | null {
  const def = getBillingPlanDef(planKey);
  if (!def) return null;
  return {
    ...def,
    name: PLAN_KEY_DISPLAY_EN[def.key],
    whoFor: "",
    upgradeHint: "",
    description: "",
    features: [],
    highlight: def.highlightKey === "mostPopular" ? "Most popular" : def.highlightKey === "premium" ? "Premium" : undefined,
  };
}

/** @deprecated use INDIVIDUAL_BILLING_PLAN_DEFS + i18n on the client */
export const INDIVIDUAL_BILLING_PLANS: PublicBillingPlan[] = INDIVIDUAL_BILLING_PLAN_DEFS.map((def) => getBillingPlan(def.key)!);

export function formatLimitNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}
