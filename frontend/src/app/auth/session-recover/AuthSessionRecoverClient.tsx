"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createOAuthBrowserClient } from "@/lib/supabase/oauth-browser-client";

function safeNextPath(value: string | null | undefined) {
  if (!value) return "/dashboard";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export function AuthSessionRecoverClient({
  code,
  nextPath,
}: {
  code: string;
  nextPath?: string;
}) {
  const [message, setMessage] = useState("Giris oturumu tamamlaniyor...");

  useEffect(() => {
    let cancelled = false;

    async function recoverSession() {
      const oauthSupabase = createOAuthBrowserClient();
      const appSupabase = createClient();
      const next = safeNextPath(nextPath);

      if (!code || !oauthSupabase || !appSupabase) {
        window.location.replace(
          `/login?error=${encodeURIComponent("Giris oturumu tamamlanamadi. Lutfen tekrar deneyin.")}`,
        );
        return;
      }

      const { data, error } = await oauthSupabase.auth.exchangeCodeForSession(code);

      if (cancelled) return;

      if (error || !data.session?.access_token || !data.session.refresh_token) {
        setMessage("Google oturumu tamamlanamadi. Login sayfasina donuluyor...");
        window.setTimeout(() => {
          window.location.replace(
            `/login?error=${encodeURIComponent("Google girisi tamamlanamadi. Lutfen tekrar deneyin.")}`,
          );
        }, 900);
        return;
      }

      const { error: cookieSessionError } = await appSupabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (cancelled) return;

      if (cookieSessionError) {
        setMessage("Oturum cookie'leri yazilamadi. Login sayfasina donuluyor...");
        window.setTimeout(() => {
          window.location.replace(
            `/login?error=${encodeURIComponent("Oturum tamamlanamadi. Lutfen tekrar deneyin.")}`,
          );
        }, 900);
        return;
      }

      window.location.replace(next);
    }

    void recoverSession();

    return () => {
      cancelled = true;
    };
  }, [code, nextPath]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--shadow-soft)]">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <h1 className="text-xl font-semibold text-foreground">Google girisi</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}
