/**
 * Merges generated documentCatalog + subcategory arrays into messages/en.json and tr.json.
 * Run from frontend/: node scripts/merge-isg-library-catalog-into-messages.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "..", "messages");

const subcategoriesEn = {
  education: [
    "Basic OHS training",
    "Professional training",
    "Emergency training",
    "Refresher training",
  ],
  assessment: ["Exams", "Surveys", "Assessment forms", "Measurement and monitoring"],
  forms: ["Daily checks", "Periodic checks", "Audit forms"],
  emergency: ["Emergency plans", "Evacuation", "Fire", "Drills", "Assembly areas"],
  instructions: [
    "Machine instructions",
    "Workflow instructions",
    "PPE instructions",
    "Field practices",
  ],
};

const subcategoriesTr = {
  education: ["Temel İSG Eğitimi", "Mesleki Eğitim", "Acil Durum Eğitimi", "Yenileme Eğitimleri"],
  assessment: ["Sınavlar", "Anketler", "Değerlendirme Formları", "Ölçme ve İzleme"],
  forms: ["Günlük Kontroller", "Periyodik Kontroller", "Denetim Formları"],
  emergency: ["Acil Durum Planları", "Tahliye", "Yangın", "Tatbikat", "Toplanma Alanları"],
  instructions: ["Makine Talimatları", "İş Akışı Talimatları", "KKD Talimatları", "Saha Uygulamaları"],
};

function mergeLocale(filename, subcategories, catalogPath) {
  const p = path.join(messagesDir, filename);
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  if (!data.isgLibrary) throw new Error(`missing isgLibrary in ${filename}`);
  data.isgLibrary.documentCatalog = catalog.documentCatalog;
  data.isgLibrary.subcategories = subcategories;
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log("updated", filename);
}

const enCatalog = path.join(messagesDir, "_isg-document-catalog-en.generated.json");
const trCatalog = path.join(messagesDir, "_isg-document-catalog-tr.generated.json");

mergeLocale("en.json", subcategoriesEn, enCatalog);
mergeLocale("tr.json", subcategoriesTr, trCatalog);
