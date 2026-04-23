type HeaderSource = {
  get(name: string): string | null;
};

function normalizeOrigin(candidate: string | null | undefined): string | null {
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function isLocalOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    process.env.VERCEL_ENV === "production"
  );
}

function getConfiguredOrigin(): string | null {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL?.trim());
  if (configured && (!isProductionRuntime() || !isLocalOrigin(configured))) {
    return configured;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return normalizeOrigin(`https://${vercelUrl}`);
  }

  return null;
}

function buildOriginFromHeaders(headers: HeaderSource): string | null {
  const directOrigin = normalizeOrigin(headers.get("origin"));
  if (directOrigin) return directOrigin;

  const forwardedHost = headers.get("x-forwarded-host");
  const forwardedProto = headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    const forwardedOrigin = normalizeOrigin(`${forwardedProto}://${forwardedHost}`);
    if (forwardedOrigin) return forwardedOrigin;
  }

  const host = headers.get("host");
  if (host) {
    const protocol = isProductionRuntime() ? "https" : "http";
    const hostOrigin = normalizeOrigin(`${protocol}://${host}`);
    if (hostOrigin) return hostOrigin;
  }

  return null;
}

function selectBestOrigin(candidates: Array<string | null>): string {
  for (const candidate of candidates) {
    const normalized = normalizeOrigin(candidate);
    if (!normalized) continue;

    if (isProductionRuntime() && isLocalOrigin(normalized)) {
      continue;
    }

    return normalized;
  }

  if (!isProductionRuntime()) {
    return "http://localhost:3000";
  }

  return "https://getrisknova.com";
}

export function resolveAppOriginFromHeaders(headers: HeaderSource): string {
  return selectBestOrigin([buildOriginFromHeaders(headers), getConfiguredOrigin()]);
}

export function resolveAppOriginFromRequest(request: Request): string {
  let requestOrigin: string | null = null;

  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    requestOrigin = null;
  }

  return selectBestOrigin([
    requestOrigin,
    buildOriginFromHeaders(request.headers),
    getConfiguredOrigin(),
  ]);
}
