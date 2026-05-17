/**
 * Saha risk analizi — görsel bazlı profesyonel PDF çıktısı.
 */

import type { ExportFinding, RiskAnalysisExportData } from "@/lib/risk-analysis-export";
import {
  exportTotalFindings,
  findingActionText,
  findingLegalText,
  resolveExportImageSections,
} from "@/lib/risk-analysis/field-export-sections";
import {
  formatActionTurkish,
  formatFineKinneyBlock,
  formatMatrixBlock,
  riskClassLabelTr,
} from "@/lib/risk-analysis/finding-quality";

function asText(value: unknown, fallback = "-"): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function scoreDetailForFinding(f: ExportFinding): string {
  if (f.scoreDetail) return f.scoreDetail;
  if (f.fkDetails) {
    return formatFineKinneyBlock({
      likelihood: f.fkDetails.likelihood,
      exposure: f.fkDetails.exposure,
      severity: f.fkDetails.severity,
      score: f.score,
      riskClass: f.riskClass,
    });
  }
  if (f.matrixDetails) {
    return formatMatrixBlock({
      likelihood: f.matrixDetails.likelihood,
      severity: f.matrixDetails.severity,
      score: f.score,
      riskClass: f.riskClass,
    });
  }
  if (f.paramDetails && f.paramDetails.length > 0) {
    return f.paramDetails.map((p) => `${p.code}: ${(p.value * 100).toFixed(0)}%`).join(", ");
  }
  return f.scoreLabel || String(f.score);
}

function tableRowSummary(f: ExportFinding): string {
  const code = f.riskCode || "-";
  const params =
    f.fkDetails
      ? `P=${f.fkDetails.likelihood} F=${f.fkDetails.exposure} S=${f.fkDetails.severity}`
      : f.matrixDetails
        ? `O=${f.matrixDetails.likelihood} S=${f.matrixDetails.severity}`
        : "";
  return `${code} | ${f.title} | ${f.category} | ${params} | Skor=${Math.round(f.score)} | ${riskClassLabelTr(f.riskClass)}`;
}

