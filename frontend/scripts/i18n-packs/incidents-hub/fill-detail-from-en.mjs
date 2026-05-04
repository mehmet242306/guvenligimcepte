/**
 * Merges detail keys from en.json into other locale packs:
 * { ...en.detail, ...locale.detail }
 *
 * Run from frontend/: node scripts/i18n-packs/incidents-hub/fill-detail-from-en.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = __dirname;
const en = JSON.parse(fs.readFileSync(path.join(DIR, "en.json"), "utf8"));
const enDetail = en.detail;
if (!enDetail) {
  console.error("en.json missing detail");
  process.exit(1);
}

for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith(".json") || f === "en.json") continue;
  const p = path.join(DIR, f);
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.detail = { ...enDetail, ...data.detail };
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
}

console.log("fill-detail-from-en: OK");
