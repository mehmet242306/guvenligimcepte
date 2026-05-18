import type { ExportFinding, ExportImageSection, RiskAnalysisExportData } from "@/lib/risk-analysis-export";
import { findingActionText, findingLegalText, resolveExportImageSections } from "@/lib/risk-analysis/field-export-sections";
import { isReportIncomplete } from "@/lib/risk-analysis/field-report-validity";

export type RiskReportMethod = "fine_kinney" | "l_matrix" | "r_skor_2d";
export type RiskReportSourceType = "risk_analysis" | "field_analysis";
export type RiskReportScopeStatus = "in_scope" | "out_of_scope";
export type RiskReportAnnotation = {
  type: "box" | "polygon" | "point";
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: Array<{ x: number; y: number }>;
};

export type RiskReportFinding = {
  findingCode: string;
  title: string;
  category: string;
  observedEvidence: string;
  possibleConsequence: string;
  probability: number | null;
  frequency: number | null;
  severity: number | null;
  score: number;
  riskClass: string;
  confidence: string;
  existingControls: string;
  emergencyAction: string;
  correctiveAction: string;
  preventiveAction: string;
  verificationNeeds: string;
  responsiblePerson: string;
  deadline: string;
  completionEvidence: string;
  residualRisk: string;
  legalContext: string;
  annotation: RiskReportAnnotation | null;
};

export type RiskReportImage = {
  imageCode: string;
  fileName: string;
  imageUrl: string;
  optimizedImageUrl: string;
  sceneType: string;
  scopeStatus: RiskReportScopeStatus;
  analysisStatus: string;
  scopeReason: string;
  sceneDescription: string;
  findings: RiskReportFinding[];
};

export type RiskReportJson = {
  reportMeta: {
    reportId: string;
    organizationId: string;
    companyId: string;
    sourceType: RiskReportSourceType;
    method: RiskReportMethod;
    title: string;
    companyName: string;
    locationName: string;
    departmentName: string;
    reportDate: string;
    preparedBy: string;
    status: string;
  };
  summary: {
    totalImages: number;
    inScopeImages: number;
    outOfScopeImages: number;
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    immediateActionCount: number;
  };
  images: RiskReportImage[];
  actions: string[];
  verificationChecklist: string[];
  legalReferences: string[];
  approvals: Array<{ role: string; fullName: string; title: string; date: string; signature: string }>;
};

function text(value: unknown, fallback = "-"): string {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function cleanProfessionalText(value: unknown, fallback = "-"): string {
  const raw = text(value, fallback);
  return raw
    .replace(/Doğrudan doğrulanmış kaynak bulunamadı\.?/gi, "Saha doğrulaması önerilir.")
    .replace(/dogrudan dogrulanmis kaynak bulunamadi\.?/gi, "Saha doğrulaması önerilir.")
    .replace(/kaynak bulunamad[ıi]\.?/gi, "Saha doğrulaması önerilir.")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMethod(method: string): RiskReportMethod {
  if (method === "l_matrix") return "l_matrix";
  if (method === "r_skor" || method === "r_skor_2d") return "r_skor_2d";
  return "fine_kinney";
}

function isOutOfScope(section: ExportImageSection): boolean {
  return section.scopeDecision === "exclude" || section.sceneType === "non_workplace" || section.isgKapsamindaMi === false;
}

function uniqueClean(items: Array<string | undefined | null>, limit = 80): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const cleaned = cleanProfessionalText(item, "").replace(/^\d+[\.)]\s*/, "").trim();
    const key = cleaned.toLocaleLowerCase("tr-TR");
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= limit) break;
  }
  return out;
}

function normalizeRiskClass(value: unknown): string {
  const raw = String(value || "").trim().toLocaleLowerCase("tr-TR");
  if (["critical", "kritik", "çok yüksek", "cok yuksek"].includes(raw)) return "critical";
  if (["high", "yüksek", "yuksek"].includes(raw)) return "high";
  if (["medium", "orta"].includes(raw)) return "medium";
  if (["low", "düşük", "dusuk", "follow_up", "izleme"].includes(raw)) return raw === "follow_up" ? "follow_up" : "low";
  return raw || "low";
}

function normalizeAnnotation(value: unknown): RiskReportAnnotation | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const type = item.type === "polygon" || item.type === "point" || item.type === "box" ? item.type : null;
  if (!type) return null;
  const num = (key: string) => {
    const n = Number(item[key]);
    return Number.isFinite(n) ? n : undefined;
  };
  const points = Array.isArray(item.points)
    ? item.points
        .map((point) => {
          const p = point as Record<string, unknown>;
          const x = Number(p.x);
          const y = Number(p.y);
          return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
        })
        .filter((point): point is { x: number; y: number } => Boolean(point))
    : undefined;
  return {
    type,
    x: num("x"),
    y: num("y"),
    width: num("width"),
    height: num("height"),
    points,
  };
}

