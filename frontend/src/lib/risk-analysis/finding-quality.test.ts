import { describe, expect, it } from "vitest";
import {
  filterRealFindings,
  formatActionTurkish,
  isSyntheticOrFailedFinding,
} from "./finding-quality";

describe("finding-quality", () => {
  it("flags AI timeout placeholder as synthetic", () => {
    expect(
      isSyntheticOrFailedFinding({
        title: "AI yaniti alinamadi: saha risk envanteri manuel dogrulama gerektiriyor",
        category: "Diger",
      }),
    ).toBe(true);
  });

  it("keeps real findings", () => {
    expect(
      isSyntheticOrFailedFinding({
        title: "Elektrik panosu önü erişim uygunsuzluğu",
        category: "Elektrik",
        riskClass: "high",
      }),
    ).toBe(false);
  });

  it("filters synthetic from list", () => {
    const list = filterRealFindings([
      { title: "AI yaniti alinamadi", category: "Diger" },
      { title: "Kayma riski", category: "Ergonomi" },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].title).toContain("Kayma");
  });

  it("translates immediate action to Turkish", () => {
    expect(formatActionTurkish("Immediate action; consider stopping work", "critical")).toContain(
      "Derhal aksiyon",
    );
  });
});
