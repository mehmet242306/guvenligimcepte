/**
 * Deep-merges en.json `r2dRca` into each locale file so new keys get English fallbacks
 * and locale-specific overrides (e.g. ru, tr) win.
 *
 * From frontend/: node scripts/i18n-packs/incidents-hub/fill-r2drca-from-en.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = __dirname;

function deepMerge(a, b) {
  if (b == null || typeof b !== "object" || Array.isArray(b)) return a;
  if (a == null || typeof a !== "object" || Array.isArray(a)) return { ...b };
  const out = { ...a };
  for (const k of Object.keys(b)) {
    const av = a[k];
    const bv = b[k];
    if (
      bv != null &&
      typeof bv === "object" &&
      !Array.isArray(bv) &&
      av != null &&
      typeof av === "object" &&
      !Array.isArray(av)
    ) {
      out[k] = deepMerge(av, bv);
    } else if (bv !== undefined) {
      out[k] = bv;
    }
  }
  return out;
}

const enPath = path.join(DIR, "en.json");
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const enR2d = en.r2dRca;
if (!enR2d) {
  console.error("fill-r2drca-from-en: en.json missing r2dRca");
  process.exit(1);
}

for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith(".json") || f === "en.json") continue;
  /** Patch fragments — not hub locale packs; merging en into them corrupts the tree. */
  if (f.startsWith("r2dRca.locale.")) continue;
  const p = path.join(DIR, f);
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.r2dRca = deepMerge(enR2d, data.r2dRca ?? {});
  if (data.r2dRca?.r2dRca) delete data.r2dRca.r2dRca;
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
}

function stripAccidentalNestedR2dRca(patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return patch;
  const { r2dRca: _accidental, ...rest } = patch;
  return rest;
}

const localePatches = [
  ["ar.json", "r2dRca.locale.ar.json"],
  ["az.json", "r2dRca.locale.az.json"],
  ["de.json", "r2dRca.locale.de.json"],
  ["es.json", "r2dRca.locale.es.json"],
  ["fr.json", "r2dRca.locale.fr.json"],
  ["hi.json", "r2dRca.locale.hi.json"],
  ["id.json", "r2dRca.locale.id.json"],
  ["ja.json", "r2dRca.locale.ja.json"],
  ["ko.json", "r2dRca.locale.ko.json"],
  ["ru.json", "r2dRca.locale.ru.json"],
  ["tr.json", "r2dRca.locale.tr.json"],
  ["zh.json", "r2dRca.locale.zh.json"],
];
for (const [packFile, patchFile] of localePatches) {
  const patchPath = path.join(DIR, patchFile);
  if (!fs.existsSync(patchPath)) continue;
  const p = path.join(DIR, packFile);
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  const patch = stripAccidentalNestedR2dRca(JSON.parse(fs.readFileSync(patchPath, "utf8")));
  data.r2dRca = deepMerge(data.r2dRca, patch);
  if (data.r2dRca?.r2dRca) delete data.r2dRca.r2dRca;
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
}

console.log("fill-r2drca-from-en: OK");
