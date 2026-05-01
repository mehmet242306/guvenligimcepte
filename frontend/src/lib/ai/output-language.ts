/**
 * AI routes receive an optional UI locale (e.g. from next-intl). Base prompts may
 * stay Turkish for regulation fidelity; these snippets steer model output language.
 */

export function isEnglishUiLocale(locale: string | null | undefined): boolean {
  return String(locale ?? "")
    .toLowerCase()
    .startsWith("en");
}

/** Appended to analyze-risk system prompt when UI is English. */
export function analyzeRiskSystemLanguageSuffix(locale: string): string {
  if (!isEnglishUiLocale(locale)) return "";
  return `

=== OUTPUT LANGUAGE (MANDATORY) ===
The user's interface is in English. Write EVERY human-readable string in your JSON response in English:
titles, recommendations, observations, summaries, image descriptions, photo quality notes, category labels where you invent them, and legalReferences descriptions.
Keep JSON keys identical to the schema. Official Turkish law/regulation titles may remain as-is; explain obligations in English in "description".`;
}

/** Appended to analyze-risk user prompt when UI is English. */
export function analyzeRiskUserLanguageSuffix(locale: string): string {
  if (!isEnglishUiLocale(locale)) return "";
  return "\n\n[UI locale: English — all narrative fields in the JSON must be English.]";
}
