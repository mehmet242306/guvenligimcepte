/**
 * Translates any `scripts/i18n-packs/{pack}/en.json` into ar, ru, de, fr, es, zh, ja, ko, hi, az, id
 * (tr = source; en = master text).
 *
 * --pack=NAME   Subfolder under i18n-packs (default: risk-scoring). Example: --pack=phase3
 * Or: I18N_PACK=phase3
 *
 * Provider: OpenAI (gpt-4o-mini) or Anthropic (claude-sonnet-4); keys like @/lib/ai/provider-keys.
 *
 * Optional: --locale=de or --locale=de,fr
 * --resume    Skip locales whose pack JSON is not identical to en.json (already translated).
 * --force     With --resume, re-translate all selected locales anyway.
 *
 * Long runs: use Windows Terminal outside Cursor to avoid IDE timeouts.
 *
 * After merge:
 *   risk-scoring → npm run i18n:merge-risk-scoring && npm run i18n:verify-locale-parity
 *   phase3       → npm run i18n:merge-phase3 && npm run i18n:verify-locale-parity
 *   messages     → writes messages/{locale}.json directly; then npm run i18n:verify-locale-parity
 *                  Use --force to retranslate a locale that already differs from en (full refresh).
 *
 * Optional: --prefix=path[,path...] (messages pack only)
 *   Translates only string leaves whose message keys start with that path (dot segments allowed).
 *   Example: --prefix=isgLibrary.documentCatalog,isgLibrary.subcategories,isgLibrary.surveyTags,isgLibrary.templateDescription
 *   Merges into each existing locale file; other keys untouched. --resume skips a locale when every
 *   listed subtree already differs from English (already localized). Use --force to redo.
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

function readFirstEnv(names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return { key: value, name };
  }
  return null;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parsePackName() {
  const arg = process.argv.find((a) => a.startsWith("--pack="));
  if (arg) return arg.slice("--pack=".length).trim();
  const env = process.env.I18N_PACK?.trim();
  return env || "risk-scoring";
}

const PACK = parsePackName();
const rootDir = path.join(__dirname, "..");
/** Monorepo root (parent of `frontend/`) — API keys are often stored here instead of `frontend/.env.local`. */
const repoRootDir = path.join(rootDir, "..");
const packDir =
  PACK === "messages" ? path.join(rootDir, "messages") : path.join(__dirname, "i18n-packs", PACK);

function translateDomainHint() {
  if (PACK === "messages") {
    return "the RiskNova ISG / compliance web application — every UI string (pricing, workspace, training, documents, settings, legal, billing, admin). Preserve brand name RiskNova and product name Nova where appropriate.";
  }
  if (PACK === "phase3") {
    return "workplace / company & OSGB portfolio UI (lists, archives, workspace chrome).";
  }
  return "industrial risk analysis software (HAZOP, LOPA, FMEA, bow-tie, matrix, field analysis).";
}

function mergeCommandsHint() {
  if (PACK === "messages") {
    return "npm run i18n:verify-locale-parity";
  }
  if (PACK === "phase3") {
    return "npm run i18n:merge-phase3 && npm run i18n:verify-locale-parity";
  }
  return "npm run i18n:merge-risk-scoring && npm run i18n:verify-locale-parity";
}

function missingSourceHint() {
  if (PACK === "messages") {
    return "Ensure messages/en.json exists.";
  }
  if (PACK === "phase3") {
    return "Add scripts/i18n-packs/phase3/en.json (authoring / sync-phase3-packs).";
  }
  return "run npm run i18n:generate-risk-scoring first.";
}

for (const envPath of [
  path.join(repoRootDir, ".env.local"),
  path.join(repoRootDir, ".env"),
  path.join(rootDir, ".env.local"),
  path.join(rootDir, ".env"),
]) {
  dotenv.config({ path: envPath, override: true });
}

