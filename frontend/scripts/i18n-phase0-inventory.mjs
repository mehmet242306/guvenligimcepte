/**
 * Phase 0 i18n inventory: heuristic scan of ts/tsx for quoted UI-like strings,
 * plus locale JSON comparison vs en.json.
 *
 * Usage (from frontend/): node scripts/i18n-phase0-inventory.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
const MESSAGES = path.join(ROOT, "messages");
const OUT = path.join(ROOT, "..", "docs", "i18n-phase0-inventory.md");

const TURKISH_RE = /[ğüşıöçĞÜŞİÖÇİı]/;

/** Lines clearly not user-facing copy */
const LINE_SKIP =
  /^\s*(?:\/\/|\/\*|\*|\*|import\s|export\s+(?:\{|\*|default|type|const\s+\{)|from\s+['"]|console\.|describe\(|it\(|test\(|expect\(|jest\.|@ts-|eslint-|pragma|use\s+strict)/;

/** Inside quotes: paths, env keys, technical tokens */
function looksTechnical(inner) {
  const s = inner.trim();
  if (s.length < 6) return true;
  if (/^[@/.\-_a-zA-Z0-9{}[\]:/$]+$/.test(s) && !/\s/.test(s)) return true;
  if (/^(rgb|rgba|hsl|#[0-9a-fA-F]{3,8}|flex|grid|inline|block|none|auto|true|false|null|undefined)$/i.test(s))
    return true;
  if (/^[\d.,:%pxremvhvw\s-]+$/.test(s)) return true;
  if (/^[A-Z][A-Z0-9_]{2,}$/.test(s)) return true;
  return false;
}

function extractStringLiterals(line) {
  const results = [];
  const dq = /"([^"\\]|\\.)*"/g;
  const sq = /'([^'\\]|\\.)*'/g;
  let m;
  while ((m = dq.exec(line))) results.push({ quote: '"', raw: m[0], inner: m[0].slice(1, -1) });
  while ((m = sq.exec(line))) results.push({ quote: "'", raw: m[0], inner: m[0].slice(1, -1) });
  return results;
}

function isSuspiciousString(inner) {
  if (looksTechnical(inner)) return false;
  if (!/[a-zA-ZğüşıöçĞÜŞİÖÇİı]/.test(inner)) return false;
  // Likely sentence or label: space or Turkish or length
  if (inner.length >= 24) return true;
  if (/\s/.test(inner) && inner.length >= 10) return true;
  if (TURKISH_RE.test(inner)) return true;
  return false;
}

function walkDir(dir, ext, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walkDir(p, ext, files);
    } else if (name.endsWith(ext)) files.push(p);
  }
  return files;
}

function moduleBucket(relPath) {
  if (relPath.includes(`${path.sep}app${path.sep}`)) {
    if (relPath.includes("(public)")) return "app/(public)";
    if (relPath.includes("(protected)")) return "app/(protected)";
    return "app/other";
  }
  if (relPath.includes(`${path.sep}components${path.sep}`)) return "components";
  if (relPath.includes(`${path.sep}lib${path.sep}`)) return "lib";
  return "src/other";
}

function scanSourceFiles() {
  const tsxFiles = walkDir(SRC, ".tsx");
  const tsFiles = walkDir(SRC, ".ts").filter((f) => !f.endsWith(".d.ts"));

  const byFile = [];
  const byBucket = {};

  for (const file of [...tsxFiles, ...tsFiles]) {
    const rel = path.relative(ROOT, file);
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/);
    let suspicious = 0;
    let turkishLines = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (LINE_SKIP.test(line)) continue;
      if (TURKISH_RE.test(line) && !line.includes("http") && !line.trim().startsWith("*")) {
        turkishLines++;
      }
      const literals = extractStringLiterals(line);
      for (const { inner } of literals) {
        if (isSuspiciousString(inner)) suspicious++;
      }
    }

    if (suspicious > 0 || turkishLines > 0) {
      const bucket = moduleBucket(rel);
      byFile.push({
        rel: rel.replace(/\\/g, "/"),
        bucket,
        suspiciousStrings: suspicious,
        linesWithTurkishChars: turkishLines,
      });
      byBucket[bucket] = byBucket[bucket] || { files: 0, suspicious: 0, turkishLines: 0 };
      byBucket[bucket].files++;
      byBucket[bucket].suspicious += suspicious;
      byBucket[bucket].turkishLines += turkishLines;
    }
  }

  byFile.sort((a, b) => b.suspiciousStrings - a.suspiciousStrings);
  return { byFile, byBucket };
}

