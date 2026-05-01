import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/security/server";
import {
  getBillingCycleByPaddlePriceId,
  getPlanKeyByPaddlePriceId,
  verifyPaddleWebhookSignature,
} from "@/lib/billing/paddle";

type PaddleEvent = {
  event_id?: string;
  event_type?: string;
  occurred_at?: string;
  data?: Record<string, unknown>;
};

type PaddleCustomData = {
  user_id?: string;
  organization_id?: string;
  plan_key?: string;
  billing_cycle?: "monthly" | "yearly";
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getCustomData(data: Record<string, unknown>): PaddleCustomData {
  return asObject(data.custom_data) as PaddleCustomData;
}

function getPriceId(data: Record<string, unknown>) {
  const items = Array.isArray(data.items) ? data.items : [];
  const firstItem = asObject(items[0]);
  const price = asObject(firstItem.price);
  return (
    String(data.price_id ?? "").trim() ||
    String(price.id ?? "").trim() ||
    null
  );
}

function mapPaddleStatus(status: string | undefined, eventType: string) {
  const normalized = String(status ?? "").toLowerCase();

  if (eventType === "subscription.canceled" || normalized === "canceled") {
    return "cancelled";
  }

  if (normalized === "trialing") return "trialing";
  if (normalized === "past_due" || normalized === "paused") return "past_due";
  if (normalized === "expired") return "expired";
  if (normalized === "active") return "active";
  return "active";
}

async function resolveBillingCycleFromDb(
  service: ReturnType<typeof createServiceClient>,
  priceId: string | null,
): Promise<"monthly" | "yearly" | null> {
  if (!priceId?.trim()) return null;

  const { data: monthlyMatch } = await service
    .from("subscription_plans")
    .select("id")
    .eq("paddle_price_id_monthly", priceId.trim())
    .maybeSingle();
  if (monthlyMatch?.id) return "monthly";

  const { data: yearlyMatch } = await service
    .from("subscription_plans")
    .select("id")
    .eq("paddle_price_id_yearly", priceId.trim())
    .maybeSingle();
  if (yearlyMatch?.id) return "yearly";

  return null;
}

async function resolvePlanId({
  service,
  planKey,
  priceId,
}: {
  service: ReturnType<typeof createServiceClient>;
  planKey?: string;
  priceId?: string | null;
}) {
  if (planKey) {
    const { data } = await service
      .from("subscription_plans")
      .select("id")
      .eq("plan_key", planKey)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  if (priceId) {
    const planKeyFromEnv = getPlanKeyByPaddlePriceId(priceId);
    if (planKeyFromEnv) {
      const { data } = await service
        .from("subscription_plans")
        .select("id")
        .eq("plan_key", planKeyFromEnv)
        .maybeSingle();
      if (data?.id) return data.id as string;
    }

    const { data } = await service
      .from("subscription_plans")
      .select("id")
      .or(`paddle_price_id_monthly.eq.${priceId},paddle_price_id_yearly.eq.${priceId}`)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  return null;
}

async function upsertSubscription(eventType: string, data: Record<string, unknown>) {
  const service = createServiceClient();
  const customData = getCustomData(data);
  const userId = customData.user_id;
  const organizationId = customData.organization_id;

  if (!userId || !organizationId) return;

  const subscriptionId =
    String(data.subscription_id ?? "").trim() ||
    (eventType.startsWith("subscription.") ? String(data.id ?? "").trim() : "");
  const customerId = String(data.customer_id ?? "").trim() || null;
  const transactionId =
    String(data.transaction_id ?? "").trim() ||
    (eventType.startsWith("transaction.") ? String(data.id ?? "").trim() : null);
  const priceId = getPriceId(data);
  const planId = await resolvePlanId({
    service,
    planKey: customData.plan_key,
    priceId,
  });

  if (!planId) return;

  const billingCycleResolved =
    customData.billing_cycle === "monthly" || customData.billing_cycle === "yearly"
      ? customData.billing_cycle
      : getBillingCycleByPaddlePriceId(priceId) ??
        (await resolveBillingCycleFromDb(service, priceId)) ??
        "monthly";

  const status = mapPaddleStatus(String(data.status ?? ""), eventType);
  const nextBillingDate =
    String(data.next_billed_at ?? "").trim() ||
    String(asObject(data.current_billing_period).ends_at ?? "").trim() ||
    null;
  const cancelledAt =
    status === "cancelled"
      ? String(data.canceled_at ?? data.updated_at ?? new Date().toISOString())
      : null;

  const existing = subscriptionId
    ? await service
        .from("user_subscriptions")
        .select("id")
        .eq("paddle_subscription_id", subscriptionId)
        .maybeSingle()
    : await service
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  const payload = {
    user_id: userId,
    organization_id: organizationId,
    plan_id: planId,
    status,
    billing_cycle: billingCycleResolved,
    next_billing_date: nextBillingDate,
    cancelled_at: cancelledAt,
    paddle_customer_id: customerId,
    paddle_subscription_id: subscriptionId || null,
    paddle_transaction_id: transactionId,
    paddle_price_id: priceId,
    provider: "paddle",
    provider_status: String(data.status ?? status),
    updated_at: new Date().toISOString(),
  };

  if (existing.data?.id) {
    const { error: updateError } = await service
      .from("user_subscriptions")
      .update(payload)
      .eq("id", existing.data.id);
    if (updateError) {
      console.error("[billing.webhook] user_subscriptions update failed:", updateError.message);
    }
    return;
  }

  const { error: insertError } = await service.from("user_subscriptions").insert(payload);
  if (insertError) {
    console.error("[billing.webhook] user_subscriptions insert failed:", insertError.message);
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("paddle-signature");

  if (!verifyPaddleWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: PaddleEvent;
  try {
    event = JSON.parse(rawBody) as PaddleEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const eventId = event.event_id;
  const eventType = event.event_type;

  if (!eventId || !eventType) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const service = createServiceClient();
  const inserted = await service
    .from("paddle_webhook_events")
    .insert({
      event_id: eventId,
      event_type: eventType,
      occurred_at: event.occurred_at ?? null,
      payload: event,
    });

  if (inserted.error) {
    const message = inserted.error.message.toLowerCase();
    if (message.includes("duplicate")) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    return NextResponse.json({ error: inserted.error.message }, { status: 500 });
  }

  if (
    [
      "transaction.completed",
      "subscription.created",
      "subscription.updated",
      "subscription.canceled",
      "subscription.paused",
      "subscription.resumed",
      "subscription.past_due",
    ].includes(eventType)
  ) {
    await upsertSubscription(eventType, asObject(event.data));
  }

  return NextResponse.json({ ok: true });
}
