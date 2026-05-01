import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/security/server";
import type { AuthOk } from "@/lib/supabase/api-auth";
import {
  BILLING_ACTION_LABELS,
  type BillingAction,
} from "./plans";

type QuotaResult = {
  allowed?: boolean;
  reason?: string;
  plan_key?: string;
  plan_name?: string;
  action?: string;
  limit?: number;
  used?: number;
  remaining?: number;
  message?: string;
};

export async function consumeEntitlement(
  auth: Pick<AuthOk, "userId" | "organizationId">,
  action: BillingAction,
) {
  const service = createServiceClient();
  const { data, error } = await service.rpc("consume_subscription_quota", {
    p_user_id: auth.userId,
    p_organization_id: auth.organizationId,
    p_action: action,
    p_amount: 1,
  });

  if (error) {
    console.error("[billing] consume_subscription_quota failed:", error.message);
    return NextResponse.json(
      { error: "Abonelik limiti kontrol edilemedi." },
      { status: 500 },
    );
  }

  const result = data as QuotaResult;
  if (result?.allowed === true) return null;

  return NextResponse.json(
    {
      error: "Paket limitiniz doldu.",
      action,
      actionLabel: BILLING_ACTION_LABELS[action],
      planKey: result?.plan_key ?? "free",
      planName: result?.plan_name ?? "Free",
      limit: Number(result?.limit ?? 0),
      used: Number(result?.used ?? 0),
      remaining: Number(result?.remaining ?? 0),
      upgradeUrl: "/pricing",
      message:
        result?.message ||
        `${BILLING_ACTION_LABELS[action]} limitiniz doldu. Devam etmek için paketinizi yükseltin.`,
    },
    { status: 402 },
  );
}
