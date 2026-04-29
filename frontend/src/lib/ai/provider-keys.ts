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

export function getConfiguredAiProviderNames() {
  return {
    openai: OPENAI_KEY_NAMES.filter((name) => Boolean(process.env[name]?.trim())),
    anthropic: ANTHROPIC_KEY_NAMES.filter((name) => Boolean(process.env[name]?.trim())),
  };
}
