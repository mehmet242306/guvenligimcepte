/**
 * Saha risk analizi — gerçek risk / sentetik fallback / API hata ayrımı.
 */

export type ImageAnalysisStatus = "success" | "failed" | "pending" | "manual_required" | "partial";

const SYNTHETIC_TITLE_PATTERN =
  /(?:ai\s*yanit\w*\s*alinamad|ai\s*yanıt\w*\s*alınamad|manuel\s*dogrulama\s*gerek|saha\s*risk\s*envanteri|analiz\s*tamamlanamad|timeout|api\s*hatas|high\s*risk$)/i;

const GENERIC_LEGAL_SNIPPET =
  /6331.*madde\s*4.*risk\s*degerlendirme.*madde\s*8/i;

export type RiskCountInput = {
  title: string;
  category: string;
  isManual?: boolean;
  riskClass?: string;
  scoreLabel?: string;
  recommendation?: string;
  analysisStatus?: ImageAnalysisStatus;
};

export function isSyntheticOrFailedFinding(f: RiskCountInput): boolean {
  const title = String(f.title ?? "").trim();
  const category = String(f.category ?? "").trim().toLowerCase();
  if (!title) return true;
  if (SYNTHETIC_TITLE_PATTERN.test(title)) return true;
  if (category === "diger" && SYNTHETIC_TITLE_PATTERN.test(`${title} ${f.recommendation ?? ""}`)) {
    return true;
  }
  if (f.scoreLabel && /^high\s*risk$/i.test(String(f.scoreLabel).trim()) && !f.isManual) {
    return true;
  }
  return false;
}

export function filterRealFindings<T extends RiskCountInput>(findings: T[]): T[] {
  return findings.filter((f) => !isSyntheticOrFailedFinding(f));
}

export function imageAnalysisStatusLabel(status: ImageAnalysisStatus): string {
  switch (status) {
    case "success":
      return "Başarılı";
    case "failed":
      return "Başarısız — yeniden deneme veya manuel doğrulama gerekli";
    case "manual_required":
      return "Manuel risk girişi gerekli";
    case "partial":
      return "Kısmi analiz — saha doğrulaması gerekli";
    default:
      return "Analiz bekliyor";
  }
}

export function riskClassLabelTr(riskClass: string): string {
  switch (riskClass) {
    case "critical":
      return "Kritik";
    case "high":
      return "Yüksek";
    case "medium":
      return "Orta";
    case "low":
      return "Düşük";
    case "follow_up":
      return "İzleme";
    default:
      return riskClass || "-";
  }
}

/** İngilizce risk-scoring action metinlerini Türkçe karşılığa çevir. */
export function formatActionTurkish(action: string, riskClass: string): string {
  const a = String(action ?? "").trim();
  if (!a) {
    if (riskClass === "critical") return "Derhal aksiyon: çalışma geçici olarak durdurulmalı veya alan güvenli hale getirilmelidir.";
    if (riskClass === "high") return "Öncelikli aksiyon planlanmalı; sorumlu ve termin atanmalıdır.";
    if (riskClass === "medium") return "Kısa vadede iyileştirme planlanmalıdır.";
    return "Rutin izleme yeterlidir.";
  }
  const lower = a.toLowerCase();
  if (lower.includes("stop work") || lower.includes("stopping work")) {
    return "Derhal aksiyon: çalışma geçici olarak durdurulmalı veya alan güvenli hale getirilmelidir.";
  }
  if (lower.includes("immediate action")) {
    return "Derhal aksiyon alınmalı; sorumlu kişi ve termin belirlenmelidir.";
  }
  if (lower.includes("priority intervention")) {
    return "Öncelikli müdahale ve takip gerekir.";
  }
  if (lower.includes("short term")) {
    return "Kısa vadede iyileştirme planlanmalıdır.";
  }
  if (lower.includes("monitoring") || lower.includes("review")) {
    return "İzleme altında tutulmalı; periyodik yeniden değerlendirme yapılmalıdır.";
  }
  return a;
}

