/**
 * Saha Risk Analizi — konsolide JSON (PDF/Word öncesi veri yapısı).
 */

import type { ExportFinding, RiskAnalysisExportData } from "@/lib/risk-analysis-export";
import { exportTotalFindings, findingActionText, resolveExportImageSections } from "@/lib/risk-analysis/field-export-sections";
import { riskClassLabelTr } from "@/lib/risk-analysis/finding-quality";

export type FieldReportConsolidatedJson = {
  rapor_bilgisi: {
    firma: string;
    lokasyon: string;
    tarih: string;
    yontem: string;
    hazirlayan: string;
    sinirlamalar: string[];
  };
  yonetici_ozeti: {
    toplam_gorsel: number;
    toplam_bulgu: number;
    kritik: number;
    yuksek: number;
    orta: number;
    dusuk: number;
    acil_durdurma_gerekenler: string[];
    ilk_24_saat_aksiyonlari: string[];
    yedi_gun_aksiyonlari: string[];
  };
  gorseller: Array<{
    gorsel_kodu: string;
    saha_tanimi: string;
    gorsel_sinirlamalari: string[];
    riskler: Array<Record<string, unknown>>;
  }>;
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
    gozlemlenen_kanit: f.observedEvidence ?? f.recommendation?.slice(0, 500) ?? "",
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
    artik_risk: f.residualRiskNote ?? "",
    sorumlu: f.responsible ?? "",
    termin: f.deadline ?? "",
    tamamlanma_kaniti: f.completionProof ?? "",
    mevzuat_standart: f.legalContext ?? "",
  };
}

export function buildFieldReportConsolidatedJson(data: RiskAnalysisExportData): FieldReportConsolidatedJson {
  const sections = resolveExportImageSections(data);
  const allFindings = sections.flatMap((s) => s.findings);
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

  return {
    rapor_bilgisi: {
      firma: data.companyName || "-",
      lokasyon: [data.location, data.department].filter(Boolean).join(" / ") || "-",
      tarih: data.date || "-",
      yontem: data.methodLabel || "Fine-Kinney",
      hazirlayan: participants,
      sinirlamalar: [
        "Analiz yalnızca yüklenen fotoğraflara dayanır; görünmeyen alanlar saha doğrulaması gerektirir.",
        data.failedImageCount ? `${data.failedImageCount} görselde otomatik analiz başarısız.` : "",
        data.analysisNote || "",
      ].filter(Boolean),
    },
    yonetici_ozeti: {
      toplam_gorsel: sections.length,
      toplam_bulgu: exportTotalFindings(data),
      kritik,
      yuksek,
      orta,
      dusuk,
      acil_durdurma_gerekenler: acilDurdurma,
      ilk_24_saat_aksiyonlari: ilk24,
      yedi_gun_aksiyonlari: yediGun,
    },
    gorseller: sections.map((sec) => {
      const gCode = `G${sec.imageIndex}`;
      return {
        gorsel_kodu: gCode,
        saha_tanimi: sec.areaLocation || sec.rowTitle || sec.fileName,
        gorsel_sinirlamalari: sec.imageLimitations ?? [],
        riskler: sec.findings.map((f, idx) => mapFindingToReportRisk(f, gCode, idx + 1)),
      };
    }),
    oncelikli_aksiyon_listesi: oncelikli,
    saha_dogrulama_checklisti: Array.from(dogrulamaSet).slice(0, 40),
    mevzuat_referanslari: Array.from(mevzuatSet).slice(0, 30),
  };
}
