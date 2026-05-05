/**
 * Copies `r2dRca` subtree from `i18n-packs/r2drca-locale/<lang>.json` into
 * `r2dRca.locale.<lang>.json` patches for fill-r2drca-from-en.mjs.
 *
 * From frontend/: node scripts/i18n-packs/incidents-hub/sync-r2drca-from-mini-pack.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MINI = path.join(__dirname, "..", "r2drca-locale");

const APP_LOCALES = ["tr", "de", "fr", "es", "ru", "ar", "az", "hi", "id", "ja", "ko", "zh"];

function main() {
  for (const lang of APP_LOCALES) {
    const src = path.join(MINI, `${lang}.json`);
    if (!fs.existsSync(src)) {
      console.warn("skip (missing):", path.relative(process.cwd(), src));
      continue;
    }
    const doc = JSON.parse(fs.readFileSync(src, "utf8"));
    const r2d = doc.r2dRca;
    if (!r2d) {
      console.error("missing r2dRca in", src);
      process.exit(1);
    }
    const out = path.join(__dirname, `r2dRca.locale.${lang}.json`);
    fs.writeFileSync(out, `${JSON.stringify(r2d, null, 2)}\n`);
    console.log("→", path.basename(out));
  }
  console.log("sync-r2drca-from-mini-pack: OK");
}

main();
