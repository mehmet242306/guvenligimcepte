/**
 * Dijital Ikiz modulu - test surecinde kisitli erisim.
 * Acik: platform/super admin (useIsAdmin) veya allowlist e-postasi.
 */

const DEFAULT_ALLOWLIST_EMAIL = "mehmetyildirim2923@gmail.com";

export function getDigitalTwinAllowlistEmail(): string {
  const fromEnv = process.env.NEXT_PUBLIC_DIGITAL_TWIN_ALLOWLIST_EMAIL?.trim().toLowerCase();
  return fromEnv || DEFAULT_ALLOWLIST_EMAIL;
}

export function isDigitalTwinEmailAllowlisted(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === getDigitalTwinAllowlistEmail();
}

export function canAccessDigitalTwinSync(params: {
  isAdmin: boolean;
  userEmail: string | null | undefined;
}): boolean {
  return params.isAdmin || isDigitalTwinEmailAllowlisted(params.userEmail);
}
