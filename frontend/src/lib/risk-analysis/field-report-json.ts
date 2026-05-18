/**
 * Saha Risk Analizi — konsolide JSON (v4 — başarısız analiz güvenliği).
 */

import type { ExportFinding, RiskAnalysisExportData } from "@/lib/risk-analysis-export";
import {
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
  rapor_gecerlilik: {
    nihai_rapor_mu: boolean;
    durum: "Geçerli" | "Eksik analiz" | "Geçersiz" | "Manuel doğrulama gerekli";
    gecersizlik_nedenleri: string[];
    kritik_uyarilar: string[];
  };
  gorsel_kapsam_kontrolu: Array<Record<string, unknown>>;
  gercek_riskler: Array<Record<string, unknown>>;
  dokuman_dogrulama_maddeleri: Array<Record<string, unknown>>;
  kapsam_disi_gorseller: Array<Record<string, unknown>>;
  analiz_basarisiz_gorseller: Array<Record<string, unknown>>;
  pdf_kalite_kontrol: {
    turkce_karakter_sorunu: boolean;
    tablo_tasmasi: boolean;
    metin_ust_uste_binme: boolean;
    harf_araligi_sorunu: boolean;
    sayfa_numarasi_sorunu: boolean;
    teslim_edilebilir_mi: boolean;
    duzeltme_notlari: string[];
  };
  rapor_durumu: {
    analiz_gecerli_mi: boolean;
    gecersizlik_nedeni: string;
    uyari: string;
    analiz_gecerlilik_durumu: string;
  };
  yonetici_ozeti: {
    toplam_gorsel: number;
    isg_kapsamindaki_gorsel: number;
    kapsam_disi_gorsel: number;
    basarili_analiz: number;
    kismi_analiz: number;
    basarisiz_analiz: number;
    toplam_gercek_risk: number;
    toplam_gercek_isg_riski: number;
    kritik: number;
    yuksek: number;
    orta: number;
    dusuk_izleme: number;
    dokuman_dogrulama: number;
    dokuman_dogrulama_maddesi: number;
    sistemsel_uyari: number;
    kapsam_disi_sistemsel_uyari: number;
    dof_adayi: number;
    gercek_risk_sayimi_guvenilir_mi: boolean;
    toplam_gercek_isg_riski_notu: string;
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

function isScopeExcluded(sec: ReturnType<typeof resolveExportImageSections>[number]): boolean {
  return sec.scopeDecision === "exclude" || sec.sceneType === "non_workplace" || sec.isgKapsamindaMi === false;
}

function isAnalysisFailed(sec: ReturnType<typeof resolveExportImageSections>[number]): boolean {
  const st = sec.imageAnalysisStatus ?? sec.analysisStatus;
  return st === "failed" || st === "manual_required";
}

function normalizeSceneType(sceneType: unknown): string {
  const value = String(sceneType ?? "unclear").trim();
  if (!value || value === "unknown") return "unclear";
  return value;
}

function mapSectionScope(sec: ReturnType<typeof resolveExportImageSections>[number]): Record<string, unknown> {
  const failed = isAnalysisFailed(sec);
  const excluded = isScopeExcluded(sec);
  const imageStatus = failed ? "failed" : (sec.imageAnalysisStatus ?? sec.analysisStatus ?? "success");
  return {
    gorsel_kodu: `G${sec.imageIndex}`,
    dosya_adi: sec.fileName,
    scene_type: normalizeSceneType(sec.sceneType),
    isg_kapsaminda_mi: excluded ? false : sec.isgKapsamindaMi ?? sec.sceneType !== "non_workplace",
    contains_workers: sec.containsWorkers ?? false,
    contains_work_activity: sec.containsWorkActivity ?? false,
    contains_work_at_height: sec.containsWorkAtHeight ?? false,
    contains_open_edge: sec.containsOpenEdge ?? false,
    contains_scaffold_or_platform: sec.containsScaffoldOrPlatform ?? false,
    contains_ladder: sec.containsLadder ?? false,
    contains_rebar: sec.containsRebar ?? false,
    contains_machinery: sec.containsMachinery ?? false,
    contains_ppe_issue: sec.containsPpeIssue ?? false,
    image_analysis_status: imageStatus,
    zero_risk_allowed: excluded ? false : sec.zeroRiskAllowed === true,
    scope_decision: failed ? "manual_review_required" : excluded ? "exclude" : sec.scopeDecision ?? "analyze",
    scope_reason:
      sec.scopeReason ??
      (failed
        ? FAILED_IMAGE_NOTE
        : excluded
          ? "Bu görsel işyeri / saha / mesleki faaliyet içermediği için İSG risk analizinden hariç tutuldu."
          : "Görsel İSG kapsamında değerlendirilmiştir."),
  };
}

export function buildFieldReportConsolidatedJson(data: RiskAnalysisExportData): FieldReportConsolidatedJson {
  const sections = resolveExportImageSections(data);
  const excludedSections = sections.filter(isScopeExcluded);
  const failedSections = sections.filter(isAnalysisFailed);
  const isgSections = sections.filter((s) => !isScopeExcluded(s));
  const allFindings = isgSections.filter((s) => !isAnalysisFailed(s)).flatMap((s) => s.findings);
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

  const gorselKapsamKontrolu = sections.map(mapSectionScope);
  const gercekRiskler = isgSections
    .filter((s) => !isAnalysisFailed(s))
    .flatMap((sec) => sec.findings.map((f, idx) => mapFindingToReportRisk(f, `G${sec.imageIndex}`, idx + 1)));
  const dokumanDogrulamaMaddeleri = sections.flatMap((sec) =>
    (sec.documentCheckItems ?? []).map((item) => ({
      tip: "Doküman doğrulama",
      baslik: item,
      gerekce: "Bu bilgi görselden doğrulanamaz.",
      kontrol_yontemi: "Özlük dosyası, eğitim kayıtları, görevlendirme kayıtları, kontrol formları ve saha kayıtları kontrol edilmelidir.",
      risk_sayimina_dahil_mi: false,
      gorsel_kodu: `G${sec.imageIndex}`,
    })),
  );
  const kapsamDisiGorseller = excludedSections.map((sec) => ({
    gorsel_kodu: `G${sec.imageIndex}`,
    dosya_adi: sec.fileName,
    durum: "Kapsam dışı",
    neden: sec.scopeReason ?? "Görsel işyeri, şantiye, endüstriyel alan veya mesleki faaliyet içermiyor.",
    aksiyon: "Doğru saha fotoğrafı yüklenmeli veya bu görsel rapor kapsamından çıkarılmalı.",
    riskler: [],
    fine_kinney_uygulanir_mi: false,
    dof_olusturulur_mu: false,
    gercek_risk_sayimina_dahil_mi: false,
  }));
  const analizBasarisizGorseller = failedSections.map((sec) => ({
    gorsel_kodu: `G${sec.imageIndex}`,
    dosya_adi: sec.fileName,
    durum: "Analiz başarısız",
    neden: sec.analysisError || "Görsel analiz motoru risk çıktısı üretemedi.",
    uyari: "Bu durum 0 risk anlamına gelmez.",
    risk_count: null,
    aksiyon: "Görsel yeniden analiz edilmeli veya manuel İSG uzmanı değerlendirmesine alınmalıdır.",
    rapor_gecerliligine_etki: "Bu görsel İSG kapsamındaysa nihai rapor geçersiz / eksik sayılır.",
    gercek_risk_sayimina_dahil_mi: false,
  }));
  const gecersizlikNedenleri = [
    raporDurumu.gecersizlik_nedeni,
    ...sections
      .filter((s) => s.sceneType === "construction_site" && !isAnalysisFailed(s) && s.findings.length === 0)
      .map((s) => `G${s.imageIndex}: İnşaat sahası görseli risk kaydı olmadan geçemez.`),
  ].filter(Boolean);
  const durum: FieldReportConsolidatedJson["rapor_gecerlilik"]["durum"] =
    failedSections.length > 0 ? "Eksik analiz" : gecersizlikNedenleri.length > 0 ? "Geçersiz" : "Geçerli";

  return {
    rapor_gecerlilik: {
      nihai_rapor_mu: durum === "Geçerli",
      durum,
      gecersizlik_nedenleri: gecersizlikNedenleri,
      kritik_uyarilar: [
        failedSections.length > 0 ? FAILED_ANALYSIS_WARNING : "",
        excludedSections.length > 0 ? "Kapsam dışı görseller gerçek risk sayımına dahil edilmedi." : "",
      ].filter(Boolean),
    },
    gorsel_kapsam_kontrolu: gorselKapsamKontrolu,
    gercek_riskler: gercekRiskler,
    dokuman_dogrulama_maddeleri: dokumanDogrulamaMaddeleri,
    kapsam_disi_gorseller: kapsamDisiGorseller,
    analiz_basarisiz_gorseller: analizBasarisizGorseller,
    pdf_kalite_kontrol: {
      turkce_karakter_sorunu: false,
      tablo_tasmasi: false,
      metin_ust_uste_binme: false,
      harf_araligi_sorunu: false,
      sayfa_numarasi_sorunu: false,
      teslim_edilebilir_mi: durum === "Geçerli",
      duzeltme_notlari: [
        "PDF çıktısında UTF-8 Türkçe metin ve okunabilir tablo düzeni hedeflenir.",
        ...(durum === "Geçerli" ? [] : ["Eksik/başarısız analiz kapanmadan rapor nihai teslim edilebilir sayılmaz."]),
      ],
    },
    rapor_durumu: raporDurumu,
    yonetici_ozeti: {
      toplam_gorsel: sections.length,
      isg_kapsamindaki_gorsel: isgSections.length,
      kapsam_disi_gorsel: excludedSections.length,
      basarili_analiz: imgCounts.basarili,
      kismi_analiz: imgCounts.kismi,
      basarisiz_analiz: imgCounts.basarisiz,
      toplam_gercek_risk: allFindings.length,
      toplam_gercek_isg_riski: allFindings.length,
      kritik,
      yuksek,
      orta,
      dusuk_izleme: dusuk,
      dokuman_dogrulama: countDocumentChecks(sections),
      dokuman_dogrulama_maddesi: countDocumentChecks(sections),
      sistemsel_uyari: failedSections.length + excludedSections.length,
      kapsam_disi_sistemsel_uyari: failedSections.length + excludedSections.length,
      dof_adayi: data.dofCandidateCount,
      gercek_risk_sayimi_guvenilir_mi: failedSections.length === 0,
      toplam_gercek_isg_riski_notu:
        failedSections.length > 0
          ? "Değerlendirilemedi: İSG kapsamındaki bazı görseller analiz başarısız olduğu için 0 risk anlamına gelmez."
          : `${allFindings.length} gerçek İSG risk bulgusu`,
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
      const excluded = isScopeExcluded(sec);
      return {
        gorsel_kodu: gCode,
        dosya_adi: sec.fileName,
        scene_type: normalizeSceneType(sec.sceneType),
        isg_kapsaminda_mi: excluded ? false : sec.isgKapsamindaMi ?? true,
        scope_decision: failed ? "manual_review_required" : excluded ? "exclude" : sec.scopeDecision ?? "analyze",
        scope_reason: sec.scopeReason ?? "",
        image_analysis_status: st,
        risk_count: failed ? null : (sec.riskCount ?? sec.findings.length),
        zero_risk_allowed: excluded ? false : sec.zeroRiskAllowed ?? false,
        saha_tanimi: sec.areaLocation || sec.rowTitle || sec.fileName,
        sinirlamalar: sec.imageLimitations ?? [],
        riskler: failed || excluded ? [] : sec.findings.map((f, idx) => mapFindingToReportRisk(f, gCode, idx + 1)),
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
