// Merges i18n-packs/company-workspace-extensions into messages/*/companyWorkspace.
// All locales: fill missing keys from en.json. tr.json: overwrite with tr.json.
// Usage (from frontend/): node scripts/merge-company-workspace-extensions.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.join(__dirname, "..", "messages");
const PACK = path.join(__dirname, "i18n-packs", "company-workspace-extensions");

function deepFill(enNode, locNode) {
  if (enNode === null || typeof enNode !== "object") {
    return locNode !== undefined ? locNode : enNode;
  }
  if (Array.isArray(enNode)) {
    if (!Array.isArray(locNode)) return structuredClone(enNode);
    return enNode.map((item, i) => deepFill(item, locNode[i]));
  }
  const out =
    locNode !== null && typeof locNode === "object" && !Array.isArray(locNode) ? { ...locNode } : {};
  for (const k of Object.keys(enNode)) {
    if (!(k in out)) {
      out[k] = structuredClone(enNode[k]);
    } else {
      out[k] = deepFill(enNode[k], out[k]);
    }
  }
  return out;
}

function deepOverwrite(patch, target) {
  for (const [k, v] of Object.entries(patch)) {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== "object" || Array.isArray(target[k])) {
        target[k] = {};
      }
      deepOverwrite(v, target[k]);
    } else {
      target[k] = v;
    }
  }
}

function main() {
  const fragEn = JSON.parse(fs.readFileSync(path.join(PACK, "en.json"), "utf8"));
  const fragTr = JSON.parse(fs.readFileSync(path.join(PACK, "tr.json"), "utf8"));

  const files = fs
    .readdirSync(MESSAGES)
    .filter(
      (f) =>
        f.endsWith(".json") &&
        !f.includes("bundle") &&
        !f.startsWith("_") &&
        f !== "translations",
    );

  for (const f of files.sort()) {
    const p = path.join(MESSAGES, f);
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!data.companyWorkspace || typeof data.companyWorkspace !== "object") {
      console.warn("skip (no companyWorkspace):", f);
      continue;
    }
    data.companyWorkspace = deepFill(fragEn, data.companyWorkspace);
    if (f === "tr.json") {
      deepOverwrite(fragTr, data.companyWorkspace);
    }
    fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log("merged extensions:", f);
  }
}

main();
