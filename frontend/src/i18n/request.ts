import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { messagesByLocale } from "./messages-map";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./routing";

/**
 * Phase 2 (protected-shell bootstrap) — complete:
 * `npm run i18n:phase2-bootstrap-locales` copies from `messages/en.json` into the 11 non-tr
 * bootstrap locales: `common.languagePickerAria`, `activeCompanyBar`, `consentGate`,
 * `auth.loginPage.privilegedLoginBlocked`. Re-run after changing those keys in `en.json`.
 * Full-message parity is checked with `npm run i18n:verify-locale-parity`.
 * Further locale polish is iterative (module-by-module translations beyond this bootstrap).
 *
 * Phase 3 (workspace / companies / OSGB strings): JSON packs in `scripts/i18n-packs/phase3/`.
 * `npm run i18n:translate-phase3:resume` fills non-en locales via AI (Anthropic/OpenAI); then
 * `npm run i18n:merge-phase3` → `messages/*.json`. `npm run i18n:phase3` = sync EN clones + merge + parity.
 * `tr.json` there is the Turkish source (sync skips overwriting tr).
 *
 * Full `messages/*.json` (all namespaces): `npm run i18n:translate-messages` rewrites
 * ar/ru/de/fr/es/zh/ja/ko/hi/az/id from `en.json` via the same AI translator (long run).
 * `i18n:translate-messages:resume` skips locales that already differ from en; add `--force` to redo.
 * `tr` stays the Turkish JSON; `en` is the source. Then `npm run i18n:verify-locale-parity`.
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

export default getRequestConfig(async () => {
  const locale = await readLocaleFromRequest();
  return {
    locale,
    timeZone: "Europe/Istanbul",
    messages: messagesByLocale[locale],
  };
});
