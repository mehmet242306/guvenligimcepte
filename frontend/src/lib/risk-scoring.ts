/**
 * RiskNova Risk Scoring Engine
 * 3 method: R-SKOR 2D, Fine-Kinney, 5x5 L-Tipi Matris
 */

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */

export type RiskClass = "follow_up" | "low" | "medium" | "high" | "critical";

/** Namespace `riskScoring` — use with useTranslations("riskScoring"). */
export interface RiskResult {
  score: number;
  riskClass: RiskClass;
  labelKey: string;
  actionKey: string;
  /** English fallback for exports / PDF when locale is unavailable */
  label: string;
  action: string;
  color: string;
}

function band(
  method: string,
  rc: RiskClass,
  en: { label: string; action: string },
  color: string,
): Pick<RiskResult, "riskClass" | "labelKey" | "actionKey" | "label" | "action" | "color"> {
  return {
    riskClass: rc,
    labelKey: `classification.${method}.${rc}.label`,
    actionKey: `classification.${method}.${rc}.action`,
    label: en.label,
    action: en.action,
    color,
  };
}

/* ================================================================== */
/* R-SKOR 2D                                                           */
/* ================================================================== */

export interface R2DParam {
  key: string;
  code: string;
  /** Short English label for Word/PDF export tables */
  exportLabel: string;
  weight: number;
  /** Override katsayisi (sadece C3, C5, C7, C8 icin) */
  overrideCoeff: number | null;
}

export const R2D_PARAMS: R2DParam[] = [
  { key: "c1", code: "C1", exportLabel: "Hazard density", weight: 0.16, overrideCoeff: null },
  { key: "c2", code: "C2", exportLabel: "PPE gaps", weight: 0.12, overrideCoeff: null },
  { key: "c3", code: "C3", exportLabel: "Behaviour risk", weight: 0.12, overrideCoeff: 1.40 },
  { key: "c4", code: "C4", exportLabel: "Environmental stress", weight: 0.10, overrideCoeff: null },
  { key: "c5", code: "C5", exportLabel: "Chemical / electrical", weight: 0.12, overrideCoeff: 1.60 },
  { key: "c6", code: "C6", exportLabel: "Access / obstruction", weight: 0.10, overrideCoeff: null },
  { key: "c7", code: "C7", exportLabel: "Machinery / process", weight: 0.14, overrideCoeff: 1.50 },
  { key: "c8", code: "C8", exportLabel: "Vehicle traffic", weight: 0.10, overrideCoeff: 1.30 },
  { key: "c9", code: "C9", exportLabel: "Organizational load", weight: 0.08, overrideCoeff: null },
];

export function r2dParamTitleKey(paramKey: string): string {
  return `r2dParams.${paramKey}.label`;
}

export function r2dParamDescriptionKey(paramKey: string): string {
  return `r2dParams.${paramKey}.description`;
}

export function r2dParamSourceKey(): string {
  return "r2dParams.source.visualAnalysis";
}

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
  const sPeak = 0.25 * Math.max(0, ...overrideCandidates);

  // 3. Bilesik skor
  const score = Math.min(1, sBase + sPeak);

  // 4. Dominant parametre
  contributions.sort((a, b) => b.contribution - a.contribution);
  const dominantParam = contributions[0]?.code ?? "C1";

  // 5. Siniflandirma
  const { riskClass, labelKey, actionKey, label, action, color } = classifyR2D(score);

  return { score, sBase, sPeak, riskClass, labelKey, actionKey, label, action, color, dominantParam, paramContributions: contributions };
}

function classifyR2D(score: number): Pick<RiskResult, "riskClass" | "labelKey" | "actionKey" | "label" | "action" | "color"> {
  if (score < 0.20) return band("r2d", "follow_up", { label: "Monitoring", action: "Routine monitoring is sufficient" }, "#10B981");
  if (score < 0.40) return band("r2d", "low", { label: "Low", action: "Schedule structured reassessment" }, "#F59E0B");
  if (score < 0.60) return band("r2d", "medium", { label: "Medium", action: "Increased supervision required" }, "#F97316");
  if (score < 0.80) return band("r2d", "high", { label: "High", action: "Priority intervention required" }, "#DC2626");
  return band("r2d", "critical", { label: "Critical", action: "Evaluate work stoppage" }, "#7F1D1D");
}

