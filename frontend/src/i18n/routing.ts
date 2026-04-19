/**
 * next-intl shared configuration.
 *
 * Locale selection strategy (Phase 1):
 *   - No URL segment (e.g. /tr/...). Locale is stored in a cookie + localStorage.
 *   - Server components read locale from the cookie via `request.ts`.
 *   - Client components call `useLocale()` / `useTranslations()` like normal.
 *
 * Phase 2 (future): move to `app/[locale]/...` segment routing.
 */

export const locales = [
  "tr",
  "en",
  "ar",
  "ru",
  "de",
  "fr",
  "es",
  "zh",
  "ja",
  "ko",
  "hi",
  "az",
  "id",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "tr";

export const LOCALE_COOKIE = "risknova-locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
