/**
 * Saha risk analizi — denetime uygun PDF (tablolar, UTF-8 Türkçe, Fine-Kinney).
 * Premium profesyonel tasarım v2.
 */

import type { ExportFinding, RiskAnalysisExportData } from "@/lib/risk-analysis-export";
import {
  findingActionText,
  findingLegalText,
  resolveExportImageSections,
} from "@/lib/risk-analysis/field-export-sections";
import { buildFieldReportConsolidatedJson, FAILED_ANALYSIS_WARNING } from "@/lib/risk-analysis/field-report-json";
import { buildRiskAnalysisReportJson } from "@/lib/risk-analysis/report-json";
import {
  FAILED_IMAGE_NOTE,
  isReportIncomplete,
  reportTitleWithValidity,
} from "@/lib/risk-analysis/field-report-validity";
import {
  formatFineKinneyBlock,
  formatMatrixBlock,
  riskClassLabelTr,
} from "@/lib/risk-analysis/finding-quality";
import {
  measureWrappedTextHeight,
  syncYAfterTable,
  writeParagraph,
} from "@/lib/risk-analysis/pdf-layout-helpers";

/* ------------------------------------------------------------------ */
/*  Premium renk paleti                                                */
/* ------------------------------------------------------------------ */
const C = {
  navy: [15, 23, 42] as [number, number, number],
  navyMid: [30, 41, 59] as [number, number, number],
  gold: [180, 142, 38] as [number, number, number],
  goldLight: [212, 175, 55] as [number, number, number],
  goldPale: [253, 248, 234] as [number, number, number],
  teal: [13, 148, 136] as [number, number, number],
  tealDark: [15, 118, 110] as [number, number, number],
  red: [185, 28, 28] as [number, number, number],
  redLight: [254, 226, 226] as [number, number, number],
  orange: [180, 83, 9] as [number, number, number],
  slate50: [248, 250, 252] as [number, number, number],
  slate100: [241, 245, 249] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],
  slate400: [148, 163, 184] as [number, number, number],
  slate500: [100, 116, 139] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
};

/* ------------------------------------------------------------------ */
/*  Font loading                                                       */
/* ------------------------------------------------------------------ */
let notoSansFontPromise: Promise<{ regular: string; bold: string } | null> | null = null;

