export async function streamTextReveal(
  fullText: string,
  onUpdate: (visibleText: string) => void,
  options?: { signal?: AbortSignal },
): Promise<void> {
  if (!fullText) {
    onUpdate("");
    return;
  }

  let visible = "";
  for (let index = 0; index < fullText.length; index += 1) {
    if (options?.signal?.aborted) break;
    const char = fullText[index] ?? "";
    visible += char;
    onUpdate(visible);
    const delay = estimateDelay(char, index, fullText.length);
    await sleep(delay);
  }
}

function estimateDelay(char: string, index: number, total: number): number {
  const progress = total > 0 ? index / total : 1;
  const base = char === "\n" ? 16 : /[.,;:!?]/.test(char) ? 24 : char === " " ? 6 : 12;
  if (progress > 0.85) return Math.max(4, base - 6);
  return base;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
