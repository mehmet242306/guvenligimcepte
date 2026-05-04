/**
 * Firma çalışma alanı (companyWorkspace) metinleri birçok dilde İngilizce kalmıştı.
 * Bu script, risk.pageTitle hâlâ İngilizce stub olan locale dosyalarına tr.json'daki
 * companyWorkspace ağacını kopyalar (tam Türkçe içerik).
 *
 * Çalıştır: node scripts/sync-company-workspace-from-tr.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "..", "messages");
const EN_STUB_TITLE = "Risk and field management";

const tr = JSON.parse(fs.readFileSync(path.join(messagesDir, "tr.json"), "utf8"));
const source = tr.companyWorkspace;
if (!source) {
  console.error("tr.json: companyWorkspace bulunamadı");
  process.exit(1);
}

const targets = ["es", "az", "ar", "ru", "ja", "ko", "hi", "id", "zh"];

for (const loc of targets) {
  const file = path.join(messagesDir, `${loc}.json`);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const current = data.companyWorkspace?.risk?.pageTitle;
  if (current !== EN_STUB_TITLE) {
    console.log(`skip ${loc}.json (risk.pageTitle=${JSON.stringify(current)})`);
    continue;
  }
  data.companyWorkspace = JSON.parse(JSON.stringify(source));
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log("updated companyWorkspace <- tr:", file);
}