const SOURCE_LOCALE = "en";
const TARGETS = APP_MESSAGE_LOCALES.filter((l) => l !== "tr" && l !== "en");

const LOCALE_NAMES = {
  ar: "Arabic",
  ru: "Russian",
  de: "German",
  fr: "French",
  es: "Spanish (neutral Latin American / international; avoid region-specific slang)",
  zh: "Simplified Chinese (Mainland; use 简体字)",
  ja: "Japanese (です・ます style for UI)",
  ko: "Korean (polite but concise UI tone)",
  hi: "Hindi (Devanagari; modern technical register)",
  az: "Azerbaijani (Latin script)",
  id: "Indonesian",
};

const BATCH_SIZE = (() => {
  const env = process.env.RISK_I18N_BATCH || process.env.OPENAI_RISK_I18N_BATCH;
  if (env) return Number(env);
  if (PACK === "messages") return 28;
  return 45;
})();
const OPENAI_MODEL = process.env.OPENAI_RISK_I18N_MODEL || "gpt-4o-mini";
const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_RISK_I18N_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

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

/** Supports nested keys and arrays, e.g. landing.plans.starter.features[0] */
function unflattenPaths(flat) {
  const root = {};
  for (const [pathKey, value] of Object.entries(flat)) {
    if (typeof value !== "string") continue;
    setDeepAtPath(root, pathKey, value);
  }
  return root;
}

function setDeepAtPath(root, pathKey, value) {
  const segs = pathKey.split(".");
  let cur = root;
  for (let d = 0; d < segs.length; d++) {
    const raw = segs[d];
    const lb = raw.indexOf("[");
    const name = lb === -1 ? raw : raw.slice(0, lb);
    const index =
      lb === -1 ? null : Number(raw.slice(lb + 1, raw.indexOf("]", lb)));
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

function chunkKeys(keys, size) {
  const out = [];
  for (let i = 0; i < keys.length; i += size) out.push(keys.slice(i, i + size));
  return out;
}

function placeholdersOk(src, dst) {
  const re = /\{[^}]+\}/g;
  const a = (src.match(re) || []).sort().join("|");
  const b = (dst.match(re) || []).sort().join("|");
  return a === b;
}

function extractJsonBody(rawText) {
  const t = rawText.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fence ? fence[1].trim() : t;
}

/** Parallel-array protocol: model returns only {"translations":["...",...]} — avoids fragile nested JSON keys. */
function buildBatchPromptArrays(locale, langName, orderedKeys, englishValues) {
  const n = orderedKeys.length;
  return [
    `Target locale code: ${locale}`,
    `Target language: ${langName}`,
    "",
    `Translate ${n} UI strings for ${translateDomainHint()}`,
    "Rules:",
    "- Preserve every substring like {word} (curly braces + identifier) exactly — do not translate inside braces.",
    "- Do not add or remove placeholders.",
    "- Keep UI strings concise.",
    "",
    `Return ONLY valid JSON with exactly this shape: {"translations":[ ${n} translated strings ]}`,
    `The array length MUST be ${n}. Order MUST match the keys and English strings below (same index).`,
    "",
    "Keys (same order as array you output):",
    JSON.stringify(orderedKeys),
    "",
    "English strings (translate each to target language, index i → keys[i]):",
    JSON.stringify(englishValues),
  ].join("\n");
}

function parseJsonLenient(body) {
  try {
    return JSON.parse(body);
  } catch {
    return JSON.parse(jsonrepair(body));
  }
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
      throw new Error(`Placeholder mismatch for key ${k}: src=${JSON.stringify(payload[k])} dst=${JSON.stringify(v)}`);
    }
    out[k] = v;
  }
  return out;
}

