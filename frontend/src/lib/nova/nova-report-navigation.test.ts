import { describe, expect, it } from "vitest";
import {
  buildNovaHardGateResponse,
  validateNovaResponse,
} from "./behavior-prompt";
import { resolveNovaNavigationIntent } from "./navigation-intents";
import {
  isNovaExplicitReportsNavigationRequest,
  isNovaReportContentAdvisoryTask,
} from "./nova-report-intent";
import { resolveNovaRoute } from "./request-mode";

describe("nova report navigation policy", () => {
  it("1) contradictory report language — advisory in chat, no Reports", () => {
    const prompt =
      "Bu riski raporda 'kritik ama kabul edilebilir, acil aksiyon gerektirmiyor' diye yazmak istiyorum. Bunu profesyonel rapor diliyle nasıl ifade ederim?";
    expect(isNovaReportContentAdvisoryTask(prompt)).toBe(true);
    expect(resolveNovaNavigationIntent(prompt)).toBeNull();
    const answer = buildNovaHardGateResponse(prompt)!;
    expect(answer).toMatch(/önermem|çelişir/i);
    expect(answer).toMatch(/Risk kritik seviyededir/i);
    expect(answer).not.toMatch(/Raporlar alanına|Sayfaya Git/i);
  });

  it("2) rapora ne yaz — method + ethics, no Reports", () => {
    const prompt =
      "Risk orta görünüyor ama yasal yükümlülük ağır. Rapora ne yazacağımı ve ne yazmamam gerektiğini söyle.";
    expect(resolveNovaRoute(prompt)).toBe("behavior_prompt");
    expect(resolveNovaNavigationIntent(prompt)).toBeNull();
    const answer = buildNovaHardGateResponse(prompt)!;
    expect(answer).toMatch(/R-Skor 2D|R2D-RCA|Kesinlikle yazmayın/i);
    expect(answer).not.toMatch(/Raporlar alanına/i);
  });

  it("3) müşteri raporu reddetti — customer reply, no Reports", () => {
    const prompt = "Müşteri raporu reddetti; suçlayıcı olmayan net bir cevap yaz.";
    expect(resolveNovaNavigationIntent(prompt)).toBeNull();
    const answer = buildNovaHardGateResponse(prompt)!;
    expect(answer).toMatch(/Merhaba|profesyonel|Geri bildiriminizi/i);
    expect(answer).not.toMatch(/Raporlar alanına|Sayfaya Git/i);
  });

  it("4) belirsizlik in risk report — example text, no Reports", () => {
    const prompt = "Risk raporunda belirsizliği nasıl profesyonel yazarım?";
    expect(resolveNovaNavigationIntent(prompt)).toBeNull();
    const answer = buildNovaHardGateResponse(prompt)!;
    expect(answer).toMatch(/belirsizlik|doğrulandıkça/i);
    expect(answer).not.toMatch(/Raporlar alanına/i);
  });

  it("5) explicit Reports page request — navigation allowed", () => {
    const prompt = "Raporlar sayfasına git.";
    expect(isNovaExplicitReportsNavigationRequest(prompt)).toBe(true);
    expect(isNovaReportContentAdvisoryTask(prompt)).toBe(false);
    const intent = resolveNovaNavigationIntent(prompt);
    expect(intent?.navigation.destination).toBe("reports");
    expect(intent?.navigation.url).toBe("/reports");
  });

  it("validator rejects Reports navigation copy on report advisory prompts", () => {
    const prompt = "Raporda nasıl yazmalıyım?";
    const invalid = validateNovaResponse({
      prompt,
      response:
        "Raporlar alanına yönlendiriyorum. Raporlama ve çıktı alma işlemleri Raporlar alanında toplanır. Sayfaya Git.",
    });
    expect(invalid.valid).toBe(false);
    if (!invalid.valid) {
      expect(invalid.replacement).not.toMatch(/Raporlar alanına yönlendiriyorum/i);
    }
  });
});
