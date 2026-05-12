/**
 * Risk Analizi Export: PDF, Word, Excel
 * Profesyonel ISG rapor formatı — SATIR BAZLI GRUPLAMA
 *
 * Her satır (risk alanı) kendi görselleri ve tespitleriyle birlikte
 * gruplanmış şekilde export edilir.
 */

import ExcelJS from "exceljs";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ImageRun,
  ShadingType,
  PageBreak,
} from "docx";

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */

export type ExportImage = {
  imageId: string;
  rowTitle: string;
  dataUrl: string;
  fileName: string;
  findingCount: number;
  /** Yeni: Gorsel meta verileri */
  imageRelevance?: "relevant" | "irrelevant" | "not_real_photo";
  imageDescription?: string;
  areaSummary?: string;
  positiveObservations?: string[];
  photoQuality?: "good" | "moderate" | "poor";
};

export type ExportFinding = {
  rowTitle: string;
  imageId: string;
  title: string;
  category: string;
  severity: string;
  severityLabel: string;
  score: number;
  scoreLabel: string;
  riskClass: string;
  action: string;
  recommendation: string;
  confidence: number;
  isManual: boolean;
  correctiveActionRequired: boolean;
  method: string;
  methodLabel: string;
  paramDetails?: { code: string; label: string; value: number; contribution: number }[];
  fkDetails?: { likelihood: number; severity: number; exposure: number };
  matrixDetails?: { likelihood: number; severity: number };
  fmeaDetails?: { severity: number; occurrence: number; detection: number; rpn: number };
  hazopDetails?: { severity: number; likelihood: number; detectability: number; guideWord: string; parameter: string; deviation: string };
  bowTieDetails?: { threatProbability: number; consequenceSeverity: number; preventionBarriers: number; mitigationBarriers: number; rawRisk: number; residualRisk: number };
  ftaDetails?: { componentCount: number; gateType: string; systemProbability: number; systemCriticality: number };
  checklistDetails?: { compliancePercent: number; totalItems: number; compliantCount: number; nonCompliantCount: number };
  jsaDetails?: { jobTitle: string; stepCount: number; highRiskStepCount: number; maxStepScore: number; avgStepScore: number };
  lopaDetails?: { initiatingEventFreq: number; mitigatedFreq: number; riskReductionFactor: number; layerCount: number; meetsTarget: boolean };
  legalReferences?: { law: string; article: string; description: string }[];
};

export type ExportParticipant = {
  fullName: string;
  role: string;
  title: string;
  certificateNo: string;
};

export type RiskAnalysisExportData = {
  analysisTitle: string;
  analysisNote: string;
  companyName: string;
  companyKind: string;
  companySector: string;
  companyHazardClass: string;
  companyAddress: string;
  companyLogoUrl: string;
  location: string;
  department: string;
  method: string;
  methodLabel: string;
  participants: ExportParticipant[];
  findings: ExportFinding[];
  images: ExportImage[];
  totalFindings: number;
  criticalCount: number;
  dofCandidateCount: number;
  date: string;
  shareQrDataUrl?: string;
  shareUrl?: string;
};

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

function severityColor(s: string): string {
  return s === "critical" ? "#7F1D1D" : s === "high" ? "#DC2626" : s === "medium" ? "#F97316" : s === "low" ? "#F59E0B" : "#10B981";
}

function severityBg(s: string): string {
  return s === "critical" ? "#FEE2E2" : s === "high" ? "#FEF2F2" : s === "medium" ? "#FFF7ED" : s === "low" ? "#FFFBEB" : "#ECFDF5";
}

function scoreDisplay(f: ExportFinding): string {
  const m = f.method;
  // Percentage-based methods (0-1 range)
  if (m === "r_skor" || m === "bow_tie" || m === "fta") return (f.score * 100).toFixed(0);
  // Checklist: compliance percent
  if (m === "checklist" && f.checklistDetails) return `%${f.checklistDetails.compliancePercent}`;
  // LOPA: scientific notation
  if (m === "lopa" && f.lopaDetails) return f.lopaDetails.mitigatedFreq.toExponential(1);
  // JSA: decimal
  if (m === "jsa") return f.score.toFixed(1);
  // Integer-based methods (FK, Matrix, FMEA, HAZOP)
  return String(Math.round(f.score));
}

function methodScoreDetail(f: ExportFinding): string {
  if (f.fmeaDetails) return `S(${f.fmeaDetails.severity}) x O(${f.fmeaDetails.occurrence}) x D(${f.fmeaDetails.detection}) = RPN ${f.fmeaDetails.rpn}`;
  if (f.hazopDetails) return `S(${f.hazopDetails.severity}) x L(${f.hazopDetails.likelihood}) x (6-D)(${6 - f.hazopDetails.detectability}) | ${f.hazopDetails.guideWord}`;
  if (f.bowTieDetails) return `Ham: ${f.bowTieDetails.rawRisk} → Artık: ${f.bowTieDetails.residualRisk.toFixed(1)} | Ö:${f.bowTieDetails.preventionBarriers} A:${f.bowTieDetails.mitigationBarriers}`;
  if (f.ftaDetails) return `${f.ftaDetails.gateType} kapı | ${f.ftaDetails.componentCount} bileşen | P=${f.ftaDetails.systemProbability.toExponential(2)}`;
  if (f.checklistDetails) return `%${f.checklistDetails.compliancePercent} uygun | ${f.checklistDetails.compliantCount}/${f.checklistDetails.totalItems}`;
  if (f.jsaDetails) return `${f.jsaDetails.stepCount} adım | Max: ${f.jsaDetails.maxStepScore.toFixed(1)} | Yüksek risk: ${f.jsaDetails.highRiskStepCount}`;
  if (f.lopaDetails) return `RRF: ${f.lopaDetails.riskReductionFactor.toFixed(0)}x | ${f.lopaDetails.layerCount} katman | ${f.lopaDetails.meetsTarget ? "Hedef OK" : "Hedef KARŞILANMADI"}`;
  if (f.fkDetails) return `L(${f.fkDetails.likelihood}) x S(${f.fkDetails.severity}) x E(${f.fkDetails.exposure})`;
  if (f.matrixDetails) return `O(${f.matrixDetails.likelihood}) x Ş(${f.matrixDetails.severity})`;
  if (f.paramDetails) return f.paramDetails.map(p => `${p.code}: ${(p.value * 100).toFixed(0)}%`).join(", ");
  return "";
}

