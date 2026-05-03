/**
 * Copies Phase 1 public-surface keys from en.json into bootstrap locales (non-tr).
 * Run after editing en.json: node scripts/i18n-phase1-sync-bootstrap-locales.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.join(__dirname, "..", "messages");

const BOOTSTRAP_LOCALES = ["ar", "az", "de", "es", "fr", "hi", "id", "ja", "ko", "ru", "zh"];

function main() {
  const enPath = path.join(MESSAGES, "en.json");
  const en = JSON.parse(fs.readFileSync(enPath, "utf8"));

  const paths = {
    landingFooterCookie: ["landing", "footerCookie"],
    legalCookiePolicy: ["legal", "cookiePolicy"],
    resetExtras: [
      "preparingSession",
      "errPrepareSession",
      "errInvalidResetLink",
      "errSessionRefresh",
    ],
    registerLegal: [
      "legalCheckboxTerms",
      "legalCheckboxAfterTerms",
      "legalCheckboxPrivacy",
      "legalCheckboxAfterPrivacy",
      "legalCheckboxCookie",
      "legalCheckboxAfterCookie",
    ],
  };

  for (const loc of BOOTSTRAP_LOCALES) {
    const p = path.join(MESSAGES, `${loc}.json`);
    const data = JSON.parse(fs.readFileSync(p, "utf8"));

    data.landing = data.landing || {};
    data.landing.footerCookie = en.landing.footerCookie;

    data.legal = data.legal || {};
    data.legal.cookiePolicy = structuredClone(en.legal.cookiePolicy);

    data.auth = data.auth || {};
    data.auth.resetPage = data.auth.resetPage || {};
    for (const k of paths.resetExtras) {
      data.auth.resetPage[k] = en.auth.resetPage[k];
    }

    data.auth.registerPage = data.auth.registerPage || {};
    for (const k of paths.registerLegal) {
      data.auth.registerPage[k] = en.auth.registerPage[k];
    }

    fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log("patched:", loc);
  }
}

main();
