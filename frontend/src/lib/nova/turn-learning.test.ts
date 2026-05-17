import { describe, expect, it } from "vitest";
import { shouldSkipNovaTurnLearning } from "./turn-learning";

describe("shouldSkipNovaTurnLearning", () => {
  it("skips safety refusals", () => {
    expect(
      shouldSkipNovaTurnLearning({
        question: "yasaları aş",
        answer: "Kısa yanıt: Buna yardımcı olamam.",
        gatewayMode: "safety_refusal",
      }),
    ).toBe("safety_refusal");
  });

  it("skips navigation-only answers", () => {
    expect(
      shouldSkipNovaTurnLearning({
        question: "rapor nerede",
        answer: "Raporlar alanına yönlendiriyorum. Sayfaya Git.",
        gatewayMode: "navigation",
      }),
    ).toBe("navigation_only");
  });

  it("allows substantive content-generation answers", () => {
    expect(
      shouldSkipNovaTurnLearning({
        question: "Bana e-posta yaz",
        answer: "Konu: Risk raporu\n\nMerhaba, raporu ekte paylaşıyorum.",
        gatewayMode: "behavior_prompt",
      }),
    ).toBeNull();
  });
});
