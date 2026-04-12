import { createServiceClient } from "@/lib/security/server";

type ErrorLevel = "info" | "warn" | "error" | "critical";

type ErrorLogOptions = {
  level?: ErrorLevel;
  source: string;
  message: string;
  endpoint?: string | null;
  stackTrace?: string | null;
  context?: Record<string, unknown>;
  userId?: string | null;
  organizationId?: string | null;
  requestId?: string | null;
};

type AiUsageOptions = {
  userId?: string | null;
  organizationId?: string | null;
  model: string;
  endpoint: string;
  promptTokens?: number;
  completionTokens?: number;
  cachedTokens?: number;
  success?: boolean;
  metadata?: Record<string, unknown>;
};

type AdminNotificationOptions = {
  category: string;
  level?: "info" | "warning" | "critical";
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown>;
};

const MODEL_PRICING_PER_MILLION: Record<
  string,
  { input: number; output: number; cachedInput?: number }
> = {
  "claude-sonnet-4-20250514": { input: 3, output: 15, cachedInput: 0.3 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5, cachedInput: 0.1 },
  "claude-3-5-haiku-latest": { input: 0.8, output: 4, cachedInput: 0.08 },
  "claude-3-5-sonnet-latest": { input: 3, output: 15, cachedInput: 0.3 },
  "claude-sonnet-4-0": { input: 3, output: 15, cachedInput: 0.3 },
};

function normalizeModelKey(model: string) {
  return model.trim().toLowerCase();
}

export function estimateAiCostUsd({
  model,
  promptTokens = 0,
  completionTokens = 0,
  cachedTokens = 0,
}: {
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  cachedTokens?: number;
}) {
  const key = normalizeModelKey(model);
  const pricing =
    MODEL_PRICING_PER_MILLION[key] ??
    MODEL_PRICING_PER_MILLION["claude-sonnet-4-20250514"];

  const uncachedPromptTokens = Math.max(0, promptTokens - cachedTokens);
  const inputCost = (uncachedPromptTokens / 1_000_000) * pricing.input;
  const cachedCost = ((cachedTokens ?? 0) / 1_000_000) * (pricing.cachedInput ?? pricing.input);
  const outputCost = (completionTokens / 1_000_000) * pricing.output;

  return Number((inputCost + cachedCost + outputCost).toFixed(6));
}

export async function logErrorEvent(options: ErrorLogOptions) {
  try {
    const supabase = createServiceClient();
    await supabase.rpc("log_error_event", {
      p_level: options.level ?? "error",
      p_source: options.source,
      p_message: options.message,
      p_stack_trace: options.stackTrace ?? null,
      p_context: options.context ?? {},
      p_user_id: options.userId ?? null,
      p_organization_id: options.organizationId ?? null,
      p_request_id: options.requestId ?? null,
      p_endpoint: options.endpoint ?? null,
    });

    if ((options.level ?? "error") === "critical") {
      await createAdminNotification({
        category: "critical_error",
        level: "critical",
        title: "Kritik uygulama hatasi",
        message: options.message,
        link: "/settings?tab=error_logs",
        metadata: {
          source: options.source,
          endpoint: options.endpoint ?? null,
          requestId: options.requestId ?? null,
        },
      });
    }
  } catch (error) {
    console.error("[admin-observability] logErrorEvent failed:", error);
  }
}

export async function logAiUsage(options: AiUsageOptions) {
  try {
    const supabase = createServiceClient();
    const costUsd = estimateAiCostUsd({
      model: options.model,
      promptTokens: options.promptTokens ?? 0,
      completionTokens: options.completionTokens ?? 0,
      cachedTokens: options.cachedTokens ?? 0,
    });

    await supabase.rpc("log_ai_usage", {
      p_user_id: options.userId ?? null,
      p_organization_id: options.organizationId ?? null,
      p_model: options.model,
      p_prompt_tokens: options.promptTokens ?? 0,
      p_completion_tokens: options.completionTokens ?? 0,
      p_cached_tokens: options.cachedTokens ?? 0,
      p_cost_usd: costUsd,
      p_endpoint: options.endpoint,
      p_success: options.success ?? true,
      p_metadata: {
        estimated: true,
        ...(options.metadata ?? {}),
      },
    });
  } catch (error) {
    console.error("[admin-observability] logAiUsage failed:", error);
  }
}

export async function createAdminNotification(options: AdminNotificationOptions) {
  try {
    const supabase = createServiceClient();
    await supabase.from("admin_notifications").insert({
      category: options.category,
      level: options.level ?? "info",
      title: options.title,
      message: options.message,
      link: options.link ?? null,
      metadata: options.metadata ?? {},
    });
  } catch (error) {
    console.error("[admin-observability] createAdminNotification failed:", error);
  }
}
