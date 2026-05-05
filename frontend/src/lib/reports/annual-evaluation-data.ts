/**
 * Yıllık değerlendirme raporu — firma çalışma alanı için yıl içi özet verisi (Supabase RLS ile).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type AnnualEvaluationFactsheet = {
  year: number;
  companyWorkspaceId: string;
  companyName: string;
  period: { start: string; end: string };
  riskAssessments: { total: number; byStatus: Record<string, number>; samples: Array<{ title: string; status: string | null; created_at: string }> };
  findings: { total: number; bySeverity: Record<string, number>; byTracking: Record<string, number> };
  correctiveActions: { total: number; byStatus: Record<string, number>; open: number };
  incidents: { total: number; byStatus: Record<string, number>; samples: Array<{ code: string | null; type: string | null; date: string | null; severity: string | null }> };
  documents: { total: number };
  inspectionRuns: { total: number; completed: number; avgReadiness: number | null };
  isgTasks: { total: number; byStatus: Record<string, number> };
  trainings: { total: number; completed: number; planned: number };
  periodicControls: { total: number; overdue: number };
  committeeMeetings: { total: number };
};

function inYear(iso: string | null | undefined, year: number): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getUTCFullYear() === year;
}

function yBounds(year: number) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31T23:59:59.999Z`;
  return { start, end };
}

export async function collectAnnualEvaluationFacts(
  supabase: SupabaseClient,
  organizationId: string,
  companyWorkspaceId: string,
  companyName: string,
  year: number,
): Promise<AnnualEvaluationFactsheet> {
  const { start, end } = yBounds(year);

  const countBy = <T extends Record<string, unknown>>(rows: T[], key: keyof T): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const r of rows) {
      const v = String(r[key] ?? "—");
      out[v] = (out[v] ?? 0) + 1;
    }
    return out;
  };

  const [
    risksRes,
    findingsRes,
    dofsRes,
    incidentsRes,
    docsRes,
    runsRes,
    tasksRes,
    trainingsRes,
    controlsRes,
    meetingsRes,
  ] = await Promise.all([
    supabase
      .from("risk_assessments")
      .select("id, title, status, created_at")
      .eq("organization_id", organizationId)
      .eq("company_workspace_id", companyWorkspaceId)
      .gte("created_at", start)
      .lte("created_at", end)
      .limit(800),
    supabase
      .from("risk_assessment_findings")
      .select("id, title, severity, tracking_status, created_at")
      .eq("organization_id", organizationId)
      .eq("company_workspace_id", companyWorkspaceId)
      .gte("created_at", start)
      .lte("created_at", end)
      .limit(2000),
    supabase
      .from("corrective_actions")
      .select("id, title, status, priority, deadline, created_at")
      .eq("organization_id", organizationId)
      .eq("company_workspace_id", companyWorkspaceId)
      .gte("created_at", start)
      .lte("created_at", end)
      .limit(800),
    supabase
      .from("incidents")
      .select("id, incident_code, incident_type, incident_date, severity, status, created_at")
      .eq("organization_id", organizationId)
      .eq("company_workspace_id", companyWorkspaceId)
      .limit(800),
    supabase
      .from("editor_documents")
      .select("id, title, status, created_at, updated_at")
      .eq("organization_id", organizationId)
      .eq("company_workspace_id", companyWorkspaceId)
      .gte("created_at", start)
      .lte("created_at", end)
      .limit(800),
    supabase
      .from("inspection_runs")
      .select("id, code, status, readiness_score, started_at, completed_at")
      .eq("organization_id", organizationId)
      .eq("company_workspace_id", companyWorkspaceId)
      .gte("started_at", start)
      .lte("started_at", end)
      .limit(800),
    supabase
      .from("isg_tasks")
      .select("id, title, status, start_date, end_date, created_at")
      .eq("organization_id", organizationId)
      .eq("company_workspace_id", companyWorkspaceId)
      .limit(1200),
    supabase
      .from("company_trainings")
      .select("id, title, status, training_date, created_at")
      .eq("organization_id", organizationId)
      .eq("company_workspace_id", companyWorkspaceId)
      .limit(800),
    supabase
      .from("company_periodic_controls")
      .select("id, title, status, next_inspection_date, inspection_date, created_at")
      .eq("organization_id", organizationId)
      .eq("company_workspace_id", companyWorkspaceId)
      .limit(800),
    supabase
      .from("company_committee_meetings")
      .select("id, meeting_number, status, meeting_date, created_at")
      .eq("organization_id", organizationId)
      .eq("company_workspace_id", companyWorkspaceId)
      .limit(200),
  ]);

  const risks = (risksRes.data ?? []) as Array<{ id: string; title: string; status: string | null; created_at: string }>;

  const findingsRaw = (findingsRes.data ?? []) as Array<{
    id: string;
    title: string;
    severity: string | null;
    tracking_status: string | null;
    created_at: string;
  }>;

  const dofs = (dofsRes.data ?? []) as Array<{ id: string; title: string; status: string | null; created_at: string }>;
  let incidents = (incidentsRes.data ?? []) as Array<{
    id: string;
    incident_code: string | null;
    incident_type: string | null;
    incident_date: string | null;
    severity: string | null;
    status: string | null;
    created_at: string;
  }>;
  incidents = incidents.filter((i) => inYear(i.incident_date, year) || inYear(i.created_at, year));

  const docs = (docsRes.data ?? []) as Array<{ id: string; created_at: string }>;
  const runs = (runsRes.data ?? []) as Array<{
    id: string;
    status: string | null;
    readiness_score: number | null;
    started_at: string;
  }>;
  let tasks = (tasksRes.data ?? []) as Array<{ id: string; status: string | null; start_date: string | null; created_at: string }>;
  tasks = tasks.filter((t) => inYear(t.start_date, year) || inYear(t.created_at, year));

  let trainings = (trainingsRes.data ?? []) as Array<{ id: string; status: string | null; training_date: string | null; created_at: string }>;
  trainings = trainings.filter((t) => inYear(t.training_date, year) || inYear(t.created_at, year));

  let controls = (controlsRes.data ?? []) as Array<{
    id: string;
    status: string | null;
    next_inspection_date: string | null;
    created_at: string;
  }>;
  controls = controls.filter((c) => inYear(c.created_at, year));

  let meetings = (meetingsRes.data ?? []) as Array<{ id: string; meeting_date: string | null; created_at: string }>;
  meetings = meetings.filter((m) => inYear(m.meeting_date, year) || inYear(m.created_at, year));

  const today = new Date().toISOString().slice(0, 10);
  const overdueControls = controls.filter((c) => c.next_inspection_date && c.next_inspection_date < today).length;

  const readinessScores = runs.map((r) => r.readiness_score).filter((n): n is number => typeof n === "number" && !Number.isNaN(n));
  const avgReadiness =
    readinessScores.length > 0 ? Math.round((readinessScores.reduce((a, b) => a + b, 0) / readinessScores.length) * 10) / 10 : null;

  return {
    year,
    companyWorkspaceId,
    companyName,
    period: { start, end },
    riskAssessments: {
      total: risks.length,
      byStatus: countBy(risks, "status"),
      samples: risks.slice(0, 15).map((r) => ({ title: r.title, status: r.status, created_at: r.created_at })),
    },
    findings: {
      total: findingsRaw.length,
      bySeverity: countBy(findingsRaw, "severity"),
      byTracking: countBy(findingsRaw, "tracking_status"),
    },
    correctiveActions: {
      total: dofs.length,
      byStatus: countBy(dofs, "status"),
      open: dofs.filter((d) => {
        const s = (d.status ?? "").toLowerCase();
        return !/(closed|completed|verified|kapali|iptal|cancelled)/.test(s);
      }).length,
    },
    incidents: {
      total: incidents.length,
      byStatus: countBy(incidents, "status"),
      samples: incidents.slice(0, 12).map((i) => ({
        code: i.incident_code,
        type: i.incident_type,
        date: i.incident_date,
        severity: i.severity,
      })),
    },
    documents: { total: docs.length },
    inspectionRuns: {
      total: runs.length,
      completed: runs.filter((r) => r.status === "completed").length,
      avgReadiness,
    },
    isgTasks: {
      total: tasks.length,
      byStatus: countBy(tasks, "status"),
    },
    trainings: {
      total: trainings.length,
      completed: trainings.filter((t) => t.status === "completed").length,
      planned: trainings.filter((t) => t.status === "planned").length,
    },
    periodicControls: {
      total: controls.length,
      overdue: overdueControls,
    },
    committeeMeetings: { total: meetings.length },
  };
}
