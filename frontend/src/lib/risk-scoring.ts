/**
 * RiskNova Risk Scoring Engine
 * 3 method: R-SKOR 2D, Fine-Kinney, 5x5 L-Tipi Matris
 */

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */

export type RiskClass = "follow_up" | "low" | "medium" | "high" | "critical";

export interface RiskResult {
  score: number;
  riskClass: RiskClass;
  label: string;
  action: string;
  color: string;
}

/* ================================================================== */
/* R-SKOR 2D                                                           */
/* ================================================================== */

export interface R2DParam {
  key: string;
  code: string;
  label: string;
  description: string;
  source: string;
  weight: number;
  /** Override katsayisi (sadece C3, C5, C7, C8 icin) */
  overrideCoeff: number | null;
}

export const R2D_PARAMS: R2DParam[] = [
  { key: "c1", code: "C1", label: "Tehlike Yogunlugu", description: "Sahada tespit edilen tehlikeli nesne sayisi / yogunlugu", source: "Kamera (YOLO)", weight: 0.16, overrideCoeff: null },
  { key: "c2", code: "C2", label: "KKD Eksikligi", description: "Baret, eldiven, gozluk gibi KKD takilmamis durumlar", source: "Kamera + Kayit", weight: 0.12, overrideCoeff: null },
  { key: "c3", code: "C3", label: "Davranis Riski", description: "Yasak bolgeye giris, korumasiz calisma, yuksekten dusme tehlikesi", source: "Kamera + Bolge sensoru", weight: 0.12, overrideCoeff: 1.40 },
  { key: "c4", code: "C4", label: "Cevresel Stres", description: "Asiri sicaklik, gurultu, titresim gibi cevresel faktorler", source: "IoT sensorleri", weight: 0.10, overrideCoeff: null },
  { key: "c5", code: "C5", label: "Kimyasal Tehlike", description: "Gaz kacagi, VOC seviyesi, havalandirma arizasi", source: "Gaz sensorleri + SCADA", weight: 0.12, overrideCoeff: 1.60 },
  { key: "c6", code: "C6", label: "Erisim / Engel", description: "Kacis yolu tikali, islak zemin, gecis engeli", source: "Kamera + Sensor", weight: 0.10, overrideCoeff: null },
  { key: "c7", code: "C7", label: "Makine / Proses", description: "Makine korumasi devre disi, bakim gecikmis", source: "CMMS + Sensor", weight: 0.14, overrideCoeff: 1.50 },
  { key: "c8", code: "C8", label: "Arac Trafigi", description: "Forklift yogunlugu, hat kesisimi, yaya-arac catismasi", source: "RTLS + Kamera", weight: 0.10, overrideCoeff: 1.30 },
  { key: "c9", code: "C9", label: "Orgutsel Yuk", description: "Fazla mesai, deneyimsizlik, egitim eksikligi", source: "IK kayitlari", weight: 0.08, overrideCoeff: null },
];

export type R2DValues = Record<string, number>; // c1..c9 -> [0,1]

export interface R2DResult extends RiskResult {
  sBase: number;
  sPeak: number;
  dominantParam: string;
  paramContributions: { code: string; contribution: number }[];
}

export function calculateR2D(values: R2DValues): R2DResult {
  // 1. Taban skor
  let sBase = 0;
  const contributions: { code: string; contribution: number }[] = [];
  for (const p of R2D_PARAMS) {
    const v = values[p.key] ?? 0;
    const contrib = p.weight * v;
    sBase += contrib;
    contributions.push({ code: p.code, contribution: contrib });
  }

  // 2. Override (tepe-risk)
  const overrideCandidates: number[] = [];
  for (const p of R2D_PARAMS) {
    if (p.overrideCoeff !== null) {
      overrideCandidates.push(p.overrideCoeff * (values[p.key] ?? 0));
    }
  }
  const sPeak = 0.15 * Math.max(0, ...overrideCandidates);

  // 3. Bilesik skor
  const score = Math.min(1, sBase + sPeak);

  // 4. Dominant parametre
  contributions.sort((a, b) => b.contribution - a.contribution);
  const dominantParam = contributions[0]?.code ?? "C1";

  // 5. Siniflandirma
  const { riskClass, label, action, color } = classifyR2D(score);

  return { score, sBase, sPeak, riskClass, label, action, color, dominantParam, paramContributions: contributions };
}