export async function generateFieldRiskAnalysisPdfBytes(data: RiskAnalysisExportData): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  const width = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  const ensureSpace = (height = 12) => {
    if (y + height <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };

  const line = (text: string, size = 10, style: "normal" | "bold" = "normal", color: [number, number, number] = [15, 23, 42]) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const wrapped = doc.splitTextToSize(text, width - margin * 2) as string[];
    ensureSpace(wrapped.length * (size * 0.42) + 3);
    doc.text(wrapped, margin, y);
    y += wrapped.length * (size * 0.42) + 3;
  };

  const label = (name: string, value: unknown) => line(`${name}: ${asText(value)}`, 9);

  const section = (title: string) => {
    ensureSpace(12);
    y += y === margin ? 0 : 3;
    doc.setDrawColor(212, 160, 23);
    doc.line(margin, y, width - margin, y);
    y += 6;
    line(title, 12, "bold", [15, 23, 42]);
  };

  const sections = resolveExportImageSections(data);
  const totalReal = exportTotalFindings(data);
  const criticalHigh = data.criticalCount;

  // Kapak
  line(asText(data.analysisTitle, "Risk Analizi Raporu"), 18, "bold");
  line("RiskNova — Saha Risk Analizi", 10, "bold", [212, 160, 23]);
  label("Firma", data.companyName);
  label("Tarih", data.date);
  label("Yöntem", data.methodLabel);
  label("Lokasyon", data.location);
  label("Bölüm", data.department);

  section("Yönetici Özeti");
  label("Toplam gerçek bulgu", totalReal);
  label("Kritik/yüksek bulgu", criticalHigh);
  label("DÖF adayı", data.dofCandidateCount);
  if (data.failedImageCount) label("Analiz başarısız görsel", data.failedImageCount);
  if (data.pendingImageCount) label("Analiz bekleyen görsel", data.pendingImageCount);
  if (data.analysisNote) line(asText(data.analysisNote), 9);

  section("Yöntem ve Skor Ölçeği");
  line(
    data.method === "fine_kinney"
      ? "Fine-Kinney: Skor = Olasılık (P) × Maruziyet/Frekans (F) × Şiddet (S). Sınıflandırma skor bandına göre yapılır."
      : data.method === "l_matrix"
        ? "5×5 L Matrisi: Skor = Olasılık × Şiddet."
        : data.method === "r_skor"
          ? "R-Skor 2D: RiskNova çok boyutlu parametreleri ve sınıflandırma kullanılır."
          : asText(data.methodLabel),
    9,
  );

  if (data.participants.length > 0) {
    section("Analiz Ekibi");
    data.participants.forEach((p, i) => {
      line(`${i + 1}. ${p.fullName} — ${p.role}${p.title ? ` / ${p.title}` : ""}`, 9);
    });
  }

  section("Görsel Bazlı Risk Analizleri");
  for (const sec of sections) {
    ensureSpace(20);
    line(`Görsel ${sec.imageIndex}: ${sec.fileName}`, 11, "bold");
    label("Alan/lokasyon", sec.areaLocation || sec.rowTitle);
    label("Görsel analiz durumu", sec.analysisStatusLabel);
    if (sec.analysisError) label("Açıklama", sec.analysisError);
    label("Tespit edilen risk sayısı", sec.analysisStatus === "success" ? sec.findingCount : 0);

    const dataUrl = sec.dataUrl ?? "";
    if (dataUrl.startsWith("data:image/")) {
      try {
        ensureSpace(52);
        line("Anotasyonlu görsel", 9, "bold");
        const format = dataUrl.includes("image/png") ? "PNG" : "JPEG";
        const imgW = width - margin * 2;
        doc.addImage(dataUrl, format, margin, y, imgW, imgW * 0.55, undefined, "FAST");
        y += imgW * 0.55 + 4;
      } catch (e) {
        console.warn("[pdf-field-report] image skip", e);
      }
    }

    if (sec.analysisStatus !== "success" || sec.findings.length === 0) {
      if (sec.analysisStatus !== "success") {
        line("Bu görsel için otomatik risk üretilmedi. Manuel doğrulama veya yeniden analiz gerekir.", 9);
      } else {
        line("Bu görselde kayıtlı risk bulunmuyor.", 9);
      }
      y += 2;
      continue;
    }

    line("Risk tablosu", 10, "bold");
    sec.findings.forEach((f, idx) => {
      ensureSpace(14);
      line(`${idx + 1}. ${tableRowSummary(f)}`, 9);
    });

    sec.findings.forEach((f) => {
      ensureSpace(28);
      line(`${f.riskCode || "R?"} — ${f.title}`, 10, "bold");
      line(`Kategori: ${f.category} | Sınıf: ${riskClassLabelTr(f.riskClass)}`, 9);
      line(scoreDetailForFinding(f), 8);
      line(`Önerilen kontrol / acil aksiyon: ${findingActionText(f)}`, 8);
      if (f.recommendation) line(`Mevcut durum / öneri: ${f.recommendation}`, 8);
      if (f.correctiveAction) line(`Düzeltici faaliyet: ${f.correctiveAction}`, 8);
      if (f.preventiveAction) line(`Önleyici faaliyet: ${f.preventiveAction}`, 8);
      if (f.responsible) line(`Sorumlu: ${f.responsible}`, 8);
      if (f.deadline) line(`Termin: ${f.deadline}`, 8);
      if (f.residualRiskNote) line(`Önlem sonrası artık risk: ${f.residualRiskNote}`, 8);
      line(`Mevzuat/RAG bağlamı: ${findingLegalText(f)}`, 8);
    });
  }

  const priority = sections
    .flatMap((s) => s.findings)
    .filter((f) => f.riskClass === "critical" || f.riskClass === "high")
    .slice(0, 15);

  if (priority.length > 0) {
    section("Öncelikli Aksiyon Listesi");
    priority.forEach((f, i) => {
      line(
        `${i + 1}. [${f.riskCode || "-"}] ${f.title} — ${findingActionText(f)}`,
        9,
      );
    });
  }

  if (data.shareUrl || data.shareQrDataUrl) {
    section("Doğrulama");
    if (data.shareUrl) line(`Paylaşım bağlantısı: ${data.shareUrl}`, 8);
    const qr = data.shareQrDataUrl ?? "";
    if (qr.startsWith("data:image/")) {
      try {
        ensureSpace(36);
        doc.addImage(qr, "PNG", margin, y, 28, 28, undefined, "FAST");
        y += 32;
      } catch (e) {
        console.warn("[pdf-field-report] qr skip", e);
      }
    }
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
