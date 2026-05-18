/**
 * Risk Analizi Export: PDF, Word, Excel
 * Profesyonel ISG rapor formatı — GÖRSEL BAZLI BÖLÜMLER
 *
 * Her görsel kendi anotasyonlu görseli ve risk tablosuyla birlikte export edilir.
 */

import ExcelJS from "exceljs";
import {
  exportTotalFindings,
  findingActionText,
  findingLegalText,
  findingPinLabel,
  resolveExportImageSections,
} from "@/lib/risk-analysis/field-export-sections";
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

export type ImageAnalysisStatus = "success" | "failed" | "pending" | "manual_required" | "partial";

export type SceneType =
  | "construction_site"
  | "industrial_site"
  | "warehouse"
  | "office"
  | "non_workplace"
  | "unclear"
  | "workplace"
  | "unknown";

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
  analysisStatus?: ImageAnalysisStatus;
  analysisError?: string;
  imageAnalysisStatus?: ImageAnalysisStatus;
  riskCount?: number | null;
  sceneType?: SceneType;
  zeroRiskAllowed?: boolean;
  isgKapsamindaMi?: boolean;
  scopeDecision?: "analyze" | "exclude" | "manual_review_required";
  scopeReason?: string;
  containsWorkers?: boolean;
  containsWorkActivity?: boolean;
  containsWorkAtHeight?: boolean;
  containsOpenEdge?: boolean;
  containsScaffoldOrPlatform?: boolean;
  containsLadder?: boolean;
  containsRebar?: boolean;
  containsMachinery?: boolean;
  containsPpeIssue?: boolean;
};

export type ExportImageSection = {
  imageIndex: number;
  imageId: string;
  fileName: string;
  rowTitle: string;
  areaLocation: string;
  analysisStatus: ImageAnalysisStatus;
  analysisStatusLabel: string;
  analysisError?: string;
  findingCount: number;
  dataUrl?: string;
  imageLimitations?: string[];
  imageAnalysisStatus?: ImageAnalysisStatus;
  /** null = analiz başarısız; 0 yazılmaz */
  riskCount?: number | null;
  sceneType?: SceneType;
  zeroRiskAllowed?: boolean;
  isgKapsamindaMi?: boolean;
  scopeDecision?: "analyze" | "exclude" | "manual_review_required";
  scopeReason?: string;
  containsWorkers?: boolean;
  containsWorkActivity?: boolean;
  containsWorkAtHeight?: boolean;
  containsOpenEdge?: boolean;
  containsScaffoldOrPlatform?: boolean;
  containsLadder?: boolean;
  containsRebar?: boolean;
  containsMachinery?: boolean;
  containsPpeIssue?: boolean;
  documentCheckItems?: string[];
  failureRecoveryActions?: string[];
  constructionChecklistNotes?: Record<string, string>;
  findings: ExportFinding[];
};

export type ExportFinding = {
  rowTitle: string;
  imageId: string;
  riskCode?: string;
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
  legalContext?: string;
  actionTr?: string;
  scoreDetail?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  responsible?: string;
  deadline?: string;
  residualRiskNote?: string;
  /** Saha raporu — gözlemlenen kanıt */
  observedEvidence?: string;
  verificationNeeded?: string;
  possibleOutcome?: string;
  currentControl?: string;
  confidenceLevelTr?: string;
  immediateAction?: string;
  completionProof?: string;
  fkPRationale?: string;
  fkFRationale?: string;
  fkSRationale?: string;
};

export type ExportParticipant = {
  fullName: string;
  role: string;
  title: string;
  certificateNo: string;
};

