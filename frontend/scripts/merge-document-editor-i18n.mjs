/**
 * Merges `scripts/document-editor-i18n/document-editor.{en,tr}.json`
 * into `messages/{locale}.json` as root key `documentEditor`.
 * Non-`tr` locales receive the English pack (parity with en keys).
 *
 * Usage (from frontend/): node scripts/merge-document-editor-i18n.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packDir = path.join(__dirname, "document-editor-i18n");
const messagesDir = path.join(__dirname, "..", "messages");

function flattenKeys(obj, prefix = "") {
  const keys = [];
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return keys;
  for (const k of Object.keys(obj).sort()) {
    const p = prefix ? `${prefix}.${k}` : k;
    keys.push(p);
    keys.push(...flattenKeys(obj[k], p));
  }
  return keys;
}

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
const trPath = path.join(packDir, "document-editor.tr.json");
const docEn = JSON.parse(fs.readFileSync(enPath, "utf8"));
const docTr = JSON.parse(fs.readFileSync(trPath, "utf8"));

const enLeaves = leafKeys(docEn);
const trLeaves = leafKeys(docTr);
const missingInTr = [...enLeaves].filter((k) => !trLeaves.has(k));
const extraInTr = [...trLeaves].filter((k) => !enLeaves.has(k));
if (missingInTr.length || extraInTr.length) {
  console.error("document-editor EN vs TR leaf key mismatch");
  if (missingInTr.length) console.error("missing in TR:", missingInTr.slice(0, 30));
  if (extraInTr.length) console.error("extra in TR:", extraInTr.slice(0, 30));
  process.exit(1);
}

const localeFiles = fs
  .readdirSync(messagesDir)
  .filter((f) => f.endsWith(".json") && !f.includes("bundle") && f !== "translations" && !f.startsWith("_"));

for (const f of localeFiles.sort()) {
  const loc = f.replace(/\.json$/, "");
  const msgPath = path.join(messagesDir, f);
  const messages = JSON.parse(fs.readFileSync(msgPath, "utf8"));
  messages.documentEditor = loc === "tr" ? docTr : docEn;
  fs.writeFileSync(msgPath, `${JSON.stringify(messages, null, 2)}\n`);
}

console.log("documentEditor merged into:", localeFiles.sort().join(", "));
