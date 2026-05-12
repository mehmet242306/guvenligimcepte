import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/security/server";
import {
  getBillingCycleByPaddlePriceId,
  getPlanKeyByPaddlePriceId,
  verifyPaddleWebhookSignature,
} from "@/lib/billing/paddle";
import { sendBillingNotificationEmail } from "@/lib/mailer";
import { resolveAppOriginFromRequest } from "@/lib/server/app-origin";

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

type SubscriptionPersistResult =
  | {
      ok: true;
      skipped?: false;
      userId: string;
      organizationId: string;
      planId: string;
      planName: string;
      billingCycle: "monthly" | "yearly";
      status: string;
      nextBillingDate: string | null;
    }
  | { ok: true; skipped: true }
  | { ok: false };

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

function sanitizePaddleWebhookPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePaddleWebhookPayload(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      const normalized = key.toLowerCase();
      if (
        normalized.includes("email") ||
        normalized.includes("name") ||
        normalized.includes("phone") ||
        normalized.includes("address") ||
        normalized.includes("tax") ||
        normalized.includes("ip") ||
        normalized.includes("payment_method") ||
        normalized.includes("card")
      ) {
        return [key, "[redacted]"];
      }

      return [key, sanitizePaddleWebhookPayload(item)];
    }),
  );
}

