/**
 * Translates `scripts/document-templates/tr-source.json` (Turkish) into locale bundles:
 * `src/lib/document-template-locales/bundles/{locale}.json`
 *
 * Requires OPENAI_* or ANTHROPIC_* (same env discovery as translate-risk-scoring-packs.mjs).
 *
 * Usage:
 *   node scripts/translate-document-templates.mjs
 *   node scripts/translate-document-templates.mjs --locale=en,de
 *   node scripts/translate-document-templates.mjs --limit=5
 *   node scripts/translate-document-templates.mjs --offset=0 --count=5
 *   (same as --limit=5 when offset=0) next slice: --offset=5 --count=5
 *   node scripts/translate-document-templates.mjs --template-id=hekim-ilac-takip
 *
 * After: npm run typecheck
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import { jsonrepair } from "jsonrepair";
import { APP_MESSAGE_LOCALES } from "./i18n-locales.mjs";

const OPENAI_KEY_NAMES = ["OPENAI_API_KEY", "OPENAI_KEY", "AI_OPENAI_API_KEY", "RISKNOVA_OPENAI_API_KEY"];
const ANTHROPIC_KEY_NAMES = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_KEY",
  "AI_ANTHROPIC_API_KEY",
  "CLAUDE_API_KEY",
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const repoRootDir = path.join(rootDir, "..");
const trSourcePath = path.join(__dirname, "document-templates", "tr-source.json");
const bundlesDir = path.join(rootDir, "src", "lib", "document-template-locales", "bundles");

const OPENAI_MODEL = process.env.OPENAI_DOC_TEMPLATES_MODEL || "gpt-4o-mini";
const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_DOC_TEMPLATES_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
/** Larger batches = fewer API round-trips per template (default was 12 → ~48 calls; 22 → ~26). */
const BATCH_SIZE = Number(process.env.DOC_TEMPLATES_I18N_BATCH || "22");

const LOCALE_NAMES = {
  en: "English",
  ar: "Arabic",
  ru: "Russian",
  de: "German",
  fr: "French",
  es: "Spanish (neutral/international)",
  zh: "Simplified Chinese (简体字)",
  ja: "Japanese (です・ます)",
  ko: "Korean (polite, concise)",
  hi: "Hindi (Devanagari)",
  az: "Azerbaijani (Latin)",
  id: "Indonesian",
};

for (const envPath of [
  path.join(repoRootDir, ".env.local"),
  path.join(repoRootDir, ".env"),
  path.join(rootDir, ".env.local"),
  path.join(rootDir, ".env"),
]) {
  dotenv.config({ path: envPath, override: true });
}

function readFirstEnv(names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return { key: value, name };
  }
  return null;
}

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

function setDeepAtPath(root, pathKey, value) {
  const segs = pathKey.split(".");
  let cur = root;
  for (let d = 0; d < segs.length; d++) {
    const raw = segs[d];
    const lb = raw.indexOf("[");
    const name = lb === -1 ? raw : raw.slice(0, lb);
    const index = lb === -1 ? null : Number(raw.slice(lb + 1, raw.indexOf("]", lb)));
    if (name.length === 0 || (index !== null && Number.isNaN(index))) {
      throw new Error(`Invalid path segment in ${pathKey}: ${raw}`);
    }
    const isLast = d === segs.length - 1;

    if (index !== null) {
      if (!cur[name]) cur[name] = [];
      while (cur[name].length <= index) cur[name].push(undefined);
      if (isLast) {
        cur[name][index] = value;
      } else {
        if (!cur[name][index] || typeof cur[name][index] !== "object") cur[name][index] = {};
        cur = cur[name][index];
      }
    } else if (isLast) {
      cur[name] = value;
    } else {
      if (!cur[name] || typeof cur[name] !== "object" || Array.isArray(cur[name])) cur[name] = {};
      cur = cur[name];
    }
  }
}

function unflattenPaths(flat) {
  const root = {};
  for (const [pathKey, value] of Object.entries(flat)) {
    if (typeof value !== "string") continue;
    setDeepAtPath(root, pathKey, value);
  }
  return root;
}

function chunkKeys(keys, size) {
  const out = [];
  for (let i = 0; i < keys.length; i += size) out.push(keys.slice(i, i + size));
  return out;
}

function placeholdersOk(src, dst) {
  const re = /\{\{[^}]+\}\}|\{[^{}]+\}/g;
  const a = (src.match(re) || []).sort().join("|");
  const b = (dst.match(re) || []).sort().join("|");
  return a === b;
}

function extractJsonBody(rawText) {
  const t = rawText.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fence ? fence[1].trim() : t;
}

function parseJsonLenient(body) {
  try {
    return JSON.parse(body);
  } catch {
    return JSON.parse(jsonrepair(body));
  }
}