async function fetchFontAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Font indirilemedi: ${response.status}`);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

async function ensurePdfUnicodeFont(doc: InstanceType<typeof import("jspdf").jsPDF>): Promise<boolean> {
  notoSansFontPromise ??= (async () => {
    try {
      const [regular, bold] = await Promise.all([
        fetchFontAsBase64("https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf"),
        fetchFontAsBase64("https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Bold.ttf"),
      ]);
      return { regular, bold };
    } catch (error) {
      console.warn("[pdf-field-report] Noto Sans font yüklenemedi; helvetica fallback kullanılacak.", error);
      return null;
    }
  })();

  const fonts = await notoSansFontPromise;
  if (!fonts) return false;
  doc.addFileToVFS("NotoSans-Regular.ttf", fonts.regular);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", fonts.bold);
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  return true;
}

/* ------------------------------------------------------------------ */
/*  Yardımcılar                                                        */
/* ------------------------------------------------------------------ */
function asText(value: unknown, fallback = "-"): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function riskClassFill(riskClass: string): [number, number, number] {
  switch (riskClass) {
    case "critical":
      return [153, 27, 27];
    case "high":
      return [220, 78, 10];
    case "medium":
      return [180, 120, 4];
    case "low":
    case "follow_up":
      return [21, 128, 61];
    default:
      return [100, 116, 139];
  }
}

function riskClassAccent(riskClass: string): [number, number, number] {
  switch (riskClass) {
    case "critical":
      return [220, 38, 38];
    case "high":
      return [249, 115, 22];
    case "medium":
      return [234, 179, 8];
    case "low":
    case "follow_up":
      return [34, 197, 94];
    default:
      return [148, 163, 184];
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

type TableCell = string | number | boolean | null | undefined;

function sceneTypeLabel(value: unknown): string {
  switch (String(value || "")) {
    case "construction_site":
      return "İnşaat sahası";
    case "industrial_site":
      return "Endüstriyel saha";
    case "warehouse":
      return "Depo / lojistik alanı";
    case "office":
      return "Ofis";
    case "workplace":
      return "İşyeri";
    case "non_workplace":
      return "İşyeri dışı";
    case "unclear":
    case "unknown":
      return "Belirsiz";
    default:
      return asText(value);
  }
}

function analysisStatusLabel(value: unknown): string {
  switch (String(value || "")) {
    case "success":
      return "Başarılı";
    case "partial":
      return "Kısmi analiz";
    case "failed":
      return "Analiz başarısız";
    case "pending":
      return "Beklemede";
    case "manual_required":
      return "Manuel doğrulama gerekli";
    default:
      return asText(value);
  }
}

function scopeDecisionLabel(value: unknown): string {
  switch (String(value || "")) {
    case "analyze":
      return "Analize dahil";
    case "exclude":
      return "Kapsam dışı";
    case "manual_review_required":
      return "Manuel inceleme gerekli";
    default:
      return asText(value);
  }
}

function displayFileName(value: unknown, index?: number): string {
  const fileName = asText(value, index ? `Görsel ${index}` : "Görsel");
  const extension = fileName.match(/\.[a-z0-9]{2,5}$/i)?.[0] ?? "";
  const base = extension ? fileName.slice(0, -extension.length) : fileName;
  const looksGenerated = base.length > 34 && !base.includes("-") && !base.includes("_") && !base.includes(" ");
  if (looksGenerated) return `${index ? `Görsel ${index}` : "Görsel"}${extension}`;
  return truncate(fileName, 54);
}

/* ================================================================== */
/*  Ana PDF oluşturucu                                                 */
/* ================================================================== */
export async function generateFieldRiskAnalysisPdfBytes(data: RiskAnalysisExportData): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const QRCode = await import("qrcode");

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const fontFamily = (await ensurePdfUnicodeFont(doc)) ? "NotoSans" : "helvetica";
  doc.setFont(fontFamily, "normal");
  const margin = 15;
  const width = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentW = width - margin * 2;
  const reportDate = asText(data.date, new Date().toLocaleDateString("tr-TR"));
  const baseTitle = asText(data.analysisTitle, "Saha Risk Analizi Raporu");
  const incomplete = data.reportIncomplete ?? isReportIncomplete(data);
  const reportTitle = reportTitleWithValidity(baseTitle, incomplete);
  let y = margin;
  let totalPages = 0;

  /* ---------- Uyarı kutusu ---------- */
  const alertBox = (text: string) => {
    const innerWidth = contentW - 12;
    const wrapped = doc.splitTextToSize(text, innerWidth) as string[];
    const h = wrapped.length * 4.5 + 12;
    ensureSpace(h);
    const boxTop = y;
    doc.setFillColor(...C.redLight);
    doc.setDrawColor(...C.red);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, boxTop, contentW, h, 2, 2, "FD");
    doc.setFillColor(...C.red);
    doc.rect(margin, boxTop, 3, h, "F");
    y = writeParagraph(doc, {
      text,
      x: margin + 7,
      y: boxTop + 6,
      maxWidth: innerWidth,
      fontFamily,
      fontSize: 9,
      style: "bold",
      color: C.red,
      lineHeightFactor: 1.2,
    });
    y += 5;
  };

  /* ---------- Sayfa üstbilgi / altbilgi ---------- */
  const addPageHeaderFooter = () => {
    const page = doc.getCurrentPageInfo().pageNumber;
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.gold);
    doc.text("RISKNOVA", margin, 8);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.slate500);
    doc.text(truncate(reportTitle, 70), margin + 22, 8);
    doc.text(reportDate, width - margin, 8, { align: "right" });
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.4);
    doc.line(margin, 10, width - margin, 10);
    doc.setLineWidth(0.1);
    doc.setDrawColor(...C.slate200);
    doc.line(margin, pageHeight - 12, width - margin, pageHeight - 12);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.slate400);
    doc.text(`Sayfa ${page}`, width / 2, pageHeight - 7, { align: "center" });
    doc.setTextColor(...C.text);
  };

  /* ---------- Sayfa alanı kontrolü ---------- */
  const ensureSpace = (height = 14) => {
    if (y + height <= pageHeight - 14) return;
    doc.addPage();
    y = 15;
    addPageHeaderFooter();
  };

  /* ---------- Metin yardımcıları ---------- */
  const line = (text: string, size = 10, style: "normal" | "bold" = "normal", color: [number, number, number] = C.text) => {
    const blockH = measureWrappedTextHeight(doc, text, contentW, size);
    ensureSpace(blockH + 3);
    y = writeParagraph(doc, {
      text,
      x: margin,
      y,
      maxWidth: contentW,
      fontFamily,
      fontSize: size,
      style,
      color,
    });
  };

  /* ---------- Bölüm başlığı (altın çubuk) ---------- */
  const section = (title: string) => {
    ensureSpace(16);
    y += y <= 20 ? 0 : 4;
    doc.setFillColor(...C.gold);
    doc.rect(margin, y, 2.5, 8.5, "F");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(...C.navy);
    doc.text(title.toLocaleUpperCase("tr-TR"), margin + 6, y + 6.2);
    y += 11;
    doc.setTextColor(...C.text);
    doc.setFont(fontFamily, "normal");
  };

  /* ---------- Tablolar ---------- */
  const addSimpleTable = (
    head: string[],
    body: TableCell[][],
    options: {
      fontSize?: number;
      headerColor?: [number, number, number];
      columnStyles?: Record<number, Record<string, unknown>>;
      minCellHeight?: number;
    } = {},
  ) => {
    ensureSpace(22);
    const fs = options.fontSize ?? 8.5;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [head],
      body: body.map((row) => row.map((cell) => asText(cell))),
      styles: {
        font: fontFamily,
        fontSize: fs,
        cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
        overflow: "linebreak",
        valign: "top",
        halign: "left",
        minCellHeight: options.minCellHeight ?? 8,
        lineColor: C.slate200,
        lineWidth: 0.15,
        textColor: C.text,
      },
      headStyles: {
        fillColor: options.headerColor ?? C.navyMid,
        textColor: 255,
        fontStyle: "bold",
        cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
        minCellHeight: 9,
      },
      alternateRowStyles: { fillColor: C.slate50 },
      columnStyles: options.columnStyles,
      rowPageBreak: "avoid",
      tableLineColor: C.slate200,
      tableLineWidth: 0.15,
    });
    y = syncYAfterTable(doc, y, 3);
  };

  const addKeyValueTable = (
    rows: TableCell[][],
    options: { labelWidth?: number; fontSize?: number; headerColor?: [number, number, number] } = {},
  ) => {
    ensureSpace(18);
    const fs = options.fontSize ?? 8.5;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      body: rows.map((row) => row.map((cell) => asText(cell))),
      styles: {
        font: fontFamily,
        fontSize: fs,
        cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
        overflow: "linebreak",
        valign: "top",
        halign: "left",
        minCellHeight: 8,
        lineColor: C.slate200,
        lineWidth: 0.15,
        textColor: C.text,
      },
      columnStyles: {
        0: { cellWidth: options.labelWidth ?? 38, fillColor: options.headerColor ?? C.goldPale, fontStyle: "bold", textColor: C.navy },
        2: { cellWidth: options.labelWidth ?? 38, fillColor: options.headerColor ?? C.goldPale, fontStyle: "bold", textColor: C.navy },
      },
      rowPageBreak: "avoid",
      tableLineColor: C.slate200,
      tableLineWidth: 0.15,
    });
    y = syncYAfterTable(doc, y, 3);
  };

  /* ---------- Numaralı liste (tablo değil, paragraf) ---------- */
  const addNumberedListBlock = (title: string, rows: string[], limit = 12) => {
    if (rows.length === 0) return;
    ensureSpace(12);

    // Başlık şeridi
    doc.setFillColor(...C.tealDark);
    doc.rect(margin, y, contentW, 6, "F");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.white);
    doc.text(title, margin + 3, y + 4.2);
    y += 6;

    // Numaralı satırlar
    doc.setTextColor(...C.text);
    const items = rows.slice(0, limit);
    for (let i = 0; i < items.length; i++) {
      const text = `${i + 1}. ${items[i]}`;
      const wrapped = doc.splitTextToSize(text, contentW - 6) as string[];
      const lineH = 4;
      const blockH = wrapped.length * lineH + 3;
      ensureSpace(blockH);

      // Alternatif arkaplan
      if (i % 2 === 0) {
        doc.setFillColor(...C.slate50);
        doc.rect(margin, y, contentW, blockH, "F");
      }

      doc.setFont(fontFamily, "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...C.text);
      let lineY = y + 3.2;
      for (const w of wrapped) {
        doc.text(w, margin + 3, lineY);
        lineY += lineH;
      }
      y += blockH;
    }
    y += 3;
  };

  // Geri uyumluluk
  const addNumberedListTable = addNumberedListBlock;

  /* ================================================================ */
  /*  Veri hazırlığı                                                   */
  /* ================================================================ */
  const consolidated = buildFieldReportConsolidatedJson(data);
  const sections_data = resolveExportImageSections(data);
  const reportJson = buildRiskAnalysisReportJson(data);
  const verificationPayload =
    data.shareUrl ||
    JSON.stringify({
      document: "RiskNova Saha Risk Analizi",
      reportId: reportJson.reportMeta.reportId,
      company: reportJson.reportMeta.companyName,
      date: reportJson.reportMeta.reportDate,
      title: reportJson.reportMeta.title,
      method: reportJson.reportMeta.method,
      findings: reportJson.summary.totalFindings,
      critical: reportJson.summary.criticalCount,
      generatedAt: new Date().toISOString(),
    });
  const verificationQrDataUrl =
    data.shareQrDataUrl ||
    (await QRCode.toDataURL(verificationPayload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 260,
    }).catch((error) => {
      console.warn("[pdf-field-report] qr generate skip", error);
      return "";
    }));

  /* ================================================================ */
  /*  KAPAK SAYFASI                                                    */
  /* ================================================================ */

  // Üst koyu bant (60mm)
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, width, 60, "F");

  // Altın çizgi
  doc.setFillColor(...C.gold);
  doc.rect(0, 60, width, 2.5, "F");

  // Marka ve başlık
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(10);
  doc.setTextColor(...C.gold);
  doc.text("RISKNOVA", margin, 14);

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.slate400);
  doc.text("Profesyonel İSG Risk Değerlendirme Platformu", margin, 20);

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(22);
  doc.setTextColor(...C.white);
  doc.text("Risk Değerlendirme", margin, 34);
  doc.text("Raporu", margin, 43);

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(9);
  doc.setTextColor(180, 195, 220);
  doc.text("Saha Risk Analizi | Denetim ve Aksiyon Takip Dokümanı", margin, 52);

  // QR kod (sağ üst, altın çerçeveli)
  if (verificationQrDataUrl.startsWith("data:image/")) {
    try {
      const qrSize = 26;
      const qrX = width - margin - qrSize - 2;
      const qrY = 9;
      doc.setFillColor(...C.gold);
      doc.roundedRect(qrX - 1.5, qrY - 1.5, qrSize + 3, qrSize + 3, 1.5, 1.5, "F");
      doc.setFillColor(...C.white);
      doc.roundedRect(qrX - 0.5, qrY - 0.5, qrSize + 1, qrSize + 1, 1, 1, "F");
      doc.addImage(verificationQrDataUrl, "PNG", qrX, qrY, qrSize, qrSize, undefined, "FAST");
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(6);
      doc.setTextColor(180, 195, 220);
      doc.text("QR Doğrulama", qrX + qrSize / 2, qrY + qrSize + 5, { align: "center" });
    } catch (e) {
      console.warn("[pdf-field-report] cover qr skip", e);
    }
  }

  // Kapak bilgi alanı
  y = 70;
  doc.setTextColor(...C.text);

  // Rapor başlığı
  const titleLines = doc.splitTextToSize(reportTitle, contentW) as string[];
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(14);
  doc.setTextColor(...C.navy);
  for (const tl of titleLines) {
    doc.text(tl, margin, y);
    y += 6;
  }
  y += 3;
  doc.setTextColor(...C.text);

  // Firma ve rapor bilgileri tablosu
  addKeyValueTable(
    [
      ["Firma", data.companyName, "Tarih", reportDate],
      ["Lokasyon", [data.location, data.department].filter(Boolean).join(" / "), "Yöntem", data.methodLabel],
      ["Sektör", data.companySector, "Tehlike sınıfı", data.companyHazardClass],
      ["Adres", data.companyAddress, "Rapor durumu", incomplete ? "Eksik analiz / doğrulama gerekli" : "Teslim edilebilir"],
      ["Rapor türü", "Fotoğraf destekli saha risk değerlendirmesi", "Doğrulama", data.shareUrl ? "Dijital rapor bağlantılı QR" : "Rapor kimliği QR"],
    ],
    { fontSize: 9 },
  );

  // Teslim özeti
  addSimpleTable(
    ["Teslim Özeti", "Açıklama"],
    [
      ["Kapsam", "Yüklenen saha görselleri üzerinden İSG risklerinin tespiti, önceliklendirilmesi ve aksiyon planına dönüştürülmesi."],
      ["Yöntem", data.method === "fine_kinney" ? "Fine-Kinney P × F × S risk skorlama yaklaşımı." : asText(data.methodLabel)],
      ["Sınır", "Bu rapor fotoğraf ve kullanıcı girdilerine dayanır; belge, eğitim, izin, ekipman sertifikası ve saha ölçümü gerektiren hususlar ayrıca doğrulanmalıdır."],
    ],
    { fontSize: 8.5, headerColor: C.tealDark, columnStyles: { 0: { cellWidth: 34 } } },
  );

  // Eksik rapor uyarısı
  if (incomplete) {
    alertBox(consolidated.rapor_durumu.uyari || FAILED_ANALYSIS_WARNING);
  }

  // Kapak altbilgisi
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 18, width - margin, pageHeight - 18);
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.slate400);
  doc.text("Bu rapor RiskNova platformu tarafından üretilmiştir.", margin, pageHeight - 13);
  doc.text("Sayfa 1", width - margin, pageHeight - 13, { align: "right" });

  /* ================================================================ */
  /*  BÖLÜM 1 — Amaç, Kapsam ve Rapor Esası                          */
  /* ================================================================ */
  doc.addPage();
  y = 16;
  addPageHeaderFooter();

  section("1. Amaç, Kapsam ve Rapor Esası");
  addKeyValueTable([
    ["Amaç", "Sahada gözlenen İSG tehlikelerini karar verilebilir risk kayıtlarına dönüştürmek.", "Kapsam", `${reportJson.summary.totalImages} görsel, ${reportJson.summary.totalFindings} risk bulgusu`],
    ["Dayanak", "Yüklenen fotoğraflar, kullanıcı satır açıklamaları ve seçilen risk metodolojisi.", "Kısıt", "Tek fotoğraf frekans, eğitim, sertifika, izin ve ölçüm kayıtlarını tek başına kanıtlamaz."],
    ["Çıktı", "Konsolide risk kayıt tablosu, görsel bazlı analiz, öncelikli aksiyon listesi ve doğrulama kontrol listesi.", "QR", data.shareUrl ? "Dijital rapor bağlantısı içerir." : "Rapor kimlik özetini içerir."],
  ]);

  /* ================================================================ */
  /*  BÖLÜM 2 — Rapor Geçerlilik Durumu                               */
  /* ================================================================ */
  section("2. Rapor Geçerlilik Durumu");
  addKeyValueTable([
    ["Durum", consolidated.rapor_gecerlilik.durum, "Nihai rapor mu", consolidated.rapor_gecerlilik.nihai_rapor_mu ? "Evet" : "Hayır"],
    [
      "Geçersizlik nedenleri",
      consolidated.rapor_gecerlilik.gecersizlik_nedenleri.join("\n") || "-",
      "Kritik uyarılar",
      consolidated.rapor_gecerlilik.kritik_uyarilar.join("\n") || "-",
    ],
  ]);

  /* ================================================================ */
  /*  BÖLÜM 3 — Yönetici Özeti                                        */
  /* ================================================================ */
  section("3. Yönetici Özeti");
  const oz = consolidated.yonetici_ozeti;

  // Özet istatistik kartları
  ensureSpace(24);
  const cardW = (contentW - 6) / 4;
  const cardH = 18;
  const cardY = y;
  const statCards: { label: string; value: string | number; color: [number, number, number] }[] = [
    { label: "Toplam Risk", value: oz.toplam_gercek_isg_riski, color: C.navy },
    { label: "Kritik", value: oz.kritik, color: [220, 38, 38] },
    { label: "Yüksek", value: oz.yuksek, color: [249, 115, 22] },
    { label: "Orta / Düşük", value: `${oz.orta} / ${oz.dusuk_izleme}`, color: C.teal },
  ];
  for (let i = 0; i < statCards.length; i++) {
    const cx = margin + i * (cardW + 2);
    const card = statCards[i];
    doc.setFillColor(...C.slate50);
    doc.setDrawColor(...card.color);
    doc.setLineWidth(0.5);
    doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, "FD");
    doc.setFillColor(...card.color);
    doc.rect(cx, cardY, 2.5, cardH, "F");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(16);
    doc.setTextColor(...card.color);
    doc.text(String(card.value), cx + cardW / 2 + 1, cardY + 10, { align: "center" });
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.slate500);
    doc.text(card.label, cx + cardW / 2 + 1, cardY + 15, { align: "center" });
  }
  y = cardY + cardH + 6;

  // Detay tablosu
  addSimpleTable(
    ["Gösterge", "Değer", "Gösterge", "Değer"],
    [
      ["Analiz geçerlilik", oz.analiz_gecerlilik_durumu, "Toplam görsel", oz.toplam_gorsel],
      ["İSG kapsamında", oz.isg_kapsamindaki_gorsel, "Kapsam dışı", oz.kapsam_disi_gorsel],
      ["Başarılı analiz", oz.basarili_analiz, "Kısmi / başarısız", `${oz.kismi_analiz} / ${oz.basarisiz_analiz}`],
      [
        "Gerçek İSG risk bulgusu",
        oz.gercek_risk_sayimi_guvenilir_mi ? String(oz.toplam_gercek_isg_riski) : "Değerlendirilemedi",
        "DÖF adayı",
        oz.dof_adayi,
      ],
      ["Doküman doğrulama", oz.dokuman_dogrulama_maddesi, "Kapsam dışı / sistemsel uyarı", oz.kapsam_disi_sistemsel_uyari],
    ],
    { fontSize: 8.5 },
  );
  if (!oz.gercek_risk_sayimi_guvenilir_mi) {
    line(oz.toplam_gercek_isg_riski_notu, 8.5, "normal", C.red);
  }
  if (oz.basarisiz_analiz > 0) {
    alertBox(
      `${oz.basarisiz_analiz} görsel analiz edilemedi. Bu görseller için 0 risk anlamına gelmez. Yeniden analiz veya manuel doğrulama zorunludur.`,
    );
  }

  addNumberedListBlock("Acil durdurma / derhal müdahale gereken işler", oz.acil_durdurma_gerekenler, 6);
  addNumberedListBlock("İlk 24 saat aksiyonları", oz.ilk_24_saat_aksiyonlari, 8);
  addNumberedListBlock("7 gün içinde aksiyonlar", oz.yedi_gun_aksiyonlari, 10);
  if (data.analysisNote) line(asText(data.analysisNote), 9);

  /* ================================================================ */
  /*  BÖLÜM 4 — Görsel Kapsam Kontrol Tablosu                         */
  /* ================================================================ */
  section("4. Görsel Kapsam Kontrol Tablosu");
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Kod", "Dosya", "Sahne", "Kapsam", "Durum", "Karar", "Gerekçe"]],
    body: consolidated.gorsel_kapsam_kontrolu.map((g, index) => [
      asText(g.gorsel_kodu),
      displayFileName(g.dosya_adi, index + 1),
      sceneTypeLabel(g.scene_type),
      g.isg_kapsaminda_mi ? "İSG kapsamında" : "Kapsam dışı",
      analysisStatusLabel(g.image_analysis_status),
      scopeDecisionLabel(g.scope_decision),
      truncate(asText(g.scope_reason), 80),
    ]),
    styles: {
      font: fontFamily,
      fontSize: 7.5,
      cellPadding: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 },
      overflow: "linebreak",
      valign: "top",
      halign: "left",
      minCellHeight: 8,
      lineColor: C.slate200,
      lineWidth: 0.15,
      textColor: C.text,
    },
    headStyles: { fillColor: C.navyMid, textColor: 255, fontStyle: "bold", minCellHeight: 9 },
    alternateRowStyles: { fillColor: C.slate50 },
    rowPageBreak: "avoid",
  });
  y = syncYAfterTable(doc, y, 5);

  /* ================================================================ */
  /*  BÖLÜM 5 — Metodoloji                                            */
  /* ================================================================ */
  section("5. Metodoloji ve Fine-Kinney");
  line(
    data.method === "fine_kinney"
      ? "Fine-Kinney: Skor = P (olasılık) × F (maruziyet/frekans) × S (şiddet). P/F/S gerekçeleri saha fotoğrafı ve varsayımlarla birlikte raporlanır; frekans tek karede kesin değildir."
      : asText(data.methodLabel),
    9,
  );
  consolidated.rapor_bilgisi.sinirlamalar.forEach((s) => line(`• ${s}`, 8.5));

  if (data.participants.length > 0) {
    section("Analiz Ekibi");
    addSimpleTable(
      ["No", "Ad Soyad", "Rol", "Unvan", "Sertifika No"],
      data.participants.map((p, i) => [i + 1, p.fullName, p.role, p.title, p.certificateNo]),
      {
        fontSize: 8.5,
        columnStyles: {
          0: { cellWidth: 12 },
          1: { cellWidth: 42 },
          2: { cellWidth: 38 },
        },
      },
    );
  }

  /* ================================================================ */
  /*  BÖLÜM 6 — Konsolide Risk Kayıt Tablosu                          */
  /* ================================================================ */
  section("6. Konsolide Risk Kayıt Tablosu");
  const allFindings = sections_data
    .filter((s) => s.scopeDecision !== "exclude" && s.sceneType !== "non_workplace")
    .flatMap((s) => s.findings);
  if (allFindings.length > 0) {
    ensureSpace(22);
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
      styles: {
        font: fontFamily,
        fontSize: 7.5,
        cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 },
        overflow: "linebreak",
        valign: "top",
        halign: "left",
        minCellHeight: 8,
        lineColor: C.slate200,
        lineWidth: 0.15,
        textColor: C.text,
      },
      headStyles: { fillColor: C.navyMid, textColor: 255, fontStyle: "bold", minCellHeight: 9 },
      alternateRowStyles: { fillColor: C.slate50 },
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 28 },
        2: { cellWidth: 38 },
        8: { cellWidth: 32 },
      },
      rowPageBreak: "avoid",
      didParseCell: (hook) => {
        if (hook.section === "body" && hook.column.index === 7) {
          const f = allFindings[hook.row.index];
          if (f) {
            hook.cell.styles.fillColor = riskClassFill(f.riskClass);
            hook.cell.styles.textColor = 255;
            hook.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    y = syncYAfterTable(doc, y, 3);
  } else if (incomplete) {
    line("Konsolide tablo üretilemedi: bir veya daha fazla görsel analiz edilemedi. Başarısız analiz 0 risk sayılmaz.", 9);
  } else {
    line("Başarıyla analiz edilen görsellerde kayıtlı risk bulgusu yok (saha güvenli görünüm).", 9);
  }

  /* ================================================================ */
  /*  BÖLÜM 7 — Görsel Bazlı Analiz                                   */
  /* ================================================================ */
  if (sections_data.length === 0) {
    section("7. Görsel Bazlı Analiz");
    line("Bu rapora aktarılmış görsel bulunamadı. Analiz tamamlanmadan export alındıysa görselleri yükleyip analizi yeniden çalıştırın.", 9);
  }

  let firstVisualSection = true;
  for (const sec of sections_data) {
    if (firstVisualSection) {
      section("7. Görsel Bazlı Analiz");
      firstVisualSection = false;
    } else {
      // Doğal akış — başlık + meta için yeterli yer varsa devam et
      y += 4;
      ensureSpace(36);
    }

    const gCode = `G${sec.imageIndex}`;
    const excluded = sec.scopeDecision === "exclude" || sec.isgKapsamindaMi === false || sec.sceneType === "non_workplace";

    // Görsel başlık bandı
    ensureSpace(12);
    doc.setFillColor(...C.slate100);
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentW, 10, 1.5, 1.5, "FD");
    doc.setFillColor(...C.navy);
    doc.roundedRect(margin, y, 18, 10, 1.5, 0, "F");
    doc.rect(margin + 5, y, 13, 10, "F");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.white);
    doc.text(gCode, margin + 9, y + 6.5, { align: "center" });
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.navy);
    doc.text(displayFileName(sec.fileName, sec.imageIndex), margin + 21, y + 6.5);
    y += 14;
    doc.setTextColor(...C.text);

    // Görsel meta bilgileri
    addKeyValueTable(
      [
        ["Saha tanımı", sec.areaLocation || sec.rowTitle, "Analiz durumu", analysisStatusLabel(sec.imageAnalysisStatus ?? sec.analysisStatus)],
        ["Sahne tipi", sceneTypeLabel(sec.sceneType), "Kapsam kararı", scopeDecisionLabel(sec.scopeDecision)],
        ["Risk sayısı", sec.riskCount ?? sec.findingCount, "Kapsam gerekçesi", sec.scopeReason],
      ],
      { fontSize: 8.5 },
    );

    if (sec.imageLimitations && sec.imageLimitations.length > 0) {
      addSimpleTable(
        ["Görsel sınırlılıkları"],
        sec.imageLimitations.map((lim) => [lim]),
        { fontSize: 8.5, headerColor: C.orange },
      );
    }

    // Görsel (çerçeveli)
    const dataUrl = sec.dataUrl ?? "";
    if (dataUrl.startsWith("data:image/")) {
      try {
        const format = dataUrl.includes("image/png") ? "PNG" : "JPEG";
        const imgW = contentW;
        const imgH = imgW * 0.5;
        ensureSpace(imgH + 6);
        doc.setDrawColor(...C.slate200);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin - 0.5, y - 0.5, imgW + 1, imgH + 1, 1, 1, "S");
        doc.addImage(dataUrl, format, margin, y, imgW, imgH, undefined, "FAST");
        y += imgH + 4;
      } catch (e) {
        console.warn("[pdf-field-report] image skip", e);
      }
    }

    if (excluded) {
      alertBox("Bu görsel İSG risk analizi kapsamı dışında değerlendirildi; Fine-Kinney risk tablosu oluşturulmaz.");
      line(`Gerekçe: ${asText(sec.scopeReason)}`, 8.5);
      continue;
    }

    const secFailed =
      sec.analysisStatus === "failed" ||
      sec.analysisStatus === "manual_required" ||
      sec.imageAnalysisStatus === "failed" ||
      sec.imageAnalysisStatus === "manual_required";

    if (secFailed) {
      alertBox(FAILED_IMAGE_NOTE);
      if (sec.analysisError) addKeyValueTable([["Hata", sec.analysisError, "Risk sayısı", "Değerlendirilemedi"]]);
      if (sec.failureRecoveryActions && sec.failureRecoveryActions.length > 0) {
        addNumberedListTable("Yapılacaklar", sec.failureRecoveryActions);
      }
      if (sec.documentCheckItems && sec.documentCheckItems.length > 0) {
        addNumberedListTable("Doküman kontrol maddeleri", sec.documentCheckItems);
      }
      if (sec.constructionChecklistNotes) {
        addSimpleTable(
          ["İnşaat sahası zorunlu kontrol", "Durum"],
          Object.entries(sec.constructionChecklistNotes),
          { fontSize: 8.5, headerColor: C.orange },
        );
      }
      continue;
    }

    if (sec.findings.length === 0) {
      if (sec.zeroRiskAllowed) {
        line("Bu görselde iş güvenliği tehlikesi gözlemlenmedi (başarılı analiz, sıfır risk izinli).", 9);
      } else {
        line("Bu görselde otomatik risk üretilmedi; saha doğrulaması önerilir.", 9, "normal", C.orange);
      }
      continue;
    }

    // Görsel risk tablosu
    ensureSpace(18);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Kod", "Risk", "Kanıt / Olası Sonuç", "P", "F", "S", "Skor", "Sınıf", "Aksiyon"]],
      body: sec.findings.map((f) => [
        asText(f.riskCode),
        truncate(f.title, 42),
        truncate([f.observedEvidence, f.possibleOutcome].filter(Boolean).join("\n"), 90),
        f.fkDetails ? String(f.fkDetails.likelihood) : "-",
        f.fkDetails ? String(f.fkDetails.exposure) : "-",
        f.fkDetails ? String(f.fkDetails.severity) : "-",
        String(Math.round(f.score)),
        riskClassLabelTr(f.riskClass),
        truncate(f.immediateAction ?? findingActionText(f), 70),
      ]),
      styles: {
        font: fontFamily,
        fontSize: 7.5,
        cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 },
        overflow: "linebreak",
        valign: "top",
        halign: "left",
        minCellHeight: 8,
        lineColor: C.slate200,
        lineWidth: 0.15,
        textColor: C.text,
      },
      headStyles: { fillColor: C.navyMid, textColor: 255, fontStyle: "bold", minCellHeight: 9 },
      alternateRowStyles: { fillColor: C.slate50 },
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 30 },
        2: { cellWidth: 40 },
        8: { cellWidth: 34 },
      },
      rowPageBreak: "avoid",
      didParseCell: (hook) => {
        if (hook.section === "body" && hook.column.index === 7) {
          const f = sec.findings[hook.row.index];
          if (f) {
            hook.cell.styles.fillColor = riskClassFill(f.riskClass);
            hook.cell.styles.textColor = 255;
            hook.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    y = syncYAfterTable(doc, y, 3);

    // Risk detay fişleri (renkli kenar çubuklu)
    for (const f of sec.findings) {
      ensureSpace(22);

      // Risk sınıfı renk çubuğu
      const accent = riskClassAccent(f.riskClass);
      doc.setFillColor(...accent);
      doc.rect(margin, y, 2.5, 8, "F");
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(10);
      doc.setTextColor(...accent);
      doc.text(`${f.riskCode ?? "R?"} — Risk Detay Fişi`, margin + 5, y + 5.5);

      // Sınıf rozeti
      const badgeText = riskClassLabelTr(f.riskClass).toLocaleUpperCase("tr-TR");
      const badgeW = doc.getTextWidth(badgeText) + 8;
      doc.setFillColor(...riskClassFill(f.riskClass));
      doc.roundedRect(width - margin - badgeW, y, badgeW, 8, 1.5, 1.5, "F");
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(8);
      doc.setTextColor(...C.white);
      doc.text(badgeText, width - margin - badgeW / 2, y + 5.5, { align: "center" });

      y += 10;
      doc.setTextColor(...C.text);

      addKeyValueTable(
        [
          ["Risk başlığı", f.title, "Kategori", f.category],
          ["Sınıf / skor", `${riskClassLabelTr(f.riskClass)} / ${Math.round(f.score)}`, "Güven", f.confidenceLevelTr],
          ["Puan gerekçesi", scoreDetailForFinding(f), "Mevcut kontrol", f.currentControl],
          ["Gözlemlenen kanıt", f.observedEvidence, "Olası sonuç", f.possibleOutcome],
          ["Acil aksiyon", f.immediateAction ?? findingActionText(f), "Doğrulama", f.verificationNeeded],
          ["Düzeltici faaliyet", f.correctiveAction, "Önleyici faaliyet", f.preventiveAction],
          ["Sorumlu / termin", [f.responsible, f.deadline].filter(Boolean).join(" / "), "Tamamlanma kanıtı", f.completionProof],
          ["Artık risk", f.residualRiskNote, "Mevzuat bağlamı", findingLegalText(f)],
        ],
        { fontSize: 7.5, labelWidth: 30 },
      );
    }
  }

  /* ================================================================ */
  /*  BÖLÜM 8 — Öncelikli Aksiyon Listesi                             */
  /* ================================================================ */
  if (reportJson.actions.length > 0) {
    ensureSpace(26);
    section("8. Öncelikli Aksiyon Listesi");
    addNumberedListBlock("Aksiyon", reportJson.actions, 20);
  }

  /* ================================================================ */
  /*  BÖLÜM 9 — Saha Doğrulama Kontrol Listesi                        */
  /* ================================================================ */
  if (reportJson.verificationChecklist.length > 0) {
    ensureSpace(26);
    section("9. Saha Doğrulama Kontrol Listesi");
    addNumberedListBlock("Kontrol maddesi", reportJson.verificationChecklist, 24);
  }

  /* ================================================================ */
  /*  BÖLÜM 10 — Mevzuat ve Standart Referansları                     */
  /* ================================================================ */
  if (reportJson.legalReferences.length > 0) {
    ensureSpace(22);
    section("10. Mevzuat ve Standart Referansları");
    addNumberedListBlock("Referans", reportJson.legalReferences, 20);
  }

  /* ================================================================ */
  /*  BÖLÜM 11 — Onay, İmza ve Doğrulama                              */
  /* ================================================================ */
  section("11. Onay, İmza ve Doğrulama");

  // İmza tablosu
  addSimpleTable(
    ["Rol", "Ad Soyad", "Unvan", "Tarih", "İmza"],
    reportJson.approvals.map((approval) => [
      approval.role,
      approval.fullName,
      approval.title,
      approval.date,
      approval.signature,
    ]),
    {
      fontSize: 9,
      minCellHeight: 14,
      headerColor: C.navyMid,
      columnStyles: {
        0: { cellWidth: 36, fillColor: C.goldPale, fontStyle: "bold", textColor: C.navy },
        4: { cellWidth: 36 },
      },
    },
  );

  addKeyValueTable([
    ["QR içeriği", data.shareUrl ? "Dijital rapor bağlantısı" : "Rapor kimlik özeti", "Rapor tarihi", reportDate],
    ["Doğrulama notu", data.shareUrl || "QR kod; firma, tarih, yöntem, bulgu sayısı ve rapor üretim zamanını içerir.", "Uyarı", "Basılı kopya, saha doğrulaması ve yetkili imzalarla birlikte geçerli kabul edilmelidir."],
  ]);

  // Son QR kodu
  if (verificationQrDataUrl.startsWith("data:image/")) {
    try {
      ensureSpace(48);

      // QR çerçeve alanı
      doc.setFillColor(...C.slate50);
      doc.setDrawColor(...C.gold);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y, contentW, 40, 2, 2, "FD");

      // QR kod
      const qrSize = 32;
      doc.setFillColor(...C.white);
      doc.roundedRect(margin + 3, y + 4, qrSize, qrSize, 1, 1, "F");
      doc.addImage(verificationQrDataUrl, "PNG", margin + 4, y + 5, qrSize - 2, qrSize - 2, undefined, "FAST");

      // QR açıklama metinleri
      const qrTextX = margin + qrSize + 8;
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(10);
      doc.setTextColor(...C.navy);
      doc.text("Rapor Doğrulama", qrTextX, y + 10);

      doc.setFont(fontFamily, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.slate500);
      doc.text("QR kodu taratarak rapor bağlantısını veya rapor kimlik", qrTextX, y + 17);
      doc.text("özetini doğrulayın.", qrTextX, y + 22);

      doc.setFontSize(7.5);
      if (data.shareUrl) {
        doc.text(truncate(data.shareUrl, 80), qrTextX, y + 29);
      } else {
        doc.text("Kayıtlı paylaşım bağlantısı yoksa QR rapor kimlik verisini taşır.", qrTextX, y + 29);
      }

      y += 44;
      doc.setTextColor(...C.text);
    } catch (e) {
      console.warn("[pdf-field-report] qr skip", e);
    }
  }

  // Sayfa toplam sayısı güncelleme
  totalPages = doc.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.slate400);
    const updated = `Sayfa ${p} / ${totalPages}`;
    doc.setFillColor(...C.white);
    doc.rect(width / 2 - 15, pageHeight - 10, 30, 6, "F");
    doc.text(updated, width / 2, pageHeight - 7, { align: "center" });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
