/**
 * Saha risk analizi — denetime uygun PDF (tablolar, UTF-8 Türkçe, Fine-Kinney).
 */

import type { ExportFinding, RiskAnalysisExportData } from "@/lib/risk-analysis-export";
import {
  findingActionText,
  findingLegalText,
  resolveExportImageSections,
} from "@/lib/risk-analysis/field-export-sections";
import { buildFieldReportConsolidatedJson, FAILED_ANALYSIS_WARNING } from "@/lib/risk-analysis/field-report-json";
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

type PdfTable = { lastAutoTable?: { finalY: number } };
type TableCell = string | number | boolean | null | undefined;

function tableY(doc: InstanceType<typeof import("jspdf").jsPDF>, fallback: number): number {
  return (doc as PdfTable).lastAutoTable?.finalY ?? fallback;
}

export async function generateFieldRiskAnalysisPdfBytes(data: RiskAnalysisExportData): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const fontFamily = (await ensurePdfUnicodeFont(doc)) ? "NotoSans" : "helvetica";
  doc.setFont(fontFamily, "normal");
  const margin = 14;
  const width = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const reportDate = asText(data.date, new Date().toLocaleDateString("tr-TR"));
  const baseTitle = asText(data.analysisTitle, "Saha Risk Analizi Raporu");
  const incomplete = data.reportIncomplete ?? isReportIncomplete(data);
  const reportTitle = reportTitleWithValidity(baseTitle, incomplete);
  let y = margin;

  const alertBox = (text: string) => {
    const wrapped = doc.splitTextToSize(text, width - margin * 2 - 8) as string[];
    const h = wrapped.length * 4.2 + 8;
    ensureSpace(h);
    doc.setFillColor(254, 226, 226);
    doc.setDrawColor(185, 28, 28);
    doc.roundedRect(margin, y, width - margin * 2, h, 2, 2, "FD");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(9);
    doc.setTextColor(127, 29, 29);
    doc.text(wrapped, margin + 4, y + 6);
    y += h + 4;
    doc.setTextColor(15, 23, 42);
    doc.setFont(fontFamily, "normal");
  };

  const addPageHeaderFooter = () => {
    const page = doc.getCurrentPageInfo().pageNumber;
    doc.setFont(fontFamily, "normal");
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
    doc.setFont(fontFamily, style);
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
    ensureSpace(18);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [head],
      body: body.map((row) => row.map((cell) => asText(cell))),
      styles: {
        font: fontFamily,
        fontSize: options.fontSize ?? 8,
        cellPadding: 2,
        overflow: "linebreak",
        valign: "top",
        minCellHeight: options.minCellHeight,
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: options.headerColor ?? [30, 41, 59],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: options.columnStyles,
    });
    y = tableY(doc, y + 20) + 6;
  };

  const addKeyValueTable = (
    rows: TableCell[][],
    options: { labelWidth?: number; fontSize?: number; headerColor?: [number, number, number] } = {},
  ) => {
    ensureSpace(16);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      body: rows.map((row) => row.map((cell) => asText(cell))),
      styles: {
        font: fontFamily,
        fontSize: options.fontSize ?? 8,
        cellPadding: 2,
        overflow: "linebreak",
        valign: "top",
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: options.labelWidth ?? 38, fillColor: options.headerColor ?? [241, 245, 249], fontStyle: "bold" },
        2: { cellWidth: options.labelWidth ?? 38, fillColor: options.headerColor ?? [241, 245, 249], fontStyle: "bold" },
      },
    });
    y = tableY(doc, y + 16) + 6;
  };

  const addNumberedListTable = (title: string, rows: string[], limit = 12) => {
    if (rows.length === 0) return;
    addSimpleTable([title], rows.slice(0, limit).map((item, index) => [`${index + 1}. ${truncate(item, 180)}`]), {
      fontSize: 8,
      headerColor: [15, 118, 110],
    });
  };

  const consolidated = buildFieldReportConsolidatedJson(data);
  const sections = resolveExportImageSections(data);

  // Kapak
  line(reportTitle, 18, "bold");
  line("RiskNova — Saha Risk Analizi", 10, "bold", [212, 160, 23]);
  addKeyValueTable(
    [
      ["Firma", data.companyName, "Tarih", reportDate],
      ["Lokasyon", [data.location, data.department].filter(Boolean).join(" / "), "Yöntem", data.methodLabel],
      ["Sektör", data.companySector, "Tehlike sınıfı", data.companyHazardClass],
      ["Adres", data.companyAddress, "Rapor durumu", incomplete ? "Eksik analiz / doğrulama gerekli" : "Teslim edilebilir"],
    ],
    { fontSize: 9 },
  );
  if (incomplete) {
    alertBox(
      consolidated.rapor_durumu.uyari || FAILED_ANALYSIS_WARNING,
    );
  }
  addPageHeaderFooter();

  doc.addPage();
  y = margin + 6;
  addPageHeaderFooter();

  section("1. Rapor Geçerlilik Durumu");
  addKeyValueTable([
    ["Durum", consolidated.rapor_gecerlilik.durum, "Nihai rapor mu", consolidated.rapor_gecerlilik.nihai_rapor_mu ? "Evet" : "Hayır"],
    [
      "Geçersizlik nedenleri",
      consolidated.rapor_gecerlilik.gecersizlik_nedenleri.join("\n") || "-",
      "Kritik uyarılar",
      consolidated.rapor_gecerlilik.kritik_uyarilar.join("\n") || "-",
    ],
  ]);

  section("2. Yönetici Özeti");
  const oz = consolidated.yonetici_ozeti;
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
      ["Kritik", oz.kritik, "Yüksek", oz.yuksek],
      ["Orta", oz.orta, "Düşük / izleme", oz.dusuk_izleme],
      ["Doküman doğrulama", oz.dokuman_dogrulama_maddesi, "Kapsam dışı / sistemsel uyarı", oz.kapsam_disi_sistemsel_uyari],
    ],
    { fontSize: 8 },
  );
  if (!oz.gercek_risk_sayimi_guvenilir_mi) {
    line(oz.toplam_gercek_isg_riski_notu, 8, "normal", [185, 28, 28]);
  }
  if (oz.basarisiz_analiz > 0) {
    alertBox(
      `${oz.basarisiz_analiz} görsel analiz edilemedi. Bu görseller için 0 risk anlamına gelmez. Yeniden analiz veya manuel doğrulama zorunludur.`,
    );
  }

  addNumberedListTable("Acil durdurma / derhal müdahale gereken işler", oz.acil_durdurma_gerekenler, 6);
  addNumberedListTable("İlk 24 saat aksiyonları", oz.ilk_24_saat_aksiyonlari, 8);
  addNumberedListTable("7 gün içinde aksiyonlar", oz.yedi_gun_aksiyonlari, 10);
  if (data.analysisNote) line(asText(data.analysisNote), 9);

  section("3. Görsel Kapsam Kontrol Tablosu");
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Kod", "Dosya", "Sahne", "Kapsam", "Durum", "Karar", "Gerekçe"]],
    body: consolidated.gorsel_kapsam_kontrolu.map((g) => [
      asText(g.gorsel_kodu),
      truncate(asText(g.dosya_adi), 28),
      asText(g.scene_type),
      g.isg_kapsaminda_mi ? "İSG kapsamında" : "Kapsam dışı",
      asText(g.image_analysis_status),
      asText(g.scope_decision),
      truncate(asText(g.scope_reason), 80),
    ]),
    styles: { font: fontFamily, fontSize: 7, cellPadding: 1.5, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
  });
  y = tableY(doc, y + 35);
  y += 6;

  section("4. Metodoloji ve Fine-Kinney");
  line(
    data.method === "fine_kinney"
      ? "Fine-Kinney: Skor = P (olasılık) × F (maruziyet/frekans) × S (şiddet). P/F/S gerekçeleri saha fotoğrafı ve varsayımlarla birlikte raporlanır; frekans tek karede kesin değildir."
      : asText(data.methodLabel),
    9,
  );
  consolidated.rapor_bilgisi.sinirlamalar.forEach((s) => line(`• ${s}`, 8));

  if (data.participants.length > 0) {
    section("Analiz Ekibi");
    addSimpleTable(
      ["No", "Ad Soyad", "Rol", "Unvan", "Sertifika No"],
      data.participants.map((p, i) => [i + 1, p.fullName, p.role, p.title, p.certificateNo]),
      {
        fontSize: 8,
        columnStyles: {
          0: { cellWidth: 12 },
          1: { cellWidth: 42 },
          2: { cellWidth: 38 },
        },
      },
    );
  }

  section("5. Konsolide Risk Kayıt Tablosu");
  const allFindings = sections
    .filter((s) => s.scopeDecision !== "exclude" && s.sceneType !== "non_workplace")
    .flatMap((s) => s.findings);
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
      styles: { font: fontFamily, fontSize: 7, cellPadding: 1.5, overflow: "linebreak", valign: "top" },
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
    y = tableY(doc, y + 40);
    y += 6;
    addPageHeaderFooter();
  } else if (incomplete) {
    line("Konsolide tablo üretilemedi: bir veya daha fazla görsel analiz edilemedi. Başarısız analiz 0 risk sayılmaz.", 9);
  } else {
    line("Başarıyla analiz edilen görsellerde kayıtlı risk bulgusu yok (saha güvenli görünüm).", 9);
  }

  section("6. Görsel Bazlı Analiz");
  for (const sec of sections) {
    doc.addPage();
    y = margin + 6;
    addPageHeaderFooter();

    const gCode = `G${sec.imageIndex}`;
    line(`${gCode} — ${sec.fileName}`, 11, "bold");
    addKeyValueTable(
      [
        ["Saha tanımı", sec.areaLocation || sec.rowTitle, "Analiz durumu", sec.analysisStatusLabel],
        ["Sahne tipi", sec.sceneType, "Kapsam kararı", sec.scopeDecision],
        ["Risk sayısı", sec.riskCount ?? sec.findingCount, "Kapsam gerekçesi", sec.scopeReason],
      ],
      { fontSize: 8 },
    );
    if (sec.imageLimitations && sec.imageLimitations.length > 0) {
      addSimpleTable(
        ["Görsel sınırlılıkları"],
        sec.imageLimitations.map((lim) => [lim]),
        { fontSize: 8, headerColor: [180, 83, 9] },
      );
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
          { fontSize: 8, headerColor: [180, 83, 9] },
        );
      }
      continue;
    }

    if (sec.findings.length === 0) {
      if (sec.zeroRiskAllowed) {
        line("Bu görselde iş güvenliği tehlikesi gözlemlenmedi (başarılı analiz, sıfır risk izinli).", 9);
      } else {
        line("Bu görselde otomatik risk üretilmedi; saha doğrulaması önerilir.", 9, "normal", [180, 83, 9]);
      }
      continue;
    }

    ensureSpace(16);
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
      styles: { font: fontFamily, fontSize: 7, cellPadding: 1.6, overflow: "linebreak", valign: "top" },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 30 },
        2: { cellWidth: 40 },
        8: { cellWidth: 34 },
      },
      didParseCell: (hook) => {
        if (hook.section === "body" && hook.column.index === 7) {
          const f = sec.findings[hook.row.index];
          if (f) {
            hook.cell.styles.fillColor = riskClassFill(f.riskClass);
            hook.cell.styles.textColor = 255;
          }
        }
      },
    });
    y = tableY(doc, y + 20);
    y += 4;

    for (const f of sec.findings) {
      section(`${f.riskCode ?? "R?"} — Risk Detay Fişi`);
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
        { fontSize: 7, labelWidth: 30 },
      );
    }
  }

  if (consolidated.oncelikli_aksiyon_listesi.length > 0) {
    doc.addPage();
    y = margin + 6;
    addPageHeaderFooter();
    section("7. Öncelikli Aksiyon Listesi");
    addNumberedListTable("Aksiyon", consolidated.oncelikli_aksiyon_listesi, 20);
  }

  if (consolidated.saha_dogrulama_checklisti.length > 0) {
    section("8. Saha Doğrulama Kontrol Listesi");
    addNumberedListTable("Kontrol maddesi", consolidated.saha_dogrulama_checklisti, 24);
  }

  if (consolidated.mevzuat_referanslari.length > 0) {
    section("9. Mevzuat ve Standart Referansları (özet)");
    addSimpleTable(
      ["Referans"],
      consolidated.mevzuat_referanslari.map((t) => [truncate(t, 220)]),
      { fontSize: 8 },
    );
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

  return new Uint8Array(doc.output("arraybuffer"));
}