async function translateBatchOpenAI(openai, locale, langName, entries) {
  const sortedEntries = [...entries].sort((a, b) => a[0].localeCompare(b[0]));
  const orderedKeys = sortedEntries.map((e) => e[0]);
  const englishValues = sortedEntries.map((e) => e[1]);
  const payload = Object.fromEntries(sortedEntries);
  const user = buildBatchPromptArrays(locale, langName, orderedKeys, englishValues);

  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an expert technical translator for enterprise safety software. Reply with one JSON object only; no markdown.",
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
  const englishValues = sortedEntries.map((e) => e[1]);
  const payload = Object.fromEntries(sortedEntries);
  const user = buildBatchPromptArrays(locale, langName, orderedKeys, englishValues);

  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 16384,
    temperature: 0.2,
    system:
      "You are an expert technical translator for enterprise safety software. Reply with a single JSON object: {\"translations\":[string,...]} only (optionally wrapped in ```json fences). Array length must match the prompt. Escape quotes inside strings per JSON rules.",
    messages: [{ role: "user", content: user }],
  });

  const block = message.content.find((b) => b.type === "text");
  const raw = block?.text;
  if (!raw) throw new Error("Empty Anthropic completion");
  const translated = parseTranslationsArray(raw, orderedKeys);
  return validateBatchTranslations(payload, translated);
}

/** One string, no JSON — avoids model errors on strings with colons, quotes, or CJK. */
async function translateOnePlainAnthropic(anthropic, locale, langName, key, english) {
  const user = [
    `Target: ${langName} (locale ${locale})`,
    `Translate the following UI string for ${translateDomainHint()}`,
    "Rules: keep every {placeholder} like {title}, {n}, {name} exactly (same braces and word inside).",
    "Output: ONLY the translated text. No JSON, no quotes around the line, no explanation.",
    "",
    "String to translate:",
    english,
  ].join("\n");

  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    temperature: 0.2,
    system:
      "You translate UI strings. Output only the translated text — plain UTF-8, single line or multiple lines as needed. No markdown fences.",
    messages: [{ role: "user", content: user }],
  });

  const block = message.content.find((b) => b.type === "text");
  let raw = block?.text?.trim();
  if (!raw) throw new Error("Empty plain-string translation");
  raw = raw.replace(/^["'`]|["'`]$/g, "").trim();
  return raw;
}

async function translateOnePlainOpenAI(openai, locale, langName, key, english) {
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Translate UI strings for enterprise safety software. Reply with ONLY the translated text, nothing else.",
      },
      {
        role: "user",
        content: [
          `Target language: ${langName} (${locale})`,
          "Preserve placeholders like {title}, {n} exactly.",
          "",
          "Translate:",
          english,
        ].join("\n"),
      },
    ],
  });

  let raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty plain-string translation");
  raw = raw.replace(/^["'`]|["'`]$/g, "").trim();
  return raw;
}

/** On malformed JSON from the model, split the batch and retry (common with CJK / long strings). */
async function translateBatchWithSplit(provider, client, locale, langName, entries, depth = 0) {
  try {
    if (provider === "openai") {
      return await translateBatchOpenAI(client, locale, langName, entries);
    }
    return await translateBatchAnthropic(client, locale, langName, entries);
  } catch (e) {
    if (entries.length === 1) {
      const k = entries[0][0];
      const v = entries[0][1];
      console.warn(`  (plain-text fallback for key ${k}) ${e.message.slice(0, 100)}`);
      const t =
        provider === "openai"
          ? await translateOnePlainOpenAI(client, locale, langName, k, v)
          : await translateOnePlainAnthropic(client, locale, langName, k, v);
      if (!placeholdersOk(v, t)) {
        throw new Error(`Placeholder mismatch after plain fallback for ${k}`);
      }
      return { [k]: t };
    }
    const mid = Math.floor(entries.length / 2);
    const left = entries.slice(0, mid);
    const right = entries.slice(mid);
    const indent = "  ".repeat(Math.min(depth + 1, 4));
    console.warn(`${indent}(split batch ${entries.length} → ${left.length} + ${right.length}) ${e.message.slice(0, 120)}`);
    await new Promise((r) => setTimeout(r, 300));
    const a = await translateBatchWithSplit(provider, client, locale, langName, left, depth + 1);
    const b = await translateBatchWithSplit(provider, client, locale, langName, right, depth + 1);
    return { ...a, ...b };
  }
}

async function translateLocale(provider, client, locale, sourceFlat) {
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
    await new Promise((r) => setTimeout(r, 400));
  }

  if (Object.keys(merged).length !== keys.length) {
    throw new Error(`Key count mismatch for ${locale}: expected ${keys.length}, got ${Object.keys(merged).length}`);
  }
  return merged;
}

