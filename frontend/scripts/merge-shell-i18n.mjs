import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packDir = path.join(__dirname, "shell-i18n");
const messagesDir = path.join(__dirname, "..", "messages");

const en = JSON.parse(fs.readFileSync(path.join(messagesDir, "en.json"), "utf8"));
const enNavKeys = Object.keys(en.nav).sort();

for (const file of fs.readdirSync(packDir).filter((f) => f.endsWith(".json"))) {
  const locale = path.basename(file, ".json");
  const pack = JSON.parse(fs.readFileSync(path.join(packDir, file), "utf8"));
  const navKeys = Object.keys(pack.nav).sort();
  if (JSON.stringify(navKeys) !== JSON.stringify(enNavKeys)) {
    console.error("nav key mismatch", locale, "expected", enNavKeys.length, "got", navKeys.length);
    process.exit(1);
  }
  const headerKeys = Object.keys(pack.header).sort();
  const enHeaderKeys = Object.keys(en.header).sort();
  if (JSON.stringify(headerKeys) !== JSON.stringify(enHeaderKeys)) {
    console.error("header key mismatch", locale);
    process.exit(1);
  }
  const msgPath = path.join(messagesDir, `${locale}.json`);
  const j = JSON.parse(fs.readFileSync(msgPath, "utf8"));
  j.nav = pack.nav;
  j.header = pack.header;
  fs.writeFileSync(msgPath, `${JSON.stringify(j, null, 2)}\n`);
}
console.log("shell-i18n merged:", fs.readdirSync(packDir).filter((f) => f.endsWith(".json")).sort().join(", "));
