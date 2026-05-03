/**
 * Writes scripts/i18n-packs/phase3/{locale}.json from en.json for every locale except tr.
 * Preserves tr.json (Turkish source). Run before merge when adding locales or refreshing EN copies.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_MESSAGE_LOCALES } from "./i18n-locales.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packDir = path.join(__dirname, "i18n-packs", "phase3");
const enPath = path.join(packDir, "en.json");

const enPack = JSON.parse(fs.readFileSync(enPath, "utf8"));

const written = [];
for (const loc of APP_MESSAGE_LOCALES) {
  if (loc === "tr") continue;
  const outPath = path.join(packDir, `${loc}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(enPack, null, 2)}\n`);
  written.push(loc);
}

console.log("phase3 packs synced from en.json (" + written.length + "):", written.join(", "));
console.log("unchanged: tr.json");
