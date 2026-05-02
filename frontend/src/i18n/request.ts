import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./routing";

/**
 * Phase 2 status (2026-04-25):
 *   - tr/en: native translations
 *   - ar/ru/de/fr/es/zh/ja/ko/hi/az/id: bootstrapped from en.json, awaiting
 *     professional translation. Replace each file with a real translation
 *     as it ships.
 */

function parseAcceptLanguage(accept: string | null): Locale | null {
  if (!accept) return null;
  const parts = accept
    .split(",")
    .map((raw) => {
      const [langPart, ...params] = raw.trim().split(";");
      const lang = langPart?.trim().toLowerCase().split("-")[0] ?? "";
      let q = 1;
      for (const p of params) {
        const [k, v] = p.trim().split("=");
        if (k === "q" && v) {
          const n = Number.parseFloat(v);
          if (!Number.isNaN(n)) q = n;
        }
      }
      return { lang, q };
    })
    .filter((p) => p.lang.length > 0)
    .sort((a, b) => b.q - a.q);

  for (const { lang } of parts) {
    if (isLocale(lang)) return lang;
  }
  return null;
}

/** ISO 3166-1 alpha-2 (Vercel: x-vercel-ip-country, Cloudflare: cf-ipcountry). */
function localeFromCountryCode(code: string | null | undefined): Locale | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  const map: Record<string, Locale> = {
    TR: "tr",
    DE: "de",
    AT: "de",
    CH: "de",
    FR: "fr",
    BE: "fr",
    ES: "es",
    MX: "es",
    AR: "es",
    CO: "es",
    GB: "en",
    UK: "en",
    US: "en",
    CA: "en",
    AU: "en",
    NZ: "en",
    IE: "en",
    IN: "hi",
    SA: "ar",
    AE: "ar",
    EG: "ar",
    QA: "ar",
    KW: "ar",
    BH: "ar",
    OM: "ar",
    JO: "ar",
    IQ: "ar",
    RU: "ru",
    BY: "ru",
    KZ: "ru",
    JP: "ja",
    KR: "ko",
    CN: "zh",
    TW: "zh",
    HK: "zh",
    SG: "en",
    AZ: "az",
    ID: "id",
    NL: "en",
    SE: "en",
    NO: "en",
    DK: "en",
    FI: "en",
    PL: "en",
    PT: "en",
    BR: "en",
    IT: "en",
    GR: "en",
    CZ: "en",
    RO: "en",
    HU: "en",
  };
  return map[c] ?? null;
}

async function readLocaleFromRequest(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  const headerStore = await headers();
  const fromAccept = parseAcceptLanguage(headerStore.get("accept-language"));
  if (fromAccept) return fromAccept;

  const country =
    headerStore.get("x-vercel-ip-country") ?? headerStore.get("cf-ipcountry") ?? null;
  const fromGeo = localeFromCountryCode(country);
  if (fromGeo) return fromGeo;

  return defaultLocale;
}

async function loadMessages(locale: Locale) {
  return (await import(`../../messages/${locale}.json`)).default;
}

export default getRequestConfig(async () => {
  const locale = await readLocaleFromRequest();
  return {
    locale,
    timeZone: "Europe/Istanbul",
    messages: await loadMessages(locale),
  };
});
