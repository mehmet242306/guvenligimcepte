/**
 * Generates scripts/i18n-packs/risk-scoring/en.json and tr.json (namespace riskScoring).
 * Other locales: npm run i18n:translate-risk-scoring (OpenAI) then npm run i18n:merge-risk-scoring.
 * Run: node scripts/generate-risk-scoring-messages.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { wizardEn, wizardTr } from "./risk-analysis-wizard-messages.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "i18n-packs", "risk-scoring");

function classification(method, buckets) {
  const en = {};
  const tr = {};
  for (const [bucket, [el, ea], [tl, ta]] of buckets) {
    en[bucket] = { label: el, action: ea };
    tr[bucket] = { label: tl, action: ta };
  }
  return { en: { [method]: en }, tr: { [method]: tr } };
}

const blocks = [
  classification("r2d", [
    ["follow_up", ["Monitoring", "Routine monitoring is sufficient"], ["İzleme", "Rutin izleme yeterli"]],
    ["low", ["Low", "Schedule structured reassessment"], ["Düşük", "Planlı değerlendirme yapılmalı"]],
    ["medium", ["Medium", "Increased supervision required"], ["Orta", "Artırılmış gözetim gerekli"]],
    ["high", ["High", "Priority intervention required"], ["Yüksek", "Öncelikli müdahale gerekli"]],
    ["critical", ["Critical", "Evaluate work stoppage"], ["Kritik", "İş durdurma değerlendirmesi yapılmalı"]],
  ]),
  classification("fk", [
    ["follow_up", ["Acceptable", "May need improvement suggestions; no urgent action"], ["Kabul Edilebilir", "Önlem önerisi gerekebilir, acil önlem gerekmez"]],
    ["low", ["Moderate concern", "Keep under review; plan improvements"], ["Dikkate Değer", "Gözetim altında tutulmalı, iyileştirme planlanmalı"]],
    ["medium", ["Significant", "Take action in the short term"], ["Önemli", "Kısa vadede önlem alınmalı"]],
    ["high", ["High risk", "Immediate action; consider stopping work"], ["Yüksek Risk", "Hemen önlem alınmalı, iş durdurulmalı"]],
    ["critical", ["Very high risk", "Stop work immediately"], ["Çok Yüksek Risk", "Çalışma derhal durdurulmalı"]],
  ]),
  classification("matrix", [
    ["follow_up", ["Acceptable", "Further measures may not be needed; monitoring sufficient"], ["Kabul Edilebilir", "Ek önlem gerekmeyebilir, izleme yeterli"]],
    ["low", ["Low risk", "Existing controls adequate; keep observing"], ["Düşük Risk", "Mevcut kontroller yeterli, gözlem sürdürülmeli"]],
    ["medium", ["Medium risk", "Plan improvement activities"], ["Orta Risk", "İyileştirme çalışmaları planlanmalı"]],
    ["high", ["High risk", "Take action soon"], ["Yüksek Risk", "Kısa sürede önlem alınmalı"]],
    ["critical", ["Intolerable", "Stop work immediately; emergency measures"], ["Tolere Edilemez", "İş derhal durdurulmalı, acil önlem"]],
  ]),
  classification("fmea", [
    ["follow_up", ["Acceptable", "Current controls sufficient; keep monitoring"], ["Kabul Edilebilir", "Mevcut kontroller yeterli, izleme sürdürülmeli"]],
    ["low", ["Low risk", "Plan improvements"], ["Düşük Risk", "İyileştirme planlanmalı"]],
    ["medium", ["Medium risk", "Take action; strengthen controls"], ["Orta Risk", "Önlem alınmalı, kontroller güçlendirilmeli"]],
    ["high", ["High risk", "Urgent action; consider design change"], ["Yüksek Risk", "Acil önlem gerekli, tasarım değişikliği değerlendirilmeli"]],
    ["critical", ["Critical risk", "Stop work; perform root cause analysis"], ["Kritik Risk", "İş durdurulmalı, kök neden analizi yapılmalı"]],
  ]),
  classification("hazop", [
    ["follow_up", ["Acceptable", "Current controls sufficient"], ["Kabul Edilebilir", "Mevcut kontroller yeterli"]],
    ["low", ["Low", "Plan monitoring and improvements"], ["Düşük", "İzleme ve iyileştirme planlanmalı"]],
    ["medium", ["Medium", "Evaluate additional protection layers"], ["Orta", "Ek koruma katmanları değerlendirilmeli"]],
    ["high", ["High", "Process change or extra barrier required"], ["Yüksek", "Proses değişikliği veya ek bariyer gerekli"]],
    ["critical", ["Intolerable", "Stop process; revise design"], ["Tolere Edilemez", "Proses durdurulmalı, tasarım revizyonu yapılmalı"]],
  ]),
  classification("bow_tie", [
    ["follow_up", ["Acceptable", "Barriers adequate; continue monitoring"], ["Kabul Edilebilir", "Bariyerler yeterli, izleme sürdürülmeli"]],
    ["low", ["Low", "Review barrier effectiveness"], ["Düşük", "Bariyer etkinliği gözden geçirilmeli"]],
    ["medium", ["Medium", "Add further barriers"], ["Orta", "Ek bariyer eklenmeli"]],
    ["high", ["High", "Urgent barrier reinforcement; review process"], ["Yüksek", "Acil bariyer takviyesi, proses gözden geçirilmeli"]],
    ["critical", ["Critical", "Stop work; redesign barriers"], ["Kritik", "İş durdurulmalı, tüm bariyerler yeniden tasarlanmalı"]],
  ]),
  classification("fta", [
    ["follow_up", ["Acceptable", "System reliability adequate"], ["Kabul Edilebilir", "Sistem güvenilirliği yeterli"]],
    ["low", ["Low", "Evaluate redundancy / backups"], ["Düşük", "Yedekleme sistemleri değerlendirilmeli"]],
    ["medium", ["Medium", "Add redundancy to critical components"], ["Orta", "Kritik bileşenlere yedek eklenmeli"]],
    ["high", ["High", "Redesign the system"], ["Yüksek", "Sistem yeniden tasarlanmalı"]],
    ["critical", ["Critical", "Do not operate; eliminate root causes"], ["Kritik", "Sistem kullanılmamalı, kök neden giderilmeli"]],
  ]),
  classification("checklist", [
    ["follow_up", ["Compliant", "Maintain current practice"], ["Uygun", "Mevcut durum sürdürülmeli"]],
    ["low", ["Acceptable", "Close gaps in the short term"], ["Kabul Edilebilir", "Eksiklikler kısa vadede giderilmeli"]],
    ["medium", ["Improvement needed", "Prepare a broader improvement plan"], ["İyileştirme Gerekli", "Kapsamlı iyileştirme planı hazırlanmalı"]],
    ["high", ["Inadequate", "Start urgent corrective actions"], ["Yetersiz", "Acil düzeltici faaliyet başlatılmalı"]],
    ["critical", ["Critically inadequate", "Stop activity; full revision"], ["Kritik Yetersizlik", "Faaliyet durdurulmalı, tam revizyon yapılmalı"]],
  ]),
  classification("lopa", [
    ["follow_up", ["Acceptable", "Current protection layers sufficient"], ["Kabul Edilebilir", "Mevcut koruma katmanları yeterli"]],
    ["low", ["ALARP", "As low as reasonably practicable"], ["ALARP", "Makul derecede uygulanabilir en düşük risk"]],
    ["medium", ["Improvement needed", "Add an extra protection layer"], ["İyileştirme Gerekli", "Ek koruma katmanı eklenmeli"]],
    ["high", ["High risk", "Multiple layers or process change required"], ["Yüksek Risk", "Birden fazla ek katman veya proses değişikliği gerekli"]],
    ["critical", ["Intolerable", "Stop process; revise design"], ["Tolere Edilemez", "Proses durdurulmalı, tasarım revizyonu yapılmalı"]],
  ]),
];

const enClassification = { classification: {} };
const trClassification = { classification: {} };
for (const b of blocks) {
  Object.assign(enClassification.classification, b.en);
  Object.assign(trClassification.classification, b.tr);
}

const matrixLikelihoodEn = [
  "Very low (almost impossible)",
  "Low (rare, unexpected)",
  "Medium (unlikely but possible)",
  "High (likely, not surprising)",
  "Very high (expected, unavoidable)",
];
const matrixLikelihoodTr = [
  "Çok düşük (Hemen hemen imkansız)",
  "Düşük (Çok az, beklenmiyor)",
  "Orta (Az ama mümkün)",
  "Yüksek (Muhtemel, şaşırtmaz)",
  "Çok yüksek (Beklenen, kaçınılamaz)",
];
const matrixSeverityEn = [
  "Very minor (no lost time)",
  "Minor (no lost-time injury)",
  "Moderate (lost-time injury)",
  "Major (permanent harm, amputation)",
  "Catastrophic (fatality, multiple fatalities)",
];
const matrixSeverityTr = [
  "Çok hafif (İş günü kaybı yok)",
  "Hafif (İş günü kaybına yol açmayan)",
  "Orta (İş günü kaybı gerektiren)",
  "Ciddi (Uzuv kaybı, kalıcı hasar)",
  "Çok ciddi (Ölüm, toplu ölüm)",
];

const r2dParamsEn = {
  c1: { label: "Hazard density", description: "Count / density of hazardous objects observed in the field" },
  c2: { label: "PPE gaps", description: "Missing helmets, gloves, goggles, etc." },
  c3: { label: "Behaviour risk", description: "Restricted zone entry, unguarded work, fall exposure" },
  c4: { label: "Environmental stress", description: "Heat, noise, vibration and similar stressors" },
  c5: { label: "Chemical / electrical", description: "Gas leaks, chemicals, electrical hazards" },
  c6: { label: "Access / obstruction", description: "Blocked exits, wet floors, passage obstacles" },
  c7: { label: "Machinery / process", description: "Guards bypassed, overdue maintenance" },
  c8: { label: "Vehicle traffic", description: "Forklift intensity, line crossings, pedestrian–vehicle conflict" },
  c9: { label: "Organizational load", description: "Training gaps, missing warning signage" },
};
const r2dParamsTr = {
  c1: { label: "Tehlike Yoğunluğu", description: "Sahada tespit edilen tehlikeli nesne sayısı / yoğunluğu" },
  c2: { label: "KKD Eksikliği", description: "Baret, eldiven, gözlük gibi KKD takılmamış durumlar" },
  c3: { label: "Davranış Riski", description: "Yasak bölgeye giriş, korumasız çalışma, yüksekten düşme tehlikesi" },
  c4: { label: "Çevresel Stres", description: "Aşırı sıcaklık, gürültü, titreşim gibi çevresel faktörler" },
  c5: { label: "Kimyasal/Elektrik Tehlike", description: "Gaz kaçağı, kimyasal madde, elektrik tehlikesi" },
  c6: { label: "Erişim / Engel", description: "Kaçış yolu tıkalı, ıslak zemin, geçiş engeli" },
  c7: { label: "Makine / Proses", description: "Makine koruması devre dışı, bakım gecikmesi" },
  c8: { label: "Araç Trafiği", description: "Forklift yoğunluğu, hat kesişimi, yaya-araç çatışması" },
  c9: { label: "Örgütsel Yük", description: "Eğitim eksikliği, uyarı levhası eksikliği" },
};

const fkLikelihoodEn = {
  v0_1: "Almost impossible",
  v0_2: "Very unlikely",
  v0_5: "Unexpected but possible",
  v1: "Low likelihood, not negligible",
  v3: "Rare but possible",
  v6: "Quite likely",
  v10: "Very likely / expected",
};
const fkLikelihoodTr = {
  v0_1: "Neredeyse imkansız",
  v0_2: "Çok düşük ihtimal",
  v0_5: "Beklenmeyen ama mümkün",
  v1: "Düşük ihtimal, olasılık dışı değil",
  v3: "Nadir ama mümkün",
  v6: "Oldukça olası",
  v10: "Çok olası / beklenen",
};
const fkSeverityEn = {
  v1: "Notable, first aid",
  v3: "Significant, external treatment",
  v7: "Serious, permanent harm",
  v15: "Very serious, loss of limb",
  v40: "Disaster, single fatality",
  v100: "Mass disaster, multiple fatalities",
};
const fkSeverityTr = {
  v1: "Dikkate değer, ilk yardım gerektiren",
  v3: "Önemli, dış tedavi gerektiren",
  v7: "Ciddi, kalıcı hasar",
  v15: "Çok ciddi, uzuv kaybı",
  v40: "Felaket, bir ölüm",
  v100: "Kitlesel felaket, çoklu ölüm",
};
const fkExposureEn = {
  v0_5: "Very rare (once a year)",
  v1: "Rare (once a month)",
  v2: "Occasional (once a week)",
  v3: "Sometimes (several per week)",
  v6: "Frequent (daily)",
  v10: "Continuous (most of the day)",
};
const fkExposureTr = {
  v0_5: "Çok nadir (yılda bir)",
  v1: "Nadir (ayda bir)",
  v2: "Ara sıra (haftada bir)",
  v3: "Bazen (haftada birkaç)",
  v6: "Sıklıkla (her gün)",
  v10: "Sürekli (günün büyük bölümü)",
};

function fkBranch(enObj, trObj, sub, isTr) {
  const src = isTr ? trObj : enObj;
  const out = {};
  for (const k of Object.keys(src)) out[k] = src[k];
  return { fk: { [sub]: out } };
}

const fmeaSevEn = {
  v1: "No effect — unnoticed",
  v2: "Very minor — negligible impact",
  v3: "Minor — slight nuisance",
  v4: "Low — performance drop",
  v5: "Moderate — significant performance loss",
  v6: "High — system function impaired",
  v7: "Very high — inoperable",
  v8: "Hazardous (with warning) — injury risk",
  v9: "Hazardous (no warning) — serious injury",
  v10: "Catastrophic — fatality / mass accident",
};
const fmeaSevTr = {
  v1: "Etkisiz — fark edilmez",
  v2: "Çok küçük — ihmal edilebilir etki",
  v3: "Küçük — hafif rahatsızlık",
  v4: "Düşük — performans düşüşü",
  v5: "Orta — önemli performans kaybı",
  v6: "Yüksek — sistem işlevi bozulur",
  v7: "Çok yüksek — çalışamaz duruma gelir",
  v8: "Tehlikeli (uyarılı) — yaralanma riski",
  v9: "Tehlikeli (uyarısız) — ciddi yaralanma",
  v10: "Felaket — ölüm/toplu kaza",
};
const fmeaOccEn = {
  v1: "Nearly impossible (< 1/1,000,000)",
  v2: "Remote (1/20,000)",
  v3: "Very low (1/4,000)",
  v4: "Low (1/1,000)",
  v5: "Medium-low (1/400)",
  v6: "Medium (1/80)",
  v7: "Medium-high (1/40)",
  v8: "High (1/20)",
  v9: "Very high (1/8)",
  v10: "Almost certain (≥ 1/2)",
};
const fmeaOccTr = {
  v1: "Neredeyse imkansız (< 1/1.000.000)",
  v2: "Uzak ihtimal (1/20.000)",
  v3: "Çok düşük (1/4.000)",
  v4: "Düşük (1/1.000)",
  v5: "Orta-düşük (1/400)",
  v6: "Orta (1/80)",
  v7: "Orta-yüksek (1/40)",
  v8: "Yüksek (1/20)",
  v9: "Çok yüksek (1/8)",
  v10: "Neredeyse kesin (≥ 1/2)",
};
const fmeaDetEn = {
  v1: "Almost certain detection",
  v2: "Very high chance of detection",
  v3: "High chance",
  v4: "Medium-high",
  v5: "Medium",
  v6: "Low-medium",
  v7: "Low",
  v8: "Very low",
  v9: "Remote chance",
  v10: "Cannot detect",
};
const fmeaDetTr = {
  v1: "Neredeyse kesin tespit",
  v2: "Çok yüksek tespit şansı",
  v3: "Yüksek tespit şansı",
  v4: "Orta-yüksek tespit",
  v5: "Orta tespit",
  v6: "Düşük-orta tespit",
  v7: "Düşük tespit",
  v8: "Çok düşük tespit",
  v9: "Uzak ihtimal tespit",
  v10: "Tespit edilemez",
};

function fmeaBranch(en, tr, name, isTr) {
  const src = isTr ? tr : en;
  const out = {};
  for (const k of Object.keys(src)) out[k] = src[k];
  return { fmea: { [name]: out } };
}

const methodsEn = {
  r_skor: {
    name: "R-SKOR 2D",
    description: "Weighted field screening score with 9 parameters",
    tooltip: "RiskNova method: nine parameters (C1–C9) weight visual and field inputs; supports automated scoring from imagery.",
  },
  fine_kinney: {
    name: "Fine-Kinney",
    description: "Likelihood × Severity × Exposure product",
    tooltip: "Common quantitative risk method: L (0.1–10), S (1–100), E (0.5–10); aligns with ISO 31000.",
  },
  l_matrix: {
    name: "L-type matrix",
    description: "5×5 likelihood–severity risk matrix",
    tooltip: "Pick likelihood (1–5) and severity (1–5); read risk from a 25-cell colour matrix (aligned with Turkish OHS practice).",
  },
  fmea: {
    name: "FMEA",
    description: "Failure Mode & Effects Analysis — RPN",
    tooltip: "Severity (1–10) × Occurrence (1–10) × Detection (1–10) = RPN. Ideal for operations and maintenance; IEC 60812.",
  },
  hazop: {
    name: "HAZOP",
    description: "Hazard and operability study",
    tooltip: "Guide words (No, Less, More, Reverse, …) explore process deviations; common in chemical/petro plants; IEC 61882.",
  },
  bow_tie: {
    name: "Bow-Tie",
    description: "Bow-tie — threat–barrier–consequence",
    tooltip: "Threat likelihood and consequence severity with preventive and mitigative barriers; residual risk from barrier strength.",
  },
  fta: {
    name: "FTA",
    description: "Fault tree analysis — system reliability",
    tooltip: "Decompose system failure with AND/OR gates; used in aviation, nuclear and critical systems; IEC 61025.",
  },
  checklist: {
    name: "Checklist",
    description: "Checklist — compliance percentage",
    tooltip: "Weighted compliance from OK / Not OK / Partial items—good for audits and inspections.",
  },
  jsa: {
    name: "JSA",
    description: "Job safety analysis — step-based hazards",
    tooltip: "Per-step Severity × Likelihood / Control effectiveness; essential for construction and field work.",
  },
  lopa: {
    name: "LOPA",
    description: "Layer of protection analysis — frequency reduction",
    tooltip: "Multiply initiating frequency by layer PFD values; often paired with SIL targets in process safety.",
  },
};
const methodsTr = {
  r_skor: {
    name: "R-SKOR 2D",
    description: "9 parametreli ağırlıklı saha tarama skoru",
    tooltip: "RiskNova'nın özgün yöntemi. 9 parametre (C1-C9) ile sahadan toplanan verileri ağırlıklı olarak değerlendirir. Görsel analiz ile otomatik skorlama yapılabilir.",
  },
  fine_kinney: {
    name: "Fine-Kinney",
    description: "Olasılık × Şiddet × Maruziyet çarpımı",
    tooltip: "En yaygın kullanılan nicel risk değerlendirme yöntemi. Olasılık (0.1-10), Şiddet (1-100) ve Maruziyet (0.5-10) çarpılarak risk skoru elde edilir. ISO 31000 uyumlu.",
  },
  l_matrix: {
    name: "L-Tipi Matris",
    description: "5×5 olasılık-şiddet risk matrisi",
    tooltip: "Basit ve anlaşılır matris yöntemi. Olasılık (1-5) ve Şiddet (1-5) seçilerek 25 hücreli renkli matris üzerinden risk seviyesi belirlenir. 6331 İSG Kanunu uyumlu.",
  },
  fmea: {
    name: "FMEA",
    description: "Hata Türü ve Etkileri Analizi — RPN hesaplama",
    tooltip: "Failure Mode & Effects Analysis. Şiddet (1-10) × Oluşma Olasılığı (1-10) × Tespit Edilebilirlik (1-10) = RPN. Üretim, bakım ve proses güvenliği için ideal. IEC 60812 standardı.",
  },
  hazop: {
    name: "HAZOP",
    description: "Tehlike ve İşletilebilirlik Çalışması",
    tooltip: "Hazard and Operability Study. Kılavuz kelimeler (Yok, Az, Çok, Tersi) ile proses sapmalarını analiz eder. Kimya, petrokimya ve enerji sektörü için zorunlu. IEC 61882.",
  },
  bow_tie: {
    name: "Bow-Tie",
    description: "Papyon analizi — tehdit-bariyer-sonuç modeli",
    tooltip: "Tehdit olasılığı ve sonuç şiddeti arasındaki önleyici ve azaltıcı bariyerleri değerlendirir. Bariyer etkinliğine göre residüel risk hesaplanır. Körfez/petrol sektöründe yaygın.",
  },
  fta: {
    name: "FTA",
    description: "Hata Ağacı Analizi — sistem güvenilirliği",
    tooltip: "Fault Tree Analysis. Sistem arızasını bileşen hatalarına ayırır. AND/OR kapıları ile sistem arıza olasılığı hesaplanır. Havacılık, nükleer ve kritik sistemlerde kullanılır. IEC 61025.",
  },
  checklist: {
    name: "Checklist",
    description: "Kontrol listesi — uygunluk yüzdesi",
    tooltip: "Standart kontrol maddelerinin Uygun/Uygun Değil/Kısmi olarak değerlendirilmesi. Ağırlıklı uygunluk yüzdesi hesaplanır. Denetim, teftiş ve periyodik kontroller için ideal.",
  },
  jsa: {
    name: "JSA",
    description: "İş Güvenliği Analizi — adım bazlı tehlike değerlendirme",
    tooltip: "Job Safety Analysis. İş adımları tek tek analiz edilerek her adımda Şiddet × Olasılık / Kontrol Etkinliği hesaplanır. İnşaat, üretim ve saha işleri için vazgeçilmez.",
  },
  lopa: {
    name: "LOPA",
    description: "Koruma Katmanı Analizi — frekans azaltma",
    tooltip: "Layer of Protection Analysis. Başlangıç olay frekansını koruma katmanlarının PFD değerleri ile çarparak azaltılmış frekans hesaplar. Proses güvenliği için SIL değerlendirmesi ile birlikte kullanılır.",
  },
};

const hazopGuideEn = {
  noNot: "No / Not",
  less: "Less",
  more: "More",
  partOf: "Part of",
  reverse: "Reverse",
  otherThan: "Other than",
  early: "Early",
  late: "Late",
  before: "Before",
  after: "After",
};
const hazopGuideTr = {
  noNot: "Yok (No/Not)",
  less: "Az (Less)",
  more: "Çok (More)",
  partOf: "Kısmen (Part of)",
  reverse: "Tersi (Reverse)",
  otherThan: "Başka (Other than)",
  early: "Erken (Early)",
  late: "Geç (Late)",
  before: "Önce (Before)",
  after: "Sonra (After)",
};
const hazopParamEn = {
  flow: "Flow",
  pressure: "Pressure",
  temperature: "Temperature",
  level: "Level",
  time: "Time",
  composition: "Composition",
  ph: "pH",
  speed: "Speed",
  mixing: "Mixing",
  reaction: "Reaction",
};
const hazopParamTr = {
  flow: "Akış (Flow)",
  pressure: "Basınç (Pressure)",
  temperature: "Sıcaklık (Temperature)",
  level: "Seviye (Level)",
  time: "Zaman (Time)",
  composition: "Kompozisyon (Composition)",
  ph: "pH",
  speed: "Hız (Speed)",
  mixing: "Karıştırma (Mixing)",
  reaction: "Reaksiyon (Reaction)",
};

const lopaInitEn = {
  v1: "Once per year — very frequent",
  v0_1: "Once in 10 years — frequent",
  v0_01: "Once in 100 years — occasional",
  v0_001: "Once in 1,000 years — rare",
  v0_0001: "Once in 10,000 years — very rare",
  v0_00001: "Once in 100,000 years — extremely rare",
};
const lopaInitTr = {
  v1: "Yılda 1 kez — çok sık",
  v0_1: "10 yılda 1 — sık",
  v0_01: "100 yılda 1 — ara sıra",
  v0_001: "1000 yılda 1 — nadir",
  v0_0001: "10.000 yılda 1 — çok nadir",
  v0_00001: "100.000 yılda 1 — son derece nadir",
};
const lopaPfdEn = {
  v0_1: "Simple administrative control",
  v0_01: "Trained operator response / alarm",
  v0_001: "Automated safety system (SIL-1 class)",
};
const lopaPfdTr = {
  v0_1: "Basit idari kontrol",
  v0_01: "Eğitimli operatör yanıtı / alarm",
  v0_001: "Otomatik güvenlik sistemi (SIL-1)",
};

const panelEn = {
  hazop: {
    guideWord: "Guide word",
    parameter: "Process parameter",
    deviation: "Deviation description",
    deviationPlaceholder: "Describe the deviation…",
    severity: "Severity",
    likelihood: "Likelihood",
    detectability: "Detectability",
    detectEasy: "Easy",
    detectHard: "Hard",
  },
  fmea: {
    severity: "Severity (S)",
    occurrence: "Occurrence (O)",
    detection: "Detection (D)",
    formula: "S × O × D = RPN",
  },
  lopa: {
    initFreq: "Initiating event frequency",
    consequence: "Consequence severity",
    layerPfd: "Layer PFD",
    meetsTarget: "Meets tolerable target",
    riskReduction: "Risk reduction",
    target: "Target",
    targetMet: "Met",
    targetNotMet: "Not met",
    layersHeading: "Protection layers ({count})",
    addLayer: "+ Add",
    layerDefault: "Layer {n}",
    layerNamePlaceholder: "Layer name",
    removeTitle: "Remove",
    consequenceV1: "Low",
    consequenceV2: "Minor",
    consequenceV3: "Moderate",
    consequenceV4: "Severe",
    consequenceV5: "Catastrophic",
  },
  bowtie: {
    threat: "Threat likelihood",
    consequence: "Consequence severity",
    prevention: "Preventive barriers",
    mitigation: "Mitigative barriers",
    rawRisk: "Raw risk",
    residualRisk: "Residual risk",
  },
  fta: {
    systemProb: "System P",
    gate: "Gate",
    gateType: "Gate type:",
    systemCriticality: "System criticality",
    componentsHeading: "Components ({count})",
    add: "+ Add",
    componentDefault: "Component {n}",
    componentPlaceholder: "Component name",
    failureRateTitle: "Failure probability (0–1)",
    removeTitle: "Remove",
  },
  checklist: {
    statusUygun: "Compliant",
    statusKismi: "Partial",
    statusUygunDegil: "Non-compliant",
    statusNa: "N/A",
    itemsHeading: "Check items ({count})",
    compliantLine: "{n} compliant",
    partialLine: "{n} partial",
    nonCompliantLine: "{n} non-compliant",
    itemPlaceholder: "Control item…",
    add: "+ Add",
    removeTitle: "Remove",
  },
  jsa: {
    max: "Max",
    avg: "Avg",
    highRisk: "High-risk steps",
    jobTitle: "Job title",
    jobPlaceholder: "Job name…",
    stepsHeading: "Job steps ({count})",
    stepDefault: "Step {n}",
    stepDescPlaceholder: "Step description…",
    hazardPlaceholder: "Hazard…",
    severity: "Severity",
    likelihood: "Likelihood",
    control: "Control",
    controlsPlaceholder: "Control measures…",
    stepScoreIntro: "Step score:",
    add: "+ Add",
    removeTitle: "Remove",
  },
};

const panelTr = {
  hazop: {
    guideWord: "Kılavuz Kelime",
    parameter: "Proses Parametresi",
    deviation: "Sapma Açıklaması",
    deviationPlaceholder: "Sapma tanımı…",
    severity: "Şiddet",
    likelihood: "Olasılık",
    detectability: "Tespit",
    detectEasy: "Kolay",
    detectHard: "Zor",
  },
  fmea: {
    severity: "Ciddiyet (S)",
    occurrence: "Oluşma Olasılığı (O)",
    detection: "Tespit Edilebilirlik (D)",
    formula: "S × O × D = RPN",
  },
  lopa: {
    initFreq: "Başlangıç Olay Frekansı",
    consequence: "Sonuç Şiddeti",
    layerPfd: "Katman PFD",
    meetsTarget: "Hedef tolere edilebilirlik",
    riskReduction: "Risk Azaltma",
    target: "Hedef",
    targetMet: "Karşılandı",
    targetNotMet: "Karşılanmadı",
    layersHeading: "Koruma Katmanları ({count})",
    addLayer: "+ Ekle",
    layerDefault: "Katman {n}",
    layerNamePlaceholder: "Katman adı",
    removeTitle: "Sil",
    consequenceV1: "Düşük",
    consequenceV2: "Hafif",
    consequenceV3: "Orta",
    consequenceV4: "Ciddi",
    consequenceV5: "Felaket",
  },
  bowtie: {
    threat: "Tehdit Olasılığı",
    consequence: "Sonuç Şiddeti",
    prevention: "Önleyici Bariyer",
    mitigation: "Azaltıcı Bariyer",
    rawRisk: "Ham Risk",
    residualRisk: "Artık Risk",
  },
  fta: {
    systemProb: "Sistem P",
    gate: "Kapı",
    gateType: "Kapı Tipi:",
    systemCriticality: "Sistem Kritikliği",
    componentsHeading: "Bileşenler ({count})",
    add: "+ Ekle",
    componentDefault: "Bileşen {n}",
    componentPlaceholder: "Bileşen adı",
    failureRateTitle: "Arıza olasılığı (0–1)",
    removeTitle: "Sil",
  },
  checklist: {
    statusUygun: "Uygun",
    statusKismi: "Kısmi",
    statusUygunDegil: "Uygun Değil",
    statusNa: "N/A",
    itemsHeading: "Kontrol Maddeleri ({count})",
    compliantLine: "{n} uygun",
    partialLine: "{n} kısmi",
    nonCompliantLine: "{n} uygun değil",
    itemPlaceholder: "Kontrol maddesi…",
    add: "+ Ekle",
    removeTitle: "Sil",
  },
  jsa: {
    max: "Max",
    avg: "Ort.",
    highRisk: "Yüksek riskli adım",
    jobTitle: "İş Tanımı",
    jobPlaceholder: "İş adı…",
    stepsHeading: "İş Adımları ({count})",
    stepDefault: "Adım {n}",
    stepDescPlaceholder: "Adım açıklaması…",
    hazardPlaceholder: "Tehlike…",
    severity: "Şiddet",
    likelihood: "Olasılık",
    control: "Kontrol",
    controlsPlaceholder: "Kontrol önlemleri…",
    stepScoreIntro: "Adım skoru:",
    add: "+ Ekle",
    removeTitle: "Sil",
  },
};

const participantsRolesEn = {
  employer: "Employer",
  employer_representative: "Employer representative",
  ohs_specialist: "OHS specialist",
  workplace_physician: "Workplace physician",
  other_health_personnel: "Other health personnel",
  employee_representative: "Employee representative",
  support_staff: "Support staff",
  knowledgeable_employee: "Employee knowledgeable about risks",
};

const participantsRolesTr = {
  employer: "İşveren",
  employer_representative: "İşveren Vekili",
  ohs_specialist: "İş Güvenliği Uzmanı",
  workplace_physician: "İşyeri Hekimi",
  other_health_personnel: "Diğer Sağlık Personeli",
  employee_representative: "Çalışan Temsilcisi",
  support_staff: "Destek Elemanı",
  knowledgeable_employee: "Riskler Hakkında Bilgi Sahibi Çalışan",
};

const uiEn = {
  severity: {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  },
  r2d: { base: "Base", peak: "Peak", dominant: "Dominant", parameters: "Parameters" },
  fk: { likelihood: "Likelihood (L)", severity: "Severity (S)", exposure: "Exposure (E)" },
  matrix: {
    axisOs: "L\\S",
    likelihoodHeading: "Likelihood ({n})",
    severityHeading: "Severity ({n})",
  },
  page: {
    analysisTitlePlaceholder: "Field risk analysis",
    analysisNotePlaceholder: "Each row is a risk topic or non-conformity group. One or more photos can be attached per row.",
    describeRiskGroup: "Briefly describe the risk group",
  },
};

const uiTr = {
  severity: {
    low: "Düşük",
    medium: "Orta",
    high: "Yüksek",
    critical: "Kritik",
  },
  r2d: { base: "Taban", peak: "Tepe", dominant: "Dominant", parameters: "Parametreler" },
  fk: { likelihood: "Olasılık (L)", severity: "Şiddet (S)", exposure: "Frekans / Maruziyet (E)" },
  matrix: {
    axisOs: "O\\S",
    likelihoodHeading: "Olasılık ({n})",
    severityHeading: "Şiddet ({n})",
  },
  page: {
    analysisTitlePlaceholder: "Saha Risk Analizi",
    analysisNotePlaceholder: "Her satır bir risk konusu veya uygunsuzluk grubunu temsil eder. Aynı satıra bir veya birden fazla fotoğraf eklenebilir.",
    describeRiskGroup: "Risk grubunu kısaca açıkla",
  },
};

function deepMerge(a, b) {
  const out = { ...a };
  for (const k of Object.keys(b)) {
    if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && typeof out[k] === "object" && out[k] && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k], b[k]);
    } else {
      out[k] = b[k];
    }
  }
  return out;
}

function build(langPack) {
  const isTr = langPack === "tr";
  const classification = isTr ? trClassification.classification : enClassification.classification;

  const likelihoodAxis = {};
  const severityAxis = {};
  for (let i = 0; i < 5; i++) {
    likelihoodAxis[`i${i + 1}`] = {
      description: isTr ? matrixLikelihoodTr[i] : matrixLikelihoodEn[i],
    };
    severityAxis[`i${i + 1}`] = {
      description: isTr ? matrixSeverityTr[i] : matrixSeverityEn[i],
    };
  }

  const r2dParams = {};
  for (const k of Object.keys(r2dParamsEn)) {
    r2dParams[k] = isTr ? r2dParamsTr[k] : r2dParamsEn[k];
  }
  r2dParams.source = { visualAnalysis: isTr ? "Görsel Analiz" : "Visual analysis" };

  let rs = {
    classification,
    matrix: { likelihood: likelihoodAxis, severity: severityAxis },
    r2dParams,
  };

  rs = deepMerge(rs, fkBranch(fkLikelihoodEn, fkLikelihoodTr, "likelihood", isTr));
  rs = deepMerge(rs, fkBranch(fkSeverityEn, fkSeverityTr, "severity", isTr));
  rs = deepMerge(rs, fkBranch(fkExposureEn, fkExposureTr, "exposure", isTr));
  rs = deepMerge(rs, fmeaBranch(fmeaSevEn, fmeaSevTr, "severity", isTr));
  rs = deepMerge(rs, fmeaBranch(fmeaOccEn, fmeaOccTr, "occurrence", isTr));
  rs = deepMerge(rs, fmeaBranch(fmeaDetEn, fmeaDetTr, "detection", isTr));

  rs.methods = isTr ? methodsTr : methodsEn;
  rs.hazop = {
    guideWords: isTr ? hazopGuideTr : hazopGuideEn,
    parameters: isTr ? hazopParamTr : hazopParamEn,
  };
  rs.lopa = {
    initFreq: isTr ? lopaInitTr : lopaInitEn,
    pfd: isTr ? lopaPfdTr : lopaPfdEn,
  };
  rs.panel = isTr ? panelTr : panelEn;
  rs.ui = isTr ? uiTr : uiEn;
  rs.participants = { roles: isTr ? participantsRolesTr : participantsRolesEn };
  rs.wizard = isTr ? wizardTr : wizardEn;

  return { riskScoring: rs };
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "en.json"), `${JSON.stringify(build("en"), null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "tr.json"), `${JSON.stringify(build("tr"), null, 2)}\n`);
console.log("wrote risk-scoring packs:", path.join(outDir, "en.json"), path.join(outDir, "tr.json"));