export type RiskAnalysisExportData = {
  reportId?: string;
  organizationId?: string;
  companyId?: string;
  sourceType?: "risk_analysis" | "field_analysis";
  preparedBy?: string;
  status?: string;
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
  imageSections?: ExportImageSection[];
  totalFindings: number;
  realTotalFindings?: number;
  criticalCount: number;
  dofCandidateCount: number;
  failedImageCount?: number;
  pendingImageCount?: number;
  partialImageCount?: number;
  reportIncomplete?: boolean;
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
  if (f.scoreDetail?.trim()) return f.scoreDetail.trim();
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

function buildFindingCardHTML(f: ExportFinding, pinLabel?: string): string {
  const code = pinLabel || f.riskCode || "";
  const legal = findingLegalText(f);
  return `
    <div style="margin:10px 0;border:1px solid #dee2e6;border-radius:8px;overflow:hidden;page-break-inside:avoid;">
      <div style="background:${severityBg(f.severity)};padding:8px 12px;border-bottom:1px solid #dee2e6;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:700;font-size:13px;color:#1a1a2e;">${code ? `${code}: ` : ""}${f.title}</span>
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
          <p style="margin:0;font-size:11px;line-height:1.5;">${findingActionText(f)}</p>
        </div>
        ${methodScoreDetail(f) ? `
        <div style="margin-bottom:6px;">
          <p style="margin:0 0 2px 0;font-size:9px;font-weight:600;color:#B8860B;text-transform:uppercase;letter-spacing:0.05em;">Skorlama Detayı (${f.methodLabel})</p>
          <p style="margin:0;font-size:10px;line-height:1.4;color:#333;font-family:monospace;">${methodScoreDetail(f)}</p>
        </div>` : ""}
        <div>
          <p style="margin:0 0 3px 0;font-size:9px;font-weight:600;color:#B8860B;text-transform:uppercase;letter-spacing:0.05em;">Mevzuat / RAG Bağlamı</p>
          <p style="margin:2px 0;font-size:10px;line-height:1.4;">${legal}</p>
        </div>
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
/* Word Export — docx kütüphanesi ile premium profesyonel rapor        */
/* ================================================================== */

// Premium renk paleti (PDF ile uyumlu)
const NAVY_HEX = "0F172A";
const NAVY_MID_HEX = "1E293B";
const GOLD_HEX = "B48E26";
const GOLD_PALE_HEX = "FDF8EA";
const TEAL_DARK_HEX = "0F766E";
const SLATE_50_HEX = "F8FAFC";
const SLATE_100_HEX = "F1F5F9";
const SLATE_200_HEX = "E2E8F0";
const SLATE_400_HEX = "94A3B8";
const SLATE_500_HEX = "64748B";
const DARK_HEX = "0F172A";

function sevColorHex(s: string): string {
  return s === "critical" ? "991B1B" : s === "high" ? "DC4E0A" : s === "medium" ? "B47804" : s === "low" ? "15803D" : "64748B";
}

function sevBgHex(s: string): string {
  return s === "critical" ? "FEE2E2" : s === "high" ? "FED7AA" : s === "medium" ? "FEF3C7" : s === "low" ? "DCFCE7" : "F1F5F9";
}

function sevLabelTr(s: string): string {
  return s === "critical" ? "KRİTİK" : s === "high" ? "YÜKSEK" : s === "medium" ? "ORTA" : s === "low" ? "DÜŞÜK" : "İZLEME";
}

function thinBorder() {
  const b = { style: BorderStyle.SINGLE, size: 2, color: SLATE_200_HEX };
  return { top: b, bottom: b, left: b, right: b };
}

function noBorder() {
  const b = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return { top: b, bottom: b, left: b, right: b };
}

/** Bölüm başlığı şeridi — sol altın çubuk + navy başlık */
function sectionBanner(text: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 3, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: " ", size: 1 })] })],
          shading: { type: ShadingType.SOLID, color: GOLD_HEX },
          borders: noBorder(),
        }),
        new TableCell({
          width: { size: 97, type: WidthType.PERCENTAGE },
          children: [new Paragraph({
            children: [new TextRun({ text: text.toLocaleUpperCase("tr-TR"), bold: true, size: 22, font: "Segoe UI", color: "FFFFFF" })],
            spacing: { before: 80, after: 80 },
          })],
          shading: { type: ShadingType.SOLID, color: NAVY_HEX },
          margins: { left: 200, right: 100, top: 60, bottom: 60 },
          borders: noBorder(),
        }),
      ],
    })],
  });
}

/** Etiket hücresi (altın açık arkaplan) */
function labelCell(text: string, widthPct = 18): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, size: 17, font: "Segoe UI", color: NAVY_HEX })],
      spacing: { after: 20 },
    })],
    shading: { type: ShadingType.SOLID, color: GOLD_PALE_HEX },
    borders: thinBorder(),
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}

/** Değer hücresi */
function valueCell(text: string, widthPct = 32): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    children: [new Paragraph({
      children: [new TextRun({ text: text || "-", size: 17, font: "Segoe UI", color: DARK_HEX })],
      spacing: { after: 20 },
    })],
    borders: thinBorder(),
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}

/** İstatistik kartı hücresi (renkli başlık + büyük rakam) */
function statCardCell(label: string, value: string | number, accentHex: string): TableCell {
  return new TableCell({
    width: { size: 25, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        children: [new TextRun({ text: String(value), bold: true, size: 36, font: "Segoe UI", color: accentHex })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 40 },
      }),
      new Paragraph({
        children: [new TextRun({ text: label.toLocaleUpperCase("tr-TR"), bold: true, size: 16, font: "Segoe UI", color: SLATE_500_HEX })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }),
    ],
    shading: { type: ShadingType.SOLID, color: SLATE_50_HEX },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: accentHex },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: accentHex },
      left: { style: BorderStyle.SINGLE, size: 12, color: accentHex },
      right: { style: BorderStyle.SINGLE, size: 4, color: accentHex },
    },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}

function goldHeaderCell(text: string): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, font: "Segoe UI", color: "FFFFFF" })], alignment: AlignmentType.LEFT })],
    shading: { type: ShadingType.SOLID, color: NAVY_MID_HEX },
    borders: thinBorder(),
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}

function dataCell(text: string, opts?: { bold?: boolean; color?: string; bg?: string }): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: text || "-", bold: opts?.bold, size: 17, font: "Segoe UI", color: opts?.color || DARK_HEX })], spacing: { after: 20 } })],
    shading: opts?.bg ? { type: ShadingType.SOLID, color: opts.bg } : undefined,
    borders: thinBorder(),
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
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

function appendWordFindingDetail(children: (Paragraph | Table)[], f: ExportFinding, pin: string) {
  const sevColor = sevColorHex(f.severity);
  const sevLabel = sevLabelTr(f.severity);

  // Risk başlık şeridi: renkli sol çubuk + kod + başlık + sınıf rozeti
  children.push(new Paragraph({ spacing: { before: 120 } }));
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 2, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: " ", size: 1 })] })],
          shading: { type: ShadingType.SOLID, color: sevColor },
          borders: noBorder(),
        }),
        new TableCell({
          width: { size: 78, type: WidthType.PERCENTAGE },
          children: [new Paragraph({
            children: [
              new TextRun({ text: `${pin}  `, bold: true, size: 22, font: "Segoe UI", color: sevColor }),
              new TextRun({ text: f.title, bold: true, size: 22, font: "Segoe UI", color: NAVY_HEX }),
            ],
            spacing: { before: 60, after: 30 },
          }), new Paragraph({
            children: [new TextRun({ text: f.category || "-", size: 16, font: "Segoe UI", color: SLATE_500_HEX, italics: true })],
            spacing: { after: 60 },
          })],
          shading: { type: ShadingType.SOLID, color: SLATE_50_HEX },
          borders: noBorder(),
          margins: { top: 40, bottom: 40, left: 200, right: 100 },
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          children: [new Paragraph({
            children: [new TextRun({ text: sevLabel, bold: true, size: 20, font: "Segoe UI", color: "FFFFFF" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 120 },
          })],
          shading: { type: ShadingType.SOLID, color: sevColor },
          borders: noBorder(),
        }),
      ],
    })],
  }));

  // Detay 2-sütun key-value tablosu (label | value)
  const mDetail = methodScoreDetail(f);
  const kvRows: { label: string; value: string }[] = [
    { label: "Sınıf / Skor", value: `${sevLabel} / ${scoreDisplay(f)}` },
    { label: "Yöntem", value: f.methodLabel },
    { label: "Tespit ve Değerlendirme", value: f.recommendation || "Detaylı değerlendirme yapılmalıdır." },
    { label: "Alınacak Önlem", value: findingActionText(f) },
  ];
  if (mDetail) kvRows.push({ label: "Skor Detayı", value: mDetail });
  kvRows.push({ label: "Mevzuat Bağlamı", value: findingLegalText(f) });
  if (f.correctiveActionRequired) kvRows.push({ label: "Durum", value: "DÖF Adayı — Düzeltici Faaliyet Gerekli" });

  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: kvRows.map((kv) => new TableRow({
      children: [labelCell(kv.label, 22), valueCell(kv.value, 78)],
    })),
  }));
  children.push(new Paragraph({ spacing: { after: 100 } }));
}

export async function generateRiskAnalysisWordBlob(data: RiskAnalysisExportData): Promise<Blob> {
  const now = data.date || new Date().toLocaleDateString("tr-TR");
  const children: (Paragraph | Table)[] = [];

  /* ================================================================ */
  /*  KAPAK / BAŞLIK                                                  */
  /* ================================================================ */

  // Marka
  children.push(new Paragraph({
    children: [new TextRun({ text: "RISKNOVA", bold: true, size: 18, font: "Segoe UI", color: GOLD_HEX })],
    spacing: { after: 40 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: "Profesyonel İSG Risk Değerlendirme Platformu", size: 14, font: "Segoe UI", color: SLATE_500_HEX, italics: true })],
    spacing: { after: 240 },
  }));

  // Ana başlık
  children.push(new Paragraph({
    children: [new TextRun({ text: "RİSK DEĞERLENDİRME RAPORU", bold: true, size: 44, font: "Segoe UI", color: NAVY_HEX })],
    heading: HeadingLevel.TITLE,
    spacing: { after: 60 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: "Saha Risk Analizi | Denetim ve Aksiyon Takip Dokümanı", size: 18, font: "Segoe UI", color: SLATE_500_HEX })],
    spacing: { after: 100 },
  }));

  // Altın çizgi
  children.push(new Paragraph({
    children: [new TextRun({ text: " ", size: 1 })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: GOLD_HEX, space: 1 } },
    spacing: { after: 200 },
  }));

  // Firma bilgileri tablosu
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        labelCell("Firma"), valueCell(data.companyName),
        labelCell("Tarih"), valueCell(now),
      ]}),
      new TableRow({ children: [
        labelCell("Lokasyon"), valueCell([data.location, data.department].filter(Boolean).join(" / ")),
        labelCell("Yöntem"), valueCell(data.methodLabel),
      ]}),
      new TableRow({ children: [
        labelCell("Sektör"), valueCell(data.companySector || "-"),
        labelCell("Tehlike sınıfı"), valueCell(data.companyHazardClass || "-"),
      ]}),
      new TableRow({ children: [
        labelCell("Adres"), valueCell(data.companyAddress || "-"),
        labelCell("Rapor türü"), valueCell("Fotoğraf destekli saha risk değerlendirmesi"),
      ]}),
    ],
  }));
  children.push(new Paragraph({ spacing: { after: 240 } }));

  const sections = resolveExportImageSections(data);
  const totalReal = exportTotalFindings(data);

  /* ================================================================ */
  /*  GENEL DURUM ÖZETİ                                               */
  /* ================================================================ */

  // Risk sınıfı sayımları
  const counts = {
    critical: data.findings.filter((f) => f.riskClass === "critical").length,
    high: data.findings.filter((f) => f.riskClass === "high").length,
    medium: data.findings.filter((f) => f.riskClass === "medium").length,
    low: data.findings.filter((f) => f.riskClass === "low" || f.riskClass === "follow_up").length,
  };

  children.push(sectionBanner("Genel Durum Özeti"));
  children.push(new Paragraph({ spacing: { after: 80 } }));

  // 4 istatistik kartı tablosu
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [
        statCardCell("Kritik", counts.critical, "DC2626"),
        statCardCell("Yüksek", counts.high, "F97316"),
        statCardCell("Orta", counts.medium, "EAB308"),
        statCardCell("Düşük / İzleme", counts.low, "22C55E"),
      ],
    })],
  }));
  children.push(new Paragraph({ spacing: { after: 120 } }));

  // Özet bilgi tablosu
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        labelCell("Toplam görsel"), valueCell(String(sections.length)),
        labelCell("Toplam risk bulgusu"), valueCell(String(totalReal)),
      ]}),
      new TableRow({ children: [
        labelCell("Başarılı analiz"), valueCell(String(sections.filter((s) => s.analysisStatus === "success").length)),
        labelCell("Manuel doğrulama"), valueCell(String(data.failedImageCount ?? 0)),
      ]}),
      new TableRow({ children: [
        labelCell("DÖF adayı"), valueCell(String(data.dofCandidateCount)),
        labelCell("Yüksek/Kritik"), valueCell(String(counts.critical + counts.high)),
      ]}),
    ],
  }));
  children.push(new Paragraph({ spacing: { after: 240 } }));

  /* ================================================================ */
  /*  HAZIRLAYAN / ANALİZ EKİBİ                                       */
  /* ================================================================ */
  if (data.participants.length > 0) {
    children.push(sectionBanner("Hazırlayan / Analiz Ekibi"));
    children.push(new Paragraph({ spacing: { after: 80 } }));

    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [
          goldHeaderCell("No"),
          goldHeaderCell("Ad Soyad"),
          goldHeaderCell("Görev / Rol"),
          goldHeaderCell("Unvan"),
          goldHeaderCell("Sertifika No"),
        ]}),
        ...data.participants.map((p, i) => new TableRow({
          children: [
            dataCell(String(i + 1)),
            dataCell(p.fullName, { bold: true }),
            dataCell(p.role),
            dataCell(p.title),
            dataCell(p.certificateNo),
          ],
        })),
      ],
    }));
    children.push(new Paragraph({ spacing: { after: 240 } }));
  }

  /* ================================================================ */
  /*  METODOLOJİ                                                       */
  /* ================================================================ */
  children.push(sectionBanner("Metodoloji"));
  children.push(new Paragraph({ spacing: { after: 80 } }));
  children.push(new Paragraph({
    children: [new TextRun({
      text: data.method === "fine_kinney"
        ? "Bu değerlendirme Fine-Kinney metodolojisi (Risk = Olasılık × Maruziyet/Frekans × Şiddet) ile yapılmıştır. Her bulgu için P, F ve S parametreleri saha gözlemleri ve uzman değerlendirmesine dayanır."
        : `Bu değerlendirme ${data.methodLabel} metodolojisi ile yapılmıştır.`,
      size: 18,
      font: "Segoe UI",
      color: DARK_HEX,
    })],
    spacing: { after: 200 },
  }));

  // Sayfa atlaması — görsel analizi yeni sayfada başlasın
  children.push(new Paragraph({ children: [new PageBreak()] }));

  /* ================================================================ */
  /*  GÖRSEL BAZLI ANALİZ                                              */
  /* ================================================================ */
  children.push(sectionBanner("Görsel Bazlı Analiz"));
  children.push(new Paragraph({ spacing: { after: 120 } }));

  for (let idx = 0; idx < sections.length; idx++) {
    const sec = sections[idx];
    if (idx > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    // Görsel başlık şeridi: kod chip + dosya adı + durum badge
    const statusColor = sec.analysisStatus === "success" ? "059669" : "D97706";
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            children: [new Paragraph({
              children: [new TextRun({ text: `G${sec.imageIndex}`, bold: true, size: 22, font: "Segoe UI", color: "FFFFFF" })],
              alignment: AlignmentType.CENTER,
            })],
            shading: { type: ShadingType.SOLID, color: NAVY_HEX },
            borders: noBorder(),
            margins: { top: 100, bottom: 100, left: 40, right: 40 },
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({
              children: [new TextRun({ text: sec.fileName, bold: true, size: 20, font: "Segoe UI", color: NAVY_HEX })],
              spacing: { before: 60, after: 60 },
            })],
            shading: { type: ShadingType.SOLID, color: SLATE_100_HEX },
            borders: noBorder(),
            margins: { top: 60, bottom: 60, left: 200, right: 100 },
          }),
          new TableCell({
            width: { size: 22, type: WidthType.PERCENTAGE },
            children: [new Paragraph({
              children: [new TextRun({ text: sec.analysisStatusLabel, bold: true, size: 16, font: "Segoe UI", color: "FFFFFF" })],
              alignment: AlignmentType.CENTER,
            })],
            shading: { type: ShadingType.SOLID, color: statusColor },
            borders: noBorder(),
            margins: { top: 100, bottom: 100, left: 60, right: 60 },
          }),
        ],
      })],
    }));
    children.push(new Paragraph({ spacing: { after: 80 } }));

    // Side-by-side: SOL fotoğraf, SAĞ meta tablo
    const parsed = sec.dataUrl ? parseDataUrl(sec.dataUrl) : null;
    const leftCellChildren: Paragraph[] = [];

    if (parsed) {
      try {
        leftCellChildren.push(new Paragraph({
          children: [new ImageRun({
            type: parsed.ext,
            data: parsed.buffer,
            transformation: { width: 220, height: 165 },
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
        }));
      } catch {
        leftCellChildren.push(new Paragraph({
          children: [new TextRun({ text: "[Görsel yüklenemedi]", size: 16, font: "Segoe UI", color: SLATE_400_HEX, italics: true })],
          alignment: AlignmentType.CENTER,
        }));
      }
    } else {
      leftCellChildren.push(new Paragraph({
        children: [new TextRun({ text: "[Görsel önizleme mevcut değil]", size: 16, font: "Segoe UI", color: SLATE_400_HEX, italics: true })],
        alignment: AlignmentType.CENTER,
      }));
    }

    // Meta key-value: SAĞ
    const metaRows: { label: string; value: string }[] = [
      { label: "Saha tanımı", value: sec.areaLocation || sec.rowTitle || "-" },
      { label: "Sahne tipi", value: sec.sceneType || "-" },
      { label: "Risk sayısı", value: String(sec.findings.length) },
      { label: "Analiz durumu", value: sec.analysisStatusLabel },
      { label: "Kapsam", value: sec.scopeReason || "Analize dahil" },
    ];

    const rightCellChildren: (Paragraph | Table)[] = [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: metaRows.map((kv) => new TableRow({
          children: [labelCell(kv.label, 40), valueCell(kv.value, 60)],
        })),
      }),
    ];

    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            children: leftCellChildren,
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            shading: { type: ShadingType.SOLID, color: SLATE_50_HEX },
            borders: { top: { style: BorderStyle.SINGLE, size: 2, color: SLATE_200_HEX }, bottom: { style: BorderStyle.SINGLE, size: 2, color: SLATE_200_HEX }, left: { style: BorderStyle.SINGLE, size: 2, color: SLATE_200_HEX }, right: { style: BorderStyle.SINGLE, size: 2, color: SLATE_200_HEX } },
          }),
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            children: rightCellChildren,
            margins: { top: 40, bottom: 40, left: 40, right: 40 },
            borders: noBorder(),
          }),
        ],
      })],
    }));
    children.push(new Paragraph({ spacing: { after: 120 } }));

    if (sec.analysisError) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: "⚠ Analiz Hatası: ", bold: true, size: 16, font: "Segoe UI", color: "92400E" }),
          new TextRun({ text: sec.analysisError, size: 16, font: "Segoe UI", color: "92400E", italics: true }),
        ],
        shading: { type: ShadingType.SOLID, color: "FEF3C7" },
        spacing: { after: 100 },
      }));
    }

    // Tespit edilen riskler başlığı
    if (sec.findings.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: "TESPİT EDİLEN RİSKLER", bold: true, size: 18, font: "Segoe UI", color: GOLD_HEX })],
        spacing: { before: 120, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD_HEX, space: 1 } },
      }));

      sec.findings.forEach((f, fi) => {
        appendWordFindingDetail(children, f, findingPinLabel(f, fi));
      });
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: "Bu görsel için risk tespiti bulunmamaktadır.", size: 16, font: "Segoe UI", color: SLATE_500_HEX, italics: true })],
        spacing: { after: 120 },
      }));
    }
  }

  /* ================================================================ */
  /*  ONAY VE İMZA                                                     */
  /* ================================================================ */
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionBanner("Onay ve İmza"));
  children.push(new Paragraph({ spacing: { after: 80 } }));

  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        goldHeaderCell("Rol"),
        goldHeaderCell("Ad Soyad"),
        goldHeaderCell("Unvan"),
        goldHeaderCell("Tarih"),
        goldHeaderCell("İmza"),
      ]}),
      new TableRow({ children: [
        dataCell("Hazırlayan", { bold: true }),
        dataCell(data.participants[0]?.fullName || ""),
        dataCell(data.participants[0]?.title || data.participants[0]?.role || ""),
        dataCell(now),
        dataCell(""),
      ]}),
      new TableRow({ children: [
        dataCell("Kontrol eden", { bold: true }),
        dataCell(""), dataCell(""), dataCell(""), dataCell(""),
      ]}),
      new TableRow({ children: [
        dataCell("İşveren / Vekili", { bold: true }),
        dataCell(""), dataCell(""), dataCell(""), dataCell(""),
      ]}),
    ],
  }));
  children.push(new Paragraph({ spacing: { after: 240 } }));

  // ── QR Kod (varsa) — dijital doğrulama ──
  if (data.shareQrDataUrl) {
    const qrParsed = parseDataUrl(data.shareQrDataUrl);
    children.push(sectionBanner("Dijital Doğrulama"));
    children.push(new Paragraph({ spacing: { after: 80 } }));

    const qrChildren: Paragraph[] = [];
    if (qrParsed) {
      qrChildren.push(new Paragraph({
        children: [new ImageRun({ data: qrParsed.buffer, transformation: { width: 110, height: 110 }, type: qrParsed.ext })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
      }));
    }
    qrChildren.push(new Paragraph({
      children: [new TextRun({ text: "QR doğrulama", bold: true, size: 16, font: "Segoe UI", color: NAVY_HEX })],
      alignment: AlignmentType.CENTER,
    }));

    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            children: qrChildren,
            shading: { type: ShadingType.SOLID, color: SLATE_50_HEX },
            borders: thinBorder(),
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Rapor Doğrulama Bilgisi", bold: true, size: 18, font: "Segoe UI", color: NAVY_HEX })],
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [new TextRun({ text: "QR kodu taratarak raporun dijital versiyonuna ulaşabilir, rapor kimlik özetini doğrulayabilirsiniz.", size: 16, font: "Segoe UI", color: SLATE_500_HEX })],
                spacing: { after: 60 },
              }),
              ...(data.shareUrl ? [new Paragraph({
                children: [new TextRun({ text: data.shareUrl, size: 14, font: "Segoe UI", color: GOLD_HEX, italics: true })],
              })] : []),
            ],
            borders: thinBorder(),
            margins: { top: 120, bottom: 120, left: 200, right: 120 },
          }),
        ],
      })],
    }));
  }

  // ── Footer ──
  children.push(new Paragraph({ spacing: { before: 240 } }));
  children.push(new Paragraph({
    children: [new TextRun({ text: " ", size: 1 })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD_HEX, space: 1 } },
    spacing: { after: 80 },
  }));
  children.push(new Paragraph({
    children: [
      new TextRun({ text: `Bu rapor RiskNova İSG Platformu tarafından ${now} tarihinde oluşturulmuştur.`, size: 14, font: "Segoe UI", color: SLATE_500_HEX, italics: true }),
    ],
    alignment: AlignmentType.CENTER,
  }));
  children.push(new Paragraph({
    children: [
      new TextRun({ text: `${data.methodLabel} yöntemi ile değerlendirilmiş — Basılı kopya saha doğrulaması ve yetkili imzalarla geçerlidir.`, size: 14, font: "Segoe UI", color: SLATE_500_HEX, italics: true }),
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
    { width: 10 },  // A: Risk ID
    { width: 30 },  // B: Tespit
    { width: 14 },  // C: Kategori
    { width: 10 },  // D: Risk Sınıfı
    { width: 8 },   // E: Skor
    { width: 24 },  // F: Skor Detayı
    { width: 6 },   // G: DÖF
    { width: 35 },  // H: Tespit Detayı
    { width: 30 },  // I: Mevzuat
    { width: 25 },  // J: Önlem
  ];

  // Baslik
  const titleRow = ws.addRow(["RİSK ANALİZİ RAPORU"]);
  ws.mergeCells("A1:J1");
  titleRow.font = { bold: true, size: 16, color: { argb: GOLD } };
  titleRow.height = 28;

  // Firma bilgileri
  const infoRow = ws.addRow([`${data.companyName} · ${data.location || "-"} · ${data.department || "-"} · ${data.methodLabel} · ${data.date}`]);
  ws.mergeCells("A2:J2");
  infoRow.font = { size: 10, color: { argb: "666666" } };

  // Istatistik satiri
  const sections = resolveExportImageSections(data);
  const totalReal = exportTotalFindings(data);
  const statRow = ws.addRow([
    `Toplam gerçek bulgu: ${totalReal} · Yüksek/Kritik: ${data.criticalCount} · DÖF: ${data.dofCandidateCount}${data.failedImageCount ? ` · Başarısız görsel: ${data.failedImageCount}` : ""} · Ekip: ${data.participants.length}`,
  ]);
  ws.mergeCells("A3:J3");
  statRow.font = { size: 10, bold: true, color: { argb: GOLD } };

  ws.addRow([]); // Bos satir

  const headers = ["Risk ID", "Tespit", "Kategori", "Risk Sınıfı", "Skor", "Skor Detayı", "DÖF", "Tespit Detayı", "Mevzuat / RAG", "Alınacak Önlem"];

  for (const sec of sections) {
    const sectionRow = ws.addRow([
      `Görsel ${sec.imageIndex}: ${sec.fileName} — ${sec.areaLocation} — ${sec.analysisStatusLabel} — ${sec.analysisStatus === "success" ? `${sec.findingCount} risk` : "risk üretilmedi"}`,
    ]);
    const sn = sectionRow.number;
    ws.mergeCells(`A${sn}:J${sn}`);
    sectionRow.height = 22;
    sectionRow.font = { bold: true, size: 11, color: { argb: GOLD } };
    sectionRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD_BG } };

    if (sec.dataUrl) {
      try {
        const base64Data = sec.dataUrl.split(",")[1];
        if (base64Data) {
          const ext = sec.dataUrl.includes("image/png") ? "png" : "jpeg";
          const imageId = wb.addImage({ base64: base64Data, extension: ext });
          const imgRow = ws.addRow([]);
          imgRow.height = 120;
          ws.addImage(imageId, {
            tl: { col: 0, row: imgRow.number - 1 },
            ext: { width: 280, height: 150 },
          });
        }
      } catch {
        /* görsel eklenemezse devam */
      }
    }

    if (sec.analysisStatus !== "success" || sec.findings.length === 0) {
      const noteRow = ws.addRow([sec.analysisError || "Bu görsel için otomatik risk kaydı üretilmedi."]);
      ws.mergeCells(`A${noteRow.number}:J${noteRow.number}`);
      noteRow.font = { italic: true, size: 10, color: { argb: "92400E" } };
      ws.addRow([]);
      continue;
    }

    const hRow = ws.addRow(headers);
    hRow.height = 20;
    hRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: WHITE }, size: 9 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD } };
      cell.alignment = { wrapText: true, vertical: "middle" };
    });

    sec.findings.forEach((f, fi) => {
      const mDetail = methodScoreDetail(f);
      const mevzuat = findingLegalText(f);
      const row = ws.addRow([
        findingPinLabel(f, fi),
        f.title,
        f.category,
        f.scoreLabel,
        f.score < 2 ? Number((f.score * 100).toFixed(0)) : Math.round(f.score),
        mDetail || "-",
        f.correctiveActionRequired ? "Evet" : "-",
        f.recommendation || "-",
        mevzuat,
        findingActionText(f),
      ]);

      row.alignment = { wrapText: true, vertical: "top" };
      const COL_WIDTHS = [10, 30, 14, 10, 8, 24, 6, 35, 30, 25];
      row.height = calcRowHeight(
        [findingPinLabel(f, fi), f.title, f.category, f.scoreLabel, String(f.score), mDetail || "-", f.correctiveActionRequired ? "Evet" : "-", f.recommendation || "", mevzuat, findingActionText(f)],
        COL_WIDTHS,
      );

      const rColor = riskColor(f.severity);
      row.getCell(4).font = { bold: true, color: { argb: rColor }, size: 9 };
      if (f.correctiveActionRequired) {
        row.getCell(7).font = { bold: true, color: { argb: RED }, size: 9 };
      }
      if (fi % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
        });
      }
    });

    ws.addRow([]);
  }

  // ── Ekip bilgileri (alt kisim) ──
  if (data.participants.length > 0) {
    ws.addRow([]);
    const ekipTitle = ws.addRow(["ANALİZ EKİBİ"]);
    ws.mergeCells(`A${ekipTitle.number}:J${ekipTitle.number}`);
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
