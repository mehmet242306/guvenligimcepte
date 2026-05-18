import { createClient } from "@/lib/supabase/server";
import type {
  ExportFinding,
  ExportImageSection,
  ExportParticipant,
  RiskAnalysisExportData,
  SceneType,
} from "@/lib/risk-analysis-export";
import { buildRiskAnalysisReportJson, type RiskReportJson } from "@/lib/risk-analysis/report-json";
import { formatFineKinneyBlock, formatMatrixBlock, riskClassLabelTr } from "@/lib/risk-analysis/finding-quality";

type DbRow = Record<string, any>;

function asText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function methodLabel(method: string): string {
  if (method === "fine_kinney") return "Fine-Kinney";
  if (method === "l_matrix") return "L Tipi Matris";
  if (method === "r_skor" || method === "r_skor_2d") return "R Skor 2D";
  return method || "Risk Metodu";
}

function riskClassFromScore(score: number): string {
  if (score >= 400) return "critical";
  if (score >= 200) return "high";
  if (score >= 70) return "medium";
  if (score > 0) return "low";
  return "follow_up";
}

function scoreFromFinding(finding: DbRow, method: string): { score: number; riskClass: string; detail?: string } {
  if (method === "fine_kinney") {
    const fk = finding.fk_values ?? {};
    const p = Number(fk.likelihood ?? 1);
    const f = Number(fk.exposure ?? 1);
    const s = Number(fk.severity ?? 1);
    const score = Number((finding.fk_result as Record<string, unknown> | null)?.score ?? p * f * s);
    const riskClass = asText((finding.fk_result as Record<string, unknown> | null)?.riskClass, riskClassFromScore(score));
    return {
      score,
      riskClass,
      detail: formatFineKinneyBlock({ likelihood: p, exposure: f, severity: s, score, riskClass }),
    };
  }

  if (method === "l_matrix") {
    const matrix = finding.matrix_values ?? {};
    const likelihood = Number(matrix.likelihood ?? 1);
    const severity = Number(matrix.severity ?? 1);
    const score = Number((finding.matrix_result as Record<string, unknown> | null)?.score ?? likelihood * severity);
    const riskClass = asText((finding.matrix_result as Record<string, unknown> | null)?.riskClass, riskClassFromScore(score * 20));
    return {
      score,
      riskClass,
      detail: formatMatrixBlock({ likelihood, severity, score, riskClass }),
    };
  }

  const score = Number((finding.r2d_result as Record<string, unknown> | null)?.score ?? 0);
  return { score, riskClass: riskClassFromScore(score) };
}

function dataUrlFromSignedUrl(url: string): Promise<string> {
  return fetch(url)
    .then(async (response) => {
      if (!response.ok) return "";
      const contentType = response.headers.get("content-type") || "image/jpeg";
      const buffer = Buffer.from(await response.arrayBuffer());
      return `data:${contentType};base64,${buffer.toString("base64")}`;
    })
    .catch(() => "");
}

function mapParticipants(value: unknown): ExportParticipant[] {
  if (!Array.isArray(value)) return [];
  return value.map((participant) => {
    const item = participant as Record<string, unknown>;
    return {
      fullName: asText(item.fullName ?? item.full_name ?? item.name),
      role: asText(item.role ?? item.roleCode ?? item.role_code),
      title: asText(item.title),
      certificateNo: asText(item.certificateNo ?? item.certificate_no),
    };
  });
}

async function loadCompanyInfo(supabase: Awaited<ReturnType<typeof createClient>>, companyWorkspaceId: string | null) {
  if (!companyWorkspaceId) return { companyName: "", companySector: "", companyHazardClass: "", companyAddress: "" };

  const { data: workspace } = await supabase
    .from("company_workspaces")
    .select("company_identity_id, display_name")
    .eq("id", companyWorkspaceId)
    .maybeSingle();

  if (!workspace?.company_identity_id) {
    return { companyName: asText(workspace?.display_name), companySector: "", companyHazardClass: "", companyAddress: "" };
  }

  const { data: identity } = await supabase
    .from("company_identities")
    .select("official_name, sector, hazard_class, address, city")
    .eq("id", workspace.company_identity_id)
    .maybeSingle();

  return {
    companyName: asText(identity?.official_name, asText(workspace.display_name)),
    companySector: asText(identity?.sector),
    companyHazardClass: asText(identity?.hazard_class),
    companyAddress: [identity?.address, identity?.city].filter(Boolean).join(" "),
  };
}

