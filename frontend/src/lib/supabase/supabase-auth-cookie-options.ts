import type { CookieOptionsWithName } from "@supabase/ssr";

const isProd = process.env.NODE_ENV === "production";

/**
 * createBrowserClient ile createServerClient ayni secenekleri kullanmali (@supabase/ssr).
 * Mobil tarayicilarda PKCE parcaciklari icin path/sameSite/secure tutarli olmalı.
 */
export const supabaseAuthCookieOptions: CookieOptionsWithName = {
  path: "/",
  sameSite: "lax",
  secure: isProd,
  maxAge: 60 * 60 * 24 * 7,
};