export function buildFineKinneyRationaleFromFkParams(
  fkParams?: Record<string, unknown> | null,
): string | undefined {
  if (!fkParams || typeof fkParams !== "object") return undefined;
  const parts = [
    fkParams.pRationale ? `P gerekçesi: ${String(fkParams.pRationale)}` : "",
    fkParams.fRationale ? `F gerekçesi: ${String(fkParams.fRationale)}` : "",
    fkParams.sRationale ? `S gerekçesi: ${String(fkParams.sRationale)}` : "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join("\n") : undefined;
}

export function formatFineKinneyBlock(details: {
  likelihood: number;
  severity: number;
  exposure: number;
  score: number;
  riskClass: string;
  rationale?: string;
  pRationale?: string;
  fRationale?: string;
  sRationale?: string;
}): string {
  const rationale =
    details.rationale ??
    buildFineKinneyRationaleFromFkParams({
      pRationale: details.pRationale,
      fRationale: details.fRationale,
      sRationale: details.sRationale,
    });
  return [
    `Fine-Kinney: P (Olasılık) = ${details.likelihood}`,
    `F (Maruziyet/Frekans) = ${details.exposure}`,
    `S (Şiddet) = ${details.severity}`,
    `Skor = P × F × S = ${Math.round(details.score)}`,
    `Sınıf = ${riskClassLabelTr(details.riskClass)}`,
    rationale ? rationale : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatMatrixBlock(details: {
  likelihood: number;
  severity: number;
  score: number;
  riskClass: string;
  rationale?: string;
}): string {
  return [
    `5×5 L Matrisi: Olasılık = ${details.likelihood}`,
    `Şiddet = ${details.severity}`,
    `Skor = Olasılık × Şiddet = ${Math.round(details.score)}`,
    `Sınıf = ${riskClassLabelTr(details.riskClass)}`,
    details.rationale ? `Gerekçe: ${details.rationale}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatLegalContextForRisk(
  category: string,
  legalReferences?: { law: string; article: string; description: string }[],
): string {
  const refs = Array.isArray(legalReferences) ? legalReferences : [];
  const filtered = refs.filter((r) => {
    const blob = `${r.law} ${r.article} ${r.description}`;
    if (GENERIC_LEGAL_SNIPPET.test(blob) && refs.length > 1) return false;
    return Boolean(r.law?.trim() || r.description?.trim());
  });

  if (filtered.length === 0) {
    const cat = category.toLowerCase();
    if (/(elektrik|pano|kablo)/.test(cat)) {
      return "Elektrik tesisatı, pano erişimi ve yetkisiz müdahale riskleri için ilgili iş ekipmanı ve iş güvenliği mevzuatı bağlamında değerlendirme yapılmalıdır. Doğrudan doğrulanmış kaynak bulunamadı.";
    }
    if (/(yangin|acil|cikis|tahliye)/.test(cat)) {
      return "Acil çıkış, tahliye ve yangın önlemleri bağlamında işyeri düzenlemesi ve acil durum planı gereklilikleri göz önünde bulundurulmalıdır. Doğrudan doğrulanmış kaynak bulunamadı.";
    }
    if (/(kimyasal|etiket|sds|gbf)/.test(cat)) {
      return "Kimyasal depolama, etiketleme ve maruziyet kontrolleri için ilgili yönetmelik hükümleri değerlendirilmelidir. Doğrudan doğrulanmış kaynak bulunamadı.";
    }
    return "Doğrudan doğrulanmış kaynak bulunamadı; risk türüne özel mevzuat kontrolü önerilir.";
  }

  return filtered
    .map((r) => [r.law, r.article, r.description].filter(Boolean).join(" — "))
    .join("; ");
}

export function computeRiskStats<T extends RiskCountInput & { riskClass?: string }>(
  findings: T[],
  isHighOrCritical: (riskClass: string) => boolean,
): {
  totalReal: number;
  criticalHigh: number;
  dofCandidates: number;
} {
  const real = filterRealFindings(findings);
  return {
    totalReal: real.length,
    criticalHigh: real.filter((f) => isHighOrCritical(String(f.riskClass ?? ""))).length,
    dofCandidates: real.length,
  };
}

export function annotationColorForRiskClass(riskClass: string): { stroke: string; fill: string; labelBg: string } {
  switch (riskClass) {
    case "critical":
      return { stroke: "#7F1D1D", fill: "rgba(127, 29, 29, 0.18)", labelBg: "#7F1D1D" };
    case "high":
      return { stroke: "#EA580C", fill: "rgba(234, 88, 12, 0.15)", labelBg: "#EA580C" };
    case "medium":
      return { stroke: "#CA8A04", fill: "rgba(202, 138, 4, 0.15)", labelBg: "#CA8A04" };
    case "low":
    case "follow_up":
      return { stroke: "#16A34A", fill: "rgba(22, 163, 74, 0.12)", labelBg: "#16A34A" };
    default:
      return { stroke: "#CA8A04", fill: "rgba(202, 138, 4, 0.15)", labelBg: "#CA8A04" };
  }
}
