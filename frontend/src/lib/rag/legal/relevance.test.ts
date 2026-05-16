import { describe, expect, it } from "vitest";
import { classifyLegalQueryIntent, isRegulationRelatedQuery } from "./relevance";

describe("legal relevance", () => {
  it("flags off-topic queries", () => {
    expect(classifyLegalQueryIntent("bugun hava durumu nasil")).toBe("off_topic");
  });

  it("detects regulation queries", () => {
    expect(isRegulationRelatedQuery("6331 risk degerlendirmesi zorunlu mu")).toBe(true);
    expect(classifyLegalQueryIntent("6331 risk degerlendirmesi zorunlu mu")).toBe("legal_isg");
  });

  it("allows general isg practice", () => {
    expect(classifyLegalQueryIntent("ramak kala sonrasi ne yapmaliyiz")).toBe("general_isg_practice");
  });
});
