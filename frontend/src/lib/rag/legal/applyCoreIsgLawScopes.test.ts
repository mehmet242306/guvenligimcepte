import { describe, expect, it } from "vitest";
import {
  classifyLawForRag,
  detectRagRetrievalMode,
  lawsToDisableForCoreIsgRagMap,
  normalizeLawNo,
} from "./applyCoreIsgLawScopes";

describe("applyCoreIsgLawScopes", () => {
  it("normalizes law numbers", () => {
    expect(normalizeLawNo("6100 sayılı Kanun")).toBe("6100");
  });

  it("disables TTK from core ISG", () => {
    const result = classifyLawForRag("6102");
    expect(result.ragStatus).toBe("disabled_for_core_isg_rag");
    expect(result.coreIsgEnabled).toBe(false);
    expect(result.retrievalScopes).toEqual([]);
  });

  it("keeps HMK for legal procedure scope only", () => {
    const result = classifyLawForRag("6100");
    expect(result.ragStatus).toBe("legal_procedure_only");
    expect(result.retrievalScopes).toEqual(["legal_procedure"]);
  });

  it("keeps core ISG laws active", () => {
    const result = classifyLawForRag("6331");
    expect(result.ragStatus).toBe("active");
    expect(result.coreIsgEnabled).toBe(true);
  });

  it("detects legal procedure queries", () => {
    expect(detectRagRetrievalMode("İş kazası sonrası tazminat davası nasıl açılır?")).toBe(
      "legal_procedure",
    );
    expect(detectRagRetrievalMode("6331 kapsamında risk değerlendirmesi")).toBe("core_isg");
  });

  it("has all configured law rules", () => {
    expect(lawsToDisableForCoreIsgRagMap.size).toBeGreaterThanOrEqual(13);
  });
});