type RowGroup = { rowTitle: string; images: ExportImage[]; findings: ExportFinding[] };

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Metin uzunluguna gore satir yuksekligi hesapla (ExcelJS icin) */
function calcRowHeight(texts: string[], colWidths: number[]): number {
  const CHAR_PX = 7; // Yaklaşık karakter genişliği (pixel)
  const LINE_HEIGHT = 15; // Bir satır yüksekliği (pt)
  const PADDING = 10; // Üst+alt padding
  let maxLines = 1;
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i] || "";
    const colPx = (colWidths[i] || 10) * CHAR_PX;
    const lines = Math.ceil((text.length * CHAR_PX) / colPx);
    if (lines > maxLines) maxLines = lines;
  }
  return Math.max(20, maxLines * LINE_HEIGHT + PADDING);
}

/** Findings ve images'i rowTitle bazinda grupla, sirayi koru */
function groupByRow(data: RiskAnalysisExportData): RowGroup[] {
  const map = new Map<string, RowGroup>();
  // Images sirasiyla row'lari olustur (dogru sira)
  for (const img of data.images) {
    if (!map.has(img.rowTitle)) map.set(img.rowTitle, { rowTitle: img.rowTitle, images: [], findings: [] });
    map.get(img.rowTitle)!.images.push(img);
  }
  // Findings'i dagit
  for (const f of data.findings) {
    if (!map.has(f.rowTitle)) map.set(f.rowTitle, { rowTitle: f.rowTitle, images: [], findings: [] });
    map.get(f.rowTitle)!.findings.push(f);
  }
  // Boş satırları filtrele (başlıksız veya hem görsel hem tespit olmayan)
  return Array.from(map.values()).filter((g) => g.rowTitle.trim() && (g.images.length > 0 || g.findings.length > 0));
}

/* ================================================================== */
/* HTML Generator — SATIR BAZLI (Professional ISG Report)              */
/* ================================================================== */

function buildFindingCardHTML(f: ExportFinding): string {
  return `
    <div style="margin:10px 0;border:1px solid #dee2e6;border-radius:8px;overflow:hidden;page-break-inside:avoid;">
      <div style="background:${severityBg(f.severity)};padding:8px 12px;border-bottom:1px solid #dee2e6;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:700;font-size:13px;color:#1a1a2e;">${f.title}</span>
          <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:9px;font-weight:700;color:#fff;background:${severityColor(f.severity)};">
            ${f.scoreLabel} — ${scoreDisplay(f)}
          </span>
        </div>
        <div style="margin-top:3px;font-size:10px;color:#666;">${f.category}${f.correctiveActionRequired ? ' · <strong style="color:#DC2626;">DÖF Adayı</strong>' : ""}</div>
      </div>
      <div style="padding:10px 12px;">
        <div style="margin-bottom:6px;">
          <p style="margin:0 0 2px 0;font-size:9px;font-weight:600;color:#B8860B;text-transform:uppercase;letter-spacing:0.05em;">Tespit ve Değerlendirme</p>
          <p style="margin:0;font-size:11px;line-height:1.5;">${f.recommendation || "Detaylı değerlendirme yapılmalıdır."}</p>
        </div>
        <div style="margin-bottom:6px;">
          <p style="margin:0 0 2px 0;font-size:9px;font-weight:600;color:#B8860B;text-transform:uppercase;letter-spacing:0.05em;">Alınması Gereken Önlem</p>
          <p style="margin:0;font-size:11px;line-height:1.5;">${f.action}</p>
        </div>
        ${methodScoreDetail(f) ? `
        <div style="margin-bottom:6px;">
          <p style="margin:0 0 2px 0;font-size:9px;font-weight:600;color:#B8860B;text-transform:uppercase;letter-spacing:0.05em;">Skorlama Detayı (${f.methodLabel})</p>
          <p style="margin:0;font-size:10px;line-height:1.4;color:#333;font-family:monospace;">${methodScoreDetail(f)}</p>
        </div>` : ""}
        ${(f.legalReferences ?? []).length > 0 ? `
          <div>
            <p style="margin:0 0 3px 0;font-size:9px;font-weight:600;color:#B8860B;text-transform:uppercase;letter-spacing:0.05em;">Mevzuat Dayanağı</p>
            ${(f.legalReferences ?? []).map((r) => `
              <p style="margin:2px 0;font-size:10px;line-height:1.4;">
                <strong>§ ${r.law}</strong>${r.article ? ` — ${r.article}` : ""}${r.description ? `<br/><span style="color:#666;margin-left:12px;">${r.description}</span>` : ""}
              </p>
            `).join("")}
          </div>
        ` : ""}
      </div>
    </div>`;
}

