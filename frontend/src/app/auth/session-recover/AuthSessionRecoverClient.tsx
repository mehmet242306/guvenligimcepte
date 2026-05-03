"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDemoAccessState } from "@/lib/platform-admin/demo-access";
import {
  isPrivilegedAccountSelfServiceLoginBlocked,
  PRIVILEGED_ACCOUNT_LOGIN_BLOCKED_CODE,
} from "@/lib/account/account-routing";

function toLoginError(message: string | undefined): string {
  if (!message?.trim()) {
    return "Google girisi tamamlanamadi. Lutfen tekrar deneyin.";
  }
  const m = message.trim().slice(0, 240).replace(/\s+/g, " ");
  const lower = m.toLowerCase();
  if (lower.includes("code verifier") || lower.includes("pkce")) {
    return "Baglanti anahtari bulunamadi (sayfa yenilendi veya www / adres uyumsuz). Google ile tekrar deneyin; mumkunse tek bir adres kullanin.";
  }
  if (lower.includes("invalid_grant") || lower.includes("already been used")) {
    return "Giris baglantisi kullanildi veya suresi doldu. Giris sayfasindan tekrar deneyin.";
  }
  return m;
}

function redirectToLoginWithError(errorMessage: string) {
  window.location.replace(`/login?error=${encodeURIComponent(toLoginError(errorMessage))}`);
}

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