function classifyR2D(score: number): { riskClass: RiskClass; label: string; action: string; color: string } {
  if (score < 0.20) return { riskClass: "follow_up", label: "Follow-up", action: "Rutin izleme", color: "#10B981" };
  if (score < 0.40) return { riskClass: "low", label: "Dusuk", action: "Planli degerlendirme", color: "#F59E0B" };
  if (score < 0.60) return { riskClass: "medium", label: "Orta", action: "Artirilmis gozetim", color: "#F97316" };
  if (score < 0.80) return { riskClass: "high", label: "Yuksek", action: "Oncelikli mudahale", color: "#DC2626" };
  return { riskClass: "critical", label: "Kritik", action: "Is durdurma degerlendirmesi", color: "#7F1D1D" };
}

/* ================================================================== */
/* Fine-Kinney                                                         */
/* ================================================================== */

export interface FKOption {
  value: number;
  label: string;
  description: string;
}

export const FK_LIKELIHOOD: FKOption[] = [
  { value: 0.1, label: "0.1", description: "Neredeyse imkansiz" },
  { value: 0.2, label: "0.2", description: "Cok dusuk ihtimal" },
  { value: 0.5, label: "0.5", description: "Beklenmeyen ama mumkun" },
  { value: 1, label: "1", description: "Dusuk ihtimal, olasilik disi degil" },
  { value: 3, label: "3", description: "Nadir ama mumkun" },
  { value: 6, label: "6", description: "Oldukca olasi" },
  { value: 10, label: "10", description: "Cok olasi / beklenen" },
];

export const FK_SEVERITY: FKOption[] = [
  { value: 1, label: "1", description: "Dikkate deger, ilk yardim gerektiren" },
  { value: 3, label: "3", description: "Onemli, dis tedavi gerektiren" },
  { value: 7, label: "7", description: "Ciddi, kalici hasar" },
  { value: 15, label: "15", description: "Cok ciddi, uzuv kaybi" },
  { value: 40, label: "40", description: "Felaket, bir olum" },
  { value: 100, label: "100", description: "Kitlesel felaket, coklu olum" },
];

export const FK_EXPOSURE: FKOption[] = [
  { value: 0.5, label: "0.5", description: "Cok nadir (yilda bir)" },
  { value: 1, label: "1", description: "Nadir (ayda bir)" },
  { value: 2, label: "2", description: "Ara sira (haftada bir)" },
  { value: 3, label: "3", description: "Bazen (haftada birkac)" },
  { value: 6, label: "6", description: "Siklikla (her gun)" },
  { value: 10, label: "10", description: "Surekli (gunun buyuk bolumu)" },
];

export interface FKValues {
  likelihood: number;
  severity: number;
  exposure: number;
}

export interface FKResult extends RiskResult {
  likelihood: number;
  severity: number;
  exposure: number;
}

export function calculateFK(values: FKValues): FKResult {
  const score = values.likelihood * values.severity * values.exposure;
  const { riskClass, label, action, color } = classifyFK(score);
  return { score, riskClass, label, action, color, ...values };
}

function classifyFK(score: number): { riskClass: RiskClass; label: string; action: string; color: string } {
  if (score < 20) return { riskClass: "follow_up", label: "Kabul Edilebilir", action: "Onlem onerisi gerekebilir, acil onlem gerekmez", color: "#10B981" };
  if (score < 70) return { riskClass: "low", label: "Dikkate Deger", action: "Gozetim altinda tutulmali, iyilestirme planlanmali", color: "#F59E0B" };
  if (score < 200) return { riskClass: "medium", label: "Onemli", action: "Kisa vadede onlem alinmali", color: "#F97316" };
  if (score < 400) return { riskClass: "high", label: "Yuksek Risk", action: "Hemen onlem alinmali, is durdurulmali", color: "#DC2626" };
  return { riskClass: "critical", label: "Cok Yuksek Risk", action: "Calisma derhal durdurulmali", color: "#7F1D1D" };
}

