import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/security/server";
import type { AuthOk } from "@/lib/supabase/api-auth";
import { BILLING_ACTION_LABEL_EN, type BillingAction } from "./plans";

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

const DEFAULT_UPGRADE_URL = "/pricing";
const OSGB_COMMERCIAL_UPGRADE_URL = "/cozumler/osgb";

async function resolveUpgradeUrl(organizationId: string): Promise<string> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("organizations")
    .select("account_type")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) return DEFAULT_UPGRADE_URL;
  if (data.account_type === "osgb") return OSGB_COMMERCIAL_UPGRADE_URL;
  return DEFAULT_UPGRADE_URL;
}

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
      { errorKey: "quotaCheckFailed", error: "Abonelik limiti kontrol edilemedi." },
      { status: 500 },
    );
  }

  const result = data as QuotaResult;
  if (result?.allowed === true) return null;

  const upgradeUrl = await resolveUpgradeUrl(auth.organizationId);

  return NextResponse.json(
    {
      errorKey: "quotaExceeded",
      error: "Paket limitiniz doldu.",
      action,
      actionLabel: BILLING_ACTION_LABEL_EN[action],
      planKey: result?.plan_key ?? "free",
      planName: result?.plan_name ?? "Free",
      limit: Number(result?.limit ?? 0),
      used: Number(result?.used ?? 0),
      remaining: Number(result?.remaining ?? 0),
      upgradeUrl,
      message:
        result?.message ||
        "Bu özellik için aylık kullanım kotanız doldu. Devam etmek için paketinizi yükseltin.",
    },
    { status: 402 },
  );
}
