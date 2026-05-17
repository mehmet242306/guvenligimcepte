import { describe, expect, it } from "vitest";
import { validateNovaResponse } from "./behavior-prompt";
import { resolveNovaNavigationIntent } from "./navigation-intents";
import {
  isAdminOnlyNavigationUrl,
  isForbiddenUserNavigationCopy,
  isNovaRagServiceRequest,
} from "./nova-navigation-policy";
import { formatNovaLegalRagPayload } from "./nova-rag-service";
import { resolveNovaRoute, shouldUseNovaLegalRag } from "./request-mode";

describe("nova RAG navigation policy", () => {
  it("a) roof incident + RAG — no admin mevzuat navigation", () => {
    const prompt =
      "Olay: Bakım ekibi ayda yalnızca bir kez çatıdaki havalandırma ünitesine erişiyor. Çatı kenarında korkuluk yok. Bu olayı analiz et, RAG/mevzuat kontrolü yap.";
    expect(isNovaRagServiceRequest(prompt)).toBe(true);
    expect(shouldUseNovaLegalRag(prompt)).toBe(true);
    expect(resolveNovaRoute(prompt)).not.toBe("navigation");
    expect(resolveNovaNavigationIntent(prompt)).toBeNull();

    const formatted = formatNovaLegalRagPayload(prompt, {
      answer: "Genel yüksekte çalışma önlemleri.",
      confidence: 0.4,
      sources: [],
      retrievalMode: "no_match",
    });
    expect(formatted.answer).not.toMatch(/Mevzuat ve Rehberler|Ayarlar\s*>\s*Mevzuat|Sayfaya Git/i);
    expect(formatted.sources).toHaveLength(0);
  });

  it("b) chemical exposure + RAG — no irrelevant badge sources", () => {
    const prompt =
      "Boya hazırlama alanında çalışanlar baş ağrısı ve göz yanması bildiriyor. Ölçüm normal ama vardiya sonu şikâyet artıyor. RAG/mevzuat kontrolü yap.";
    expect(resolveNovaNavigationIntent(prompt)).toBeNull();
    const formatted = formatNovaLegalRagPayload(prompt, {
      answer: "Doğrudan ilgili kaynak bulunamadı; genel maruziyet kontrolü önerilir.",
      confidence: 0.55,
      sources: [],
      retrievalMode: "no_match",
    });
    expect(formatted.confidence).toBeLessThan(0.68);
    expect(formatted.sources).toHaveLength(0);
    expect(formatted.answer).not.toMatch(/Güven:\s*Yüksek|Kaynak:\s*Doğrulanmış/i);
  });

  it("c) generic incident RAG — chat service not page", () => {
    const prompt = "Bu olayı analiz et, mevzuat/RAG kontrolü yap.";
    expect(shouldUseNovaLegalRag(prompt)).toBe(true);
    expect(resolveNovaNavigationIntent(prompt)).toBeNull();
  });

  it("d) show RAG result — no admin redirect", () => {
    const prompt = "RAG sonucunu göster.";
    expect(shouldUseNovaLegalRag(prompt)).toBe(true);
    expect(resolveNovaNavigationIntent(prompt)).toBeNull();
  });

  it("denylist blocks settings legislation URLs", () => {
    expect(isAdminOnlyNavigationUrl("/settings?tab=mevzuat")).toBe(true);
    expect(isAdminOnlyNavigationUrl("/risk-analysis")).toBe(false);
  });

  it("validator rejects admin mevzuat navigation copy", () => {
    const prompt = "RAG/mevzuat kontrolü yap";
    const invalid = validateNovaResponse({
      prompt,
      response:
        "Mevzuat ve Rehberler alanına yönlendiriyorum. Ayarlar > Mevzuat sekmesinde yönetilir. Sayfaya Git.",
    });
    expect(invalid.valid).toBe(false);
  });

  it("mevzuat keyword alone does not navigate to settings", () => {
    const intent = resolveNovaNavigationIntent("mevzuat nerede");
    expect(intent).toBeNull();
  });

  it("forbidden copy detector", () => {
    expect(
      isForbiddenUserNavigationCopy(
        "Mevzuat ve Rehberler alanına yönlendiriyorum. Ayarlar > Mevzuat sekmesinde yönetilir.",
      ),
    ).toBe(true);
  });
});