export async function loadRiskAnalysisExportDataFromDb(
  reportId: string,
  options: { includeImageDataUrls?: boolean } = {},
): Promise<RiskAnalysisExportData | null> {
  const supabase = await createClient();
  const [
    { data: assessment },
    { data: rows },
    { data: images },
    { data: findings },
  ] = await Promise.all([
    supabase.from("risk_assessments").select("*").eq("id", reportId).maybeSingle(),
    supabase.from("risk_assessment_rows").select("*").eq("assessment_id", reportId).order("sort_order"),
    supabase.from("risk_assessment_images").select("*").eq("assessment_id", reportId).order("sort_order"),
    supabase.from("risk_assessment_findings").select("*").eq("assessment_id", reportId).order("sort_order"),
  ]);

  if (!assessment) return null;

  const company = await loadCompanyInfo(supabase, assessment.company_workspace_id ?? null);
  const signedUrls: Record<string, string> = {};
  const imageRows = (images ?? []) as DbRow[];
  if (imageRows.length > 0) {
    const { data: signed } = await supabase.storage
      .from("risk-images")
      .createSignedUrls(imageRows.map((image) => image.storage_path), 3600);
    signed?.forEach((item, index) => {
      if (item.signedUrl) signedUrls[imageRows[index].id] = item.signedUrl;
    });
  }

  const imageDataUrls: Record<string, string> = {};
  if (options.includeImageDataUrls) {
    await Promise.all(
      imageRows.map(async (image) => {
        const url = signedUrls[image.id];
        imageDataUrls[image.id] = url ? await dataUrlFromSignedUrl(url) : "";
      }),
    );
  }

  const method = asText(assessment.method, "fine_kinney");
  const sourceType = assessment.analysis_type === "FIELD_ANALYSIS" ? "field_analysis" : "risk_analysis";
  const dbRows = (rows ?? []) as DbRow[];
  const dbFindings = (findings ?? []) as DbRow[];
  const imageSections: ExportImageSection[] = [];
  const exportFindings: ExportFinding[] = [];

  let imageIndex = 0;
  for (const row of dbRows) {
    const rowImages = imageRows.filter((image) => image.row_id === row.id);
    for (const image of rowImages) {
      imageIndex += 1;
      const imageFindings = dbFindings.filter((finding) => finding.image_id === image.id);
      const mappedFindings = imageFindings.map((finding, findingIndex) => {
        const score = scoreFromFinding(finding, method);
        const exportFinding: ExportFinding = {
          rowTitle: asText(row.title),
          imageId: image.id,
          riskCode: `G${imageIndex}-R${findingIndex + 1}`,
          title: asText(finding.title),
          category: asText(finding.category, "Genel"),
          severity: asText(finding.severity, score.riskClass),
          severityLabel: riskClassLabelTr(score.riskClass),
          score: score.score,
          scoreLabel: String(Math.round(score.score)),
          riskClass: score.riskClass,
          action: asText(finding.action_text),
          recommendation: asText(finding.recommendation),
          confidence: Number(finding.confidence ?? 0),
          isManual: Boolean(finding.is_manual),
          correctiveActionRequired: Boolean(finding.corrective_action_required),
          method,
          methodLabel: methodLabel(method),
          scoreDetail: score.detail,
          fkDetails: method === "fine_kinney" ? {
            likelihood: Number(finding.fk_values?.likelihood ?? 1),
            severity: Number(finding.fk_values?.severity ?? 1),
            exposure: Number(finding.fk_values?.exposure ?? 1),
          } : undefined,
          matrixDetails: method === "l_matrix" ? {
            likelihood: Number(finding.matrix_values?.likelihood ?? 1),
            severity: Number(finding.matrix_values?.severity ?? 1),
          } : undefined,
          legalReferences: Array.isArray(finding.legal_references) ? finding.legal_references : [],
          observedEvidence: asText(finding.action_text || finding.recommendation),
          possibleOutcome: "",
          currentControl: "",
          confidenceLevelTr: Number(finding.confidence ?? 0) >= 0.85 ? "Yüksek" : "Saha doğrulaması önerilir",
          immediateAction: asText(finding.action_text),
          correctiveAction: asText(finding.recommendation),
          preventiveAction: "",
          responsible: "İSG uzmanı / alan sorumlusu (atanacak)",
          deadline: Boolean(finding.corrective_action_required) ? "7 gün içinde" : "30 gün içinde",
          completionProof: "Fotoğraf, tutanak, kontrol listesi",
          residualRiskNote: "Önlemler uygulandıktan sonra yeniden değerlendirme gerekir",
        };
        exportFindings.push(exportFinding);
        return exportFinding;
      });

      imageSections.push({
        imageIndex,
        imageId: image.id,
        fileName: asText(image.file_name, `Görsel ${imageIndex}`),
        rowTitle: asText(row.title, `Görsel ${imageIndex}`),
        areaLocation: asText(row.description || row.title, `Görsel ${imageIndex}`),
        analysisStatus: "success",
        analysisStatusLabel: "Başarılı",
        findingCount: mappedFindings.length,
        dataUrl: options.includeImageDataUrls ? imageDataUrls[image.id] : signedUrls[image.id],
        riskCount: mappedFindings.length,
        sceneType: "workplace" as SceneType,
        zeroRiskAllowed: mappedFindings.length === 0,
        isgKapsamindaMi: true,
        scopeDecision: "analyze",
        scopeReason: "Kayıtlı risk analizi görseli İSG kapsamı içinde değerlendirilmiştir.",
        findings: mappedFindings,
      });
    }
  }

  const criticalCount = exportFindings.filter((finding) => finding.riskClass === "critical" || finding.riskClass === "high").length;

  return {
    reportId: assessment.id,
    organizationId: asText(assessment.organization_id),
    companyId: asText(assessment.company_workspace_id),
    sourceType,
    preparedBy: mapParticipants(assessment.participants).map((participant) => participant.fullName).filter(Boolean).join(", "),
    status: asText(assessment.status, "completed"),
    analysisTitle: asText(assessment.title, "Saha Risk Analizi Raporu"),
    analysisNote: asText(assessment.analysis_note),
    companyName: company.companyName,
    companyKind: "",
    companySector: company.companySector,
    companyHazardClass: company.companyHazardClass,
    companyAddress: company.companyAddress,
    companyLogoUrl: "",
    location: asText(assessment.location_text || assessment.workplace_name),
    department: asText(assessment.department_name),
    method,
    methodLabel: methodLabel(method),
    participants: mapParticipants(assessment.participants),
    findings: exportFindings,
    images: imageSections.map((section) => ({
      imageId: section.imageId,
      rowTitle: section.rowTitle,
      dataUrl: section.dataUrl ?? "",
      fileName: section.fileName,
      findingCount: section.findingCount,
      imageRelevance: "relevant",
      imageDescription: section.areaLocation,
      areaSummary: section.areaLocation,
      photoQuality: "good",
      analysisStatus: "success",
      imageAnalysisStatus: "success",
      riskCount: section.riskCount,
      sceneType: "workplace",
      zeroRiskAllowed: section.zeroRiskAllowed,
      isgKapsamindaMi: true,
      scopeDecision: "analyze",
      scopeReason: section.scopeReason,
    })),
    imageSections,
    totalFindings: exportFindings.length,
    realTotalFindings: exportFindings.length,
    criticalCount,
    dofCandidateCount: exportFindings.filter((finding) => finding.correctiveActionRequired).length,
    date: asText(assessment.assessment_date, new Date().toLocaleDateString("tr-TR")),
  };
}

export async function loadRiskAnalysisReportJsonFromDb(reportId: string): Promise<RiskReportJson | null> {
  const data = await loadRiskAnalysisExportDataFromDb(reportId, { includeImageDataUrls: false });
  return data ? buildRiskAnalysisReportJson(data) : null;
}
