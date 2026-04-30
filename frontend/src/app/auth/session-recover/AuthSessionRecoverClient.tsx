"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createOAuthBrowserClient } from "@/lib/supabase/oauth-browser-client";

type AccountContextResponse = {
  ok?: boolean;
  error?: string;
  redirectPath?: string;
  context?: {
    organizationId: string | null;
    accountType: "individual" | "osgb" | "enterprise" | null;
    activeWorkspaceId?: string | null;
    isPlatformAdmin?: boolean;
  };
};

function safeNextPath(value: string | null | undefined) {
  if (!value) return "/dashboard";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

function shouldHonorNext(next: string, data: AccountContextResponse | null) {
  if (!next || next === "/dashboard") return false;
  if (next.startsWith("/login") || next.startsWith("/register") || next.startsWith("/auth")) {
    return false;
  }

  const context = data?.context;
  if (!context?.organizationId || !context.accountType) return false;
  if (context.isPlatformAdmin) return false;
  if (data?.redirectPath === "/workspace/onboarding") return false;

  return true;
}

async function readJsonSafely<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();
  if (!raw.trim() || !contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function resolvePostAuthRedirect(next: string) {
  try {
    const response = await fetch("/api/account/context", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await readJsonSafely<AccountContextResponse>(response);

    if (response.ok && json?.context) {
      if (shouldHonorNext(next, json)) {
        return next;
      }

      return json.redirectPath || "/dashboard";
    }
  } catch (error) {
    console.warn("[session-recover] post auth redirect lookup failed:", error);
  }

  return "/workspace/onboarding";
}

export function AuthSessionRecoverClient({
  code,
  nextPath,
  intent,
  accountType,
  countryCode,
  languageCode,
  roleKey,
}: {
  code: string;
  nextPath?: string;
  intent?: string;
  accountType?: string;
  countryCode?: string;
  languageCode?: string;
  roleKey?: string;
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

      if (intent === "register") {
        setMessage("Hesap kurulumu tamamlanıyor...");
        const displayName =
          String(
            data.session.user.user_metadata?.full_name ??
              data.session.user.user_metadata?.name ??
              data.session.user.email?.split("@")[0] ??
              "",
          ).trim() || undefined;

        try {
          const response = await fetch("/api/account/onboarding", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accountType: accountType === "individual" ? "individual" : "individual",
              displayName,
              countryCode: countryCode || undefined,
              languageCode: languageCode || undefined,
              roleKey: roleKey || undefined,
            }),
          });
          const json = await readJsonSafely<{ ok?: boolean; redirectPath?: string; error?: string }>(
            response,
          );

          if (response.ok && json?.ok) {
            window.location.replace(json.redirectPath || "/workspace/onboarding");
            return;
          }

          console.warn("[session-recover] account onboarding failed:", json?.error);
        } catch (onboardingError) {
          console.warn("[session-recover] account onboarding request failed:", onboardingError);
        }

        window.location.replace("/workspace/onboarding");
        return;
      }

      setMessage("Hesap baglami kontrol ediliyor...");
      const redirectPath = await resolvePostAuthRedirect(next);
      window.location.replace(redirectPath);
    }

    void recoverSession();

    return () => {
      cancelled = true;
    };
  }, [accountType, code, countryCode, intent, languageCode, nextPath, roleKey]);

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
