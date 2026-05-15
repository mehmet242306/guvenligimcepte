/**
 * Sync critical TR laws (6331, 4857, 5510) via sync-mevzuat edge function.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env or frontend/.env.local
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(path.join(root, "frontend", ".env.local"));
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const docNumbers = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["6331", "4857", "5510"];

const endpoint = `${url.replace(/\/$/, "")}/functions/v1/sync-mevzuat`;

console.log("Syncing laws:", docNumbers.join(", "));

const res = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    apikey: key,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ action: "sync_by_doc_numbers", doc_numbers: docNumbers }),
});

const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  console.error("Non-JSON response:", text.slice(0, 500));
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));
process.exit(res.ok && data.success !== false ? 0 : 1);
