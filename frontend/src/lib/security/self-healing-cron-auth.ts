import type { NextRequest } from "next/server";

/** GitHub Actions / internal cron: `x-self-healing-key` must match `SELF_HEALING_CRON_SECRET`. */
export function isSelfHealingCronAuthorized(request: NextRequest): boolean {
  const configuredSecret = process.env.SELF_HEALING_CRON_SECRET?.trim();
  if (!configuredSecret) return false;
  return request.headers.get("x-self-healing-key")?.trim() === configuredSecret;
}
