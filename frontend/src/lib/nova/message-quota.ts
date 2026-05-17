export type NovaMessageQuota = {
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
  percentUsed: number;
};

type AiUsageApiItem = {
  action: string;
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
  percentUsed: number;
};

export async function fetchNovaMessageQuota(): Promise<NovaMessageQuota | null> {
  try {
    const response = await fetch("/api/account/ai-usage", { cache: "no-store" });
    if (!response.ok) return null;

    const payload = (await response.json()) as { items?: AiUsageApiItem[] };
    const item = payload.items?.find((row) => row.action === "nova_message");
    if (!item) return null;

    return {
      used: item.used,
      limit: item.limit,
      remaining: item.remaining,
      unlimited: item.unlimited,
      percentUsed: item.percentUsed,
    };
  } catch {
    return null;
  }
}

export function getNovaQuotaRingPercent(quota: NovaMessageQuota) {
  if (quota.unlimited) return 100;
  if (quota.limit <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((quota.remaining / quota.limit) * 100)));
}

export function getNovaQuotaTone(quota: NovaMessageQuota): "ok" | "warn" | "critical" | "empty" {
  if (quota.unlimited) return "ok";
  if (quota.remaining <= 0) return "empty";
  const ratio = quota.limit > 0 ? quota.remaining / quota.limit : 0;
  if (ratio <= 0.15) return "critical";
  if (ratio <= 0.35) return "warn";
  return "ok";
}
