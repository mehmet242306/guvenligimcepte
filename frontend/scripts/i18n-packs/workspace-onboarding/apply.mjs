/**
 * Merges translated workspaceOnboarding fragments into messages/<locale>.json.
 * Run from frontend/: node scripts/i18n-packs/workspace-onboarding/apply.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.join(__dirname, "..", "..", "..", "messages");

const LOCALES = ["ar", "az", "de", "es", "fr", "hi", "id", "ja", "ko", "ru", "zh"];

function main() {
  for (const loc of LOCALES) {
    const fragPath = path.join(__dirname, `${loc}.json`);
    const msgPath = path.join(MESSAGES, `${loc}.json`);
    if (!fs.existsSync(fragPath)) {
      console.error("missing fragment:", fragPath);
      process.exit(1);
    }
    const ws = JSON.parse(fs.readFileSync(fragPath, "utf8"));
    const data = JSON.parse(fs.readFileSync(msgPath, "utf8"));
    data.workspaceOnboarding = ws;
    fs.writeFileSync(msgPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log("patched workspaceOnboarding:", loc);
  }
  console.log("done");
}

main();
