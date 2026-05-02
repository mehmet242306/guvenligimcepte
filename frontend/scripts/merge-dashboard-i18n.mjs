import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const overrides = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'dashboard-i18n-overrides.json'), 'utf8'),
);
const messagesDir = path.join(__dirname, '..', 'messages');

for (const [locale, dashboard] of Object.entries(overrides)) {
  const p = path.join(messagesDir, `${locale}.json`);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  j.dashboard = dashboard;
  fs.writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
}
console.log('dashboard merged:', Object.keys(overrides).sort().join(', '));
