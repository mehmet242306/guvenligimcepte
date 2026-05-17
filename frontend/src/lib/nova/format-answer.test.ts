import { describe, expect, it } from "vitest";
import { formatNovaDisplayText } from "./format-answer";

describe("formatNovaDisplayText", () => {
  it("preserves Turkish characters", () => {
    const input = "Kısa yanıt: Yönetim kurulu özeti — iş sağlığı ve güvenliği (İSG).";
    expect(formatNovaDisplayText(input)).toBe(input);
  });

  it("removes markdown emphasis", () => {
    expect(formatNovaDisplayText("**Kısa yanıt:** Yangın çıkışı en az 120 cm.")).toBe(
      "Kısa yanıt: Yangın çıkışı en az 120 cm.",
    );
  });

  it("normalizes bullet lists", () => {
    expect(formatNovaDisplayText("- Birinci\n- Ikinci")).toBe("• Birinci\n• Ikinci");
  });
});