function buildBatchPrompt(locale, langName, orderedKeys, turkishValues) {
  const n = orderedKeys.length;
  return [
    `Target locale code: ${locale}`,
    `Target language: ${langName}`,
    "",
    `Translate ${n} strings from Turkish into ${langName}.`,
    "Context: RiskNova ready-made occupational health & safety (OHS) document templates — forms, tables, stock lists, legal references.",
    "Rules:",
    "- Preserve every substring like {{firma_adi}} or {n} (curly braces) exactly — do not translate inside braces.",
    "- Keep drug names (e.g. Paracetamol, Ibuprofen) and international abbreviations (ICD-10, CAPA) unchanged unless a standard localized name is required.",
    "- Return ONLY valid JSON: {\"translations\":[ ... ]} with exactly " + n + " strings in the same order as the Turkish input.",
    "",
    "Keys (reference only, same order as array):",
    JSON.stringify(orderedKeys),
    "",
    "Turkish strings (translate each to target language, index i → keys[i]):",
    JSON.stringify(turkishValues),
  ].join("\n");
}

function parseTranslationsArray(rawText, orderedKeys) {
  const body = extractJsonBody(rawText);
  const parsed = parseJsonLenient(body);
  const arr = parsed.translations;
  if (!Array.isArray(arr)) {
    throw new Error('Model JSON must contain a "translations" array');
  }
  if (arr.length !== orderedKeys.length) {
    throw new Error(`Expected ${orderedKeys.length} translations, got ${arr.length}`);
  }
  const out = {};
  for (let i = 0; i < orderedKeys.length; i++) {
    const k = orderedKeys[i];
    const v = arr[i];
    if (typeof v !== "string") {
      throw new Error(`translations[${i}] must be a string`);
    }
    out[k] = v;
  }
  return out;
}

function validateBatchTranslations(payload, translated) {
  const out = {};
  for (const k of Object.keys(payload)) {
    const v = translated[k];
    if (typeof v !== "string") {
      throw new Error(`Missing or non-string translation for key: ${k}`);
    }
    if (!placeholdersOk(payload[k], v)) {
      throw new Error(`Placeholder mismatch for key ${k}`);
    }
    out[k] = v;
  }
  return out;
}

async function translateBatchOpenAI(openai, locale, langName, entries) {
  const sortedEntries = [...entries].sort((a, b) => a[0].localeCompare(b[0]));
  const orderedKeys = sortedEntries.map((e) => e[0]);
  const turkishValues = sortedEntries.map((e) => e[1]);
  const payload = Object.fromEntries(sortedEntries);
  const user = buildBatchPrompt(locale, langName, orderedKeys, turkishValues);

  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an expert translator for workplace safety documents. Reply with one JSON object only; no markdown.",
      },
      { role: "user", content: user },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty OpenAI completion");
  const translated = parseTranslationsArray(raw, orderedKeys);
  return validateBatchTranslations(payload, translated);
}

async function translateBatchAnthropic(anthropic, locale, langName, entries) {
  const sortedEntries = [...entries].sort((a, b) => a[0].localeCompare(b[0]));
  const orderedKeys = sortedEntries.map((e) => e[0]);
  const turkishValues = sortedEntries.map((e) => e[1]);
  const payload = Object.fromEntries(sortedEntries);
  const user = buildBatchPrompt(locale, langName, orderedKeys, turkishValues);

  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 16384,
    temperature: 0.2,
    system:
      'You translate Turkish OHS document templates. Reply with a single JSON object: {"translations":[string,...]} only. Array length must match the prompt.',
    messages: [{ role: "user", content: user }],
  });

  const block = message.content.find((b) => b.type === "text");
  const raw = block?.text;
  if (!raw) throw new Error("Empty Anthropic completion");
  const translated = parseTranslationsArray(raw, orderedKeys);
  return validateBatchTranslations(payload, translated);
}

async function translateBatchWithSplit(provider, client, locale, langName, entries, depth = 0) {
  try {
    if (provider === "openai") {
      return await translateBatchOpenAI(client, locale, langName, entries);
    }
    return await translateBatchAnthropic(client, locale, langName, entries);
  } catch (e) {
    if (entries.length === 1) {
      throw e;
    }
    const mid = Math.floor(entries.length / 2);
    const left = entries.slice(0, mid);
    const right = entries.slice(mid);
    console.warn(`  (split batch ${entries.length} → ${left.length} + ${right.length}) ${e.message?.slice(0, 120)}`);
    await new Promise((r) => setTimeout(r, 400));
    const a = await translateBatchWithSplit(provider, client, locale, langName, left, depth + 1);
    const b = await translateBatchWithSplit(provider, client, locale, langName, right, depth + 1);
    return { ...a, ...b };
  }
}

async function translateFlat(provider, client, locale, sourceFlat) {
  const langName = LOCALE_NAMES[locale];
  if (!langName) throw new Error(`Unknown locale: ${locale}`);

  const keys = Object.keys(sourceFlat).sort();
  const batches = chunkKeys(keys, BATCH_SIZE);
  const merged = {};

  for (let i = 0; i < batches.length; i++) {
    const batchKeys = batches[i];
    const entries = batchKeys.map((k) => [k, sourceFlat[k]]);
    process.stdout.write(`  ${locale}: batch ${i + 1}/${batches.length} (${batchKeys.length} keys)\n`);
    const part = await translateBatchWithSplit(provider, client, locale, langName, entries);
    Object.assign(merged, part);
    await new Promise((r) => setTimeout(r, 450));
  }

  if (Object.keys(merged).length !== keys.length) {
    throw new Error(`Key count mismatch for ${locale}: expected ${keys.length}, got ${Object.keys(merged).length}`);
  }
  return merged;
}