async function resolvePostAuthRedirect(next: string, accessToken: string) {
  try {
    const response = await fetch("/api/account/context?lite=1", {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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

function shouldForcePasswordSetup(user: {
  app_metadata?: { providers?: unknown };
  user_metadata?: { must_set_password?: unknown };
}) {
  const providers = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata.providers.map((provider) => String(provider))
    : [];
  const hasOAuthProvider = providers.some((provider) => provider !== "email");
  const hasEmailProvider = providers.includes("email");
  const explicitlySkipped = user.user_metadata?.must_set_password === false;

  return hasOAuthProvider && !hasEmailProvider && !explicitlySkipped;
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
      const supabase = createClient();
      const next = safeNextPath(nextPath);

      const authDebug =
        process.env.NEXT_PUBLIC_AUTH_DEBUG === "1" ||
        process.env.NEXT_PUBLIC_AUTH_DEBUG === "true";
      if (authDebug) {
        console.info("[session-recover] page:", window.location.href, "intent:", intent ?? "login");
      }

      const urlParams = new URLSearchParams(window.location.search);
      const oauthErr = urlParams.get("error_description") || urlParams.get("error");
      if (oauthErr) {
        let human =
          oauthErr === "access_denied"
            ? "Google girisi iptal edildi."
            : oauthErr.replace(/\+/g, " ");
        try {
          human = decodeURIComponent(human);
        } catch {
          /* zaten duz metin */
        }
        redirectToLoginWithError(human);
        return;
      }

      if (!supabase) {
        redirectToLoginWithError("Supabase yapilandirmasi eksik.");
        return;
      }

      if (!code?.trim()) {
        redirectToLoginWithError("");
        return;
      }

      const trimmedCode = code.trim();
      const exchangeResult = await supabase.auth.exchangeCodeForSession(trimmedCode);
      let data = exchangeResult.data;
      let error = exchangeResult.error;

      if (cancelled) return;

      /** OAuth kodu tek kullanimlik; ikinci exchange yapma. Oturum zaten yazildiysa getSession yeter */
      if (error || !data.session?.access_token || !data.session.refresh_token) {
        const { data: existing } = await supabase.auth.getSession();
        if (existing.session?.access_token && existing.session.refresh_token) {
          data = { session: existing.session, user: existing.session.user };
          error = null;
        }
      }

      if (error || !data.session?.access_token || !data.session.refresh_token) {
        console.warn("[session-recover] exchangeCodeForSession:", error?.message);
        setMessage("Google oturumu tamamlanamadi. Login sayfasina donuluyor...");
        window.setTimeout(() => {
          redirectToLoginWithError(error?.message ?? "");
        }, 400);
        return;
      }

      const { error: cookieSessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (cancelled) return;

      if (cookieSessionError) {
        console.warn("[session-recover] setSession:", cookieSessionError.message);
        setMessage("Oturum cookie'leri yazilamadi. Login sayfasina donuluyor...");
        window.setTimeout(() => {
          redirectToLoginWithError(cookieSessionError.message);
        }, 400);
        return;
      }

      if (intent !== "register") {
        const { data: gateSession } = await supabase.auth.getSession();
        const gateToken =
          gateSession.session?.access_token ?? data.session.access_token;
        if (gateToken) {
          const gateResponse = await fetch("/api/account/context?lite=1", {
            method: "GET",
            credentials: "include",
            headers: { Authorization: `Bearer ${gateToken}` },
            cache: "no-store",
          });
          const gateJson = await readJsonSafely<{
            context?: {
              accountType?: "individual" | "osgb" | "enterprise" | null;
              isPlatformAdmin?: boolean;
            };
          }>(gateResponse);
          const gateCtx = gateJson?.context;
          if (
            gateCtx &&
            isPrivilegedAccountSelfServiceLoginBlocked({
              accountType: gateCtx.accountType ?? null,
              isPlatformAdmin: gateCtx.isPlatformAdmin ?? false,
            })
          ) {
            await supabase.auth.signOut();
            redirectToLoginWithError(PRIVILEGED_ACCOUNT_LOGIN_BLOCKED_CODE);
            return;
          }
        }
      }

      if (intent !== "register") {
        const demo = getDemoAccessState({
          userMetadata: data.session.user.user_metadata,
          appMetadata: data.session.user.app_metadata,
        });
        if (demo.status === "expired") {
          try {
            const releaseRes = await fetch("/api/account/release-demo-after-oauth", {
              method: "POST",
              credentials: "include",
              headers: {
                Authorization: `Bearer ${data.session.access_token}`,
              },
            });
            if (!releaseRes.ok && releaseRes.status !== 403) {
              console.warn("[session-recover] release-demo-after-oauth:", releaseRes.status);
            }
          } catch (releaseErr) {
            console.warn("[session-recover] release-demo-after-oauth failed:", releaseErr);
          }
        }
      }

      const { error: syncRefreshError } = await supabase.auth.refreshSession();
      if (syncRefreshError) {
        console.warn("[session-recover] refreshSession:", syncRefreshError.message);
      }

      if (shouldForcePasswordSetup(data.session.user)) {
        if (data.session.user.user_metadata?.must_set_password !== true) {
          try {
            await supabase.auth.updateUser({
              data: {
                ...data.session.user.user_metadata,
                must_set_password: true,
              },
            });
          } catch (metadataError) {
            console.warn("[session-recover] must_set_password metadata update failed:", metadataError);
          }
        }

        setMessage("Google hesabi icin sifre olusturma ekranina yonlendiriliyorsun...");
        window.location.replace("/reset-password?required=1");
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

        const { data: refreshed } = await supabase.auth.getSession();
        const bearerToken = refreshed.session?.access_token ?? data.session.access_token;

        try {
          const response = await fetch("/api/account/onboarding", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${bearerToken}`,
            },
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
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.warn("[session-recover] refreshSession after onboarding:", refreshError.message);
            }
            window.location.replace(json.redirectPath || "/workspace/onboarding");
            return;
          }

          console.warn("[session-recover] account onboarding failed:", json?.error);
        } catch (onboardingError) {
          console.warn("[session-recover] account onboarding request failed:", onboardingError);
        }

        const { error: refreshFallbackError } = await supabase.auth.refreshSession();
        if (refreshFallbackError) {
          console.warn("[session-recover] refreshSession (fallback):", refreshFallbackError.message);
        }
        window.location.replace("/workspace/onboarding");
        return;
      }

      setMessage("Hesap baglami kontrol ediliyor...");
      const { data: postRefresh } = await supabase.auth.getSession();
      const accessToken = postRefresh.session?.access_token ?? data.session.access_token;
      const redirectPath = await resolvePostAuthRedirect(next, accessToken);
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
