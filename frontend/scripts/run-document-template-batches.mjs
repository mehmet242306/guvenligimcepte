/**
 * Runs translate-document-templates.mjs in slices of `--batch-size` (default 5)
 * over all template ids in tr-source.json, until done.
 *
 * Run from repo (long): cd frontend && node scripts/run-document-template-batches.mjs
 * Optional: --batch-size=10 --locale=en  (single locale smoke)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const trSourcePath = path.join(__dirname, "document-templates", "tr-source.json");

function parseBatchSize() {
  const raw = process.argv.find((a) => a.startsWith("--batch-size="));
  if (!raw) return 5;
  const n = Number(raw.slice("--batch-size=".length));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

function parseLocalePassthrough() {
  const raw = process.argv.find((a) => a.startsWith("--locale="));
  return raw ? [raw] : [];
}

const batchSize = parseBatchSize();
const localeArgs = parseLocalePassthrough();

const trAll = JSON.parse(fs.readFileSync(trSourcePath, "utf8"));
const sorted = Object.keys(trAll).sort();
const total = sorted.length;

for (let offset = 0; offset < total; offset += batchSize) {
  const count = Math.min(batchSize, total - offset);
  const args = [
    path.join(__dirname, "translate-document-templates.mjs"),
    `--offset=${offset}`,
    `--count=${count}`,
    ...localeArgs,
  ];
  console.log(`\n>>> Batch offset=${offset} count=${count} (${sorted[offset]} … ${sorted[offset + count - 1]})\n`);
  const r = spawnSync(process.execPath, args, {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(`Stopped at offset=${offset} exit=${r.status}`);
    process.exit(r.status ?? 1);
  }
}

console.log("\nDone. All", total, "templates processed in batches of", batchSize);
