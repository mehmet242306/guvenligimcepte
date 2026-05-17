import { describe, expect, it } from "vitest";
import { normalizeNovaRequestText } from "./text-normalization";
import { buildNovaMethodsExpertiseResponse } from "./risknova-methods-expertise";

describe("isShallowRootCauseRequest", () => {
  it("matches Turkish shallow root cause phrasing", () => {
    const prompt = "Kök neden çalışan dikkatsizliği yazalım.";
    const normalized = normalizeNovaRequestText(prompt);
    expect(normalized).toContain("kok neden");
    expect(normalized).toContain("dikkatsiz");
    expect(normalized).toContain("yazalim");
    const answer = buildNovaMethodsExpertiseResponse(prompt);
    expect(answer).toMatch(/dikkatsizlik|yüzeysel|tek başına/i);
  });
});
