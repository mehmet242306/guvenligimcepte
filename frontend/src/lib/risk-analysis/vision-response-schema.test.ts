import { describe, expect, it } from "vitest";
import { validateVisionResponse } from "./vision-response-schema";

describe("vision-response-schema", () => {
  it("fails when relevant image has no valid risks", () => {
    const result = validateVisionResponse({
      imageRelevance: "relevant",
      risks: [],
    });
    expect(result.ok).toBe(false);
  });

  it("passes for not_real_photo with empty risks", () => {
    const result = validateVisionResponse({
      imageRelevance: "not_real_photo",
      risks: [],
    });
    expect(result.ok).toBe(true);
    expect(result.parsed.risks).toEqual([]);
  });

  it("filters invalid risk rows", () => {
    const result = validateVisionResponse({
      imageRelevance: "relevant",
      risks: [{ title: "ab", category: "Elektrik" }, { title: "Kablo hasarı", category: "Elektrik" }],
    });
    expect(result.ok).toBe(true);
    expect(result.parsed.risks).toHaveLength(1);
  });
});