function _generateHTML(data: RiskAnalysisExportData): string {
  const now = data.date || new Date().toLocaleDateString("tr-TR");
  const rows = groupByRow(data);

  // Katilimcilar
  const participantsHTML = data.participants.length > 0 ? `
    <h2>ANALİZ EKİBİ</h2>
    <table>
      <tr class="hdr"><th>#</th><th>Ad Soyad</th><th>Görev / Rol</th><th>Unvan</th><th>Belge No</th></tr>
      ${data.participants.map((p, i) => `
        <tr><td style="text-align:center;">${i + 1}</td><td>${p.fullName || "-"}</td><td>${p.role || "-"}</td><td>${p.title || "-"}</td><td>${p.certificateNo || "-"}</td></tr>
      `).join("")}
    </table>
  ` : "";

  // Satir bazli section'lar
  let globalIdx = 0;
  const rowSections = rows.map((group, gi) => {

    // ── Görsel bazlı gruplama: her görsel altında kendi tespitleri ──
    const imageGroups = group.images.map((img, imgIdx) => {
      const imgFindings = group.findings.filter((f) => f.imageId === img.imageId);
      return { img, imgIdx, findings: imgFindings };
    });
    // Gorsele atanamamis tespitler (eger varsa)
    const orphanFindings = group.findings.filter((f) => !group.images.some((img) => img.imageId === f.imageId));

    // Ozet tablo (tum tespitler) — yan yana layoutta görsel + tablo eşleşmesi
    // için her satır pin etiketini (R1, R2, ...) gösteriyoruz.
    const allFindingsInRow = group.findings;
    const summaryRows = allFindingsInRow.map((f) => {
      globalIdx++;
      // Her görsel içindeki finding'in sırasına göre pin etiketi (R1, R2…)
      const imgFindings = group.findings.filter((ff) => ff.imageId === f.imageId);
      const pinIdx = imgFindings.findIndex((ff) => ff === f);
      const pinLabel = pinIdx >= 0 ? `R${pinIdx + 1}` : "";
      return `
        <tr style="background:${globalIdx % 2 === 0 ? "#fff" : "#f9fafb"};">
          <td style="text-align:center;width:24px;font-weight:700;color:#DC2626;font-size:10px;">${pinLabel}</td>
          <td style="text-align:center;width:24px;color:#666;">${globalIdx}</td>
          <td style="font-size:9px;line-height:1.35;">${f.title}</td>
          <td style="font-size:9px;">${f.category}</td>
          <td style="color:${severityColor(f.severity)};font-weight:600;font-size:9px;">${f.scoreLabel}</td>
          <td style="text-align:center;font-weight:600;font-size:9px;">${scoreDisplay(f)}</td>
          <td style="text-align:center;font-size:9px;">${f.correctiveActionRequired ? "✓" : "-"}</td>
        </tr>`;
    }).join("");

    const summaryTable = allFindingsInRow.length > 0 ? `
      <table style="margin-top:0;">
        <tr class="hdr">
          <th style="width:24px;">Pin</th>
          <th style="width:24px;">#</th>
          <th>Tespit</th>
          <th>Kategori</th>
          <th>Risk</th>
          <th>Skor</th>
          <th>DÖF</th>
        </tr>
        ${summaryRows}
      </table>
    ` : "";

    // ── Yeni layout: her görsel için "Görsel + Özet Tablo" YAN YANA ──
    // Sol: annotated görsel (R1, R2 pin'leri ile), Sağ: o görsele ait özet
    // tablosu (pin etiketi + tespit + skor). Tespit kartları ALTINDA full-width.
    const imageDetailSections = imageGroups.map(({ img, imgIdx, findings }) => {
      const isIrrelevant = img.imageRelevance === "not_real_photo" || img.imageRelevance === "irrelevant";

      // Bu görsele özel mini özet tablosu — pin etiketi (R1, R2…) ile eşleşir
      const perImageSummaryRows = findings.map((f, fi) => `
        <tr style="background:${fi % 2 === 0 ? "#fff" : "#f9fafb"};">
          <td style="text-align:center;width:28px;font-weight:700;color:#DC2626;font-size:10px;border:1px solid #dee2e6;padding:4px;">R${fi + 1}</td>
          <td style="font-size:9px;line-height:1.4;border:1px solid #dee2e6;padding:4px 6px;">${f.title}</td>
          <td style="font-size:9px;text-align:center;color:${severityColor(f.severity)};font-weight:700;border:1px solid #dee2e6;padding:4px;white-space:nowrap;">${f.scoreLabel}</td>
          <td style="font-size:9px;text-align:center;font-weight:700;border:1px solid #dee2e6;padding:4px;">${scoreDisplay(f)}</td>
          <td style="text-align:center;font-size:9px;border:1px solid #dee2e6;padding:4px;">${f.correctiveActionRequired ? '<span style="color:#DC2626;font-weight:700;">DÖF</span>' : "-"}</td>
        </tr>`).join("");

      const perImageSummaryTable = findings.length > 0 ? `
        <table style="width:100%;border-collapse:collapse;margin:0;font-size:9px;">
          <tr style="background:#B8860B;color:#fff;">
            <th style="border:1px solid #996F09;padding:5px 4px;font-size:9px;width:28px;">Pin</th>
            <th style="border:1px solid #996F09;padding:5px 4px;font-size:9px;text-align:left;">Tespit</th>
            <th style="border:1px solid #996F09;padding:5px 4px;font-size:9px;width:60px;">Risk</th>
            <th style="border:1px solid #996F09;padding:5px 4px;font-size:9px;width:42px;">Skor</th>
            <th style="border:1px solid #996F09;padding:5px 4px;font-size:9px;width:42px;">DÖF</th>
          </tr>
          ${perImageSummaryRows}
        </table>` : `
        <p style="margin:0;font-size:10px;color:#666;font-style:italic;">Bu görsel için tespit bulunmadı.</p>`;

      // Görsel mevcut mu?
      const hasImage = !!img.dataUrl && img.dataUrl.length > 100;

      const irrelevantNote = isIrrelevant
        ? `<div style="margin-top:6px;padding:6px 8px;background:#FEF3C7;border:1px solid #F59E0B;border-radius:4px;font-size:9px;color:#92400E;">
            <strong>Analiz Yapılamadı:</strong> ${img.imageRelevance === "not_real_photo" ? "Bu görsel gerçek bir fotoğraf değil." : "Risk analizi kapsamında değerlendirilmedi."}
          </div>`
        : "";

      const positiveNote = !isIrrelevant && (img.positiveObservations ?? []).length > 0
        ? `<div style="margin-top:6px;padding:6px 8px;background:#ECFDF5;border:1px solid #10B981;border-radius:4px;font-size:9px;color:#065F46;">
            <strong>Olumlu Tespitler:</strong>
            ${(img.positiveObservations ?? []).map(o => `<br/>✓ ${o}`).join("")}
          </div>`
        : "";

      const summaryNote = !isIrrelevant && img.areaSummary
        ? `<p style="margin:4px 0 0;font-size:9px;color:#555;font-style:italic;line-height:1.4;">${img.areaSummary}</p>`
        : "";

      const qualityNote = img.photoQuality && img.photoQuality !== "good"
        ? `<span style="margin-left:6px;padding:1px 5px;border-radius:3px;font-size:8px;font-weight:600;${img.photoQuality === "poor" ? "background:#FEE2E2;color:#DC2626;" : "background:#FEF3C7;color:#D97706;"}">${img.photoQuality === "poor" ? "Düşük Kalite" : "Orta Kalite"}</span>`
        : "";

      // YAN YANA TABLE LAYOUT — print/HTML her ikisinde de güvenli (flex print
      // motorunda bazen sorunlu olduğu için <table> tercih edildi).
      const sideBySideBlock = `
        <div style="margin:8px 0;page-break-inside:avoid;">
          <table style="width:100%;border-collapse:collapse;margin:0;border:1px solid #d1d5db;background:#f8fafc;">
            <tr>
              <td style="width:42%;vertical-align:top;padding:8px;border-right:1px solid #d1d5db;background:#fff;">
                ${hasImage
                  ? `<img src="${img.dataUrl}" style="width:100%;max-width:340px;height:auto;max-height:260px;object-fit:contain;border:1px solid #dee2e6;border-radius:4px;display:block;background:#fff;" />`
                  : `<div style="width:100%;min-height:180px;display:flex;align-items:center;justify-content:center;background:#f3f4f6;border:1px dashed #d1d5db;border-radius:4px;color:#9ca3af;font-size:11px;text-align:center;padding:20px;">Görsel önizleme yüklenemedi<br/><span style="font-size:9px;">${img.fileName}</span></div>`}
                <p style="margin:6px 0 0;font-size:10px;font-weight:700;color:#1a1a2e;">Görsel ${imgIdx + 1}${qualityNote}</p>
                <p style="margin:2px 0 0;font-size:9px;color:#666;word-break:break-all;">${img.fileName}</p>
                <p style="margin:2px 0 0;font-size:9px;color:${isIrrelevant ? "#92400E" : "#666"};">
                  ${isIrrelevant ? "Analiz yapılamadı" : `${findings.length} tespit · pin'ler R1–R${findings.length} ile etiketlenmiştir`}
                </p>
                ${summaryNote}
                ${irrelevantNote}
                ${positiveNote}
              </td>
              <td style="vertical-align:top;padding:8px;background:#fff;">
                <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#B8860B;text-transform:uppercase;letter-spacing:0.04em;">Görsel ${imgIdx + 1} Tespitleri</p>
                ${perImageSummaryTable}
              </td>
            </tr>
          </table>
        </div>`;

      // Detaylı tespit kartları — yan yana bloğun ALTINDA full-width
      const findingCardsForImg = findings.map((f) => buildFindingCardHTML(f)).join("");

      return sideBySideBlock + findingCardsForImg;
    }).join("");

    // Sahipsiz tespitler (gorsele atanamamis)
    const orphanSection = orphanFindings.length > 0
      ? `<div style="margin:8px 0;padding:8px 10px;background:#FFFBEB;border:1px solid #F59E0B;border-radius:6px;">
          <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#92400E;">Görsele bağlanamamış tespitler</p>
          ${orphanFindings.map((f) => buildFindingCardHTML(f)).join("")}
        </div>`
      : "";

    // Toplam özet tablo (tüm görsellerin tespitleri) — opsiyonel; satır
    // başında genel görünüm sağlar. globalIdx için summaryRows hâlâ ihtiyaç
    // duyuyor; o yüzden summaryTable'ı SATIR HEADER'ından hemen sonra kısa
    // halde gösterelim — ama yan yana detaylar daha okunaklı olduğundan
    // bunu collapse edebilirsek daha iyi (PDF'te collapse yok, sadece komp.)
    const summarySection = group.images.length > 1 && allFindingsInRow.length > 1
      ? `<div style="margin:6px 0 4px;">
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:0.04em;">Satır Genel Özet (${allFindingsInRow.length} tespit)</p>
          ${summaryTable}
        </div>`
      : "";

    return `
      <div style="margin-top:${gi === 0 ? "0" : "8"}px;page-break-before:${gi === 0 ? "auto" : "always"};">
        <div style="background:#FDF8EE;border:2px solid #B8860B;border-radius:8px;padding:10px 14px;margin-bottom:6px;">
          <h3 style="margin:0;font-size:14px;color:#B8860B;text-transform:uppercase;letter-spacing:0.03em;">
            SATIR ${gi + 1}: ${group.rowTitle}
          </h3>
          <p style="margin:2px 0 0;font-size:10px;color:#666;">${group.findings.length} tespit · ${group.images.length} görsel</p>
        </div>
        ${summarySection}
        <div>
          ${imageDetailSections}
          ${orphanSection}
        </div>
      </div>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${data.analysisTitle} - Risk Analizi Raporu</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 32px; color: #1a1a2e; font-size: 12px; line-height: 1.6; }
    h1 { color: #B8860B; font-size: 20px; margin: 0; }
    h2 { color: #B8860B; font-size: 14px; border-bottom: 2px solid #B8860B; padding-bottom: 4px; margin-top: 24px; text-transform: uppercase; letter-spacing: 0.05em; }
    h3 { color: #B8860B; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px; }
    th, td { border: 1px solid #dee2e6; padding: 5px 7px; text-align: left; }
    .hdr { background: #B8860B; color: #fff; }
    .hdr th { border-color: #996F09; font-size: 10px; }
    .header { display: flex; justify-content: space-between; border-bottom: 3px solid #B8860B; padding-bottom: 12px; margin-bottom: 16px; }
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 10px 0; }
    .stat-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; text-align: center; }
    .stat-box .val { font-size: 20px; font-weight: 700; color: #B8860B; }
    .stat-box .lbl { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div style="display:flex;align-items:center;gap:12px;">
      ${data.companyLogoUrl ? `<img src="${data.companyLogoUrl}" style="width:48px;height:48px;object-fit:contain;border-radius:8px;border:1px solid #e5e7eb;" />` : ""}
      <div>
        <h1>RİSK ANALİZİ RAPORU</h1>
        <p style="margin:2px 0 0;font-size:11px;"><strong>${data.companyName}</strong></p>
        <p style="margin:1px 0 0;font-size:10px;color:#666;">${data.companyKind || ""} ${data.companySector ? `· ${data.companySector}` : ""} ${data.companyHazardClass ? `· ${data.companyHazardClass}` : ""}</p>
      </div>
    </div>
    <div style="text-align:right;">
      <p style="margin:0;font-size:10px;color:#666;">RiskNova İSG Platformu</p>
      <p style="margin:0;font-size:10px;">${data.methodLabel}</p>
      <p style="margin:0;font-size:10px;color:#666;">Tarih: ${now}</p>
      <p style="margin:0;font-size:10px;color:#666;">Lokasyon: ${data.location || "-"}</p>
      <p style="margin:0;font-size:10px;color:#666;">Bölüm: ${data.department || "-"}</p>
      ${data.companyAddress ? `<p style="margin:0;font-size:9px;color:#999;">${data.companyAddress}</p>` : ""}
    </div>
  </div>

  <div class="stat-grid">
    <div class="stat-box"><div class="val">${data.totalFindings}</div><div class="lbl">Toplam Tespit</div></div>
    <div class="stat-box"><div class="val" style="color:#DC2626;">${data.criticalCount}</div><div class="lbl">Yüksek / Kritik</div></div>
    <div class="stat-box"><div class="val">${data.dofCandidateCount}</div><div class="lbl">DÖF Adayı</div></div>
    <div class="stat-box"><div class="val">${data.participants.length}</div><div class="lbl">Ekip Üyesi</div></div>
  </div>

  ${participantsHTML}

  <h2>SATIR BAZLI RİSK TESPİTLERİ</h2>
  ${rowSections}

  ${data.shareQrDataUrl ? `
  <div style="margin-top:32px;padding:20px;border:1px solid #E5E7EB;border-radius:12px;display:flex;align-items:center;gap:20px;">
    <img src="${data.shareQrDataUrl}" alt="QR" width="100" height="100" style="border:1px solid #E5E7EB;border-radius:8px;" />
    <div>
      <p style="margin:0;font-size:11px;font-weight:700;color:#1A1A2E;">Dijital Rapor Erişimi</p>
      <p style="margin:4px 0 0;font-size:10px;color:#666;">Bu QR kodu tarayarak raporun dijital versiyonuna ulaşabilirsiniz.</p>
      ${data.shareUrl ? `<p style="margin:6px 0 0;font-size:9px;color:#B8860B;word-break:break-all;">${data.shareUrl}</p>` : ""}
    </div>
  </div>
  ` : ""}

  <div style="margin-top:24px;padding-top:12px;border-top:2px solid #B8860B;font-size:9px;color:#999;text-align:center;">
    Bu rapor RiskNova İSG Platformu tarafından ${now} tarihinde oluşturulmuştur.<br/>
    Rapor içeriği ${data.methodLabel} yöntemi ile değerlendirilmiştir.
  </div>
</body>
</html>`;
}

/* ================================================================== */
/* PDF Export                                                          */
/* ================================================================== */

export function exportRiskAnalysisPDF(_data: RiskAnalysisExportData): never {
  throw new Error("Risk analysis PDF exports must be generated through /api/risk-analysis/export.");
}

/* ================================================================== */
/* Word Export — docx kütüphanesi ile gerçek DOCX                      */
/* ================================================================== */

const GOLD_HEX = "B8860B";
const DARK_HEX = "1A1A2E";

function sevColorHex(s: string): string {
  return s === "critical" ? "7F1D1D" : s === "high" ? "DC2626" : s === "medium" ? "F97316" : s === "low" ? "F59E0B" : "10B981";
}

function sevBgHex(s: string): string {
  return s === "critical" ? "FEE2E2" : s === "high" ? "FEF2F2" : s === "medium" ? "FFF7ED" : s === "low" ? "FFFBEB" : "ECFDF5";
}

function thinBorder() {
  const b = { style: BorderStyle.SINGLE, size: 1, color: "DEE2E6" };
  return { top: b, bottom: b, left: b, right: b };
}

function goldHeaderCell(text: string): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, font: "Segoe UI", color: "FFFFFF" })], alignment: AlignmentType.LEFT })],
    shading: { type: ShadingType.SOLID, color: GOLD_HEX },
    borders: thinBorder(),
  });
}

function dataCell(text: string, opts?: { bold?: boolean; color?: string; bg?: string }): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: text || "-", bold: opts?.bold, size: 18, font: "Segoe UI", color: opts?.color || DARK_HEX })], spacing: { after: 40 } })],
    shading: opts?.bg ? { type: ShadingType.SOLID, color: opts.bg } : undefined,
    borders: thinBorder(),
  });
}

/** base64 data URL → Uint8Array + docx image type */
function parseDataUrl(dataUrl: string): { buffer: Uint8Array; ext: "jpg" | "png" | "gif" | "bmp" } | null {
  try {
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|gif|bmp);base64,(.+)$/);
    if (!match) return null;
    const rawExt = match[1];
    const ext: "jpg" | "png" | "gif" | "bmp" = rawExt === "jpeg" ? "jpg" : rawExt as "jpg" | "png" | "gif" | "bmp";
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { buffer: bytes, ext };
  } catch { return null; }
}

export async function generateRiskAnalysisWordBlob(data: RiskAnalysisExportData): Promise<Blob> {
  const now = data.date || new Date().toLocaleDateString("tr-TR");
  const rows = groupByRow(data);
  const children: (Paragraph | Table)[] = [];

  // ── Başlık ──
  children.push(new Paragraph({
    children: [new TextRun({ text: "RİSK ANALİZİ RAPORU", bold: true, size: 36, font: "Segoe UI", color: GOLD_HEX })],
    heading: HeadingLevel.TITLE,
    spacing: { after: 80 },
  }));

  children.push(new Paragraph({
    children: [new TextRun({ text: data.companyName, bold: true, size: 22, font: "Segoe UI", color: DARK_HEX })],
    spacing: { after: 40 },
  }));

  const metaParts = [data.companyKind, data.companySector, data.companyHazardClass].filter(Boolean).join(" · ");
  if (metaParts) {
    children.push(new Paragraph({
      children: [new TextRun({ text: metaParts, size: 18, font: "Segoe UI", color: "666666" })],
      spacing: { after: 40 },
    }));
  }

  children.push(new Paragraph({
    children: [
      new TextRun({ text: `${data.methodLabel} · Tarih: ${now}`, size: 18, font: "Segoe UI", color: "666666" }),
      new TextRun({ text: ` · Lokasyon: ${data.location || "-"} · Bölüm: ${data.department || "-"}`, size: 18, font: "Segoe UI", color: "666666" }),
    ],
    spacing: { after: 200 },
  }));

  // ── İstatistikler ──
  children.push(new Paragraph({
    children: [
      new TextRun({ text: `Toplam: ${data.totalFindings} tespit`, bold: true, size: 20, font: "Segoe UI", color: GOLD_HEX }),
      new TextRun({ text: ` · Yüksek/Kritik: ${data.criticalCount}`, size: 20, font: "Segoe UI", color: "DC2626" }),
      new TextRun({ text: ` · DÖF Adayı: ${data.dofCandidateCount}`, size: 20, font: "Segoe UI", color: GOLD_HEX }),
      new TextRun({ text: ` · Ekip: ${data.participants.length} kişi`, size: 20, font: "Segoe UI", color: GOLD_HEX }),
    ],
    spacing: { after: 300 },
  }));

  // ── Katılımcılar ──
  if (data.participants.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: "ANALİZ EKİBİ", bold: true, size: 24, font: "Segoe UI", color: GOLD_HEX })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    }));

    const pRows = [
      new TableRow({ children: [goldHeaderCell("#"), goldHeaderCell("Ad Soyad"), goldHeaderCell("Görev / Rol"), goldHeaderCell("Unvan"), goldHeaderCell("Belge No")] }),
      ...data.participants.map((p, i) => new TableRow({
        children: [dataCell(String(i + 1)), dataCell(p.fullName), dataCell(p.role), dataCell(p.title), dataCell(p.certificateNo)],
      })),
    ];
    children.push(new Table({ rows: pRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  // ── Satır bazlı bölümler ──
  for (let gi = 0; gi < rows.length; gi++) {
    const group = rows[gi];

    // Satır başlığı
    if (gi > 0) children.push(new Paragraph({ children: [new PageBreak()] }));

    children.push(new Paragraph({
      children: [new TextRun({ text: `SATIR ${gi + 1}: ${group.rowTitle}`, bold: true, size: 26, font: "Segoe UI", color: GOLD_HEX })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 60 },
    }));

    children.push(new Paragraph({
      children: [new TextRun({ text: `${group.findings.length} tespit · ${group.images.length} görsel`, size: 18, font: "Segoe UI", color: "666666" })],
      spacing: { after: 150 },
    }));

    // ── Yeni layout: her görsel için "Görsel + Özet" YAN YANA ──
    // Word'de 2-cell'li bir Table: sol cell'de annotated ImageRun + caption,
    // sağ cell'de o görsele ait tespitler (R1, R2... pin etiketleriyle).
    for (const img of group.images) {
      const imgFindings = group.findings.filter((f) => f.imageId === img.imageId);
      const parsed = parseDataUrl(img.dataUrl);

      // Sol cell içeriği: görsel + caption
      const leftCellChildren: Paragraph[] = [];
      if (parsed) {
        try {
          leftCellChildren.push(new Paragraph({
            children: [new ImageRun({
              type: parsed.ext,
              data: parsed.buffer,
              transformation: { width: 260, height: 195 },
            })],
            spacing: { after: 40 },
          }));
        } catch {
          leftCellChildren.push(new Paragraph({
            children: [new TextRun({ text: "[Görsel yüklenemedi]", size: 16, font: "Segoe UI", color: "999999", italics: true })],
          }));
        }
      } else {
        leftCellChildren.push(new Paragraph({
          children: [new TextRun({ text: "[Görsel önizleme mevcut değil]", size: 16, font: "Segoe UI", color: "999999", italics: true })],
        }));
      }
      leftCellChildren.push(new Paragraph({
        children: [new TextRun({ text: img.fileName, bold: true, size: 14, font: "Segoe UI", color: DARK_HEX })],
        spacing: { after: 20 },
      }));
      leftCellChildren.push(new Paragraph({
        children: [new TextRun({
          text: imgFindings.length > 0
            ? `${imgFindings.length} tespit · pin'ler R1–R${imgFindings.length}`
            : "Tespit bulunamadı",
          size: 14, font: "Segoe UI", color: "666666",
        })],
      }));
      if (img.areaSummary) {
        leftCellChildren.push(new Paragraph({
          children: [new TextRun({ text: img.areaSummary, size: 14, font: "Segoe UI", color: "555555", italics: true })],
          spacing: { before: 40 },
        }));
      }

      // Sağ cell içeriği: tespit özet listesi (R1: title | risk | skor)
      const rightCellChildren: Paragraph[] = [];
      rightCellChildren.push(new Paragraph({
        children: [new TextRun({ text: "TESPİTLER", bold: true, size: 16, font: "Segoe UI", color: GOLD_HEX, allCaps: true })],
        spacing: { after: 60 },
      }));
      if (imgFindings.length > 0) {
        imgFindings.forEach((f, fi) => {
          rightCellChildren.push(new Paragraph({
            children: [
              new TextRun({ text: `R${fi + 1}  `, bold: true, size: 16, font: "Segoe UI", color: "DC2626" }),
              new TextRun({ text: f.title, bold: true, size: 16, font: "Segoe UI", color: DARK_HEX }),
            ],
            spacing: { before: 40, after: 10 },
          }));
          rightCellChildren.push(new Paragraph({
            children: [
              new TextRun({ text: `${f.category}  ·  `, size: 14, font: "Segoe UI", color: "666666" }),
              new TextRun({ text: `${f.scoreLabel} (${scoreDisplay(f)})`, bold: true, size: 14, font: "Segoe UI", color: sevColorHex(f.severity) }),
              ...(f.correctiveActionRequired
                ? [new TextRun({ text: "  ·  DÖF", bold: true, size: 14, font: "Segoe UI", color: "DC2626" })]
                : []),
            ],
            spacing: { after: 30 },
          }));
        });
      } else {
        rightCellChildren.push(new Paragraph({
          children: [new TextRun({ text: "Bu görsel için tespit bulunmadı.", size: 14, font: "Segoe UI", color: "999999", italics: true })],
        }));
      }

      const sideBySideTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({
          children: [
            new TableCell({
              width: { size: 42, type: WidthType.PERCENTAGE },
              children: leftCellChildren,
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
            new TableCell({
              width: { size: 58, type: WidthType.PERCENTAGE },
              children: rightCellChildren,
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
          ],
        })],
      });
      children.push(sideBySideTable);
      children.push(new Paragraph({ spacing: { after: 100 } }));
    }

    // Görsele bağlanamamış tespitler için özet
    const orphanFindings = group.findings.filter((f) => !group.images.some((img) => img.imageId === f.imageId));
    if (orphanFindings.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: "Görsele bağlanamamış tespitler", bold: true, size: 18, font: "Segoe UI", color: "92400E" })],
        spacing: { before: 100, after: 60 },
      }));
      for (const f of orphanFindings) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: f.title, bold: true, size: 16, font: "Segoe UI", color: DARK_HEX }),
            new TextRun({ text: ` — ${f.scoreLabel} (${scoreDisplay(f)})`, bold: true, size: 14, font: "Segoe UI", color: sevColorHex(f.severity) }),
          ],
          spacing: { after: 40 },
        }));
      }
    }

    // Detaylı tespit kartları
    for (const f of group.findings) {
      children.push(new Paragraph({ spacing: { before: 200 } }));

      // Tespit başlığı
      children.push(new Paragraph({
        children: [
          new TextRun({ text: f.title, bold: true, size: 22, font: "Segoe UI", color: DARK_HEX }),
          new TextRun({ text: ` — ${f.scoreLabel} (${scoreDisplay(f)})`, bold: true, size: 20, font: "Segoe UI", color: sevColorHex(f.severity) }),
        ],
        shading: { type: ShadingType.SOLID, color: sevBgHex(f.severity) },
        spacing: { after: 40 },
      }));

      children.push(new Paragraph({
        children: [
          new TextRun({ text: f.category, size: 18, font: "Segoe UI", color: "666666" }),
          ...(f.correctiveActionRequired ? [new TextRun({ text: " · DÖF Adayı", bold: true, size: 18, font: "Segoe UI", color: "DC2626" })] : []),
        ],
        spacing: { after: 80 },
      }));

      // Tespit ve Değerlendirme
      children.push(new Paragraph({
        children: [new TextRun({ text: "Tespit ve Değerlendirme", bold: true, size: 16, font: "Segoe UI", color: GOLD_HEX, allCaps: true })],
        spacing: { after: 20 },
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: f.recommendation || "Detaylı değerlendirme yapılmalıdır.", size: 20, font: "Segoe UI", color: DARK_HEX })],
        spacing: { after: 80 },
      }));

      // Alınması Gereken Önlem
      children.push(new Paragraph({
        children: [new TextRun({ text: "Alınması Gereken Önlem", bold: true, size: 16, font: "Segoe UI", color: GOLD_HEX, allCaps: true })],
        spacing: { after: 20 },
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: f.action || "-", size: 20, font: "Segoe UI", color: DARK_HEX })],
        spacing: { after: 80 },
      }));

      // Skorlama detayı
      const mDetail = methodScoreDetail(f);
      if (mDetail) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `Skorlama Detayı (${f.methodLabel})`, bold: true, size: 16, font: "Segoe UI", color: GOLD_HEX, allCaps: true })],
          spacing: { after: 20 },
        }));
        children.push(new Paragraph({
          children: [new TextRun({ text: mDetail, size: 18, font: "Consolas", color: DARK_HEX })],
          spacing: { after: 80 },
        }));
      }

      // Mevzuat
      if ((f.legalReferences ?? []).length > 0) {
        children.push(new Paragraph({
          children: [new TextRun({ text: "Mevzuat Dayanağı", bold: true, size: 16, font: "Segoe UI", color: GOLD_HEX, allCaps: true })],
          spacing: { after: 20 },
        }));
        for (const ref of f.legalReferences ?? []) {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `§ ${ref.law}`, bold: true, size: 18, font: "Segoe UI", color: DARK_HEX }),
              ...(ref.article ? [new TextRun({ text: ` — ${ref.article}`, size: 18, font: "Segoe UI", color: DARK_HEX })] : []),
              ...(ref.description ? [new TextRun({ text: `\n${ref.description}`, size: 16, font: "Segoe UI", color: "666666" })] : []),
            ],
            spacing: { after: 40 },
          }));
        }
      }
    }
  }

  // ── QR Kod (varsa) ──
  if (data.shareQrDataUrl) {
    const qrParsed = parseDataUrl(data.shareQrDataUrl);
    children.push(new Paragraph({ spacing: { before: 400 } }));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: "Dijital Rapor Erişimi", bold: true, size: 20, font: "Segoe UI", color: DARK_HEX }),
      ],
    }));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: "Bu QR kodu tarayarak raporun dijital versiyonuna ulaşabilirsiniz.", size: 18, font: "Segoe UI", color: "666666" }),
      ],
      spacing: { after: 100 },
    }));
    if (qrParsed) {
      children.push(new Paragraph({
        children: [
          new ImageRun({ data: qrParsed.buffer, transformation: { width: 120, height: 120 }, type: qrParsed.ext }),
        ],
      }));
    }
    if (data.shareUrl) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: data.shareUrl, size: 16, font: "Segoe UI", color: GOLD_HEX }),
        ],
        spacing: { after: 100 },
      }));
    }
  }

  // ── Footer ──
  children.push(new Paragraph({ spacing: { before: 400 } }));
  children.push(new Paragraph({
    children: [
      new TextRun({ text: `Bu rapor RiskNova İSG Platformu tarafından ${now} tarihinde oluşturulmuştur.`, size: 16, font: "Segoe UI", color: "999999", italics: true }),
    ],
    alignment: AlignmentType.CENTER,
  }));
  children.push(new Paragraph({
    children: [
      new TextRun({ text: `Rapor içeriği ${data.methodLabel} yöntemi ile değerlendirilmiştir.`, size: 16, font: "Segoe UI", color: "999999", italics: true }),
    ],
    alignment: AlignmentType.CENTER,
  }));

  const doc = new Document({
    creator: "RiskNova İSG Platformu",
    title: `${data.analysisTitle} - Risk Analizi Raporu`,
    description: `${data.companyName} risk analizi raporu`,
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}

export async function exportRiskAnalysisWord(data: RiskAnalysisExportData) {
  const blob = await generateRiskAnalysisWordBlob(data);
  downloadBlob(blob, `Risk-Analizi-${data.companyName || "Rapor"}-${data.date || new Date().toISOString().split("T")[0]}.docx`);
}

/* ================================================================== */
/* Excel Export — Satir bazli gruplama + embedded gorseller             */
/* ================================================================== */


export async function generateRiskAnalysisExcelBlob(data: RiskAnalysisExportData): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RiskNova İSG Platformu";
  wb.created = new Date();

  const GOLD = "B8860B";
  const GOLD_BG = "FDF8EE";
  const WHITE = "FFFFFF";
  const LIGHT = "F9FAFB";
  const RED = "DC2626";
  const ORANGE = "F97316";
  const GREEN = "10B981";

  function riskColor(severity: string): string {
    return severity === "critical" ? "7F1D1D" : severity === "high" ? RED : severity === "medium" ? ORANGE : severity === "low" ? "F59E0B" : GREEN;
  }

  const ws = wb.addWorksheet("Risk Analizi");

  // Kolon genislikleri
  ws.columns = [
    { width: 5 },   // A: #
    { width: 30 },  // B: Tespit
    { width: 14 },  // C: Kategori
    { width: 10 },  // D: Risk Sinifi
    { width: 8 },   // E: Skor
    { width: 6 },   // F: DÖF
    { width: 35 },  // G: Tespit Detayi
    { width: 30 },  // H: Mevzuat Dayanagi
    { width: 25 },  // I: Alinacak Onlem
  ];

  // Baslik
  const titleRow = ws.addRow(["RİSK ANALİZİ RAPORU"]);
  ws.mergeCells("A1:I1");
  titleRow.font = { bold: true, size: 16, color: { argb: GOLD } };
  titleRow.height = 28;

  // Firma bilgileri
  const infoRow = ws.addRow([`${data.companyName} · ${data.location || "-"} · ${data.department || "-"} · ${data.methodLabel} · ${data.date}`]);
  ws.mergeCells("A2:I2");
  infoRow.font = { size: 10, color: { argb: "666666" } };

  // Istatistik satiri
  const statRow = ws.addRow([`Toplam: ${data.totalFindings} tespit · Yüksek/Kritik: ${data.criticalCount} · DÖF Adayı: ${data.dofCandidateCount} · Ekip: ${data.participants.length} kişi`]);
  ws.mergeCells("A3:I3");
  statRow.font = { size: 10, bold: true, color: { argb: GOLD } };

  ws.addRow([]); // Bos satir

  // ── Satir bazli gruplama ──
  const rows = groupByRow(data);
  let globalIdx = 0;

  for (let gi = 0; gi < rows.length; gi++) {
    const group = rows[gi];

    // ── Satir baslik satiri (altin renk, merge) ──
    const sectionRow = ws.addRow([`SATIR ${gi + 1}: ${group.rowTitle}  —  ${group.findings.length} tespit · ${group.images.length} görsel`]);
    const sn = sectionRow.number;
    ws.mergeCells(`A${sn}:I${sn}`);
    sectionRow.height = 24;
    sectionRow.font = { bold: true, size: 11, color: { argb: GOLD } };
    sectionRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD_BG } };
    sectionRow.border = {
      top: { style: "medium", color: { argb: GOLD } },
      bottom: { style: "medium", color: { argb: GOLD } },
    };

    // ── Görseller embed (başlık altında, yan yana) ──
    if (group.images.length > 0) {
      const imgRow = ws.addRow([]);
      const imgRowHeight = 120;
      imgRow.height = imgRowHeight;

      for (let ii = 0; ii < group.images.length; ii++) {
        const img = group.images[ii];
        try {
          const base64Data = img.dataUrl.split(",")[1];
          if (base64Data) {
            const ext = img.dataUrl.includes("image/png") ? "png" : "jpeg";
            const imageId = wb.addImage({ base64: base64Data, extension: ext });
            const colStart = ii * 3; // Her gorsel 3 kolon genisliginde
            if (colStart < 9) { // Max 3 gorsel yan yana (9 kolon)
              ws.addImage(imageId, {
                tl: { col: colStart, row: imgRow.number - 1 },
                ext: { width: 200, height: 130 },
              });
            }
          }
        } catch { /* gorsel eklenemezse devam */ }
      }

      // Gorsel dosya adlari
      const nameRow = ws.addRow([]);
      for (let ii = 0; ii < Math.min(group.images.length, 3); ii++) {
        const img = group.images[ii];
        const colIdx = ii * 3 + 1; // 1-indexed
        if (colIdx <= 9) {
          nameRow.getCell(colIdx).value = `${img.fileName} (${img.findingCount} tespit)`;
          nameRow.getCell(colIdx).font = { size: 8, italic: true, color: { argb: "999999" } };
        }
      }
    }

    // ── Tablo basligi (her grup icin) ──
    const headers = ["#", "Tespit", "Kategori", "Risk Sınıfı", "Skor", "Skor Detayı", "DÖF", "Tespit Detayı ve Çözüm Önerisi", "Mevzuat Dayanağı", "Alınacak Önlem"];
    const hRow = ws.addRow(headers);
    hRow.height = 20;
    hRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: WHITE }, size: 9 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD } };
      cell.alignment = { wrapText: true, vertical: "middle" };
      cell.border = { bottom: { style: "medium", color: { argb: "996F09" } } };
    });

    // ── Tespit satirlari ──
    group.findings.forEach((f, fi) => {
      globalIdx++;
      const mevzuat = (f.legalReferences ?? []).map((r) => `${r.law}${r.article ? ` — ${r.article}` : ""}${r.description ? `: ${r.description}` : ""}`).join("\n");

      const mDetail = methodScoreDetail(f);
      const row = ws.addRow([
        globalIdx,
        f.title,
        f.category,
        f.scoreLabel,
        f.score < 2 ? Number((f.score * 100).toFixed(0)) : Math.round(f.score),
        mDetail || "-",
        f.correctiveActionRequired ? "Evet" : "-",
        f.recommendation || "Detaylı değerlendirme yapılmalıdır.",
        mevzuat || "-",
        f.action || "-",
      ]);

      row.alignment = { wrapText: true, vertical: "top" };
      const COL_WIDTHS = [5, 30, 14, 10, 8, 22, 6, 35, 30, 25];
      row.height = calcRowHeight([
        String(globalIdx),
        f.title,
        f.category,
        f.scoreLabel,
        String(f.score),
        mDetail || "-",
        f.correctiveActionRequired ? "Evet" : "-",
        f.recommendation || "",
        mevzuat || "-",
        f.action || "-",
      ], COL_WIDTHS);

      // Risk sinifina gore renk
      const rColor = riskColor(f.severity);
      row.getCell(4).font = { bold: true, color: { argb: rColor }, size: 9 };
      row.getCell(5).font = { bold: true, size: 9 };
      row.getCell(6).font = { size: 8, color: { argb: "555555" } };

      if (f.correctiveActionRequired) {
        row.getCell(7).font = { bold: true, color: { argb: RED }, size: 9 };
      }

      // Zebra renk
      if (fi % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
        });
      }

      // Border
      row.eachCell((cell) => {
        cell.border = {
          bottom: { style: "thin", color: { argb: "E5E7EB" } },
        };
      });
    });

    // Gruplar arasi bos satir
    if (gi < rows.length - 1) {
      ws.addRow([]);
    }
  }

  // ── Ekip bilgileri (alt kisim) ──
  if (data.participants.length > 0) {
    ws.addRow([]);
    const ekipTitle = ws.addRow(["ANALİZ EKİBİ"]);
    ws.mergeCells(`A${ekipTitle.number}:I${ekipTitle.number}`);
    ekipTitle.font = { bold: true, size: 11, color: { argb: GOLD } };

    const ekipHdr = ws.addRow(["", "Ad Soyad", "Görev / Rol", "Unvan", "", "", "Belge No"]);
    ekipHdr.font = { bold: true, size: 9 };

    data.participants.forEach((p) => {
      ws.addRow(["", p.fullName, p.role, p.title || "-", "", "", p.certificateNo || "-"]);
    });
  }

  // Frozen panes (ilk 4 satir)
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 4 }];

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function exportRiskAnalysisExcel(data: RiskAnalysisExportData) {
  const blob = await generateRiskAnalysisExcelBlob(data);
  downloadBlob(blob, `Risk-Analizi-${data.companyName || "Rapor"}-${data.date || new Date().toISOString().split("T")[0]}.xlsx`);
}
