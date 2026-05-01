import { createHmac, timingSafeEqual } from "crypto";
import type { BillingCycle, BillingPlanKey } from "./plans";

type PaddleTransactionResponse = {
  data?: {
    id?: string;
    checkout?: {
      url?: string;
    };
  };
  error?: {
    detail?: string;
    message?: string;
  };
};

const PADDLE_PRICE_ENV: Record<BillingPlanKey, Record<BillingCycle, string>> = {
  free: {
    monthly: "",
    yearly: "",
  },
  starter: {
    monthly: "PADDLE_PRICE_STARTER_MONTHLY",
    yearly: "PADDLE_PRICE_STARTER_YEARLY",
  },
  plus: {
    monthly: "PADDLE_PRICE_PLUS_MONTHLY",
    yearly: "PADDLE_PRICE_PLUS_YEARLY",
  },
  professional: {
    monthly: "PADDLE_PRICE_PROFESSIONAL_99_MONTHLY",
    yearly: "PADDLE_PRICE_PROFESSIONAL_99_YEARLY",
  },
  professional_149: {
    monthly: "PADDLE_PRICE_PROFESSIONAL_149_MONTHLY",
    yearly: "PADDLE_PRICE_PROFESSIONAL_149_YEARLY",
  },
  professional_199: {
    monthly: "PADDLE_PRICE_PROFESSIONAL_199_MONTHLY",
    yearly: "PADDLE_PRICE_PROFESSIONAL_199_YEARLY",
  },
};

function getPaddleApiBase() {
  return process.env.PADDLE_ENV === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

function getPaddleApiKey() {
  const rawApiKey = process.env.PADDLE_API_KEY?.trim();
  if (!rawApiKey) return null;

  const apiKey = rawApiKey
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();

  if (!/^pdl_(sdbx|live)_apikey_/.test(apiKey)) {
    throw new Error(
      "PADDLE_API_KEY formati hatali. Deger tam olarak pdl_sdbx_apikey_... veya pdl_live_apikey_... ile baslamali; basina Bearer yazilmamali.",
    );
  }

  return apiKey;
}

export function getPaddlePriceId(planKey: BillingPlanKey, cycle: BillingCycle) {
  const envName = PADDLE_PRICE_ENV[planKey]?.[cycle];
  if (!envName) return null;
  return process.env[envName]?.trim() || null;
}

export function getPlanKeyByPaddlePriceId(priceId: string | null | undefined) {
  const normalizedPriceId = String(priceId ?? "").trim();
  if (!normalizedPriceId) return null;

  for (const [planKey, cycles] of Object.entries(PADDLE_PRICE_ENV)) {
    for (const envName of Object.values(cycles)) {
      if (envName && process.env[envName]?.trim() === normalizedPriceId) {
        return planKey as BillingPlanKey;
      }
    }
  }

  return null;
}

/** Webhook'larda custom_data eksik olabiliyor; fiyat ID'si env ile eslestiyse periyot kesinlesir */
export function getBillingCycleByPaddlePriceId(priceId: string | null | undefined): BillingCycle | null {
  const normalized = String(priceId ?? "").trim();
  if (!normalized) return null;

  for (const cycles of Object.values(PADDLE_PRICE_ENV)) {
    const m = cycles.monthly?.trim();
    const y = cycles.yearly?.trim();
    if (!m || !y) continue;
    if (process.env[m]?.trim() === normalized) return "monthly";
    if (process.env[y]?.trim() === normalized) return "yearly";
  }

  return null;
}

export async function createPaddleCheckoutTransaction({
  priceId,
  userId,
  organizationId,
  planKey,
  cycle,
  customerEmail,
  checkoutUrl,
}: {
  priceId: string;
  userId: string;
  organizationId: string;
  planKey: BillingPlanKey;
  cycle: BillingCycle;
  customerEmail?: string | null;
  checkoutUrl: string;
}) {
  const apiKey = getPaddleApiKey();
  if (!apiKey) {
    throw new Error("PADDLE_API_KEY tanimli degil.");
  }

  const response = await fetch(`${getPaddleApiBase()}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [{ price_id: priceId, quantity: 1 }],
      collection_mode: "automatic",
      enable_checkout: true,
      customer: customerEmail ? { email: customerEmail } : undefined,
      custom_data: {
        user_id: userId,
        organization_id: organizationId,
        plan_key: planKey,
        billing_cycle: cycle,
        app: "risknova",
      },
      checkout: {
        url: checkoutUrl,
      },
    }),
  });

  const data = (await response.json().catch(() => null)) as PaddleTransactionResponse | null;

  if (!response.ok) {
    throw new Error(
      data?.error?.detail ||
        data?.error?.message ||
        `Paddle checkout olusturulamadi (${response.status}).`,
    );
  }

  const returnedCheckoutUrl = data?.data?.checkout?.url;
  if (!returnedCheckoutUrl) {
    throw new Error("Paddle checkout URL donmedi.");
  }

  return {
    transactionId: data?.data?.id ?? null,
    checkoutUrl: returnedCheckoutUrl,
  };
}

function parseSignatureHeader(header: string) {
  const parts = Object.fromEntries(
    header.split(";").map((part) => {
      const [key, ...value] = part.split("=");
      return [key?.trim(), value.join("=").trim()];
    }),
  );

  return {
    timestamp: parts.ts,
    signatures: Object.entries(parts)
      .filter(([key]) => key === "h1")
      .map(([, value]) => value)
      .filter(Boolean),
  };
}

export function verifyPaddleWebhookSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) return false;

  const { timestamp, signatures } = parseSignatureHeader(signatureHeader);
  if (!timestamp || signatures.length === 0) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (ageSeconds > 5 * 60) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}:${rawBody}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return signatures.some((signature) => {
    try {
      const signatureBuffer = Buffer.from(signature, "hex");
      return (
        signatureBuffer.length === expectedBuffer.length &&
        timingSafeEqual(signatureBuffer, expectedBuffer)
      );
    } catch {
      return false;
    }
  });
}