/** Flatten JSON leaves: path -> string value (only string leaves) */
function flattenStrings(obj, prefix = "") {
  const out = {};
  if (obj === null || typeof obj !== "object") return out;
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      Object.assign(out, flattenStrings(item, `${prefix}[${i}]`));
    });
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[p] = v;
    else Object.assign(out, flattenStrings(v, p));
  }
  return out;
}

function localeInventory() {
  const enPath = path.join(MESSAGES, "en.json");
  const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
  const enLeaves = flattenStrings(en);
  const enKeys = Object.keys(enLeaves).sort();

  const localeFiles = fs
    .readdirSync(MESSAGES)
    .filter((f) => f.endsWith(".json") && !f.includes("bundle") && f !== "translations");

  const rows = [];

  for (const f of localeFiles.sort()) {
    const loc = f.replace(/\.json$/, "");
    if (loc === "en") {
      rows.push({
        locale: "en",
        bytes: fs.statSync(path.join(MESSAGES, f)).size,
        leafCount: enKeys.length,
        identicalToEn: enKeys.length,
        pctIdenticalToEn: 100,
        note: "source locale",
      });
      continue;
    }
    const data = JSON.parse(fs.readFileSync(path.join(MESSAGES, f), "utf8"));
    const leaves = flattenStrings(data);
    let same = 0;
    let missing = 0;
    for (const k of enKeys) {
      if (!(k in leaves)) {
        missing++;
        continue;
      }
      if (leaves[k] === enLeaves[k]) same++;
    }
    const comparable = enKeys.length - missing;
    const pct = comparable > 0 ? Math.round((same / comparable) * 1000) / 10 : 0;

    let note = "";
    if (loc === "tr") note = "primary translated locale (expect low % match to en)";
    else if (pct >= 95 && comparable > 100) note = "likely EN bootstrap / copy";
    else if (missing > 50) note = `missing ~${missing} keys vs en`;

    rows.push({
      locale: loc,
      bytes: fs.statSync(path.join(MESSAGES, f)).size,
      leafCount: Object.keys(leaves).length,
      identicalToEnOfComparable: same,
      comparableLeafCount: comparable,
      missingKeysVsEn: missing,
      pctIdenticalToEn: pct,
      note,
    });
  }

  return { enLeafCount: enKeys.length, rows };
}

