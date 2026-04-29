import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAccountContextForUser } from "@/lib/account/account-routing";
import {
  createPaddleCheckoutTransaction,
  getPaddlePriceId,
} from "@/lib/billing/paddle";
import {
  getBillingPlan,
  type BillingCycle,
  type BillingPlanKey,
} from "@/lib/billing/plans";
import {
  createServiceClient,
  parseJsonBody,
} from "@/lib/security/server";
import { requireAuth } from "@/lib/supabase/api-auth";

const checkoutSchema = z.object({
  planKey: z.enum([
    "starter",
    "plus",
    "professional",
    "professional_149",
    "professional_199",
  ]),
  cycle: z.enum(["monthly", "yearly"]).optional().default("monthly"),
});

function getAppOrigin(request: NextRequest) {
  const requestOrigin = `${request.nextUrl.protocol}//${request.nextUrl.host}`.replace(/\/$/, "");
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

  if (requestOrigin.includes("getrisknova.com")) {
    return requestOrigin;
  }

  return configuredOrigin || requestOrigin;
}

function getCheckoutErrorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error || "Paddle odeme oturumu olusturulamadi.");
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("permitted") || lowerMessage.includes("permission")) {
    return "Paddle API key bu odeme istegine izin vermiyor. Vercel'deki PADDLE_API_KEY ayni Paddle sandbox hesabindan olmali ve Transactions Write, Customers Read/Write, Prices Read yetkilerine sahip olmali.";
  }

  return message;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, checkoutSchema);
  if (!parsed.ok) return parsed.response;

  const planKey = parsed.data.planKey as BillingPlanKey;
  const cycle = parsed.data.cycle as BillingCycle;
  const plan = getBillingPlan(planKey);

  if (!plan || plan.priceUsd <= 0) {
    return NextResponse.json(
      { error: "Bu plan self-service odeme icin uygun degil." },
      { status: 400 },
    );
  }

  const accountContext = await getAccountContextForUser(auth.userId);
  if (accountContext.accountType !== "individual") {
    return NextResponse.json(
      {
        error:
          "OSGB ve kurumsal hesaplar icin self-service odeme yerine iletisim akisina gecin.",
        contactUrl: "/register?type=business",
      },
      { status: 403 },
    );
  }

  const priceId = getPaddlePriceId(planKey, cycle);
  if (!priceId) {
    return NextResponse.json(
      {
        error:
          "Paddle fiyat kimligi tanimli degil. Lutfen ilgili PADDLE_PRICE_* ortam degiskenini ekleyin.",
      },
      { status: 500 },
    );
  }

  const service = createServiceClient();
  const { data: userData } = await service.auth.admin.getUserById(auth.userId);
  const origin = getAppOrigin(request);
  const paddleCheckoutUrl =
    process.env.PADDLE_CHECKOUT_URL?.trim() ||
    `${origin}/pricing`;

  let checkout: Awaited<ReturnType<typeof createPaddleCheckoutTransaction>>;

  try {
    checkout = await createPaddleCheckoutTransaction({
      priceId,
      userId: auth.userId,
      organizationId: auth.organizationId,
      planKey,
      cycle,
      customerEmail: userData.user?.email ?? null,
      checkoutUrl: paddleCheckoutUrl,
    });
  } catch (error) {
    console.error("[billing.checkout] Paddle checkout failed", {
      planKey,
      cycle,
      priceId,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({ error: getCheckoutErrorMessage(error) }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    checkoutUrl: checkout.checkoutUrl,
    transactionId: checkout.transactionId,
  });
}
