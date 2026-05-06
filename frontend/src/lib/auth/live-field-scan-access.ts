/**
 * Canlı saha taraması — geliştirme sürecinde kısıtlı erişim.
 * Açık: platform/süper admin (useIsAdmin) veya allowlist e-postası.
 */

const DEFAULT_ALLOWLIST_EMAIL = "mehmetyildirim2923@gmail.com";

export function getLiveFieldScanAllowlistEmail(): string {
  const fromEnv = process.env.NEXT_PUBLIC_LIVE_FIELD_SCAN_ALLOWLIST_EMAIL?.trim().toLowerCase();
  return fromEnv || DEFAULT_ALLOWLIST_EMAIL;
}

export function isLiveFieldScanEmailAllowlisted(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === getLiveFieldScanAllowlistEmail();
}

export function canAccessLiveFieldScanSync(params: {
  isAdmin: boolean;
  userEmail: string | null | undefined;
}): boolean {
  return params.isAdmin || isLiveFieldScanEmailAllowlisted(params.userEmail);
}
