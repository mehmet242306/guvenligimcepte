/**
 * Saha Risk Analizi — konsolide JSON (v4 — başarısız analiz güvenliği).
 */

import type { ExportFinding, RiskAnalysisExportData } from "@/lib/risk-analysis-export";
import {
  exportTotalFindings,
  findingActionText,
  resolveExportImageSections,
} from "@/lib/risk-analysis/field-export-sections";
import { riskClassLabelTr } from "@/lib/risk-analysis/finding-quality";
import {
  buildReportValidityBlock,
  countImagesByStatus,
  FAILED_ANALYSIS_WARNING,
  FAILED_IMAGE_NOTE,
} from "@/lib/risk-analysis/field-report-validity";

export type FieldReportConsolidatedJson = {
  rapor_durumu: {
    analiz_gecerli_mi: boolean;
    gecersizlik_nedeni: string;
    uyari: string;
    analiz_gecerlilik_durumu: string;
  };
  yonetici_ozeti: {
    toplam_gorsel: number;
    basarili_analiz: number;
    kismi_analiz: number;
    basarisiz_analiz: number;
    toplam_gercek_risk: number;
    kritik: number;
    yuksek: number;
    orta: number;
    dusuk_izleme: number;
    dokuman_dogrulama: number;
    analiz_gecerlilik_durumu: string;
    acil_durdurma_gerekenler: string[];
    ilk_24_saat_aksiyonlari: string[];
    yedi_gun_aksiyonlari: string[];
  };
  rapor_bilgisi: {
    firma: string;
    lokasyon: string;
    tarih: string;
    yontem: string;
    hazirlayan: string;
    sinirlamalar: string[];
  };
  gorseller: Array<Record<string, unknown>>;
  oncelikli_aksiyon_listesi: string[];
  saha_dogrulama_checklisti: string[];
  mevzuat_referanslari: string[];
};

function countByClass(findings: ExportFinding[], cls: string): number {
  return findings.filter((f) => f.riskClass === cls).length;
}

function mapFindingToReportRisk(f: ExportFinding, gCode: string, rIdx: number): Record<string, unknown> {
  const fk = f.fkDetails;
  return {
    risk_kodu: f.riskCode ?? `${gCode}-R${rIdx}`,
    baslik: f.title,
    kategori: f.category,
    gozlemlenen_kanit: f.observedEvidence ?? "",
    dogrulanacak_bilgi: f.verificationNeeded ?? "",
    olasi_sonuc: f.possibleOutcome ?? "",
    mevcut_kontrol: f.currentControl ?? "",
    P: fk?.likelihood ?? null,
    P_gerekce: f.fkPRationale ?? "",
    F: fk?.exposure ?? null,
    F_gerekce: f.fkFRationale ?? "",
    S: fk?.severity ?? null,
    S_gerekce: f.fkSRationale ?? "",
    skor: Math.round(f.score),
    sinif: riskClassLabelTr(f.riskClass),
    guven_duzeyi: f.confidenceLevelTr ?? "",
    acil_aksiyon: f.immediateAction ?? findingActionText(f),
    duzeltici_faaliyet: f.correctiveAction ?? "",
    onleyici_faaliyet: f.preventiveAction ?? "",
    sorumlu: f.responsible ?? "",
    termin: f.deadline ?? "",
    tamamlanma_kaniti: f.completionProof ?? "",
    mevzuat_standart: f.legalContext ?? "",
  };
}

function countDocumentChecks(sections: ReturnType<typeof resolveExportImageSections>): number {
  let n = 0;
  for (const s of sections) {
    n += s.documentCheckItems?.length ?? 0;
  }
  return n;
}

