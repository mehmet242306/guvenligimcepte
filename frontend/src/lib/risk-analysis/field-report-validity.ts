/**
 * Saha raporu geçerlilik — başarısız analiz asla "0 risk" sayılmaz.
 */

import type { ExportImageSection, RiskAnalysisExportData } from "@/lib/risk-analysis-export";
import { resolveExportImageSections } from "@/lib/risk-analysis/field-export-sections";
import { exportTotalFindings } from "@/lib/risk-analysis/field-export-sections";

export const FAILED_ANALYSIS_WARNING =
  "Bu rapor nihai risk analizi değildir. Analiz başarısız görseller 0 risk anlamına gelmez.";

export const FAILED_IMAGE_NOTE =
  "Bu görsel analiz edilemedi; 0 risk anlamına gelmez. Yeniden analiz veya manuel doğrulama gerekir.";

export function countImagesByStatus(sections: ExportImageSection[]) {
  let basarili = 0;
  let kismi = 0;
  let basarisiz = 0;
  for (const s of sections) {
    const st = s.imageAnalysisStatus ?? s.analysisStatus;
    if (st === "failed" || st === "manual_required") basarisiz += 1;
    else if (st === "partial" || st === "pending") kismi += 1;
    else if (st === "success") basarili += 1;
    else if (s.analysisStatus === "failed") basarisiz += 1;
    else basarili += 1;
  }
  return { basarili, kismi, basarisiz };
}

export function isReportIncomplete(data: RiskAnalysisExportData): boolean {
  const failed = (data.failedImageCount ?? 0) > 0 || (data.pendingImageCount ?? 0) > 0;
  const sections = resolveExportImageSections(data);
  const { basarisiz, kismi } = countImagesByStatus(sections);
  const constructionZeroRisk = sections.some((s) =>
    s.sceneType === "construction_site" &&
    s.analysisStatus === "success" &&
    s.imageAnalysisStatus !== "failed" &&
    s.findings.length === 0
  );
  return failed || basarisiz > 0 || kismi > 0 || constructionZeroRisk;
}

export function reportTitleWithValidity(baseTitle: string, incomplete: boolean): string {
  if (!incomplete) return baseTitle;
  return `${baseTitle} — Eksik Analiz / Yeniden Değerlendirme Gerekli`;
}

export function buildReportValidityBlock(data: RiskAnalysisExportData) {
  const sections = resolveExportImageSections(data);
  const counts = countImagesByStatus(sections);
  const incomplete = isReportIncomplete(data);
  const constructionZeroRisk = sections.some((s) =>
    s.sceneType === "construction_site" &&
    s.analysisStatus === "success" &&
    s.imageAnalysisStatus !== "failed" &&
    s.findings.length === 0
  );
  const reasons = [
    counts.basarisiz > 0 || counts.kismi > 0
      ? `${counts.basarisiz} görsel analiz edilemedi; ${counts.kismi} görsel kısmi/beklemede.`
      : "",
    constructionZeroRisk ? "İnşaat sahasında 0 risk kabul edilmez." : "",
  ].filter(Boolean);
  return {
    analiz_gecerli_mi: !incomplete,
    gecersizlik_nedeni: incomplete ? reasons.join(" ") : "",
    uyari: incomplete ? FAILED_ANALYSIS_WARNING : "",
    analiz_gecerlilik_durumu: incomplete ? "Eksik / geçersiz — yeniden değerlendirme gerekli" : "Geçerli",
  };
}

export function formatRiskCountForDisplay(
  status: string,
  count: number | null | undefined,
): string {
  if (status === "failed" || status === "manual_required") return "Değerlendirilemedi (null)";
  if (status === "partial" || status === "pending") return "Kısmi — saha doğrulaması gerekli";
  if (count === null || count === undefined) return "-";
  return String(count);
}

export function safeExecutiveRiskTotal(data: RiskAnalysisExportData): number {
  if (isReportIncomplete(data)) {
    return exportTotalFindings(data);
  }
  return exportTotalFindings(data);
}
