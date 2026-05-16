import { normalizeLawNo } from "./applyCoreIsgLawScopes";

const TR_STOPWORDS = new Set([
  "ve",
  "veya",
  "ile",
  "icin",
  "bir",
  "bu",
  "da",
  "de",
  "mi",
  "mu",
  "ne",
  "nasil",
  "nedir",
  "olan",
  "olarak",
  "gibi",
  "var",
  "yok",
  "the",
  "and",
  "or",
  "for",
  "with",
  "what",
  "how",
  "is",
  "are",
]);

const ISG_SYNONYMS: Record<string, string[]> = {
  isg: ["is guvenligi", "6331", "isyeri guvenligi"],
  risk: ["risk degerlendirmesi", "risk analizi"],
  egitim: ["is guvenligi egitimi", "temel isg egitimi"],
  uzman: ["is guvenligi uzmani", "igu", "a sinifi"],
  hekim: ["isyeri hekimi", "dsp"],
  kaza: ["is kazasi", "ramak kala"],
  ceza: ["idari para cezasi", "6331"],
};

export function normalizeTurkishAscii(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i");
}

export function parseLawNumberFromQuery(query: string): string | null {
  const normalized = normalizeTurkishAscii(query);
  const sayili = normalized.match(/\b(\d{3,5})\s*sayili\b/);
  if (sayili) return sayili[1];
  const kanun = normalized.match(/\bkanun\s*(\d{3,5})\b/);
  if (kanun) return kanun[1];
  const bare = normalized.match(/\b(6331|4857|5510|6331|2920|2559)\b/);
  return bare ? bare[1] : null;
}

export function normalizeSearchTerms(query: string): string[] {
  const normalized = normalizeTurkishAscii(query);
  return normalized
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !TR_STOPWORDS.has(t))
    .slice(0, 12);
}

export function expandLegalQueryTerms(baseTerms: string[]): string[] {
  const expanded = new Set<string>();
  for (const term of baseTerms) {
    expanded.add(term);
    const synonyms = ISG_SYNONYMS[term];
    if (synonyms) synonyms.forEach((s) => expanded.add(normalizeTurkishAscii(s).replace(/\s+/g, " ")));
  }
  const lawNo = baseTerms.find((t) => /^\d{3,5}$/.test(t));
  if (lawNo) expanded.add(normalizeLawNo(lawNo));
  return Array.from(expanded).slice(0, 22);
}

export function buildSearchTerms(query: string): string[] {
  let terms = expandLegalQueryTerms(normalizeSearchTerms(query));
  if (terms.length === 0) {
    const lawOnly = parseLawNumberFromQuery(query);
    if (lawOnly) terms = expandLegalQueryTerms([lawOnly]);
  }
  return terms;
}