export function buildFieldReportConsolidatedJson(data: RiskAnalysisExportData): FieldReportConsolidatedJson {
  const sections = resolveExportImageSections(data);
  const allFindings = sections.flatMap((s) => s.findings);
  const imgCounts = countImagesByStatus(sections);
  const raporDurumu = buildReportValidityBlock(data);
  const kritik = countByClass(allFindings, "critical");
  const yuksek = countByClass(allFindings, "high");
  const orta = countByClass(allFindings, "medium");
  const dusuk = countByClass(allFindings, "low") + countByClass(allFindings, "follow_up");

  const acilDurdurma = allFindings
    .filter((f) => f.riskClass === "critical")
    .map((f) => `[${f.riskCode ?? "-"}] ${f.title}: ${findingActionText(f)}`);

  const ilk24 = allFindings
    .filter((f) => f.riskClass === "critical" || f.riskClass === "high")
    .slice(0, 8)
    .map((f) => `[${f.riskCode ?? "-"}] ${findingActionText(f)}`);

  const yediGun = allFindings
    .filter((f) => f.riskClass === "medium" || f.correctiveActionRequired)
    .slice(0, 12)
    .map((f) => `[${f.riskCode ?? "-"}] ${f.correctiveAction || f.recommendation}`);

  const dogrulamaSet = new Set<string>();
  for (const f of allFindings) {
    if (f.verificationNeeded?.trim()) dogrulamaSet.add(f.verificationNeeded.trim());
  }
  for (const sec of sections) {
    for (const lim of sec.imageLimitations ?? []) {
      if (lim.trim()) dogrulamaSet.add(lim.trim());
    }
    for (const d of sec.documentCheckItems ?? []) {
      if (d.trim()) dogrulamaSet.add(d.trim());
    }
    for (const a of sec.failureRecoveryActions ?? []) {
      if (a.trim()) dogrulamaSet.add(a.trim());
    }
    if (sec.analysisStatus !== "success") {
      dogrulamaSet.add(FAILED_IMAGE_NOTE);
    }
    const notes = sec.constructionChecklistNotes;
    if (notes) {
      for (const [k, v] of Object.entries(notes)) {
        dogrulamaSet.add(`${k}: ${v}`);
      }
    }
  }

  const mevzuatSet = new Set<string>();
  for (const f of allFindings) {
    const ctx = f.legalContext?.trim();
    if (ctx) mevzuatSet.add(ctx);
    for (const ref of f.legalReferences ?? []) {
      const line = [ref.law, ref.article, ref.description].filter(Boolean).join(" — ");
      if (line) mevzuatSet.add(line);
    }
  }

  const oncelikli = allFindings
    .filter((f) => f.riskClass === "critical" || f.riskClass === "high")
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((f, i) => `${i + 1}. [${f.riskCode ?? "-"}] ${f.title} — ${findingActionText(f)}`);

  const participants =
    data.participants.length > 0
      ? data.participants.map((p) => `${p.fullName} (${p.role})`).join(", ")
      : "RiskNova AI destekli saha analizi";

  const sinirlamalar = [
    "Analiz yalnızca yüklenen fotoğraflara dayanır.",
    raporDurumu.uyari,
    data.analysisNote || "",
  ].filter(Boolean);

  return {
    rapor_durumu: raporDurumu,
    yonetici_ozeti: {
      toplam_gorsel: sections.length,
      basarili_analiz: imgCounts.basarili,
      kismi_analiz: imgCounts.kismi,
      basarisiz_analiz: imgCounts.basarisiz,
      toplam_gercek_risk: exportTotalFindings(data),
      kritik,
      yuksek,
      orta,
      dusuk_izleme: dusuk,
      dokuman_dogrulama: countDocumentChecks(sections),
      analiz_gecerlilik_durumu: raporDurumu.analiz_gecerlilik_durumu,
      acil_durdurma_gerekenler: acilDurdurma,
      ilk_24_saat_aksiyonlari: ilk24,
      yedi_gun_aksiyonlari: yediGun,
    },
    rapor_bilgisi: {
      firma: data.companyName || "-",
      lokasyon: [data.location, data.department].filter(Boolean).join(" / ") || "-",
      tarih: data.date || "-",
      yontem: data.methodLabel || "Fine-Kinney",
      hazirlayan: participants,
      sinirlamalar,
    },
    gorseller: sections.map((sec) => {
      const gCode = `G${sec.imageIndex}`;
      const st = sec.imageAnalysisStatus ?? sec.analysisStatus;
      const failed = st === "failed" || st === "manual_required";
      return {
        gorsel_kodu: gCode,
        dosya_adi: sec.fileName,
        scene_type: sec.sceneType ?? "unknown",
        image_analysis_status: st,
        risk_count: failed ? null : (sec.riskCount ?? sec.findings.length),
        zero_risk_allowed: sec.zeroRiskAllowed ?? false,
        saha_tanimi: sec.areaLocation || sec.rowTitle || sec.fileName,
        sinirlamalar: sec.imageLimitations ?? [],
        riskler: failed ? [] : sec.findings.map((f, idx) => mapFindingToReportRisk(f, gCode, idx + 1)),
        dokuman_kontrol_maddeleri: sec.documentCheckItems ?? [],
        analiz_basarisizsa_yapilacaklar: failed ? sec.failureRecoveryActions ?? [] : [],
        analiz_notu: failed ? FAILED_IMAGE_NOTE : undefined,
      };
    }),
    oncelikli_aksiyon_listesi: oncelikli,
    saha_dogrulama_checklisti: Array.from(dogrulamaSet).slice(0, 50),
    mevzuat_referanslari: Array.from(mevzuatSet).slice(0, 30),
  };
}

export { FAILED_ANALYSIS_WARNING };