function mdEscape(s) {
  return String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function buildMarkdown(scan, inv) {
  const lines = [];
  lines.push("# Faz 0 — i18n envanter raporu");
  lines.push("");
  lines.push(`Oluşturulma: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Yöntem");
  lines.push("");
  lines.push(
    "- **Kaynak taraması**: `src/**/*.ts(x)` satırlarında çift/tek tırnak stringleri; uzunluk, boşluk, Türkçe karakter ve teknik olmayan token sezgisi ile **şüpheli UI metni** sayısı.",
  );
  lines.push("- **Türkçe satır sayısı**: Satırda `ğüşıöçĞÜŞİÖÇİı` geçmesi (import/log satırları tam ayıklanamaz — yanlış pozitif/negatif olabilir).");
  lines.push("- **Locale**: `messages/*.json` yaprağı (string leaf) yolları `en.json` ile karşılaştırıldı; aynı değer = İngilizce kopya sayılır.");
  lines.push("");
  lines.push("## Özet — modül kovaları (şüpheli string toplamı)");
  lines.push("");
  lines.push("| Kovası | Dosya sayısı | Şüpheli string | Türkçe karakter içeren satır (toplam) |");
  lines.push("|--------|-------------:|---------------:|---------------------------------------:|");
  const bucketOrder = ["app/(public)", "app/(protected)", "app/other", "components", "lib", "src/other"];
  for (const b of bucketOrder) {
    const x = scan.byBucket[b];
    if (!x) continue;
    lines.push(`| ${b} | ${x.files} | ${x.suspicious} | ${x.turkishLines} |`);
  }
  lines.push("");
  lines.push(`**Şüpheli string içeren dosya sayısı**: ${scan.byFile.length}`);
  lines.push("");
  lines.push("## Locale dosyaları (`messages/*.json`)");
  lines.push("");
  lines.push(`**en.json string yaprağı sayısı**: ${inv.enLeafCount}`);
  lines.push("");
  lines.push(
    "| Locale | Dosya boyutu (bayt) | Yaprak sayısı | en ile karşılaştırılabilir yaprak | Eksik anahtar (en’e göre) | Aynı değer (karşılaştırılabilir içinde) | % aynı (en) | Not |",
  );
  lines.push("|--------|--------------------:|--------------:|----------------------------------:|---------------------------:|----------------------------------------:|-------------:|-----|");
  for (const r of inv.rows) {
    if (r.locale === "en") {
      lines.push(
        `| en | ${r.bytes} | ${r.leafCount} | — | — | — | 100 | ${mdEscape(r.note)} |`,
      );
      continue;
    }
    lines.push(
      `| ${r.locale} | ${r.bytes} | ${r.leafCount} | ${r.comparableLeafCount ?? "—"} | ${r.missingKeysVsEn ?? "—"} | ${r.identicalToEnOfComparable ?? "—"} | ${r.pctIdenticalToEn}% | ${mdEscape(r.note || "")} |`,
    );
  }
  lines.push("");
  lines.push("### Yorum");
  lines.push("");
  lines.push("- **tr**: İngilizce ile düşük örtüşme beklenir (gerçek Türkçe çeviri).");
  lines.push("- **de, ar, …**: Çoğu anahtarda metin `en` ile aynıysa dosya **İngilizce bootstrap kopyası** olarak işaretlenmiştir.");
  lines.push("");
  lines.push("## Dosya bazlı checklist (şüpheli string sayısına göre, ilk 120)");
  lines.push("");
  lines.push("| Şüpheli str. | TR satır* | Dosya |");
  lines.push("|-------------:|----------:|-------|");
  for (const row of scan.byFile.slice(0, 120)) {
    lines.push(`| ${row.suspiciousStrings} | ${row.linesWithTurkishChars} | \`${row.rel}\` |`);
  }
  if (scan.byFile.length > 120) {
    lines.push("");
    lines.push(`*… ve ${scan.byFile.length - 120} dosya daha (tam liste için script çıktısını genişletin).*`);
  }
  lines.push("");
  lines.push("\\* *Türkçe satır*: heuristic; string içinde veya yorumda Türkçe geçebilir.*");
  lines.push("");
  lines.push("## Faz 0 tamamlandı");
  lines.push("");
  lines.push("- [x] Kaynak kod sezgisel taraması");
  lines.push("- [x] Kovası özet tablosu");
  lines.push("- [x] Locale vs `en.json` yaprağı karşılaştırması");
  lines.push("");
  lines.push("### Tekrar üret");
  lines.push("");
  lines.push("- Anahtar eşliği + rapor: `npm run i18n:phase0` (`frontend/` içinden).");
  lines.push("- Yalnızca rapor: `npm run i18n:phase0-inventory`.");
  lines.push("- Yalnızca `en` ile tüm locale yaprağı eşliği: `npm run i18n:verify-locale-parity`.");
  lines.push("");
  lines.push(`Rapor dosyası: \`docs/i18n-phase0-inventory.md\` (frontend kökünden bir üst \`docs/\`).`);

  return lines.join("\n");
}

function main() {
  const scan = scanSourceFiles();
  const inv = localeInventory();
  const md = buildMarkdown(scan, inv);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, md, "utf8");
  console.log("Wrote:", OUT);
  console.log("Files with signals:", scan.byFile.length);
  console.log("Buckets:", JSON.stringify(scan.byBucket, null, 2));
}

main();
