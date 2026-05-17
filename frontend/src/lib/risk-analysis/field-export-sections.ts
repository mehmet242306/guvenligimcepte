/**
 * Görsel bazlı export bölümleri — PDF, Word, Excel ortak çözümleyici.
 */

import type { ExportFinding, ExportImageSection, RiskAnalysisExportData } from "@/lib/risk-analysis-export";
import { formatLegalContextForRisk, imageAnalysisStatusLabel } from "@/lib/risk-analysis/finding-quality";

export function resolveExportImageSections(data: RiskAnalysisExportData): ExportImageSection[] {
  if (data.imageSections && data.imageSections.length > 0) {
    return data.imageSections;
  }

  const byImage = new Map<string, ExportFinding[]>();
  for (const f of data.findings) {
    if (!byImage.has(f.imageId)) byImage.set(f.imageId, []);
    byImage.get(f.imageId)!.push(f);
  }

  return data.images.map((img, i) => {
    const findings = byImage.get(img.imageId) ?? [];
    const status = img.analysisStatus ?? (img.analysisError ? "failed" : "success");
    return {
      imageIndex: i + 1,
      imageId: img.imageId,
      fileName: img.fileName,
      rowTitle: img.rowTitle,
      areaLocation: img.areaSummary?.trim() || img.rowTitle,
      analysisStatus: status,
      analysisStatusLabel: imageAnalysisStatusLabel(status),
      analysisError: img.analysisError,
      findingCount: findings.length,
      dataUrl: img.dataUrl,
      findings,
    };
  });
}

export function exportTotalFindings(data: RiskAnalysisExportData): number {
  return data.realTotalFindings ?? data.totalFindings;
}

export function findingLegalText(f: ExportFinding): string {
  if (f.legalContext?.trim()) return f.legalContext.trim();
  const refs = f.legalReferences ?? [];
  if (refs.length === 0) return formatLegalContextForRisk(f.category, refs);
  return refs.map((r) => [r.law, r.article, r.description].filter(Boolean).join(" — ")).join("; ");
}

export function findingActionText(f: ExportFinding): string {
  return (f.actionTr || f.action || "-").trim() || "-";
}

export function findingPinLabel(f: ExportFinding, indexInImage: number): string {
  return f.riskCode || `R${indexInImage + 1}`;
}
