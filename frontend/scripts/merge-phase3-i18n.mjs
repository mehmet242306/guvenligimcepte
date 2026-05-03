/**
 * Merges scripts/i18n-packs/phase3/{locale}.json into messages/{locale}.json.
 * Missing locale files fall back to en.json. Prefer `npm run i18n:sync-phase3-packs` first.
 * Run: node scripts/merge-phase3-i18n.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_MESSAGE_LOCALES } from "./i18n-locales.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packDir = path.join(__dirname, "i18n-packs", "phase3");
const messagesDir = path.join(__dirname, "..", "messages");

const enPath = path.join(packDir, "en.json");
const enPack = JSON.parse(fs.readFileSync(enPath, "utf8"));

for (const locale of APP_MESSAGE_LOCALES) {
  const p = path.join(packDir, `${locale}.json`);
  const pack = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : enPack;
  const msgPath = path.join(messagesDir, `${locale}.json`);
  const msg = JSON.parse(fs.readFileSync(msgPath, "utf8"));
  Object.assign(msg, pack);
  fs.writeFileSync(msgPath, `${JSON.stringify(msg, null, 2)}\n`);
}

console.log(
  "phase3 merged:",
  APP_MESSAGE_LOCALES.map((l) => (fs.existsSync(path.join(packDir, `${l}.json`)) ? l : `${l}(en)`)).join(", "),
);
