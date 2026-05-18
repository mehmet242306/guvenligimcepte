/**
 * Saha risk analizi — denetime uygun PDF (tablolar, UTF-8 Türkçe, Fine-Kinney).
 */

import type { ExportFinding, RiskAnalysisExportData } from "@/lib/risk-analysis-export";
import {
  exportTotalFindings,
  findingActionText,
  findingLegalText,
  resolveExportImageSections,
} from "@/lib/risk-analysis/field-export-sections";
import { buildFieldReportConsolidatedJson } from "@/lib/risk-analysis/field-report-json";
import {
  formatFineKinneyBlock,
  formatMatrixBlock,
  riskClassLabelTr,
} from "@/lib/risk-analysis/finding-quality";

function asText(value: unknown, fallback = "-"): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function riskClassFill(riskClass: string): [number, number, number] {
  switch (riskClass) {
    case "critical":
      return [127, 29, 29];
    case "high":
      return [234, 88, 12];
    case "medium":
      return [202, 138, 4];
    case "low":
    case "follow_up":
      return [22, 163, 74];
    default:
      return [100, 116, 139];
  }
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
      pRationale: f.fkPRationale,
      fRationale: f.fkFRationale,
      sRationale: f.fkSRationale,
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
  return f.scoreLabel || String(f.score);
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export async function generateFieldRiskAnalysisPdfBytes(data: RiskAnalysisExportData): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const margin = 14;
  const width = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const reportDate = asText(data.date, new Date().toLocaleDateString("tr-TR"));
  const reportTitle = asText(data.analysisTitle, "Saha Risk Analizi Raporu");
  let y = margin;

  const addPageHeaderFooter = () => {
    const page = doc.getNumberOfPages();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(reportTitle, margin, 10);
    doc.text(reportDate, width - margin, 10, { align: "right" });
    doc.text(`Sayfa ${page}`, width / 2, pageHeight - 8, { align: "center" });
    doc.setTextColor(15, 23, 42);
  };

  const ensureSpace = (height = 12) => {
    if (y + height <= pageHeight - margin - 10) return;
    doc.addPage();
    y = margin + 6;
    addPageHeaderFooter();
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

  const section = (title: string) => {
    ensureSpace(14);
    y += y === margin ? 0 : 4;
    doc.setDrawColor(212, 160, 23);
    doc.line(margin, y, width - margin, y);
    y += 6;
    line(title, 12, "bold");
  };

  const consolidated = buildFieldReportConsolidatedJson(data);
  const sections = resolveExportImageSections(data);
  const totalReal = exportTotalFindings(data);

  // Kapak
  line(reportTitle, 18, "bold");
  line("RiskNova — Saha Risk Analizi", 10, "bold", [212, 160, 23]);
  line(`Firma: ${asText(data.companyName)}`, 10);
  line(`Lokasyon: ${asText([data.location, data.department].filter(Boolean).join(" / "))}`, 10);
  line(`Tarih: ${reportDate}`, 10);
  line(`Yöntem: ${asText(data.methodLabel)}`, 10);
  addPageHeaderFooter();

  doc.addPage();
  y = margin + 6;
  addPageHeaderFooter();

  section("1. Yönetici Özeti");
  const oz = consolidated.yonetici_ozeti;
  line(`Toplam görsel: ${oz.toplam_gorsel} | Toplam gerçek bulgu: ${oz.toplam_bulgu}`, 9);
  line(`Kritik: ${oz.kritik} | Yüksek: ${oz.yuksek} | Orta: ${oz.orta} | Düşük/izleme: ${oz.dusuk}`, 9);
  line(`DÖF adayı (tüm bulgular): ${data.dofCandidateCount}`, 9);
  if (data.failedImageCount) line(`Analiz başarısız görsel: ${data.failedImageCount}`, 9, "normal", [185, 28, 28]);

  if (oz.acil_durdurma_gerekenler.length > 0) {
    line("Acil durdurma / derhal müdahale gereken işler:", 9, "bold");
    oz.acil_durdurma_gerekenler.slice(0, 6).forEach((t) => line(`• ${truncate(t, 200)}`, 8));
  }
  if (oz.ilk_24_saat_aksiyonlari.length > 0) {
    line("İlk 24 saat aksiyonları:", 9, "bold");
    oz.ilk_24_saat_aksiyonlari.slice(0, 8).forEach((t) => line(`• ${truncate(t, 200)}`, 8));
  }
  if (oz.yedi_gun_aksiyonlari.length > 0) {
    line("7 gün içinde aksiyonlar:", 9, "bold");
    oz.yedi_gun_aksiyonlari.slice(0, 10).forEach((t) => line(`• ${truncate(t, 200)}`, 8));
  }
  if (data.analysisNote) line(asText(data.analysisNote), 9);

  section("2. Metodoloji ve Fine-Kinney");
  line(
    data.method === "fine_kinney"
      ? "Fine-Kinney: Skor = P (olasılık) × F (maruziyet/frekans) × S (şiddet). P/F/S gerekçeleri saha fotoğrafı ve varsayımlarla birlikte raporlanır; frekans tek karede kesin değildir."
      : asText(data.methodLabel),
    9,
  );
  consolidated.rapor_bilgisi.sinirlamalar.forEach((s) => line(`• ${s}`, 8));

  if (data.participants.length > 0) {
    section("Analiz Ekibi");
    data.participants.forEach((p, i) => {
      line(`${i + 1}. ${p.fullName} — ${p.role}${p.title ? ` / ${p.title}` : ""}`, 9);
    });
  }

  section("3. Konsolide Risk Kayıt Tablosu");
  const allFindings = sections.flatMap((s) => s.findings);
  if (allFindings.length > 0) {
    ensureSpace(20);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Kod", "Risk Başlığı", "Gözlemlenen Kanıt", "P", "F", "S", "Skor", "Sınıf", "Acil Aksiyon", "Güven"]],
      body: allFindings.map((f) => [
        asText(f.riskCode),
        truncate(f.title, 60),
        truncate(f.observedEvidence ?? f.recommendation, 80),
        f.fkDetails ? String(f.fkDetails.likelihood) : "-",
        f.fkDetails ? String(f.fkDetails.exposure) : "-",
        f.fkDetails ? String(f.fkDetails.severity) : "-",
        String(Math.round(f.score)),
        riskClassLabelTr(f.riskClass),
        truncate(f.immediateAction ?? findingActionText(f), 70),
        asText(f.confidenceLevelTr, "-"),
      ]),
      styles: { font: "helvetica", fontSize: 7, cellPadding: 1.5, overflow: "linebreak", valign: "top" },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 28 },
        2: { cellWidth: 38 },
        8: { cellWidth: 32 },
      },
      didParseCell: (hook) => {
        if (hook.section === "body" && hook.column.index === 7) {
          const f = allFindings[hook.row.index];
          if (f) {
            hook.cell.styles.fillColor = riskClassFill(f.riskClass);
            hook.cell.styles.textColor = 255;
          }
        }
      },
    });
    y = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
    y += 6;
    addPageHeaderFooter();
  } else {
    line("Kayıtlı gerçek risk bulgusu yok.", 9);
  }

  section("4. Görsel Bazlı Analiz");
  for (const sec of sections) {
    doc.addPage();
    y = margin + 6;
    addPageHeaderFooter();

    const gCode = `G${sec.imageIndex}`;
    line(`${gCode} — ${sec.fileName}`, 11, "bold");
    line(`Saha tanımı: ${asText(sec.areaLocation || sec.rowTitle)}`, 9);
    line(`Durum: ${sec.analysisStatusLabel}`, 9);
    if (sec.imageLimitations && sec.imageLimitations.length > 0) {
      line("Görsel sınırlılıkları:", 9, "bold");
      sec.imageLimitations.forEach((lim) => line(`• ${lim}`, 8));
    }

    const dataUrl = sec.dataUrl ?? "";
    if (dataUrl.startsWith("data:image/")) {
      try {
        ensureSpace(52);
        const format = dataUrl.includes("image/png") ? "PNG" : "JPEG";
        const imgW = width - margin * 2;
        doc.addImage(dataUrl, format, margin, y, imgW, imgW * 0.52, undefined, "FAST");
        y += imgW * 0.52 + 4;
      } catch (e) {
        console.warn("[pdf-field-report] image skip", e);
      }
    }

    if (sec.analysisStatus !== "success" || sec.findings.length === 0) {
      line(
        sec.analysisStatus !== "success"
          ? "Bu görsel için otomatik risk üretilmedi. Saha doğrulaması veya yeniden analiz gerekir."
          : "Bu görselde kayıtlı risk bulunmuyor.",
        9,
      );
      continue;
    }

    ensureSpace(16);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Kod", "Risk", "P", "F", "S", "Skor", "Sınıf"]],
      body: sec.findings.map((f) => [
        asText(f.riskCode),
        truncate(f.title, 50),
        f.fkDetails ? String(f.fkDetails.likelihood) : "-",
        f.fkDetails ? String(f.fkDetails.exposure) : "-",
        f.fkDetails ? String(f.fkDetails.severity) : "-",
        String(Math.round(f.score)),
        riskClassLabelTr(f.riskClass),
      ]),
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    });
    y = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20;
    y += 4;

    for (const f of sec.findings) {
      doc.addPage();
      y = margin + 6;
      addPageHeaderFooter();
      line(`${f.riskCode ?? "R?"} — ${f.title}`, 11, "bold");
      line(`Kategori: ${f.category} | Sınıf: ${riskClassLabelTr(f.riskClass)} | Güven: ${asText(f.confidenceLevelTr)}`, 9);
      if (f.observedEvidence) line(`Gözlemlenen kanıt: ${f.observedEvidence}`, 8);
      if (f.verificationNeeded) line(`Saha doğrulaması gerekli: ${f.verificationNeeded}`, 8);
      if (f.possibleOutcome) line(`Olası sonuç: ${f.possibleOutcome}`, 8);
      if (f.currentControl) line(`Mevcut kontrol: ${f.currentControl}`, 8);
      line(scoreDetailForFinding(f), 8);
      line(`Acil aksiyon: ${f.immediateAction ?? findingActionText(f)}`, 8);
      if (f.correctiveAction) line(`Düzeltici faaliyet: ${f.correctiveAction}`, 8);
      if (f.preventiveAction) line(`Önleyici faaliyet: ${f.preventiveAction}`, 8);
      if (f.residualRiskNote) line(`Önlem sonrası artık risk: ${f.residualRiskNote}`, 8);
      if (f.responsible) line(`Sorumlu: ${f.responsible}`, 8);
      if (f.deadline) line(`Termin: ${f.deadline}`, 8);
      if (f.completionProof) line(`Tamamlanma kanıtı: ${f.completionProof}`, 8);
      line(`Mevzuat bağlamı: ${findingLegalText(f)}`, 8);
    }
  }

  if (consolidated.oncelikli_aksiyon_listesi.length > 0) {
    doc.addPage();
    y = margin + 6;
    addPageHeaderFooter();
    section("5. Öncelikli Aksiyon Listesi");
    consolidated.oncelikli_aksiyon_listesi.forEach((t) => line(t, 8));
  }

  if (consolidated.saha_dogrulama_checklisti.length > 0) {
    section("6. Saha Doğrulama Kontrol Listesi");
    consolidated.saha_dogrulama_checklisti.forEach((t, i) => line(`${i + 1}. ${t}`, 8));
  }

  if (consolidated.mevzuat_referanslari.length > 0) {
    section("7. Mevzuat ve Standart Referansları (özet)");
    consolidated.mevzuat_referanslari.forEach((t) => line(`• ${truncate(t, 220)}`, 8));
  }

  if (data.shareUrl || data.shareQrDataUrl) {
    section("Doğrulama");
    if (data.shareUrl) line(`Paylaşım: ${data.shareUrl}`, 8);
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

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    addPageHeaderFooter();
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
