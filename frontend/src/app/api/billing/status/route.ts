import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/security/server";
import { requireAuth } from "@/lib/supabase/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const service = createServiceClient();
  const { data, error } = await service
    .from("user_subscriptions")
    .select(
      `
      id,
      status,
      billing_cycle,
      plan:subscription_plans(plan_key, display_name)
    `,
    )
    .eq("user_id", auth.userId)
    .in("status", ["active", "trialing"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const plan = data?.plan as
    | { plan_key?: string | null; display_name?: string | null }
    | null
    | undefined;

  return NextResponse.json({
    subscription: data
      ? {
          id: data.id,
          status: data.status,
          billingCycle: data.billing_cycle,
          planKey: plan?.plan_key ?? null,
          displayName: plan?.display_name ?? null,
        }
      : null,
  });
}
