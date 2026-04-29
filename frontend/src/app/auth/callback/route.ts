import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function getSafeNextPath(value: string | null | undefined) {
  if (!value) return null;

  try {
    const decoded = decodeURIComponent(value);
    return decoded.startsWith("/") && !decoded.startsWith("//") ? decoded : null;
  } catch {
    return value.startsWith("/") && !value.startsWith("//") ? value : null;
  }
}

function redirectAndClearOauthNext(url: string) {
  const response = NextResponse.redirect(url);
  response.cookies.set("risknova-oauth-next", "", {
    maxAge: 0,
    path: "/",
  });
  return response;
}

/**
 * OAuth providers may still return to /auth/callback when that URL is the only
 * allow-listed redirect in Supabase. The actual PKCE exchange is intentionally
 * handled in the browser at /auth/session-recover, where the verifier exists.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  const next =
    getSafeNextPath(searchParams.get("next")) ??
    getSafeNextPath(cookieStore.get("risknova-oauth-next")?.value) ??
    "/dashboard";

  if (code) {
    const recoverUrl = new URL("/auth/session-recover", origin);
    recoverUrl.searchParams.set("code", code);
    recoverUrl.searchParams.set("next", next);

    for (const key of ["intent", "accountType", "countryCode", "languageCode", "roleKey"]) {
      const value = searchParams.get(key);
      if (value) {
        recoverUrl.searchParams.set(key, value);
      }
    }

    return redirectAndClearOauthNext(recoverUrl.toString());
  }

  return redirectAndClearOauthNext(
    `${origin}/login?error=${encodeURIComponent("Giris sirasinda bir hata olustu. Lutfen tekrar deneyin.")}`,
  );
}