/* ================================================================== */
/* 5x5 L-Tipi Matris                                                   */
/* ================================================================== */

export const MATRIX_LIKELIHOOD_LABELS = [
  "Cok dusuk (Hemen hemen imkansiz)",
  "Dusuk (Cok az, beklenmiyor)",
  "Orta (Az ama mumkun)",
  "Yuksek (Muhtemel, sasirtmaz)",
  "Cok yuksek (Beklenen, kacinilamaz)",
];

export const MATRIX_SEVERITY_LABELS = [
  "Cok hafif (Is gunu kaybi yok)",
  "Hafif (Is gunu kaybina yol acmayan)",
  "Orta (Is gunu kaybi gerektiren)",
  "Ciddi (Uzuv kaybi, kalici hasar)",
  "Cok ciddi (Olum, toplu olum)",
];

export interface MatrixValues {
  likelihood: number; // 1-5
  severity: number;   // 1-5
}

export interface MatrixResult extends RiskResult {
  likelihood: number;
  severity: number;
  cellColor: string;
}

/** 5x5 renk matrisi: [olasilik-1][siddet-1] */
const MATRIX_COLORS: string[][] = [
  /* O=1 */ ["#10B981", "#10B981", "#F59E0B", "#F59E0B", "#F97316"],
  /* O=2 */ ["#10B981", "#F59E0B", "#F59E0B", "#F97316", "#F97316"],
  /* O=3 */ ["#F59E0B", "#F59E0B", "#F97316", "#F97316", "#DC2626"],
  /* O=4 */ ["#F59E0B", "#F97316", "#F97316", "#DC2626", "#DC2626"],
  /* O=5 */ ["#F97316", "#F97316", "#DC2626", "#DC2626", "#7F1D1D"],
];

export function calculateMatrix(values: MatrixValues): MatrixResult {
  const score = values.likelihood * values.severity;
  const cellColor = MATRIX_COLORS[values.likelihood - 1]?.[values.severity - 1] ?? "#64748B";
  const { riskClass, label, action, color } = classifyMatrix(score);
  return { score, riskClass, label, action, color: cellColor, cellColor, ...values };
}

function classifyMatrix(score: number): { riskClass: RiskClass; label: string; action: string; color: string } {
  if (score <= 2) return { riskClass: "follow_up", label: "Kabul Edilebilir", action: "Ek onlem gerekmeyebilir, izleme yeterli", color: "#10B981" };
  if (score <= 4) return { riskClass: "low", label: "Dusuk Risk", action: "Mevcut kontroller yeterli, gozlem surdurulmeli", color: "#F59E0B" };
  if (score <= 9) return { riskClass: "medium", label: "Orta Risk", action: "Iyilestirme calismalari planlanmali", color: "#F97316" };
  if (score <= 15) return { riskClass: "high", label: "Yuksek Risk", action: "Kisa surede onlem alinmali", color: "#DC2626" };
  return { riskClass: "critical", label: "Tolere Edilemez", action: "Is derhal durdurulmali, acil onlem", color: "#7F1D1D" };
}

/* ================================================================== */
/* Matris hucre verileri (5x5 grid render icin)                        */
/* ================================================================== */

export function getMatrixGrid(): { likelihood: number; severity: number; score: number; color: string }[] {
  const cells: { likelihood: number; severity: number; score: number; color: string }[] = [];
  for (let l = 5; l >= 1; l--) {
    for (let s = 1; s <= 5; s++) {
      cells.push({ likelihood: l, severity: s, score: l * s, color: MATRIX_COLORS[l - 1][s - 1] });
    }
  }
  return cells;
}
