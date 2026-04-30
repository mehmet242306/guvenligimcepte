import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getDemoAccessState } from "@/lib/platform-admin/demo-access";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/pricing",
];

// Cron / webhook endpoint'leri — kendi header-based auth'larını yapıyorlar
// (örn. x-self-healing-key). Middleware bunları auth gating'den muaf tutmalı,
// yoksa cron user'ı olmadığı için /login'e redirect yiyor ve 307 dönüyor.
const PUBLIC_API_PREFIXES = [
  "/api/health",
  "/api/billing/",
  "/api/self-healing/",
];

const ROUTE_AUTH_API_PATHS = [
  "/api/account/context",
  "/api/account/onboarding",
  "/api/workspaces/onboarding",
];

const CANONICAL_HOST = "getrisknova.com";
const LEGACY_HOSTS = new Set(["getrisknova.vercel.app"]);

export async function updateSession(request: NextRequest) {
  if (LEGACY_HOSTS.has(request.nextUrl.hostname)) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.hostname = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  const pathname = request.nextUrl.pathname;
  const isPublicApiEndpoint = PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
  const isRouteAuthApiEndpoint = ROUTE_AUTH_API_PATHS.includes(pathname);
  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/auth") ||
    isPublicApiEndpoint ||
    isRouteAuthApiEndpoint;
  const hasOAuthCode = request.nextUrl.searchParams.has("code");
  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-"));

  if (
    hasOAuthCode &&
    !pathname.startsWith("/auth/callback") &&
    !pathname.startsWith("/auth/session-recover")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/session-recover";
    return NextResponse.redirect(url, 307);
  }

  if (isPublic && !hasAuthCookie && !hasOAuthCode) {
    return NextResponse.next({
      request,
    });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const providers = Array.isArray(user?.app_metadata?.providers)
    ? (user.app_metadata.providers as unknown[]).map((provider) => String(provider))
    : [];
  const hasOAuthProvider = providers.some((provider) => provider !== "email");
  const mustChangePassword =
    user?.user_metadata?.must_change_password === true && !hasOAuthProvider;
  const demoAccess = getDemoAccessState({
    userMetadata: user?.user_metadata,
    appMetadata: user?.app_metadata,
  });
  const canBypassForcedReset =
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname === "/reset-password";
  const canBypassDemoGuard =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/auth");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && demoAccess.isBlocked && !canBypassDemoGuard) {
    const errorMessage =
      demoAccess.status === "disabled"
        ? "Demo erisimi admin tarafindan engellendi."
        : "Demo erisim suresi doldu. Lutfen yeni demo erisimi isteyin.";

    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        {
          error: errorMessage,
          code: "DEMO_ACCESS_BLOCKED",
        },
        { status: 423 },
      );
    }

    // Süresi dolmuş demo kullanıcısını /login'e atıp hata toast'ı göstermek
    // yerine /register'a yönlendir — teşekkür + CTA banner'ı ile kayıt akışına
    // dönüştür. /register canBypassDemoGuard'a eklendi, yoksa loop olurdu.
    const url = request.nextUrl.clone();
    url.pathname = "/register";
    url.searchParams.set(
      "fromDemo",
      demoAccess.status === "disabled" ? "demo-disabled" : "demo-expired",
    );
    return NextResponse.redirect(url);
  }

  if (user && mustChangePassword && !canBypassForcedReset) {
    const url = request.nextUrl.clone();
    url.pathname = "/reset-password";
    url.searchParams.set("required", "1");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