/* ================================================================== */
/* Fine-Kinney                                                         */
/* ================================================================== */

export interface FKOption {
  value: number;
  label: string;
  descriptionKey: string;
}

export const FK_LIKELIHOOD: FKOption[] = [
  { value: 0.1, label: "0.1", descriptionKey: "fk.likelihood.v0_1" },
  { value: 0.2, label: "0.2", descriptionKey: "fk.likelihood.v0_2" },
  { value: 0.5, label: "0.5", descriptionKey: "fk.likelihood.v0_5" },
  { value: 1, label: "1", descriptionKey: "fk.likelihood.v1" },
  { value: 3, label: "3", descriptionKey: "fk.likelihood.v3" },
  { value: 6, label: "6", descriptionKey: "fk.likelihood.v6" },
  { value: 10, label: "10", descriptionKey: "fk.likelihood.v10" },
];

export const FK_SEVERITY: FKOption[] = [
  { value: 1, label: "1", descriptionKey: "fk.severity.v1" },
  { value: 3, label: "3", descriptionKey: "fk.severity.v3" },
  { value: 7, label: "7", descriptionKey: "fk.severity.v7" },
  { value: 15, label: "15", descriptionKey: "fk.severity.v15" },
  { value: 40, label: "40", descriptionKey: "fk.severity.v40" },
  { value: 100, label: "100", descriptionKey: "fk.severity.v100" },
];

export const FK_EXPOSURE: FKOption[] = [
  { value: 0.5, label: "0.5", descriptionKey: "fk.exposure.v0_5" },
  { value: 1, label: "1", descriptionKey: "fk.exposure.v1" },
  { value: 2, label: "2", descriptionKey: "fk.exposure.v2" },
  { value: 3, label: "3", descriptionKey: "fk.exposure.v3" },
  { value: 6, label: "6", descriptionKey: "fk.exposure.v6" },
  { value: 10, label: "10", descriptionKey: "fk.exposure.v10" },
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
  const { riskClass, labelKey, actionKey, label, action, color } = classifyFK(score);
  return { score, riskClass, labelKey, actionKey, label, action, color, ...values };
}

function classifyFK(score: number): Pick<RiskResult, "riskClass" | "labelKey" | "actionKey" | "label" | "action" | "color"> {
  if (score < 20) return band("fk", "follow_up", { label: "Acceptable", action: "May need improvement suggestions; no urgent action" }, "#10B981");
  if (score < 70) return band("fk", "low", { label: "Moderate concern", action: "Keep under review; plan improvements" }, "#F59E0B");
  if (score < 200) return band("fk", "medium", { label: "Significant", action: "Take action in the short term" }, "#F97316");
  if (score < 400) return band("fk", "high", { label: "High risk", action: "Immediate action; consider stopping work" }, "#DC2626");
  return band("fk", "critical", { label: "Very high risk", action: "Stop work immediately" }, "#7F1D1D");
}

/* ================================================================== */
/* 5x5 L-Tipi Matris                                                   */
/* ================================================================== */

/** 1-based likelihood index → message key (use with useTranslations("riskScoring")) */
export function matrixLikelihoodDescriptionKey(likelihood1to5: number): string {
  return `matrix.likelihood.i${Math.min(5, Math.max(1, likelihood1to5))}.description`;
}

/** 1-based severity index → message key */
export function matrixSeverityDescriptionKey(severity1to5: number): string {
  return `matrix.severity.i${Math.min(5, Math.max(1, severity1to5))}.description`;
}

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
  const { riskClass, labelKey, actionKey, label, action, color } = classifyMatrix(score);
  return { score, riskClass, labelKey, actionKey, label, action, color: cellColor, cellColor, ...values };
}

