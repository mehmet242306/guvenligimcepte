"use client";

import { useState } from "react";
import type { Provider } from "@supabase/supabase-js";
import { createOAuthBrowserClient } from "@/lib/supabase/oauth-browser-client";

function normalizeHost(host: string) {
  return host.replace(/^www\./i, "").toLowerCase();
}

/**
 * OAuth PKCE code_verifier tarayicida origin bazli saklanir.
 * Sayfa www ile acilip redirect NEXT_PUBLIC_APP_URL (apex) ise kod okunamaz → mobilde "Google girisi tamamlanamadi".
 * Ayni kayitli alan adi (www/apex) ise her zaman mevcut origin kullanilir.
 */
function resolveOAuthOrigin() {
  const { hostname, origin } = window.location;
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ?? "";

  try {
    if (configured && !configured.endsWith(".vercel.app")) {
      const configuredHost = new URL(configured).hostname;
      if (normalizeHost(hostname) === normalizeHost(configuredHost)) {
        return origin;
      }
    }
  } catch {
    /* NEXT_PUBLIC_APP_URL gecersiz */
  }

  if (
    (hostname === "localhost" || hostname === "127.0.0.1") &&
    configured &&
    !configured.endsWith(".vercel.app")
  ) {
    return configured;
  }

  return configured && !configured.endsWith(".vercel.app") ? configured : origin;
}

/* ── SVG Icons ── */
function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

/* ── Main Component ── */
type SocialLoginProps = {
  mode?: "login" | "register";
  nextPath?: string;
};

export function SocialLoginButtons({ mode = "login", nextPath }: SocialLoginProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleOAuth(provider: Provider) {
    const supabase = createOAuthBrowserClient();
    if (!supabase) {
      setError("Supabase bağlantısı kurulamadı.");
      return;
    }

    setLoading(provider);
    setError("");

    const callbackUrl = new URL("/auth/session-recover", resolveOAuthOrigin());

    if (mode === "login" && nextPath?.startsWith("/")) {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `risknova-oauth-next=${encodeURIComponent(
        nextPath,
      )}; Path=/; Max-Age=600; SameSite=Lax${secure}`;
    }

    if (mode === "register") {
      try {
        const rawContext = window.localStorage.getItem("risknova-register-context");
        const context = rawContext ? JSON.parse(rawContext) as Record<string, unknown> : {};
        callbackUrl.searchParams.set("intent", "register");
        ["accountType", "countryCode", "languageCode", "roleKey"].forEach((key) => {
          const value = context[key];
          if (typeof value === "string" && value.trim()) {
            callbackUrl.searchParams.set(key, value.trim());
          }
        });
      } catch (contextError) {
        console.warn("[social-login] register context unavailable:", contextError);
      }
    }

    const authDebug =
      process.env.NEXT_PUBLIC_AUTH_DEBUG === "1" ||
      process.env.NEXT_PUBLIC_AUTH_DEBUG === "true";
    if (authDebug) {
      console.info("[social-login] redirectTo:", callbackUrl.toString(), "mode:", mode);
    }

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl.toString(),
        queryParams:
          provider === "google"
            ? { access_type: "offline", prompt: "consent" }
            : undefined,
      },
    });

    if (oauthError) {
      console.warn("[social-login] OAuth error:", oauthError.message);
      const rawMessage = oauthError.message.toLowerCase();
      const redirectMessage =
        rawMessage.includes("redirect") || rawMessage.includes("not allowed")
          ? "Google girisi icin Supabase redirect adresi eksik. Supabase Authentication URL ayarlarina https://getrisknova.com/auth/callback eklenmeli."
          : "Giris sirasinda bir hata olustu. Lutfen tekrar deneyin.";
      setError(redirectMessage);
      setLoading(null);
      return;
    }
  }

  const brandName = (process.env.NEXT_PUBLIC_BRAND_NAME || "RiskNova").trim() || "RiskNova";
  const googleLabel =
    mode === "register"
      ? `Google ile ${brandName}'ya kayıt ol`
      : `Google ile ${brandName}'ya devam et`;

  const providers = [
    {
      id: "google" as Provider,
      label: googleLabel,
      Icon: GoogleIcon,
      cls: "border-border bg-card hover:bg-secondary text-foreground",
    },
  ];

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-2.5">
        {providers.map(({ id, label, Icon, cls }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleOAuth(id)}
            disabled={loading !== null}
            className={`inline-flex h-11 min-h-[44px] w-full items-center justify-center gap-2.5 rounded-xl border px-4 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto ${cls}`}
          >
            {loading === id ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            ) : (
              <Icon />
            )}
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* Ayraç */}
      <div className="relative flex items-center py-1">
        <div className="flex-1 border-t border-border" />
        <span className="mx-4 text-xs font-medium text-muted-foreground">veya e-posta ile</span>
        <div className="flex-1 border-t border-border" />
      </div>
    </div>
  );
}
