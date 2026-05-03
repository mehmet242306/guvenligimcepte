/**
 * Merges `scripts/document-editor-i18n/document-editor.<locale>.json` packs
 * into `messages/{locale}.json` as root key `documentEditor`.
 *
 * - `document-editor.en.json` is the canonical key tree (reference strings).
 * - Optional `document-editor.<locale>.json` packs (tr, de, ar, …) must match
 *   the same string leaf keys as English; any `messages/{locale}.json` without
 *   a pack falls back to English.
 *
 * Usage (from frontend/): node scripts/merge-document-editor-i18n.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packDir = path.join(__dirname, "document-editor-i18n");
const messagesDir = path.join(__dirname, "..", "messages");

function leafKeys(obj, prefix = "") {
  const out = new Set();
  if (obj === null || typeof obj !== "object") {
    if (prefix) out.add(prefix);
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      for (const x of leafKeys(item, `${prefix}[${i}]`)) out.add(x);
    });
    return out;
  }
  const ks = Object.keys(obj);
  if (ks.length === 0 && prefix) out.add(prefix);
  for (const k of ks) {
    const p = prefix ? `${prefix}.${k}` : k;
    const v = obj[k];
    if (typeof v === "string") out.add(p);
    else Object.assign(out, leafKeys(v, p));
  }
  return out;
}

const enPath = path.join(packDir, "document-editor.en.json");
if (!fs.existsSync(enPath)) {
  console.error("Missing", enPath);
  process.exit(1);
}
const docEn = JSON.parse(fs.readFileSync(enPath, "utf8"));
const enLeaves = leafKeys(docEn);

/** @type {Record<string, object>} */
const localePacks = {};
const packFiles = fs.readdirSync(packDir).filter((f) => /^document-editor\.[a-z]{2}\.json$/.test(f));
for (const f of packFiles) {
  const loc = /^document-editor\.([a-z]{2})\.json$/.exec(f)[1];
  if (loc === "en") continue;
  const data = JSON.parse(fs.readFileSync(path.join(packDir, f), "utf8"));
  const locLeaves = leafKeys(data);
  const missing = [...enLeaves].filter((k) => !locLeaves.has(k));
  const extra = [...locLeaves].filter((k) => !enLeaves.has(k));
  if (missing.length || extra.length) {
    console.error(`document-editor EN vs ${loc} leaf key mismatch`);
    if (missing.length) console.error("  missing:", missing.slice(0, 25).join(", "), missing.length > 25 ? "…" : "");
    if (extra.length) console.error("  extra:", extra.slice(0, 25).join(", "), extra.length > 25 ? "…" : "");
    process.exit(1);
  }
  localePacks[loc] = data;
}

const localeFiles = fs
  .readdirSync(messagesDir)
  .filter((f) => f.endsWith(".json") && !f.includes("bundle") && f !== "translations" && !f.startsWith("_"));

for (const file of localeFiles.sort()) {
  const loc = file.replace(/\.json$/, "");
  const msgPath = path.join(messagesDir, file);
  const messages = JSON.parse(fs.readFileSync(msgPath, "utf8"));
  messages.documentEditor = localePacks[loc] || docEn;
  fs.writeFileSync(msgPath, `${JSON.stringify(messages, null, 2)}\n`);
}

console.log(
  "documentEditor merged. Locale packs:",
  Object.keys(localePacks).sort().join(", ") || "(none, all EN)",
);
