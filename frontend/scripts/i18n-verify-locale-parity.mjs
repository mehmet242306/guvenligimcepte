/**
 * Ensures every messages/*.json locale has the same string leaf keys as en.json.
 * Exits 1 on mismatch (for CI / pre-commit).
 *
 * Usage (from frontend/): node scripts/i18n-verify-locale-parity.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.join(__dirname, "..", "messages");

function flattenStrings(obj, prefix = "") {
  const out = {};
  if (obj === null || typeof obj !== "object") return out;
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      Object.assign(out, flattenStrings(item, `${prefix}[${i}]`));
    });
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[p] = v;
    else Object.assign(out, flattenStrings(v, p));
  }
  return out;
}

function main() {
  const files = fs
    .readdirSync(MESSAGES)
    .filter((f) => f.endsWith(".json") && !f.includes("bundle") && f !== "translations");

  const enPath = path.join(MESSAGES, "en.json");
  if (!fs.existsSync(enPath)) {
    console.error("Missing messages/en.json");
    process.exit(1);
  }
  const enLeaves = flattenStrings(JSON.parse(fs.readFileSync(enPath, "utf8")));
  const enKeys = new Set(Object.keys(enLeaves));

  let failed = false;
  for (const f of files.sort()) {
    if (f === "en.json") continue;
    const loc = f.replace(/\.json$/, "");
    const data = JSON.parse(fs.readFileSync(path.join(MESSAGES, f), "utf8"));
    const leaves = flattenStrings(data);
    const keys = new Set(Object.keys(leaves));

    const missing = [...enKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !enKeys.has(k));

    if (missing.length || extra.length) {
      failed = true;
      console.error(`\n[${loc}] vs en:`);
      if (missing.length) console.error(`  missing (${missing.length}):`, missing.slice(0, 20).join(", "), missing.length > 20 ? "…" : "");
      if (extra.length) console.error(`  extra (${extra.length}):`, extra.slice(0, 20).join(", "), extra.length > 20 ? "…" : "");
    }
  }

  if (failed) {
    console.error("\ni18n-verify-locale-parity: FAILED");
    process.exit(1);
  }
  console.log(`i18n-verify-locale-parity: OK (${enKeys.size} string leaves × ${files.length - 1} locales)`);
}

main();
