import { NextRequest, NextResponse } from "next/server";
import {
  BILLING_ACTION_LABEL_EN,
  PLAN_KEY_DISPLAY_EN,
  type BillingAction,
  getBillingPlanDef,
} from "@/lib/billing/plans";
import { createServiceClient } from "@/lib/security/server";
import { requireAuth } from "@/lib/supabase/api-auth";

const BILLING_ACTIONS = Object.keys(BILLING_ACTION_LABEL_EN) as BillingAction[];
const UNLIMITED_THRESHOLD = 999999;

type JsonMap = Record<string, unknown>;

function currentUsageMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function numberFromJson(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveLimit({
  action,
  customLimits,
  actionLimits,
  planKey,
}: {
  action: BillingAction;
  customLimits: JsonMap;
  actionLimits: JsonMap;
  planKey: string | null;
}) {
  const custom = customLimits[action];
  if (custom !== undefined && custom !== null && custom !== "") {
    return Math.max(numberFromJson(custom), 0);
  }

  const direct = actionLimits[action];
  if (direct !== undefined && direct !== null && direct !== "") {
    return Math.max(numberFromJson(direct), 0);
  }

  const localPlan = getBillingPlanDef(planKey);
  if (localPlan) return localPlan.limits[action] ?? 0;

  const fallbackAction =
    action === "nova_message"
      ? "nova_message"
      : action === "document_generation"
        ? "document_generation"
        : "ai_analysis";
  return Math.max(numberFromJson(actionLimits[fallbackAction]), 0);
}

function resolveUsed(action: BillingAction, usage: JsonMap | null) {
  if (!usage) return 0;
  if (action === "nova_message") return numberFromJson(usage.message_count);
  if (action === "document_generation") return numberFromJson(usage.document_count);

  const toolUsage = (usage.tool_usage && typeof usage.tool_usage === "object"
    ? usage.tool_usage
    : {}) as JsonMap;
  const toolCount = numberFromJson(toolUsage[action]);

  if (action === "ai_analysis") {
    return Math.max(toolCount, numberFromJson(usage.analysis_count));
  }

  return toolCount;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const service = createServiceClient();
  const usageMonth = currentUsageMonth();

  const { data: subscription, error: subscriptionError } = await service
    .from("user_subscriptions")
    .select(
      `
      id,
      status,
      billing_cycle,
      custom_limits,
      plan:subscription_plans(plan_key, display_name, action_limits)
    `,
    )
    .eq("user_id", auth.userId)
    .eq("organization_id", auth.organizationId)
    .in("status", ["active", "trialing"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) {
    console.error("[account.ai-usage] subscription lookup failed:", subscriptionError.message);
    return NextResponse.json({ error: "Kullanim haklari okunamadi." }, { status: 500 });
  }

  let plan = (subscription?.plan as
    | { plan_key?: string | null; display_name?: string | null; action_limits?: JsonMap | null }
    | null
    | undefined) ?? null;

  if (!plan) {
    const { data: freePlan, error: freePlanError } = await service
      .from("subscription_plans")
      .select("plan_key, display_name, action_limits")
      .eq("plan_key", "free")
      .limit(1)
      .maybeSingle();

    if (freePlanError) {
      console.error("[account.ai-usage] free plan lookup failed:", freePlanError.message);
      return NextResponse.json({ error: "Paket haklari okunamadi." }, { status: 500 });
    }

    plan = (freePlan as typeof plan) ?? {
      plan_key: "free",
      display_name: "Free",
      action_limits: getBillingPlanDef("free")?.limits ?? {},
    };
  }

  let usage: JsonMap | null = null;
  if (subscription?.id) {
    const { data: usageRow, error: usageError } = await service
      .from("subscription_usage")
      .select("message_count, analysis_count, document_count, tool_usage, estimated_cost_usd")
      .eq("subscription_id", subscription.id)
      .eq("usage_month", usageMonth)
      .maybeSingle();

    if (usageError) {
      console.error("[account.ai-usage] usage lookup failed:", usageError.message);
      return NextResponse.json({ error: "Aylik kullanim okunamadi." }, { status: 500 });
    }

    usage = (usageRow as JsonMap | null) ?? null;
  }

  const customLimits = ((subscription?.custom_limits ?? {}) as JsonMap) ?? {};
  const actionLimits = ((plan?.action_limits ?? {}) as JsonMap) ?? {};
  const planKey = plan?.plan_key ?? "free";

  const items = BILLING_ACTIONS.map((action) => {
    const used = resolveUsed(action, usage);
    const limit = resolveLimit({ action, customLimits, actionLimits, planKey });
    const unlimited = limit >= UNLIMITED_THRESHOLD;
    const remaining = unlimited ? UNLIMITED_THRESHOLD : Math.max(limit - used, 0);
    const percentUsed = unlimited || limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));

    return {
      action,
      label: BILLING_ACTION_LABEL_EN[action],
      used,
      limit,
      remaining,
      unlimited,
      percentUsed,
    };
  });

  return NextResponse.json({
    plan: {
      key: planKey,
      name:
        plan?.display_name ??
        PLAN_KEY_DISPLAY_EN[planKey as keyof typeof PLAN_KEY_DISPLAY_EN] ??
        planKey,
      status: subscription?.status ?? "active",
      billingCycle: subscription?.billing_cycle ?? "monthly",
    },
    period: {
      month: usageMonth,
    },
    estimatedCostUsd: numberFromJson(usage?.estimated_cost_usd),
    items,
  });
}