function parseArgvLocales() {
  const raw = process.argv.slice(2).filter((a) => a.startsWith("--locale="));
  if (!raw.length) return null;
  const codes = raw.flatMap((a) =>
    a
      .slice("--locale=".length)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return codes;
}

function parseBoolFlag(name) {
  return process.argv.slice(2).includes(name);
}

/** One path or comma-separated paths, e.g. isgLibrary or isgLibrary.documentCatalog,isgLibrary.subcategories */
function parsePrefixes() {
  const arg = process.argv.find((a) => a.startsWith("--prefix="));
  if (!arg) return null;
  const raw = arg.slice("--prefix=".length).trim();
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  for (const p of parts) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(p)) {
      throw new Error(
        `Invalid --prefix segment "${p}" (allowed: letters, numbers, dots, underscores, hyphens)`,
      );
    }
  }
  return parts;
}

function getSubtree(obj, prefix) {
  const parts = prefix.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

function deepMergeTarget(target, source) {
  if (source === null || typeof source !== "object" || Array.isArray(source)) {
    return;
  }
  for (const k of Object.keys(source)) {
    const sv = source[k];
    const tv = target[k];
    if (sv !== null && typeof sv === "object" && !Array.isArray(sv)) {
      if (tv === null || typeof tv !== "object" || Array.isArray(tv)) {
        target[k] = structuredClone(sv);
      } else {
        deepMergeTarget(tv, sv);
      }
    } else {
      target[k] = sv;
    }
  }
}

function filterFlatByPrefix(flat, prefix) {
  const p = `${prefix}.`;
  const out = {};
  for (const [k, v] of Object.entries(flat)) {
    if (k === prefix || k.startsWith(p)) out[k] = v;
  }
  return out;
}

function isSubtreeIdenticalToEn(localePath, enTree, prefix) {
  if (!fs.existsSync(localePath)) return false;
  const loc = JSON.parse(fs.readFileSync(localePath, "utf8"));
  const a = getSubtree(loc, prefix);
  const b = getSubtree(enTree, prefix);
  if (a === undefined && b === undefined) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** True if file is still a byte-for-byte copy of the English pack (untranslated). */
function isEnglishDuplicatePack(localePath, enCanonical) {
  if (!fs.existsSync(localePath)) return true;
  const loc = JSON.stringify(JSON.parse(fs.readFileSync(localePath, "utf8")));
  return loc === enCanonical;
}

async function main() {
  const openaiResolved = readFirstEnv(OPENAI_KEY_NAMES);
  const anthropicResolved = readFirstEnv(ANTHROPIC_KEY_NAMES);

  let provider;
  let client;
  if (openaiResolved) {
    provider = "openai";
    client = new OpenAI({ apiKey: openaiResolved.key });
    console.log(`Using OpenAI (${OPENAI_MODEL}) via ${openaiResolved.name}`);
  } else if (anthropicResolved) {
    provider = "anthropic";
    client = new Anthropic({ apiKey: anthropicResolved.key });
    console.log(`Using Anthropic (${ANTHROPIC_MODEL}) via ${anthropicResolved.name}`);
  } else {
    console.error(
      "No API key: set one of",
      [...OPENAI_KEY_NAMES, ...ANTHROPIC_KEY_NAMES].join(", "),
      "in either:",
      `  ${path.join(repoRootDir, ".env.local")} or ${path.join(repoRootDir, ".env")} (repo root), or`,
      `  ${path.join(rootDir, ".env.local")} or ${path.join(rootDir, ".env")} (frontend).`,
    );
    process.exit(1);
  }

  const filterLocales = parseArgvLocales();
  let targets = TARGETS;
  if (filterLocales?.length) {
    const bad = filterLocales.filter((l) => !TARGETS.includes(l));
    if (bad.length) {
      console.error("Unknown --locale value(s):", bad.join(", "), "allowed:", TARGETS.join(", "));
      process.exit(1);
    }
    targets = filterLocales;
  }

  let prefixes;
  try {
    prefixes = parsePrefixes();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  if (prefixes && PACK !== "messages") {
    console.error("--prefix is only supported with --pack=messages");
    process.exit(1);
  }

  const enPath = path.join(packDir, `${SOURCE_LOCALE}.json`);
  if (!fs.existsSync(enPath)) {
    console.error("Missing", enPath, "—", missingSourceHint());
    process.exit(1);
  }

  console.log("i18n pack:", PACK, "→", packDir);
  if (prefixes?.length) console.log("prefix (partial translate):", prefixes.join(" + "));

  const sourceTree = JSON.parse(fs.readFileSync(enPath, "utf8"));
  const fullFlat = flattenStrings(sourceTree);
  let sourceFlat = fullFlat;
  if (prefixes?.length) {
    sourceFlat = {};
    for (const pr of prefixes) {
      Object.assign(sourceFlat, filterFlatByPrefix(fullFlat, pr));
    }
    if (!Object.keys(sourceFlat).length) {
      console.error(`No string leaves under prefix path(s): ${prefixes.join(", ")}`);
      process.exit(1);
    }
  }
  const keyCount = Object.keys(sourceFlat).length;
  console.log(`Source ${SOURCE_LOCALE}.json: ${keyCount} string leaves${prefixes?.length ? ` (filtered)` : ""}`);

  const resume = parseBoolFlag("--resume");
  const force = parseBoolFlag("--force");
  const enCanonical = JSON.stringify(sourceTree);

  if (resume) {
    if (prefixes?.length) {
      console.log(
        "--resume: skipping locales where every prefix subtree already differs from English (use --force to redo)",
      );
    } else {
      console.log("--resume: skipping locales that already differ from en.json (use --force to redo)");
    }
  }

  for (const locale of targets) {
    const outPath = path.join(packDir, `${locale}.json`);
    if (resume && !force) {
      if (prefixes?.length) {
        const allDone = prefixes.every((pr) => !isSubtreeIdenticalToEn(outPath, sourceTree, pr));
        if (allDone) {
          console.log(`Skipping ${locale} (all prefix subtrees differ from en — likely localized)`);
          continue;
        }
      } else if (!isEnglishDuplicatePack(outPath, enCanonical)) {
        console.log(`Skipping ${locale} (already translated)`);
        continue;
      }
    }
    console.log(`Translating → ${locale} (${LOCALE_NAMES[locale]})…`);
    const flat = await translateLocale(provider, client, locale, sourceFlat);
    const tree = unflattenPaths(flat);
    if (prefixes?.length) {
      if (!fs.existsSync(outPath)) {
        console.error("Missing", outPath, "— create locale file or run i18n:merge-missing-from-en first");
        process.exit(1);
      }
      const existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
      deepMergeTarget(existing, tree);
      fs.writeFileSync(outPath, `${JSON.stringify(existing, null, 2)}\n`);
    } else {
      fs.writeFileSync(outPath, `${JSON.stringify(tree, null, 2)}\n`);
    }
    console.log("  wrote", outPath);
  }

  console.log("Done. Run:", mergeCommandsHint());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
