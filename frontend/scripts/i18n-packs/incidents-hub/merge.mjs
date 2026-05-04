/**
 * Merges incidents-hub/<locale>.json into messages/<locale>.json under `incidents`.
 * From frontend/: node scripts/i18n-packs/incidents-hub/merge.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.join(__dirname, "..", "..", "..", "messages");
const LOCALES = ["en", "tr", "de", "fr", "es", "ru", "ar", "az", "hi", "id", "ja", "ko", "zh"];

function main() {
  for (const loc of LOCALES) {
    const fragPath = path.join(__dirname, `${loc}.json`);
    const msgPath = path.join(MESSAGES, `${loc}.json`);
    const patch = JSON.parse(fs.readFileSync(fragPath, "utf8"));
    const data = JSON.parse(fs.readFileSync(msgPath, "utf8"));
    data.incidents = { ...data.incidents, ...patch };
    fs.writeFileSync(msgPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log("merged incidents hub/rca:", loc);
  }
  console.log("done");
}

main();
