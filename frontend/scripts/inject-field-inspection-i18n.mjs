import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const enPath = path.join(__dirname, "fieldInspection-en.fragment.json");
const trPath = path.join(__dirname, "fieldInspection-tr.fragment.json");
const messagesDir = path.join(__dirname, "..", "messages");

const enFrag = JSON.parse(fs.readFileSync(enPath, "utf8"));
const trFrag = JSON.parse(fs.readFileSync(trPath, "utf8"));

for (const locale of ["en", "tr"]) {
  const file = path.join(messagesDir, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  data.fieldInspection = locale === "tr" ? trFrag : enFrag;
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log("injected fieldInspection ->", file);
}
