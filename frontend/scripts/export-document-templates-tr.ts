/**
 * Writes Turkish source JSON for all document templates (TipTap bodies).
 * Used by `translate-document-templates.mjs` to build locale bundles.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exportAllTemplatesAsRecord } from "../src/lib/document-templates-p1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "document-templates");
const outFile = path.join(outDir, "tr-source.json");

async function main() {
  const data = await exportAllTemplatesAsRecord();
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(data));
  console.log("Wrote", outFile, "keys:", Object.keys(data).length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
