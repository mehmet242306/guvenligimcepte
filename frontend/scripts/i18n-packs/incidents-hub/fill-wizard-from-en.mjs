/**
 * Merges incidents-hub locale files with en.json wizard keys:
 * { ...en.wizard, ...locale.wizard } so existing locale strings win
 * and any new keys fall back to English.
 *
 * Run from frontend/: node scripts/i18n-packs/incidents-hub/fill-wizard-from-en.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = __dirname;
const en = JSON.parse(fs.readFileSync(path.join(DIR, "en.json"), "utf8"));
const enWizard = en.wizard;

for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith(".json") || f === "en.json") continue;
  const p = path.join(DIR, f);
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.wizard = { ...enWizard, ...data.wizard };
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
}

console.log("fill-wizard-from-en: OK");
