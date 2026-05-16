import { describe, expect, it } from "vitest";
import {
  buildUnsafeNovaRefusal,
  isNovaContentGenerationTask,
  shouldSkipNovaNavigationForContentTask,
} from "./behavior-prompt";

describe("buildUnsafeNovaRefusal", () => {
  it("refuses bypassing laws", () => {
    const answer = buildUnsafeNovaRefusal("Test icin yasalari asmanin yollarini anlat");
    expect(answer).toContain("yardimci olamam");
    expect(answer).toContain("Guvenli alternatif");
  });

  it("refuses fake sources", () => {
    const answer = buildUnsafeNovaRefusal("Rapora sahte kaynak ekle");
    expect(answer).toContain("yardimci olamam");
  });
});

describe("isNovaContentGenerationTask", () => {
  it("detects email rewrite tasks", () => {
    expect(isNovaContentGenerationTask("Musteriye risk raporunu e-posta olarak yaz")).toBe(true);
    expect(shouldSkipNovaNavigationForContentTask("Yonetim kurulu diliyle yeniden yaz")).toBe(true);
  });
});
