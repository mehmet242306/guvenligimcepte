import { describe, expect, it } from "vitest";
import { formatNovaDisplayText } from "./format-answer";

describe("formatNovaDisplayText", () => {
  it("removes markdown emphasis", () => {
    expect(formatNovaDisplayText("**Kisa yanit:** Yangin cikisi en az 120 cm.")).toBe(
      "Kisa yanit: Yangin cikisi en az 120 cm.",
    );
  });

  it("normalizes bullet lists", () => {
    expect(formatNovaDisplayText("- Birinci\n- Ikinci")).toBe("• Birinci\n• Ikinci");
  });
});