function mapPaddleStatus(status: string | undefined, eventType: string) {
  const normalized = String(status ?? "").toLowerCase();

  if (eventType === "transaction.payment_failed") return "past_due";
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
  if (priceId) {
    const trimmedPriceId = priceId.trim();
    const planKeyFromEnv = getPlanKeyByPaddlePriceId(trimmedPriceId);
    if (planKeyFromEnv) {
      const { data } = await service
        .from("subscription_plans")
        .select("id, plan_key")
        .eq("plan_key", planKeyFromEnv)
        .maybeSingle();
      if (data?.id) {
        if (planKey && data.plan_key !== planKey) {
          console.warn("[billing.webhook] custom plan_key ignored; price_id wins", {
            planKey,
            resolvedPlanKey: data.plan_key,
          });
        }
        return data.id as string;
      }
    }

    const { data } = await service
      .from("subscription_plans")
      .select("id, plan_key")
      .or(`paddle_price_id_monthly.eq.${trimmedPriceId},paddle_price_id_yearly.eq.${trimmedPriceId}`)
      .maybeSingle();
    if (data?.id) {
      if (planKey && data.plan_key !== planKey) {
        console.warn("[billing.webhook] custom plan_key ignored; database price_id wins", {
          planKey,
          resolvedPlanKey: data.plan_key,
        });
      }
      return data.id as string;
    }
  }

  if (planKey && !priceId) {
    const { data } = await service
      .from("subscription_plans")
      .select("id")
      .eq("plan_key", planKey)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  return null;
}

async function upsertSubscription(
  eventType: string,
  data: Record<string, unknown>,
): Promise<SubscriptionPersistResult> {
  const service = createServiceClient();
  const customData = getCustomData(data);
  const subscriptionId =
    String(data.subscription_id ?? "").trim() ||
    (eventType.startsWith("subscription.") ? String(data.id ?? "").trim() : "");
  const customerId = String(data.customer_id ?? "").trim() || null;
  const transactionId =
    String(data.transaction_id ?? "").trim() ||
    (eventType.startsWith("transaction.") ? String(data.id ?? "").trim() : null);
  const priceId = getPriceId(data);

  const existingBySubscription = subscriptionId
    ? await service
        .from("user_subscriptions")
        .select(
          "id, user_id, organization_id, plan_id, billing_cycle, paddle_customer_id, paddle_price_id",
        )
        .eq("paddle_subscription_id", subscriptionId)
        .maybeSingle()
    : null;

  if (existingBySubscription?.error) {
    console.error(
      "[billing.webhook] subscription lookup failed:",
      existingBySubscription.error.message,
    );
    return { ok: false };
  }

  const userId =
    customData.user_id || String(existingBySubscription?.data?.user_id ?? "").trim();
  const organizationId =
    customData.organization_id ||
    String(existingBySubscription?.data?.organization_id ?? "").trim();

  if (!userId || !organizationId) {
    console.warn("[billing.webhook] skip: missing subscription owner context", {
      eventType,
      hasSubscriptionId: Boolean(subscriptionId),
      hasCustomData: Boolean(customData.user_id || customData.organization_id),
    });
    return { ok: true, skipped: true };
  }

  const planId =
    (await resolvePlanId({
      service,
      planKey: customData.plan_key,
      priceId,
    })) || String(existingBySubscription?.data?.plan_id ?? "").trim();

  if (!planId) {
    console.warn("[billing.webhook] plan_id unresolved", {
      eventType,
      priceId,
      planKey: customData.plan_key,
    });
    return { ok: false };
  }

  const { data: planRow } = await service
    .from("subscription_plans")
    .select("display_name, plan_key")
    .eq("id", planId)
    .maybeSingle();

  const billingCycleResolved =
    customData.billing_cycle === "monthly" || customData.billing_cycle === "yearly"
      ? customData.billing_cycle
      : getBillingCycleByPaddlePriceId(priceId) ??
        (await resolveBillingCycleFromDb(service, priceId)) ??
        (existingBySubscription?.data?.billing_cycle === "yearly" ? "yearly" : null) ??
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

  const existing = existingBySubscription?.data?.id
    ? { data: { id: existingBySubscription.data.id } }
    : await service
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .eq("organization_id", organizationId)
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
    paddle_customer_id:
      customerId || String(existingBySubscription?.data?.paddle_customer_id ?? "").trim() || null,
    paddle_subscription_id: subscriptionId || null,
    paddle_transaction_id: transactionId,
    paddle_price_id:
      priceId || String(existingBySubscription?.data?.paddle_price_id ?? "").trim() || null,
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
      return { ok: false };
    }
    return {
      ok: true,
      userId,
      organizationId,
      planId,
      planName:
        String(planRow?.display_name ?? "").trim() ||
        String(planRow?.plan_key ?? customData.plan_key ?? "RiskNova plan").trim(),
      billingCycle: billingCycleResolved,
      status,
      nextBillingDate,
    };
  }

  const { error: insertError } = await service.from("user_subscriptions").insert(payload);
  if (insertError) {
    console.error("[billing.webhook] user_subscriptions insert failed:", insertError.message);
    return { ok: false };
  }
  return {
    ok: true,
    userId,
    organizationId,
    planId,
    planName:
      String(planRow?.display_name ?? "").trim() ||
      String(planRow?.plan_key ?? customData.plan_key ?? "RiskNova plan").trim(),
    billingCycle: billingCycleResolved,
    status,
    nextBillingDate,
  };
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
      payload: sanitizePaddleWebhookPayload(event),
    });

  const duplicateEvent =
    Boolean(inserted.error) && inserted.error!.message.toLowerCase().includes("duplicate");

  if (inserted.error && !duplicateEvent) {
    console.error("[billing.webhook] event insert failed:", inserted.error.message);
    return NextResponse.json({ error: "webhook_event_persist_failed" }, { status: 500 });
  }

  const subscriptionEventTypes = [
    "transaction.completed",
    "transaction.payment_failed",
    "subscription.created",
    "subscription.updated",
    "subscription.activated",
    "subscription.canceled",
    "subscription.paused",
    "subscription.resumed",
    "subscription.past_due",
    "subscription.trialing",
  ];

  if (subscriptionEventTypes.includes(eventType)) {
    const persisted = await upsertSubscription(eventType, asObject(event.data));
    if (!persisted.ok) {
      return NextResponse.json({ error: "subscription_persist_failed" }, { status: 500 });
    }

    if (!persisted.skipped && !duplicateEvent) {
      try {
        const { data: profile } = await service
          .from("user_profiles")
          .select("full_name, email")
          .eq("auth_user_id", persisted.userId)
          .maybeSingle();
        const recipientEmail = profile?.email?.trim();

        if (recipientEmail) {
          const eventKey = `billing:${eventId}:${recipientEmail}`;
          const { error: emailLogError } = await service.from("email_notification_logs").insert({
            event_key: eventKey,
            notification_type: "billing_subscription_status",
            user_id: persisted.userId,
            organization_id: persisted.organizationId,
            recipient_email: recipientEmail,
            status: "sent",
            metadata: {
              paddle_event_id: eventId,
              paddle_event_type: eventType,
              plan_id: persisted.planId,
              plan_name: persisted.planName,
              subscription_status: persisted.status,
            },
          });

          if (!emailLogError) {
            const billingEmailStatus =
              persisted.status === "active" || persisted.status === "trialing"
                ? "active"
                : persisted.status === "past_due"
                  ? "past_due"
                  : persisted.status === "cancelled"
                    ? "cancelled"
                    : eventType === "subscription.paused"
                      ? "paused"
                      : "updated";

            try {
              await sendBillingNotificationEmail({
                to: recipientEmail,
                fullName: profile?.full_name ?? recipientEmail,
                planName: persisted.planName,
                billingCycle: persisted.billingCycle === "yearly" ? "Yillik" : "Aylik",
                status: billingEmailStatus,
                dashboardUrl: `${resolveAppOriginFromRequest(request)}/pricing`,
                nextBillingDateLabel: persisted.nextBillingDate
                  ? new Intl.DateTimeFormat("tr-TR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(persisted.nextBillingDate))
                  : null,
              });
            } catch (mailError) {
              await service
                .from("email_notification_logs")
                .update({
                  status: "failed",
                  error_message:
                    mailError instanceof Error ? mailError.message.slice(0, 500) : "mail_failed",
                })
                .eq("event_key", eventKey);
              console.error("[billing.webhook] billing email failed:", mailError);
            }
          } else if (!emailLogError.message.toLowerCase().includes("duplicate")) {
            console.error("[billing.webhook] email log failed:", emailLogError.message);
          }
        }
      } catch (mailSetupError) {
        console.error("[billing.webhook] billing email setup failed:", mailSetupError);
      }
    }
  }

  return NextResponse.json({ ok: true, ...(duplicateEvent ? { duplicate: true } : {}) });
}
