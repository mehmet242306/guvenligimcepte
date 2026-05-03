/**
 * Recursively fills missing keys in each locale from messages/en.json.
 * Preserves existing translations; only adds branches/strings that are absent.
 *
 * Usage (from frontend/): node scripts/i18n-merge-missing-from-en.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.join(__dirname, "..", "messages");

function deepFill(enNode, locNode) {
  if (enNode === null || typeof enNode !== "object") {
    return locNode !== undefined ? locNode : enNode;
  }
  if (Array.isArray(enNode)) {
    if (!Array.isArray(locNode)) return structuredClone(enNode);
    return enNode.map((item, i) => deepFill(item, locNode[i]));
  }
  const out = locNode !== null && typeof locNode === "object" && !Array.isArray(locNode) ? { ...locNode } : {};
  for (const k of Object.keys(enNode)) {
    if (!(k in out)) {
      out[k] = structuredClone(enNode[k]);
    } else {
      out[k] = deepFill(enNode[k], out[k]);
    }
  }
  return out;
}

function main() {
  const enPath = path.join(MESSAGES, "en.json");
  const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
  const files = fs
    .readdirSync(MESSAGES)
    .filter(
      (f) =>
        f.endsWith(".json") &&
        !f.includes("bundle") &&
        f !== "en.json" &&
        f !== "translations" &&
        !f.startsWith("_"),
    );

  for (const f of files.sort()) {
    const p = path.join(MESSAGES, f);
    const loc = JSON.parse(fs.readFileSync(p, "utf8"));
    const merged = deepFill(en, loc);
    fs.writeFileSync(p, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
    console.log("merged:", f);
  }
}

main();
