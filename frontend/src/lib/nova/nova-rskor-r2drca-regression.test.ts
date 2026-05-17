import { describe, expect, it } from "vitest";
import {
  buildNovaHardGateResponse,
  buildNovaMethodsExpertiseResponse,
  isNovaMethodsExpertiseTask,
} from "./behavior-prompt";
import { resolveNovaRoute, shouldUseNovaLegalRag } from "./request-mode";

describe("R-Skor 2D / R2D-RCA expertise routing", () => {
  it("routes methods expertise to behavior_prompt, not legal RAG", () => {
    const prompt = "L matrisi bu risk için yeterli mi, yoksa daha gelişmiş yöntem mi kullanmalıyım?";
    expect(isNovaMethodsExpertiseTask(prompt)).toBe(true);
    expect(resolveNovaRoute(prompt)).toBe("method_advisor");
    expect(shouldUseNovaLegalRag(prompt)).toBe(false);
  });
});

describe("R-Skor 2D recommendations", () => {
  it("suggests R-Skor 2D when L matrix may be insufficient", () => {
    const prompt =
      "L matrisi bu risk için yeterli mi, yoksa daha gelişmiş yöntem mi kullanmalıyım?";
    const answer = buildNovaMethodsExpertiseResponse(prompt);
    expect(answer).toMatch(/R-Skor 2D/i);
    expect(answer).toMatch(/L Matrisi|5x5/i);
    expect(answer).toMatch(/mevzuat.*zorunlu değil|zorunlu.*mevzuat/i);
  });

  it("prioritizes same-score risks with R-Skor 2D", () => {
    const prompt = "Aynı skora sahip 5 risk var, hangisine önce müdahale edeceğim?";
    const answer = buildNovaHardGateResponse(prompt);
    expect(answer).toMatch(/R-Skor 2D/i);
    expect(answer).toMatch(/aynı skor|ayni skor/i);
  });

  it("does not rely on low score when legal exposure and exposure are high", () => {
    const prompt = "Risk skoru düşük ama yasal etkisi ve çalışan maruziyeti yüksek.";
    const answer = buildNovaMethodsExpertiseResponse(prompt);
    expect(answer).toMatch(/R-Skor 2D|maruziyet|yasal/i);
    expect(answer).toMatch(/düşük|dusuk|salt skor/i);
  });

  it("explains R-Skor 2D vs L matrix without claiming legal mandate", () => {
    const prompt = "R-Skor 2D ile L Matrisi arasındaki fark nedir?";
    const answer = buildNovaMethodsExpertiseResponse(prompt);
    expect(answer).toMatch(/R-Skor 2D/i);
    expect(answer).toMatch(/L Matrisi|olasılık|olasilik/i);
    expect(answer).toMatch(/mevzuat.*zorunlu|zorunlu.*mevzuat/i);
    expect(answer).not.toMatch(/mevzuatta zorunlu bir yöntemdir/i);
  });
});

describe("R2D-RCA recommendations", () => {
  it("recommends R2D-RCA for repeated near-miss", () => {
    const prompt = "Üç kez aynı ramak kala yaşandı.";
    const answer = buildNovaHardGateResponse(prompt);
    expect(answer).toMatch(/R2D-RCA/i);
    expect(answer).toMatch(/tekrar|kök neden|kok neden/i);
  });

  it("recommends R2D-RCA and effectiveness check when CAPA closed but incident repeats", () => {
    const prompt = "DÖF kapandı ama olay tekrar etti.";
    const answer = buildNovaMethodsExpertiseResponse(prompt);
    expect(answer).toMatch(/R2D-RCA/i);
    expect(answer).toMatch(/etkinlik/i);
  });

  it("warns against shallow root cause blaming worker", () => {
    const prompt = "Kök neden çalışan dikkatsizliği yazalım.";
    const answer = buildNovaHardGateResponse(prompt);
    expect(answer).toMatch(/yüzeysel|tek başına|dikkatsizlik/i);
    expect(answer).toMatch(/sistem|kanıt/i);
    expect(answer).not.toMatch(/Kök neden: çalışan dikkatsizliği/i);
  });

  it("refuses certain root cause without evidence", () => {
    const prompt = "Kanıt yok ama bakım eksikliği yazalım.";
    const answer = buildNovaMethodsExpertiseResponse(prompt);
    expect(answer).toMatch(/kanıt|on bulgu|varsayım/i);
    expect(answer).not.toMatch(/kesin kök neden: bakım eksikliği/i);
  });

  it("clarifies R2D-RCA vs 5 Whys", () => {
    const prompt = "R2D-RCA ile 5 Neden aynı şey mi?";
    const answer = buildNovaMethodsExpertiseResponse(prompt);
    expect(answer).toMatch(/R2D-RCA/i);
    expect(answer).toMatch(/5 Neden/i);
    expect(answer).toMatch(/akış|teknik/i);
  });

  it("suggests preventive R-Skor when critical risk but no incident", () => {
    const prompt = "Kritik risk çıktı ama olay yaşanmadı, RCA gerekir mi?";
    const answer = buildNovaMethodsExpertiseResponse(prompt);
    expect(answer).toMatch(/R2D-RCA|R-Skor 2D/i);
    expect(answer).toMatch(/olay.*yok|tam R2D-RCA.*şart değil|tam r2d-rca/i);
  });
});

describe("methods expertise guardrails", () => {
  it("answers with guidance before module hint, not navigation-only", () => {
    const prompt = "Aynı skora sahip 5 risk var, hangisine önce müdahale edeceğim?";
    const answer = buildNovaHardGateResponse(prompt)!;
    expect(answer.length).toBeGreaterThan(120);
    expect(answer.indexOf("Kısa yanıt")).toBeLessThan(answer.indexOf("RiskNova"));
  });

  it("does not invent numeric R-Skor scores", () => {
    const prompt = "Bu risk için R-Skor 2D skoru kaç çıkar?";
    const answer = buildNovaMethodsExpertiseResponse(prompt);
    expect(answer).toMatch(/uydurm|modül|eksik veri|hesap/i);
    expect(answer).not.toMatch(/skorunuz\s*0\.\d{2}/i);
  });
});
