import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type EdgeErrorLogOptions = {
  level?: "info" | "warn" | "error" | "critical";
  source: string;
  message: string;
  endpoint?: string | null;
  stackTrace?: string | null;
  context?: Record<string, unknown>;
  userId?: string | null;
  organizationId?: string | null;
  requestId?: string | null;
};

type EdgeAiUsageOptions = {
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

function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

function estimateAiCostUsd({
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
  const pricing =
    MODEL_PRICING_PER_MILLION[model.trim().toLowerCase()] ??
    MODEL_PRICING_PER_MILLION["claude-sonnet-4-20250514"];

  const uncachedPromptTokens = Math.max(0, promptTokens - cachedTokens);
  const inputCost = (uncachedPromptTokens / 1_000_000) * pricing.input;
  const cachedCost = (cachedTokens / 1_000_000) * (pricing.cachedInput ?? pricing.input);
  const outputCost = (completionTokens / 1_000_000) * pricing.output;

  return Number((inputCost + cachedCost + outputCost).toFixed(6));
}

export async function logEdgeErrorEvent(options: EdgeErrorLogOptions) {
  try {
    const supabase = getServiceClient();
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
  } catch (error) {
    console.error("[edge-observability] logEdgeErrorEvent failed:", error);
  }
}

export async function logEdgeAiUsage(options: EdgeAiUsageOptions) {
  try {
    const supabase = getServiceClient();
    await supabase.rpc("log_ai_usage", {
      p_user_id: options.userId ?? null,
      p_organization_id: options.organizationId ?? null,
      p_model: options.model,
      p_prompt_tokens: options.promptTokens ?? 0,
      p_completion_tokens: options.completionTokens ?? 0,
      p_cached_tokens: options.cachedTokens ?? 0,
      p_cost_usd: estimateAiCostUsd({
        model: options.model,
        promptTokens: options.promptTokens ?? 0,
        completionTokens: options.completionTokens ?? 0,
        cachedTokens: options.cachedTokens ?? 0,
      }),
      p_endpoint: options.endpoint,
      p_success: options.success ?? true,
      p_metadata: options.metadata ?? {},
    });
  } catch (error) {
    console.error("[edge-observability] logEdgeAiUsage failed:", error);
  }
}
