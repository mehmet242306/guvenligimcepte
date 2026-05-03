import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { DOCUMENT_GROUPS } from "../src/lib/document-groups";

const __dirname = dirname(fileURLToPath(import.meta.url));

const groups: Record<string, { title: string; items: Record<string, string> }> = {};
for (const g of DOCUMENT_GROUPS) {
  const items: Record<string, string> = {};
  for (const it of g.items) {
    items[it.id] = it.title;
  }
  groups[g.key] = { title: g.title, items };
}

const out = { documentCatalog: { groups } };
const dest = join(__dirname, "..", "messages", "_isg-document-catalog-tr.generated.json");
writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log("wrote", dest);
