import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const enPath = path.join(__dirname, "..", "messages", "en.json");
const chunkPath = path.join(__dirname, "accessibility-chunk-en.json");

const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const chunk = JSON.parse(fs.readFileSync(chunkPath, "utf8"));
en.accessibility = chunk;
fs.writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`);
console.log("merged accessibility into en.json");
