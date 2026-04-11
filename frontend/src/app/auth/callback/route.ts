import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { registerSession } from "@/lib/session-tracker";

/**
 * OAuth Callback Route
 * Supabase OAuth provider'larından dönen code parametresini session'a çevirir.
 * Google, Apple, LinkedIn, Facebook redirect'leri buraya gelir.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session && data.user) {
      // Register session (max 1 web + 1 mobile)
      const h = await headers();
      const ua = h.get("user-agent") ?? "";
      const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
      await registerSession(supabase, data.user.id, data.session.access_token, ua, ip);

      return NextResponse.redirect(`${origin}${next}`);
    }

    if (error) {
      console.warn("[auth/callback] exchangeCodeForSession error:", error.message);
    }
  }

  // Hata durumunda login sayfasına yönlendir
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.")}`);
}
