/**
 * Copies Phase 2 protected-shell strings from en.json into bootstrap locales (non-tr).
 * Run from frontend/: node scripts/i18n-phase2-sync-bootstrap-locales.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.join(__dirname, "..", "messages");
const BOOTSTRAP = ["ar", "az", "de", "es", "fr", "hi", "id", "ja", "ko", "ru", "zh"];

function main() {
  const en = JSON.parse(fs.readFileSync(path.join(MESSAGES, "en.json"), "utf8"));

  for (const loc of BOOTSTRAP) {
    const p = path.join(MESSAGES, `${loc}.json`);
    const data = JSON.parse(fs.readFileSync(p, "utf8"));

    data.common = data.common || {};
    data.common.languagePickerAria = en.common.languagePickerAria;

    data.activeCompanyBar = structuredClone(en.activeCompanyBar);
    data.consentGate = structuredClone(en.consentGate);

    data.auth = data.auth || {};
    data.auth.loginPage = data.auth.loginPage || {};
    data.auth.loginPage.privilegedLoginBlocked = en.auth.loginPage.privilegedLoginBlocked;

    fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log("patched:", loc);
  }
}

main();
