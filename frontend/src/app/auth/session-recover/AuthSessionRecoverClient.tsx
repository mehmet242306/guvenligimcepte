"use client";

import { useEffect, useState } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getDemoAccessState } from "@/lib/platform-admin/demo-access";
import {
  isPrivilegedAccountSelfServiceLoginBlocked,
  PRIVILEGED_ACCOUNT_LOGIN_BLOCKED_CODE,
} from "@/lib/account/account-routing";

const AUTH_STEP_TIMEOUT_MS = 8000;
const OAUTH_RECOVERY_TIMEOUT_MS = 24000;

function withClientTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = AUTH_STEP_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(
      () => reject(new Error(`timeout_${label}`)),
      timeoutMs,
    );
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  });
}

async function fetchWithClientTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  label: string,
  timeoutMs = AUTH_STEP_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`timeout_${label}`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function toLoginError(message: string | undefined): string {
  if (!message?.trim()) {
    return "Google sign-in could not be completed. Please try again.";
  }
  const m = message.trim().slice(0, 240).replace(/\s+/g, " ");
  const lower = m.toLowerCase();
  if (lower.includes("code verifier") || lower.includes("pkce")) {
    return "Connection key was not found (page refreshed or www/address mismatch). Try Google sign-in again and use a single domain if possible.";
  }
  if (lower.includes("invalid_grant") || lower.includes("already been used")) {
    return "Sign-in link was already used or expired. Please retry from the login page.";
  }
  if (lower.startsWith("timeout_")) {
    return "Google sign-in took too long. Please try again.";
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
    const response = await fetchWithClientTimeout(
      "/api/account/context?lite=1",
      {
        method: "GET",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
      "post_auth_context",
    );
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

/**
 * PKCE: mobilde cookie/localStorage gecikmesi veya detectSessionInUrl ile yarış;
 * kisa bekleme + getSession + tekrarli exchange.
 */
type OAuthPkceResolveResult =
  | { status: "success"; session: Session; user: User }
  | { status: "failure"; message?: string }
  | { status: "aborted" };

async function resolveOAuthSessionAfterRedirect(
  supabase: SupabaseClient,
  authCode: string,
  isCancelled: () => boolean,
): Promise<OAuthPkceResolveResult> {
  await new Promise((r) => setTimeout(r, 120));
  if (isCancelled()) return { status: "aborted" };

  const { data: early } = await withClientTimeout(
    supabase.auth.getSession(),
    "oauth_get_session_early",
  );
  if (
    early.session?.access_token &&
    early.session?.refresh_token &&
    early.session.user
  ) {
    return { status: "success", session: early.session, user: early.session.user };
  }

  const delays = [0, 220, 450, 800];
  let lastErrorMessage: string | undefined;

  for (const ms of delays) {
    if (ms > 0) {
      await new Promise((r) => setTimeout(r, ms));
    }
    if (isCancelled()) return { status: "aborted" };

    const { data: peek } = await withClientTimeout(
      supabase.auth.getSession(),
      "oauth_get_session_peek",
    );
    if (
      peek.session?.access_token &&
      peek.session?.refresh_token &&
      peek.session.user
    ) {
      return { status: "success", session: peek.session, user: peek.session.user };
    }

    const { data, error } = await withClientTimeout(
      supabase.auth.exchangeCodeForSession(authCode),
      "oauth_exchange_code",
    );
    lastErrorMessage = error?.message;

    if (
      !error &&
      data.session?.access_token &&
      data.session?.refresh_token &&
      data.user
    ) {
      return { status: "success", session: data.session, user: data.user };
    }

    const msg = (error?.message ?? "").toLowerCase();
    if (msg.includes("already been used") || msg.includes("invalid_grant")) {
      const { data: existing } = await withClientTimeout(
        supabase.auth.getSession(),
        "oauth_get_existing_session",
      );
      if (
        existing.session?.access_token &&
        existing.session?.refresh_token &&
        existing.session.user
      ) {
        return { status: "success", session: existing.session, user: existing.session.user };
      }
      break;
    }
  }

  if (lastErrorMessage) {
    console.warn("[session-recover] exchangeCodeForSession (after retries):", lastErrorMessage);
  }

  return { status: "failure", message: lastErrorMessage };
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
      if (typeof window !== "undefined") {
        const h = window.location.hostname.toLowerCase();
        if (h === "www.getrisknova.com") {
          const u = new URL(window.location.href);
          u.hostname = "getrisknova.com";
          window.location.replace(u.toString());
          return;
        }
      }

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
      const resolved = await withClientTimeout(
        resolveOAuthSessionAfterRedirect(supabase, trimmedCode, () => cancelled),
        "oauth_session_recover",
        OAUTH_RECOVERY_TIMEOUT_MS,
      );

      if (cancelled) return;
      if (resolved.status === "aborted") return;
      if (resolved.status === "failure") {
        setMessage("Google oturumu tamamlanamadi. Login sayfasina donuluyor...");
        window.setTimeout(() => {
          redirectToLoginWithError(resolved.message ?? "");
        }, 400);
        return;
      }

      const data = { session: resolved.session, user: resolved.user };

      const { error: cookieSessionError } = await withClientTimeout(
        supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }),
        "oauth_set_session",
      );

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
        const { data: gateSession } = await withClientTimeout(
          supabase.auth.getSession(),
          "oauth_gate_session",
        );
        const gateToken =
          gateSession.session?.access_token ?? data.session.access_token;
        if (gateToken) {
          const gateResponse = await fetchWithClientTimeout(
            "/api/account/context?lite=1",
            {
              method: "GET",
              credentials: "include",
              headers: { Authorization: `Bearer ${gateToken}` },
              cache: "no-store",
            },
            "oauth_gate_context",
          );
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
            const releaseRes = await fetchWithClientTimeout(
              "/api/account/release-demo-after-oauth",
              {
                method: "POST",
                credentials: "include",
                headers: {
                  Authorization: `Bearer ${data.session.access_token}`,
                },
              },
              "oauth_release_demo",
            );
            if (!releaseRes.ok && releaseRes.status !== 403) {
              console.warn("[session-recover] release-demo-after-oauth:", releaseRes.status);
            }
          } catch (releaseErr) {
            console.warn("[session-recover] release-demo-after-oauth failed:", releaseErr);
          }
        }
      }

      const { error: syncRefreshError } = await withClientTimeout(
        supabase.auth.refreshSession(),
        "oauth_refresh_session",
      );
      if (syncRefreshError) {
        console.warn("[session-recover] refreshSession:", syncRefreshError.message);
      }

      if (shouldForcePasswordSetup(data.session.user)) {
        if (data.session.user.user_metadata?.must_set_password !== true) {
          try {
            await withClientTimeout(
              supabase.auth.updateUser({
                data: {
                  ...data.session.user.user_metadata,
                  must_set_password: true,
                },
              }),
              "oauth_update_user",
            );
          } catch (metadataError) {
            console.warn("[session-recover] must_set_password metadata update failed:", metadataError);
          }
        }

        setMessage("Google hesabi icin sifre olusturma ekranina yonlendiriliyorsun...");
        window.location.replace("/reset-password?required=1");
        return;
      }

      if (intent === "register") {
        setMessage("Account setup is being completed...");
        const displayName =
          String(
            data.session.user.user_metadata?.full_name ??
              data.session.user.user_metadata?.name ??
              data.session.user.email?.split("@")[0] ??
              "",
          ).trim() || undefined;

        const { data: refreshed } = await withClientTimeout(
          supabase.auth.getSession(),
          "oauth_register_session",
        );
        const bearerToken = refreshed.session?.access_token ?? data.session.access_token;

        try {
          const response = await fetchWithClientTimeout(
            "/api/account/onboarding",
            {
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
            },
            "oauth_account_onboarding",
          );
          const json = await readJsonSafely<{ ok?: boolean; redirectPath?: string; error?: string }>(
            response,
          );

          if (response.ok && json?.ok) {
            const { error: refreshError } = await withClientTimeout(
              supabase.auth.refreshSession(),
              "oauth_refresh_after_onboarding",
            );
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

        const { error: refreshFallbackError } = await withClientTimeout(
          supabase.auth.refreshSession(),
          "oauth_refresh_fallback",
        );
        if (refreshFallbackError) {
          console.warn("[session-recover] refreshSession (fallback):", refreshFallbackError.message);
        }
        window.location.replace("/workspace/onboarding");
        return;
      }

      setMessage("Hesap baglami kontrol ediliyor...");
      const { data: postRefresh } = await withClientTimeout(
        supabase.auth.getSession(),
        "oauth_post_refresh_session",
      );
      const accessToken = postRefresh.session?.access_token ?? data.session.access_token;
      const redirectPath = await resolvePostAuthRedirect(next, accessToken);
      window.location.replace(redirectPath);
    }

    void recoverSession().catch((error) => {
      if (cancelled) return;
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[session-recover] unrecovered OAuth flow error:", message);
      setMessage("Google oturumu tamamlanamadi. Login sayfasina donuluyor...");
      window.setTimeout(() => {
        redirectToLoginWithError(message);
      }, 500);
    });

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
