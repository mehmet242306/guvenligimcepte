"use client";

import { useEffect, useState } from "react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/routing";
import { messagesByLocale } from "@/i18n/messages-map";

function readCookieLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const safe = LOCALE_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = document.cookie.match(new RegExp(`(?:^|; )${safe}=([^;]*)`));
  const raw = m?.[1] ? decodeURIComponent(m[1]) : "";
  return isLocale(raw) ? raw : defaultLocale;
}

function GlobalErrorInner({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors.global");

  useEffect(() => {
    const message = error.message?.trim() || t("unknownClientError");
    void fetch("/api/admin-observability/error-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: "critical",
        source: "next.global_error",
        message,
        stackTrace: error.stack ?? null,
        requestId: error.digest ?? null,
        endpoint: typeof window !== "undefined" ? window.location.pathname : null,
        context: {
          digest: error.digest ?? null,
          href: typeof window !== "undefined" ? window.location.href : null,
        },
      }),
    }).catch(() => undefined);
  }, [error, t]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
          {t("eyebrow")}
        </div>
        <h1 className="mt-4 text-3xl font-semibold">{t("title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("description")}</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          {t("retry")}
        </button>
      </div>
    </main>
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale] = useState<Locale>(() =>
    typeof document !== "undefined" ? readCookieLocale() : defaultLocale,
  );
  const messages = messagesByLocale[locale] ?? messagesByLocale[defaultLocale];

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Istanbul">
          <GlobalErrorInner error={error} reset={reset} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