function classifyMatrix(score: number): Pick<RiskResult, "riskClass" | "labelKey" | "actionKey" | "label" | "action" | "color"> {
  if (score <= 2) return band("matrix", "follow_up", { label: "Acceptable", action: "Further measures may not be needed; monitoring sufficient" }, "#10B981");
  if (score <= 4) return band("matrix", "low", { label: "Low risk", action: "Existing controls adequate; keep observing" }, "#F59E0B");
  if (score <= 9) return band("matrix", "medium", { label: "Medium risk", action: "Plan improvement activities" }, "#F97316");
  if (score <= 15) return band("matrix", "high", { label: "High risk", action: "Take action soon" }, "#DC2626");
  return band("matrix", "critical", { label: "Intolerable", action: "Stop work immediately; emergency measures" }, "#7F1D1D");
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

/* ================================================================== */
/* FMEA (Failure Mode & Effects Analysis)                              */
/* RPN = Severity × Occurrence × Detection                             */
/* ================================================================== */

export interface FMEAValues {
  severity: number;   // 1-10
  occurrence: number; // 1-10
  detection: number;  // 1-10
}

export interface FMEAResult extends RiskResult {
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
}

export const FMEA_SEVERITY_OPTIONS: FKOption[] = [
  { value: 1, label: "1", descriptionKey: "fmea.severity.v1" },
  { value: 2, label: "2", descriptionKey: "fmea.severity.v2" },
  { value: 3, label: "3", descriptionKey: "fmea.severity.v3" },
  { value: 4, label: "4", descriptionKey: "fmea.severity.v4" },
  { value: 5, label: "5", descriptionKey: "fmea.severity.v5" },
  { value: 6, label: "6", descriptionKey: "fmea.severity.v6" },
  { value: 7, label: "7", descriptionKey: "fmea.severity.v7" },
  { value: 8, label: "8", descriptionKey: "fmea.severity.v8" },
  { value: 9, label: "9", descriptionKey: "fmea.severity.v9" },
  { value: 10, label: "10", descriptionKey: "fmea.severity.v10" },
];

export const FMEA_OCCURRENCE_OPTIONS: FKOption[] = [
  { value: 1, label: "1", descriptionKey: "fmea.occurrence.v1" },
  { value: 2, label: "2", descriptionKey: "fmea.occurrence.v2" },
  { value: 3, label: "3", descriptionKey: "fmea.occurrence.v3" },
  { value: 4, label: "4", descriptionKey: "fmea.occurrence.v4" },
  { value: 5, label: "5", descriptionKey: "fmea.occurrence.v5" },
  { value: 6, label: "6", descriptionKey: "fmea.occurrence.v6" },
  { value: 7, label: "7", descriptionKey: "fmea.occurrence.v7" },
  { value: 8, label: "8", descriptionKey: "fmea.occurrence.v8" },
  { value: 9, label: "9", descriptionKey: "fmea.occurrence.v9" },
  { value: 10, label: "10", descriptionKey: "fmea.occurrence.v10" },
];

export const FMEA_DETECTION_OPTIONS: FKOption[] = [
  { value: 1, label: "1", descriptionKey: "fmea.detection.v1" },
  { value: 2, label: "2", descriptionKey: "fmea.detection.v2" },
  { value: 3, label: "3", descriptionKey: "fmea.detection.v3" },
  { value: 4, label: "4", descriptionKey: "fmea.detection.v4" },
  { value: 5, label: "5", descriptionKey: "fmea.detection.v5" },
  { value: 6, label: "6", descriptionKey: "fmea.detection.v6" },
  { value: 7, label: "7", descriptionKey: "fmea.detection.v7" },
  { value: 8, label: "8", descriptionKey: "fmea.detection.v8" },
  { value: 9, label: "9", descriptionKey: "fmea.detection.v9" },
  { value: 10, label: "10", descriptionKey: "fmea.detection.v10" },
];

export function calculateFMEA(values: FMEAValues): FMEAResult {
  const rpn = values.severity * values.occurrence * values.detection;
  const { riskClass, labelKey, actionKey, label, action, color } = classifyFMEA(rpn);
  return { score: rpn, rpn, riskClass, labelKey, actionKey, label, action, color, ...values };
}

function classifyFMEA(rpn: number): Pick<RiskResult, "riskClass" | "labelKey" | "actionKey" | "label" | "action" | "color"> {
  if (rpn < 50) return band("fmea", "follow_up", { label: "Acceptable", action: "Current controls sufficient; keep monitoring" }, "#10B981");
  if (rpn < 100) return band("fmea", "low", { label: "Low risk", action: "Plan improvements" }, "#F59E0B");
  if (rpn < 200) return band("fmea", "medium", { label: "Medium risk", action: "Take action; strengthen controls" }, "#F97316");
  if (rpn < 500) return band("fmea", "high", { label: "High risk", action: "Urgent action; consider design change" }, "#DC2626");
  return band("fmea", "critical", { label: "Critical risk", action: "Stop work; perform root cause analysis" }, "#7F1D1D");
}

/* ================================================================== */
/* HAZOP (Hazard and Operability Study)                                */
/* Risk = Severity × Likelihood × (6 - Detectability)                  */
/* ================================================================== */

export interface HAZOPValues {
  severity: number;      // 1-5
  likelihood: number;    // 1-5
  detectability: number; // 1-5 (1=kolay tespit, 5=zor tespit)
  guideWord: string;     // kilavuz kelime
  parameter: string;     // proses parametresi
  deviation: string;     // sapma aciklamasi
}

export interface HAZOPResult extends RiskResult {
  severity: number;
  likelihood: number;
  detectability: number;
}

/** Stored value stays stable for saved assessments; UI uses labelKey with riskScoring. */
export const HAZOP_GUIDE_WORDS: { value: string; labelKey: string }[] = [
  { value: "Yok (No/Not)", labelKey: "hazop.guideWords.noNot" },
  { value: "Az (Less)", labelKey: "hazop.guideWords.less" },
  { value: "Çok (More)", labelKey: "hazop.guideWords.more" },
  { value: "Kısmen (Part of)", labelKey: "hazop.guideWords.partOf" },
  { value: "Tersi (Reverse)", labelKey: "hazop.guideWords.reverse" },
  { value: "Başka (Other than)", labelKey: "hazop.guideWords.otherThan" },
  { value: "Erken (Early)", labelKey: "hazop.guideWords.early" },
  { value: "Geç (Late)", labelKey: "hazop.guideWords.late" },
  { value: "Önce (Before)", labelKey: "hazop.guideWords.before" },
  { value: "Sonra (After)", labelKey: "hazop.guideWords.after" },
];

export const HAZOP_PARAMETERS: { value: string; labelKey: string }[] = [
  { value: "Akış (Flow)", labelKey: "hazop.parameters.flow" },
  { value: "Basınç (Pressure)", labelKey: "hazop.parameters.pressure" },
  { value: "Sıcaklık (Temperature)", labelKey: "hazop.parameters.temperature" },
  { value: "Seviye (Level)", labelKey: "hazop.parameters.level" },
  { value: "Zaman (Time)", labelKey: "hazop.parameters.time" },
  { value: "Kompozisyon (Composition)", labelKey: "hazop.parameters.composition" },
  { value: "pH", labelKey: "hazop.parameters.ph" },
  { value: "Hız (Speed)", labelKey: "hazop.parameters.speed" },
  { value: "Karıştırma (Mixing)", labelKey: "hazop.parameters.mixing" },
  { value: "Reaksiyon (Reaction)", labelKey: "hazop.parameters.reaction" },
];

export function calculateHAZOP(values: HAZOPValues): HAZOPResult {
  const score = values.severity * values.likelihood * (6 - values.detectability);
  const { riskClass, labelKey, actionKey, label, action, color } = classifyHAZOP(score);
  return { score, riskClass, labelKey, actionKey, label, action, color, severity: values.severity, likelihood: values.likelihood, detectability: values.detectability };
}

function classifyHAZOP(score: number): Pick<RiskResult, "riskClass" | "labelKey" | "actionKey" | "label" | "action" | "color"> {
  if (score <= 10) return band("hazop", "follow_up", { label: "Acceptable", action: "Current controls sufficient" }, "#10B981");
  if (score <= 25) return band("hazop", "low", { label: "Low", action: "Plan monitoring and improvements" }, "#F59E0B");
  if (score <= 50) return band("hazop", "medium", { label: "Medium", action: "Evaluate additional protection layers" }, "#F97316");
  if (score <= 75) return band("hazop", "high", { label: "High", action: "Process change or extra barrier required" }, "#DC2626");
  return band("hazop", "critical", { label: "Intolerable", action: "Stop process; revise design" }, "#7F1D1D");
}

/* ================================================================== */
/* Bow-Tie (Papyon Analizi)                                            */
/* Risk = (Threat × Severity) / (1 + Prevention + Mitigation)          */
/* ================================================================== */

export interface BowTieValues {
  threatProbability: number;     // 1-5
  consequenceSeverity: number;   // 1-5
  preventionBarriers: number;    // 0-5 (önleyici bariyer sayısı)
  mitigationBarriers: number;    // 0-5 (azaltıcı bariyer sayısı)
}

export interface BowTieResult extends RiskResult {
  threatProbability: number;
  consequenceSeverity: number;
  preventionBarriers: number;
  mitigationBarriers: number;
  rawRisk: number;
  residualRisk: number;
}

export function calculateBowTie(values: BowTieValues): BowTieResult {
  const rawRisk = values.threatProbability * values.consequenceSeverity;
  const divisor = 1 + values.preventionBarriers + values.mitigationBarriers;
  const residualRisk = rawRisk / divisor;
  const normalized = Math.min(1, residualRisk / 25); // 0-1 arasi normalize
  const { riskClass, labelKey, actionKey, label, action, color } = classifyBowTie(normalized);
  return { score: normalized, rawRisk, residualRisk, riskClass, labelKey, actionKey, label, action, color, ...values };
}

function classifyBowTie(score: number): Pick<RiskResult, "riskClass" | "labelKey" | "actionKey" | "label" | "action" | "color"> {
  if (score <= 0.20) return band("bow_tie", "follow_up", { label: "Acceptable", action: "Barriers adequate; continue monitoring" }, "#10B981");
  if (score <= 0.40) return band("bow_tie", "low", { label: "Low", action: "Review barrier effectiveness" }, "#F59E0B");
  if (score <= 0.60) return band("bow_tie", "medium", { label: "Medium", action: "Add further barriers" }, "#F97316");
  if (score <= 0.80) return band("bow_tie", "high", { label: "High", action: "Urgent barrier reinforcement; review process" }, "#DC2626");
  return band("bow_tie", "critical", { label: "Critical", action: "Stop work; redesign barriers" }, "#7F1D1D");
}

/* ================================================================== */
/* FTA (Fault Tree Analysis — Hata Ağacı)                              */
/* P_system = f(component probabilities, gate type)                    */
/* ================================================================== */

export interface FTAValues {
  components: { name: string; failureRate: number }[]; // failureRate: 0-1
  gateType: "AND" | "OR";
  systemCriticality: number; // 1-5
}

export interface FTAResult extends RiskResult {
  systemProbability: number;
  gateType: "AND" | "OR";
  systemCriticality: number;
  componentCount: number;
}

export function calculateFTA(values: FTAValues): FTAResult {
  const probs = values.components.map(c => Math.max(0.001, Math.min(1, c.failureRate)));
  let systemProbability: number;

  if (values.gateType === "AND") {
    systemProbability = probs.reduce((acc, p) => acc * p, 1);
  } else {
    systemProbability = 1 - probs.reduce((acc, p) => acc * (1 - p), 1);
  }

  const finalScore = Math.min(1, systemProbability * (values.systemCriticality / 5));
  const { riskClass, labelKey, actionKey, label, action, color } = classifyFTA(finalScore);
  return {
    score: finalScore, systemProbability, gateType: values.gateType,
    systemCriticality: values.systemCriticality,
    componentCount: values.components.length,
    riskClass, labelKey, actionKey, label, action, color,
  };
}

function classifyFTA(score: number): Pick<RiskResult, "riskClass" | "labelKey" | "actionKey" | "label" | "action" | "color"> {
  if (score < 0.10) return band("fta", "follow_up", { label: "Acceptable", action: "System reliability adequate" }, "#10B981");
  if (score < 0.30) return band("fta", "low", { label: "Low", action: "Evaluate redundancy / backups" }, "#F59E0B");
  if (score < 0.50) return band("fta", "medium", { label: "Medium", action: "Add redundancy to critical components" }, "#F97316");
  if (score < 0.75) return band("fta", "high", { label: "High", action: "Redesign the system" }, "#DC2626");
  return band("fta", "critical", { label: "Critical", action: "Do not operate; eliminate root causes" }, "#7F1D1D");
}

/* ================================================================== */
/* Checklist (Kontrol Listesi)                                         */
/* Uygunluk % = Σ(puan×ağırlık) / Σ(max×ağırlık) × 100               */
/* ================================================================== */

export interface ChecklistItem {
  id: string;
  text: string;
  status: "uygun" | "uygun_degil" | "kismi" | "na";
  weight: number; // 1-3
}

export interface ChecklistValues {
  items: ChecklistItem[];
  category: string;
}

export interface ChecklistResult extends RiskResult {
  compliancePercent: number;
  totalItems: number;
  compliantCount: number;
  nonCompliantCount: number;
  partialCount: number;
}

export function calculateChecklist(values: ChecklistValues): ChecklistResult {
  const applicable = values.items.filter(i => i.status !== "na");
  let earnedPoints = 0;
  let maxPoints = 0;
  let compliant = 0;
  let nonCompliant = 0;
  let partial = 0;

  for (const item of applicable) {
    maxPoints += 2 * item.weight;
    if (item.status === "uygun") { earnedPoints += 2 * item.weight; compliant++; }
    else if (item.status === "kismi") { earnedPoints += 1 * item.weight; partial++; }
    else { nonCompliant++; }
  }

  const compliancePercent = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 100;
  const { riskClass, labelKey, actionKey, label, action, color } = classifyChecklist(compliancePercent);
  return {
    score: 100 - compliancePercent, // yuksek risk = dusuk uygunluk
    compliancePercent, totalItems: applicable.length,
    compliantCount: compliant, nonCompliantCount: nonCompliant, partialCount: partial,
    riskClass, labelKey, actionKey, label, action, color,
  };
}

function classifyChecklist(percent: number): Pick<RiskResult, "riskClass" | "labelKey" | "actionKey" | "label" | "action" | "color"> {
  if (percent >= 90) return band("checklist", "follow_up", { label: "Compliant", action: "Maintain current practice" }, "#10B981");
  if (percent >= 75) return band("checklist", "low", { label: "Acceptable", action: "Close gaps in the short term" }, "#F59E0B");
  if (percent >= 50) return band("checklist", "medium", { label: "Improvement needed", action: "Prepare a broader improvement plan" }, "#F97316");
  if (percent >= 25) return band("checklist", "high", { label: "Inadequate", action: "Start urgent corrective actions" }, "#DC2626");
  return band("checklist", "critical", { label: "Critically inadequate", action: "Stop activity; full revision" }, "#7F1D1D");
}

/* ================================================================== */
/* JSA (Job Safety Analysis — İş Güvenliği Analizi)                    */
/* Adım Risk = Şiddet × Olasılık / Kontrol Etkinliği                   */
/* ================================================================== */

export interface JSAStep {
  id: string;
  stepDescription: string;
  hazard: string;
  severity: number;       // 1-5
  likelihood: number;     // 1-5
  controlEffectiveness: number; // 1-5 (5=cok etkili)
  controlMeasures: string;
}

export interface JSAValues {
  jobTitle: string;
  steps: JSAStep[];
}

export interface JSAResult extends RiskResult {
  stepScores: { stepId: string; score: number; riskClass: RiskClass }[];
  maxStepScore: number;
  avgStepScore: number;
  highRiskStepCount: number;
}

export function calculateJSA(values: JSAValues): JSAResult {
  const stepScores = values.steps.map(s => {
    const raw = (s.severity * s.likelihood) / Math.max(1, s.controlEffectiveness);
    return { stepId: s.id, score: raw, riskClass: classifyJSAStep(raw) };
  });

  const scores = stepScores.map(s => s.score);
  const maxStepScore = Math.max(0, ...scores);
  const avgStepScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const overallScore = (maxStepScore + avgStepScore) / 2;
  const highRiskStepCount = stepScores.filter(s => s.riskClass === "high" || s.riskClass === "critical").length;

  const { riskClass, labelKey, actionKey, label, action, color } = classifyMatrix(Math.round(overallScore)); // L-Matris siniflandirmasi
  return { score: overallScore, stepScores, maxStepScore, avgStepScore, highRiskStepCount, riskClass, labelKey, actionKey, label, action, color };
}

function classifyJSAStep(score: number): RiskClass {
  if (score <= 1) return "follow_up";
  if (score <= 2) return "low";
  if (score <= 5) return "medium";
  if (score <= 10) return "high";
  return "critical";
}

/* ================================================================== */
/* LOPA (Layer of Protection Analysis)                                 */
/* Mitigated_Freq = Init_Freq × Π(PFD_i)                              */
/* ================================================================== */

export interface LOPALayer {
  id: string;
  name: string;
  pfd: number; // Probability of Failure on Demand (10^-1 to 10^-3)
}

export interface LOPAValues {
  initiatingEventFreq: number;  // yil bazinda frekans (ör: 0.1, 0.01, 0.001)
  consequenceSeverity: number;  // 1-5
  layers: LOPALayer[];
}

export interface LOPAResult extends RiskResult {
  initiatingEventFreq: number;
  mitigatedFreq: number;
  riskReductionFactor: number;
  consequenceSeverity: number;
  layerCount: number;
  meetsTarget: boolean; // tolere edilebilir seviyeye ulasildi mi
}

export const LOPA_INIT_FREQ_OPTIONS: FKOption[] = [
  { value: 1, label: "1", descriptionKey: "lopa.initFreq.v1" },
  { value: 0.1, label: "10⁻¹", descriptionKey: "lopa.initFreq.v0_1" },
  { value: 0.01, label: "10⁻²", descriptionKey: "lopa.initFreq.v0_01" },
  { value: 0.001, label: "10⁻³", descriptionKey: "lopa.initFreq.v0_001" },
  { value: 0.0001, label: "10⁻⁴", descriptionKey: "lopa.initFreq.v0_0001" },
  { value: 0.00001, label: "10⁻⁵", descriptionKey: "lopa.initFreq.v0_00001" },
];

export const LOPA_PFD_OPTIONS: FKOption[] = [
  { value: 0.1, label: "10⁻¹", descriptionKey: "lopa.pfd.v0_1" },
  { value: 0.01, label: "10⁻²", descriptionKey: "lopa.pfd.v0_01" },
  { value: 0.001, label: "10⁻³", descriptionKey: "lopa.pfd.v0_001" },
];

export function calculateLOPA(values: LOPAValues): LOPAResult {
  const totalPFD = values.layers.reduce((acc, l) => acc * l.pfd, 1);
  const mitigatedFreq = values.initiatingEventFreq * totalPFD;
  const riskReductionFactor = totalPFD > 0 ? 1 / totalPFD : 1;
  const severityFactor = values.consequenceSeverity / 5;
  const riskScore = mitigatedFreq * severityFactor;

  // Tolere edilebilir frekans: 10^-5 (yilda)
  const targetFreq = 1e-5;
  const meetsTarget = mitigatedFreq <= targetFreq;

  const { riskClass, labelKey, actionKey, label, action, color } = classifyLOPA(mitigatedFreq);
  return {
    score: riskScore,
    initiatingEventFreq: values.initiatingEventFreq,
    mitigatedFreq, riskReductionFactor,
    consequenceSeverity: values.consequenceSeverity,
    layerCount: values.layers.length,
    meetsTarget,
    riskClass, labelKey, actionKey, label, action, color,
  };
}

function classifyLOPA(freq: number): Pick<RiskResult, "riskClass" | "labelKey" | "actionKey" | "label" | "action" | "color"> {
  if (freq <= 1e-6) return band("lopa", "follow_up", { label: "Acceptable", action: "Current protection layers sufficient" }, "#10B981");
  if (freq <= 1e-5) return band("lopa", "low", { label: "ALARP", action: "As low as reasonably practicable" }, "#F59E0B");
  if (freq <= 1e-4) return band("lopa", "medium", { label: "Improvement needed", action: "Add an extra protection layer" }, "#F97316");
  if (freq <= 1e-3) return band("lopa", "high", { label: "High risk", action: "Multiple layers or process change required" }, "#DC2626");
  return band("lopa", "critical", { label: "Intolerable", action: "Stop process; revise design" }, "#7F1D1D");
}

/* ================================================================== */
/* Yontem Metadata (UI icin)                                           */
/* ================================================================== */

export type AnalysisMethodId = "r_skor" | "fine_kinney" | "l_matrix" | "fmea" | "hazop" | "bow_tie" | "fta" | "checklist" | "jsa" | "lopa";

export interface MethodInfo {
  id: AnalysisMethodId;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  descriptionKey: string;
  tooltipKey: string;
  paramCount: number;
  scoreRange: string;
}

export const METHOD_CATALOG: MethodInfo[] = [
  {
    id: "r_skor", name: "R-SKOR 2D", shortName: "R₂D", icon: "🎯", color: "#6366F1",
    descriptionKey: "methods.r_skor.description",
    tooltipKey: "methods.r_skor.tooltip",
    paramCount: 9, scoreRange: "0–1",
  },
  {
    id: "fine_kinney", name: "Fine-Kinney", shortName: "FK", icon: "⚖️", color: "#8B5CF6",
    descriptionKey: "methods.fine_kinney.description",
    tooltipKey: "methods.fine_kinney.tooltip",
    paramCount: 3, scoreRange: "0.05–10.000",
  },
  {
    id: "l_matrix", name: "L-Tipi Matris", shortName: "5×5", icon: "📊", color: "#EC4899",
    descriptionKey: "methods.l_matrix.description",
    tooltipKey: "methods.l_matrix.tooltip",
    paramCount: 2, scoreRange: "1–25",
  },
  {
    id: "fmea", name: "FMEA", shortName: "FMEA", icon: "🔧", color: "#F59E0B",
    descriptionKey: "methods.fmea.description",
    tooltipKey: "methods.fmea.tooltip",
    paramCount: 3, scoreRange: "1–1000",
  },
  {
    id: "hazop", name: "HAZOP", shortName: "HAZOP", icon: "🏭", color: "#EF4444",
    descriptionKey: "methods.hazop.description",
    tooltipKey: "methods.hazop.tooltip",
    paramCount: 3, scoreRange: "1–125",
  },
  {
    id: "bow_tie", name: "Bow-Tie", shortName: "BT", icon: "🎀", color: "#14B8A6",
    descriptionKey: "methods.bow_tie.description",
    tooltipKey: "methods.bow_tie.tooltip",
    paramCount: 4, scoreRange: "0–1",
  },
  {
    id: "fta", name: "FTA", shortName: "FTA", icon: "🌳", color: "#6366F1",
    descriptionKey: "methods.fta.description",
    tooltipKey: "methods.fta.tooltip",
    paramCount: -1, scoreRange: "0–1",
  },
  {
    id: "checklist", name: "Checklist", shortName: "CL", icon: "✅", color: "#22C55E",
    descriptionKey: "methods.checklist.description",
    tooltipKey: "methods.checklist.tooltip",
    paramCount: -1, scoreRange: "0–100%",
  },
  {
    id: "jsa", name: "JSA", shortName: "JSA", icon: "👷", color: "#F97316",
    descriptionKey: "methods.jsa.description",
    tooltipKey: "methods.jsa.tooltip",
    paramCount: -1, scoreRange: "1–25",
  },
  {
    id: "lopa", name: "LOPA", shortName: "LOPA", icon: "🛡️", color: "#3B82F6",
    descriptionKey: "methods.lopa.description",
    tooltipKey: "methods.lopa.tooltip",
    paramCount: -1, scoreRange: "Logaritmik",
  },
];
