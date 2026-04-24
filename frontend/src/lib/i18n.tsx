"use client";

/**
 * Phase 1 shim: this module used to hold a custom React Context + a
 * hand-written message dictionary. We have moved to `next-intl` and the real
 * messages now live in `frontend/messages/*.json`.
 *
 * `useI18n()` / `useTranslation()` continue to work so existing call-sites
 * (protected-shell, public-header, language-selector, chat-widget,
 * training, reporting, etc.) do not need to be touched in a single pass.
 *
 * New code should prefer `useTranslations()` / `useLocale()` from `next-intl`.
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale as useNextLocale, useTranslations as useNextTranslations } from "next-intl";
import { LOCALE_COOKIE, locales as supportedLocales, type Locale } from "@/i18n/routing";

export type { Locale };
export const SUPPORTED_LOCALES = supportedLocales;

/** Legacy storage key kept for backwards compatibility with older clients. */
const LEGACY_STORAGE_KEY = "risknova-locale";

function persistLocale(locale: Locale) {
  if (typeof document === "undefined") return;

  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  const attrs = [
    `${LOCALE_COOKIE}=${locale}`,
    "path=/",
    `max-age=${60 * 60 * 24 * 365}`,
    "samesite=lax",
    secure ? "secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
  document.cookie = attrs;

  try {
    window.localStorage.setItem(LEGACY_STORAGE_KEY, locale);
  } catch {
    // localStorage can throw in private mode - safe to ignore.
  }
}

/**
 * Kept as a pass-through component for callers that still render
 * <I18nProvider>. The real i18n provider is now NextIntlClientProvider,
 * mounted once in `components/providers.tsx`.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useI18n() {
  const locale = useNextLocale() as Locale;
  const tNext = useNextTranslations();
  const router = useRouter();

  const setLocale = useCallback(
    (next: Locale) => {
      persistLocale(next);
      router.refresh();
    },
    [router],
  );

  const t = useCallback(
    (key: string): string => {
      try {
        return tNext(key);
      } catch {
        return key;
      }
    },
    [tNext],
  );

  return { locale, setLocale, t };
}

export function useTranslation() {
  const { t, locale } = useI18n();
  return { t, locale };
}
