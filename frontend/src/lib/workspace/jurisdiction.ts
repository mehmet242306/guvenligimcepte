/**
 * Workspace country_code (ISO 3166-1 alpha-2) drives which Turkey-specific
 * product surfaces are shown. RAG corpus uses the same codes plus GLOBAL.
 */

const TR_CODE = "TR";

/** Paths hidden from nav (and gated at route level) when workspace is not Turkey. */
export const TURKEY_ONLY_NAV_PATH_PREFIXES = ["/documents", "/account/osgb-affiliations"] as const;

/** Extra paths for OSGB manager shell (Turkey regulatory / commercial flows). */
export const OSGB_TURKEY_ONLY_EXTRA_PREFIXES = ["/osgb/contracts", "/cozumler/osgb"] as const;

export function normalizeCountryCode(code: string | null | undefined): string | null {
  if (code == null || typeof code !== "string") return null;
  const trimmed = code.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function isTurkeyWorkspace(code: string | null | undefined): boolean {
  return normalizeCountryCode(code) === TR_CODE;
}

function pathMatchesPrefix(path: string, prefix: string): boolean {
  if (path === prefix) return true;
  return path.startsWith(`${prefix}/`);
}

export function isTurkeyOnlyNavHref(
  href: string,
  mode: "standard" | "osgb",
): boolean {
  const pathOnly = (href.split("?")[0] ?? href).split("#")[0] ?? href;
  const path = pathOnly.toLowerCase();

  for (const prefix of TURKEY_ONLY_NAV_PATH_PREFIXES) {
    const p = prefix.toLowerCase();
    if (pathMatchesPrefix(path, p)) return true;
  }

  if (mode === "osgb") {
    for (const prefix of OSGB_TURKEY_ONLY_EXTRA_PREFIXES) {
      const p = prefix.toLowerCase();
      if (pathMatchesPrefix(path, p)) return true;
    }
  }

  return false;
}

export function filterNavItemsForJurisdiction<T extends { href: string }>(
  items: readonly T[],
  workspaceCountryCode: string | null,
  mode: "standard" | "osgb",
): T[] {
  if (workspaceCountryCode === null) return [...items];
  if (isTurkeyWorkspace(workspaceCountryCode)) return [...items];
  return items.filter((item) => !isTurkeyOnlyNavHref(item.href, mode));
}