function mapFinding(finding: ExportFinding, fallbackCode: string): RiskReportFinding {
  const riskClass = normalizeRiskClass(finding.riskClass);
  return {
    findingCode: text(finding.riskCode, fallbackCode),
    title: cleanProfessionalText(finding.title),
    category: cleanProfessionalText(finding.category),
    observedEvidence: cleanProfessionalText(finding.observedEvidence),
    possibleConsequence: cleanProfessionalText(finding.possibleOutcome),
    probability: finding.fkDetails?.likelihood ?? finding.matrixDetails?.likelihood ?? null,
    frequency: finding.fkDetails?.exposure ?? null,
    severity: finding.fkDetails?.severity ?? finding.matrixDetails?.severity ?? null,
    score: Math.round(Number(finding.score) || 0),
    riskClass,
    confidence: cleanProfessionalText(finding.confidenceLevelTr ?? finding.confidence),
    existingControls: cleanProfessionalText(finding.currentControl),
    emergencyAction: cleanProfessionalText(finding.immediateAction ?? findingActionText(finding)),
    correctiveAction: cleanProfessionalText(finding.correctiveAction ?? finding.recommendation),
    preventiveAction: cleanProfessionalText(finding.preventiveAction),
    verificationNeeds: cleanProfessionalText(finding.verificationNeeded),
    responsiblePerson: cleanProfessionalText(finding.responsible),
    deadline: cleanProfessionalText(finding.deadline),
    completionEvidence: cleanProfessionalText(finding.completionProof),
    residualRisk: cleanProfessionalText(finding.residualRiskNote),
    legalContext: cleanProfessionalText(findingLegalText(finding)),
    annotation: normalizeAnnotation((finding as unknown as Record<string, unknown>).annotation),
  };
}

export function buildRiskAnalysisReportJson(data: RiskAnalysisExportData): RiskReportJson {
  const sections = resolveExportImageSections(data);
  const images = sections.map((section) => {
    const imageCode = `G${section.imageIndex}`;
    const scopeStatus: RiskReportScopeStatus = isOutOfScope(section) ? "out_of_scope" : "in_scope";
    const findings =
      scopeStatus === "out_of_scope"
        ? []
        : section.findings.map((finding, index) => mapFinding(finding, `${imageCode}-R${index + 1}`));

    return {
      imageCode,
      fileName: text(section.fileName, imageCode),
      imageUrl: section.dataUrl ?? "",
      optimizedImageUrl: section.dataUrl ?? "",
      sceneType: text(section.sceneType, "unknown"),
      scopeStatus,
      analysisStatus: text(section.imageAnalysisStatus ?? section.analysisStatus),
      scopeReason: cleanProfessionalText(section.scopeReason),
      sceneDescription: cleanProfessionalText(section.areaLocation || section.rowTitle),
      findings,
    };
  });

  const findings = images.flatMap((image) => image.findings);
  const actions = uniqueClean([
    ...findings.map((finding) => finding.emergencyAction),
    ...findings.map((finding) => finding.correctiveAction),
  ], 40);
  const verificationChecklist = uniqueClean([
    ...findings.map((finding) => finding.verificationNeeds),
    ...sections.flatMap((section) => section.imageLimitations ?? []),
    ...sections.flatMap((section) => section.documentCheckItems ?? []),
    ...sections.flatMap((section) => section.failureRecoveryActions ?? []),
  ], 60);
  const legalReferences = uniqueClean(findings.map((finding) => finding.legalContext), 60);
  const criticalCount = findings.filter((finding) => finding.riskClass === "critical").length;
  const highCount = findings.filter((finding) => finding.riskClass === "high").length;
  const mediumCount = findings.filter((finding) => finding.riskClass === "medium").length;
  const lowCount = findings.filter((finding) => finding.riskClass === "low" || finding.riskClass === "follow_up").length;

  return {
    reportMeta: {
      reportId: text(data.reportId || data.shareUrl || `${data.companyName}-${data.date}`),
      organizationId: text(data.organizationId),
      companyId: text(data.companyId),
      sourceType: data.sourceType ?? "risk_analysis",
      method: normalizeMethod(data.method),
      title: text(data.analysisTitle, "Saha Risk Analizi Raporu"),
      companyName: text(data.companyName),
      locationName: text(data.location),
      departmentName: text(data.department),
      reportDate: text(data.date),
      preparedBy: text(data.preparedBy, data.participants.map((participant) => text(participant.fullName, "")).filter(Boolean).join(", ") || "-"),
      status: text(data.status, data.reportIncomplete ?? isReportIncomplete(data) ? "Eksik analiz / doğrulama gerekli" : "Teslim edilebilir"),
    },
    summary: {
      totalImages: images.length,
      inScopeImages: images.filter((image) => image.scopeStatus === "in_scope").length,
      outOfScopeImages: images.filter((image) => image.scopeStatus === "out_of_scope").length,
      totalFindings: findings.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      immediateActionCount: findings.filter((finding) => finding.riskClass === "critical" || finding.riskClass === "high").length,
    },
    images,
    actions,
    verificationChecklist,
    legalReferences,
    approvals: [
      {
        role: "Hazırlayan",
        fullName: text(data.participants[0]?.fullName, ""),
        title: text(data.participants[0]?.title || data.participants[0]?.role, ""),
        date: text(data.date, ""),
        signature: "",
      },
      { role: "Kontrol eden", fullName: "", title: "", date: "", signature: "" },
      { role: "İşveren / İşveren vekili", fullName: "", title: "", date: "", signature: "" },
    ],
  };
}
