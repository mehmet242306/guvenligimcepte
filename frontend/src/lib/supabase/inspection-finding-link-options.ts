import { createClient } from "./client";
import type { DecisionTargetTable } from "./inspection-api";

export type InspectionRiskPickRow = {
  id: string;
  title: string;
  subtitle: string;
  targetTable: "risk_assessments";
};

export type InspectionActionPickRow = {
  id: string;
  title: string;
  subtitle: string;
  targetTable: "risk_assessment_findings" | "corrective_actions";
};

export async function listRiskAssessmentsForInspectionLink(
  companyWorkspaceId: string,
): Promise<InspectionRiskPickRow[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("risk_assessments")
    .select("id,title,created_at")
    .eq("company_workspace_id", companyWorkspaceId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.warn("[inspection-finding-link] listRiskAssessments:", error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id as string,
    title: (r.title as string)?.trim() || "—",
    subtitle: "",
    targetTable: "risk_assessments" as const,
  }));
}

/**
 * Açık aksiyon bağlantısı: risk bulgusu (açık) + açık DÖF (corrective_actions).
 * Olay DÖF'ü (incident_dof) ve İSG görevleri şema üzerinde decision_target_table'da yok — listelenmez.
 */
export async function listOpenActionsForInspectionLink(
  companyWorkspaceId: string,
): Promise<InspectionActionPickRow[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data: assessments, error: aErr } = await supabase
    .from("risk_assessments")
    .select("id,title")
    .eq("company_workspace_id", companyWorkspaceId);

  if (aErr) {
    console.warn("[inspection-finding-link] assessments:", aErr.message);
    return [];
  }

  const rows: InspectionActionPickRow[] = [];
  const aList = assessments ?? [];
  const titleByAssessment = new Map(aList.map((a) => [a.id as string, (a.title as string) || ""]));

  if (aList.length > 0) {
    const aIds = aList.map((a) => a.id as string);
    const { data: findings, error: fErr } = await supabase
      .from("risk_assessment_findings")
      .select("id,title,tracking_status,assessment_id")
      .in("assessment_id", aIds)
      .in("tracking_status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(40);

    if (fErr) {
      console.warn("[inspection-finding-link] findings:", fErr.message);
    } else {
      for (const f of findings ?? []) {
        rows.push({
          id: f.id as string,
          title: (f.title as string)?.trim() || "—",
          subtitle: titleByAssessment.get(f.assessment_id as string) || "Risk analizi",
          targetTable: "risk_assessment_findings",
        });
      }
    }
  }

  const { data: caps, error: cErr } = await supabase
    .from("corrective_actions")
    .select("id,code,title,status")
    .eq("company_workspace_id", companyWorkspaceId)
    .in("status", ["tracking", "in_progress", "on_hold"])
    .order("created_at", { ascending: false })
    .limit(40);

  if (cErr) {
    console.warn("[inspection-finding-link] corrective_actions:", cErr.message);
  } else {
    for (const c of caps ?? []) {
      const code = (c.code as string | null)?.trim();
      const title = (c.title as string)?.trim() || "—";
      rows.push({
        id: c.id as string,
        title: code ? `${code} — ${title}` : title,
        subtitle: "DÖF / CAPA",
        targetTable: "corrective_actions",
      });
    }
  }

  return rows;
}

export function inspectionDecisionHref(
  table: DecisionTargetTable | null | undefined,
  targetId: string | null | undefined,
  assessmentIdForFinding?: string | null,
): string | null {
  if (!table || !targetId) return null;
  if (table === "risk_assessments") {
    return `/risk-analysis?loadId=${encodeURIComponent(targetId)}`;
  }
  if (table === "corrective_actions") {
    return `/corrective-actions/${encodeURIComponent(targetId)}`;
  }
  if (table === "risk_assessment_findings") {
    const load = assessmentIdForFinding?.trim();
    if (!load) return null;
    return `/risk-analysis?loadId=${encodeURIComponent(load)}`;
  }
  return null;
}
