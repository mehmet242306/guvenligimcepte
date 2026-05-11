import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAuthCookieOptions } from "@/lib/supabase/supabase-auth-cookie-options";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/privacy",
  "/support",
  "/delete-account",
  "/terms",
  "/refund-policy",
  // PWA: SW/manifest must be same-origin 200 — redirects break registration (SecurityError).
  "/sw.js",
  "/manifest.webmanifest",
];

// Cron / webhook endpoint'leri — kendi header-based auth'larını yapıyorlar
// (örn. x-self-healing-key). Middleware bunları auth gating'den muaf tutmalı,
// yoksa cron user'ı olmadığı için /login'e redirect yiyor ve 307 dönüyor.
const PUBLIC_API_PREFIXES = [
  "/api/health",
  "/api/site-visits",
  "/api/billing/",
  "/api/self-healing/",
];

const ROUTE_AUTH_API_PATHS = [
  "/api/account/context",
  "/api/account/onboarding",
  "/api/workspaces/onboarding",
];

function isAccountOsgbAffiliationsApi(pathname: string) {
  return pathname === "/api/account/osgb-affiliations" || pathname.startsWith("/api/account/osgb-affiliations/");
}

const CANONICAL_HOST = "getrisknova.com";
const LEGACY_HOSTS = new Set(["getrisknova.vercel.app"]);
const MIDDLEWARE_AUTH_TIMEOUT_MS = 2500;

const COOKIE_AGNOSTIC_PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/privacy",
  "/privacy-policy",
  "/support",
  "/cookie-policy",
  "/delete-account",
  "/terms",
  "/terms-and-conditions",
  "/refund-policy",
]);

async function withMiddlewareTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = MIDDLEWARE_AUTH_TIMEOUT_MS,
): Promise<T | null> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<null>((resolve) => {
    timeoutHandle = setTimeout(() => {
      console.warn(`[middleware] ${label} timed out after ${timeoutMs}ms`);
      resolve(null);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[middleware] ${label} failed: ${message}`);
    return null;
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export async function updateSession(request: NextRequest) {
  if (LEGACY_HOSTS.has(request.nextUrl.hostname)) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.hostname = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  const pathname = request.nextUrl.pathname;

  // www → apex (tum yollar, /auth dahil). Callback www'de kalinca PKCE code_verifier
  // apex localStorage'da kalir → exchangeCodeForSession "code verifier" hatasi verir.
  if (request.nextUrl.hostname.toLowerCase() === `www.${CANONICAL_HOST}`) {
    const url = request.nextUrl.clone();
    url.hostname = CANONICAL_HOST;
    return NextResponse.redirect(url, 308);
  }
  const isPublicApiEndpoint = PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
  const isRouteAuthApiEndpoint =
    ROUTE_AUTH_API_PATHS.includes(pathname) || isAccountOsgbAffiliationsApi(pathname);
  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/cozumler/") ||
    pathname.startsWith("/survey/") ||
    isPublicApiEndpoint ||
    isRouteAuthApiEndpoint;
  const hasOAuthCode = request.nextUrl.searchParams.has("code");
  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-"));

  if (
    hasOAuthCode &&
    pathname !== "/reset-password" &&
    !pathname.startsWith("/auth/callback") &&
    !pathname.startsWith("/auth/session-recover")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/session-recover";
    return NextResponse.redirect(url, 307);
  }

  if (COOKIE_AGNOSTIC_PUBLIC_PATHS.has(pathname) && !hasOAuthCode) {
    return NextResponse.next({
      request,
    });
  }

  if (isPublic && !hasAuthCookie && !hasOAuthCode) {
    return NextResponse.next({
      request,
    });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    console.warn("[middleware] Supabase public env vars are missing");

    if (isPublic) {
      return supabaseResponse;
    }

    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "Authentication service unavailable.", code: "AUTH_CONFIG_MISSING" },
        { status: 503 },
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "Authentication service unavailable.");
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookieOptions: supabaseAuthCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const userResponse = await withMiddlewareTimeout(
    supabase.auth.getUser(),
    "supabase.auth.getUser",
  );

  if (!userResponse) {
    if (isPublic) {
      return supabaseResponse;
    }

    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "Authentication service timed out.", code: "AUTH_TIMEOUT" },
        { status: 503 },
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "Authentication service timed out. Please try again.");
    return NextResponse.redirect(url);
  }

  const {
    data: { user },
  } = userResponse;

  const providers = Array.isArray(user?.app_metadata?.providers)
    ? (user.app_metadata.providers as unknown[]).map((provider) => String(provider))
    : [];
  const hasOAuthProvider = providers.some((provider) => provider !== "email");
  const mustSetPassword = user?.user_metadata?.must_set_password === true;
  const mustChangePassword =
    user?.user_metadata?.must_change_password === true && !hasOAuthProvider;
  const canBypassForcedReset =
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname === "/reset-password";

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && mustChangePassword && !canBypassForcedReset) {
    const url = request.nextUrl.clone();
    url.pathname = "/reset-password";
    url.searchParams.set("required", "1");
    return NextResponse.redirect(url);
  }

  if (user && mustSetPassword && !canBypassForcedReset) {
    const url = request.nextUrl.clone();
    url.pathname = "/reset-password";
    url.searchParams.set("required", "1");
    return NextResponse.redirect(url);
  }

  if (user && (!isPublic || isRouteAuthApiEndpoint)) {
    const mfaResponse = await withMiddlewareTimeout(
      Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]),
      "supabase.auth.mfa",
    );

    if (!mfaResponse) {
      return supabaseResponse;
    }

    const [{ data: assuranceData, error: assuranceError }, { data: factorData, error: factorError }] = mfaResponse;
    const verifiedFactors = [
      ...(factorData?.totp ?? []),
      ...(factorData?.phone ?? []),
      ...(factorData?.webauthn ?? []),
    ].filter((factor) => factor.status === "verified");
    const hasVerifiedMfaFactor = verifiedFactors.length > 0;
    const mustCompleteMfa =
      hasVerifiedMfaFactor || assuranceData?.nextLevel === "aal2";
    const cannotConfirmAal = !!assuranceError && !!factorError;

    if ((mustCompleteMfa && assuranceData?.currentLevel !== "aal2") || (hasVerifiedMfaFactor && cannotConfirmAal)) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          {
            error: "MFA verification required.",
            code: "MFA_REQUIRED",
          },
          { status: 403 },
        );
      }

      const url = request.nextUrl.clone();
      const next = `${pathname}${request.nextUrl.search}`;
      url.pathname = "/auth/mfa-challenge";
      url.search = "";
      url.searchParams.set("next", next);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