function stripTemplatePrefix(flat, templateId) {
  const prefix = `${templateId}.`;
  const out = {};
  for (const [k, v] of Object.entries(flat)) {
    if (!k.startsWith(prefix)) continue;
    out[k.slice(prefix.length)] = v;
  }
  return out;
}

function parseArgvLocales() {
  const raw = process.argv.find((a) => a.startsWith("--locale="));
  if (!raw) return null;
  return raw
    .slice("--locale=".length)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseLimit() {
  const raw = process.argv.find((a) => a.startsWith("--limit="));
  if (!raw) return null;
  const n = Number(raw.slice("--limit=".length));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseOffset() {
  const raw = process.argv.find((a) => a.startsWith("--offset="));
  if (!raw) return 0;
  const n = Number(raw.slice("--offset=".length));
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function parseCount() {
  const raw = process.argv.find((a) => a.startsWith("--count="));
  if (!raw) return null;
  const n = Number(raw.slice("--count=".length));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function parseTemplateIdFilter() {
  const raw = process.argv.find((a) => a.startsWith("--template-id="));
  return raw ? raw.slice("--template-id=".length).trim() || null : null;
}

async function main() {
  if (!fs.existsSync(trSourcePath)) {
    console.error("Missing", trSourcePath, "— run: npm run i18n:export-document-templates");
    process.exit(1);
  }

  const openaiKey = readFirstEnv(OPENAI_KEY_NAMES);
  const anthropicKey = readFirstEnv(ANTHROPIC_KEY_NAMES);
  let provider;
  let client;
  if (anthropicKey) {
    provider = "anthropic";
    client = new Anthropic({ apiKey: anthropicKey.key });
    console.log("Using Anthropic", anthropicKey.name);
  } else if (openaiKey) {
    provider = "openai";
    client = new OpenAI({ apiKey: openaiKey.key });
    console.log("Using OpenAI", openaiKey.name);
  } else {
    console.error("No API key: set ANTHROPIC_API_KEY or OPENAI_API_KEY");
    process.exit(1);
  }

  const trAll = JSON.parse(fs.readFileSync(trSourcePath, "utf8"));
  const sortedIds = Object.keys(trAll).sort();
  let templateIds = sortedIds;
  const limit = parseLimit();
  const offset = parseOffset();
  const count = parseCount();
  const oneId = parseTemplateIdFilter();
  if (oneId) {
    if (!trAll[oneId]) {
      console.error("Unknown template id:", oneId);
      process.exit(1);
    }
    templateIds = [oneId];
  } else if (count != null) {
    templateIds = sortedIds.slice(offset, offset + count);
  } else if (limit != null) {
    templateIds = sortedIds.slice(offset, offset + limit);
  } else if (offset > 0) {
    templateIds = sortedIds.slice(offset);
  }

  if (!templateIds.length) {
    console.error("No template ids in range (check --offset / --count / --limit).");
    process.exit(1);
  }

  console.log(
    "Templates in this run:",
    templateIds.length,
    "(",
    templateIds[0],
    "…",
    templateIds[templateIds.length - 1],
    ")",
  );

  const requestedLocales = parseArgvLocales();
  const targetLocales = (requestedLocales?.length ? requestedLocales : APP_MESSAGE_LOCALES.filter((l) => l !== "tr")).filter(
    (l) => l !== "tr",
  );

  fs.mkdirSync(bundlesDir, { recursive: true });

  for (const locale of targetLocales) {
    const langName = LOCALE_NAMES[locale];
    if (!langName) {
      console.warn("Skip unknown locale:", locale);
      continue;
    }

    const mergedFlat = {};
    for (const tid of templateIds) {
      const sub = trAll[tid];
      if (!sub) continue;
      const flat = flattenStrings(sub, tid);
      Object.assign(mergedFlat, flat);
    }

    console.log("\nTranslating →", locale, "keys:", Object.keys(mergedFlat).length, "templates:", templateIds.length);
    const translatedFlat = await translateFlat(provider, client, locale, mergedFlat);

    const existingPath = path.join(bundlesDir, `${locale}.json`);
    let bundle = {};
    if (fs.existsSync(existingPath)) {
      try {
        bundle = JSON.parse(fs.readFileSync(existingPath, "utf8"));
      } catch {
        bundle = {};
      }
    }

    for (const tid of templateIds) {
      const stripped = stripTemplatePrefix(translatedFlat, tid);
      bundle[tid] = unflattenPaths(stripped);
    }

    fs.writeFileSync(existingPath, JSON.stringify(bundle, null, 2) + "\n");
    console.log("Wrote", existingPath);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
