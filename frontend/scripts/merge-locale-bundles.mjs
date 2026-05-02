/**
 * Merges `messages/translations/bundle.<locale>.json` into `messages/<locale>.json`
 * (updates `landing` and `demoRequest`). Run after editing bundle files:
 *   node scripts/merge-locale-bundles.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "../messages");
const transDir = path.join(messagesDir, "translations");

const locales = ["de", "fr", "es", "ar", "ru", "zh", "ja", "ko", "hi", "az", "id"];

for (const loc of locales) {
  const bundlePath = path.join(transDir, `bundle.${loc}.json`);
  if (!fs.existsSync(bundlePath)) {
    console.warn(`skip ${loc}: missing ${bundlePath}`);
    continue;
  }
  const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
  const mainPath = path.join(messagesDir, `${loc}.json`);
  const data = JSON.parse(fs.readFileSync(mainPath, "utf8"));
  if (bundle.landing) data.landing = bundle.landing;
  if (bundle.demoRequest) data.demoRequest = bundle.demoRequest;
  if (bundle.commonHome && typeof bundle.commonHome === "object") {
    data.common = data.common || {};
    Object.assign(data.common, bundle.commonHome);
  }
  if (bundle.navHome && typeof bundle.navHome === "object") {
    data.nav = data.nav || {};
    Object.assign(data.nav, bundle.navHome);
  }
  fs.writeFileSync(mainPath, JSON.stringify(data, null, 2) + "\n");
  console.log(`merged bundle.${loc}.json → ${loc}.json`);
}
