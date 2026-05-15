const OPENAI_KEY_NAMES = [
  "OPENAI_API_KEY",
  "OPENAI_KEY",
  "AI_OPENAI_API_KEY",
  "RISKNOVA_OPENAI_API_KEY",
] as const;

const ANTHROPIC_KEY_NAMES = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_KEY",
  "AI_ANTHROPIC_API_KEY",
  "CLAUDE_API_KEY",
] as const;

// Stable Anthropic model used by document/AI flows. Kept here so a single env
// override (ANTHROPIC_MODEL) can hot-swap the model when Anthropic deprecates a
// dated alias without redeploying every route.
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6" as const;

function readFirstEnv(names: readonly string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  return null;
}

export function getOpenAIKey() {
  return readFirstEnv(OPENAI_KEY_NAMES);
}

export function getAnthropicKey() {
  return readFirstEnv(ANTHROPIC_KEY_NAMES);
}

/**
 * Returns the Anthropic model identifier to use. Reads ANTHROPIC_MODEL when
 * present (so ops can swap a deprecated dated alias without code changes) and
 * falls back to the platform default otherwise.
 */
export function getAnthropicModel() {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
}

/** Risk analizi gorsel endpoint'i icin model. Kritik tespit katmani Opus kullanir. */
const DEFAULT_RISK_VISION_MODEL = "claude-opus-4-7" as const;

export function getRiskAnalysisVisionModel(): string {
  const explicit = process.env.RISK_ANALYSIS_ANTHROPIC_MODEL?.trim();
  if (explicit) return explicit;
  return DEFAULT_RISK_VISION_MODEL;
}

export function getConfiguredAiProviderNames() {
  return {
    openai: OPENAI_KEY_NAMES.filter((name) => Boolean(process.env[name]?.trim())),
    anthropic: ANTHROPIC_KEY_NAMES.filter((name) => Boolean(process.env[name]?.trim())),
  };
}
