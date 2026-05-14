import { createClient } from "./client";
import { resolveOrganizationId } from "./incident-api";

export type CorrectiveActionStatus = "tracking" | "in_progress" | "on_hold" | "completed" | "overdue";
export type CorrectiveActionPriority = "Düşük" | "Orta" | "Yüksek" | "Kritik";
export type CorrectiveActionUpdateType = "comment" | "progress" | "status_change" | "file_upload";

/**
 * Ishikawa kategorileri — corrective_actions.category sütununda kullanılan
 * sabit küme. DB'de check constraint var: ('insan','makine','metot','malzeme','olcum','cevre').
 */
export type IshikawaCategory = "insan" | "makine" | "metot" | "malzeme" | "olcum" | "cevre";

export type CorrectiveActionRecord = {
  id: string;
  code: string | null;
  organizationId: string;
  companyWorkspaceId: string;
  incidentId: string | null;
  title: string;
  rootCause: string;
  category: string;
  correctiveAction: string;
  preventiveAction: string | null;
  responsibleUserId: string | null;
  responsibleRole: string | null;
  deadline: string;
  status: CorrectiveActionStatus;
  priority: CorrectiveActionPriority;
  completionPercentage: number;
  aiGenerated: boolean;
  ishikawaSnapshot: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  incidentCode?: string | null;
  companyName?: string | null;
};

export type CorrectiveActionUpdateRecord = {
  id: string;
  correctiveActionId: string;
  organizationId: string;
  userId: string | null;
  updateType: CorrectiveActionUpdateType;
  content: string | null;
  fileUrl: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
};

type LooseRow = Record<string, unknown>;

function mapCorrectiveActionRow(row: LooseRow): CorrectiveActionRecord {
  return {
    id: row.id as string,
    code: (row.code as string | null) ?? null,
    organizationId: row.organization_id as string,
    companyWorkspaceId: row.company_workspace_id as string,
    incidentId: (row.incident_id as string | null) ?? null,
    title: row.title as string,
    rootCause: row.root_cause as string,
    category: row.category as string,
    correctiveAction: row.corrective_action as string,
    preventiveAction: (row.preventive_action as string | null) ?? null,
    responsibleUserId: (row.responsible_user_id as string | null) ?? null,
    responsibleRole: (row.responsible_role as string | null) ?? null,
    deadline: row.deadline as string,
    status: row.status as CorrectiveActionStatus,
    priority: row.priority as CorrectiveActionPriority,
    completionPercentage: (row.completion_percentage as number | null) ?? 0,
    aiGenerated: (row.ai_generated as boolean | null) ?? false,
    ishikawaSnapshot: (row.ishikawa_snapshot as Record<string, unknown> | null) ?? {},
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    createdBy: (row.created_by as string | null) ?? null,
    updatedBy: (row.updated_by as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
    incidentCode: ((row.incidents as { incident_code?: string | null } | null) ?? null)?.incident_code ?? null,
    companyName: ((row.company_workspaces as { display_name?: string | null } | null) ?? null)?.display_name ?? null,
  };
}

function mapUpdateRow(row: LooseRow): CorrectiveActionUpdateRecord {
  return {
    id: row.id as string,
    correctiveActionId: row.corrective_action_id as string,
    organizationId: row.organization_id as string,
    userId: (row.user_id as string | null) ?? null,
    updateType: row.update_type as CorrectiveActionUpdateType,
    content: (row.content as string | null) ?? null,
    fileUrl: (row.file_url as string | null) ?? null,
    oldValue: (row.old_value as string | null) ?? null,
    newValue: (row.new_value as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function fetchCorrectiveActions() {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("corrective_actions")
    .select("*, incidents(incident_code), company_workspaces(display_name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("fetchCorrectiveActions:", error.message);
    return [];
  }

  return (data ?? []).map(mapCorrectiveActionRow);
}

export async function fetchCorrectiveActionById(id: string) {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("corrective_actions")
    .select("*, incidents(incident_code), company_workspaces(display_name)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.warn("fetchCorrectiveActionById:", error.message);
    return null;
  }

  return data ? mapCorrectiveActionRow(data) : null;
}

export async function fetchCorrectiveActionUpdates(correctiveActionId: string) {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("corrective_action_updates")
    .select("*")
    .eq("corrective_action_id", correctiveActionId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("fetchCorrectiveActionUpdates:", error.message);
    return [];
  }

  return (data ?? []).map(mapUpdateRow);
}

export async function updateCorrectiveAction(id: string, patch: Partial<CorrectiveActionRecord>) {
  const supabase = createClient();
  if (!supabase) return false;

  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.rootCause !== undefined) update.root_cause = patch.rootCause;
  if (patch.correctiveAction !== undefined) update.corrective_action = patch.correctiveAction;
  if (patch.preventiveAction !== undefined) update.preventive_action = patch.preventiveAction;
  if (patch.responsibleRole !== undefined) update.responsible_role = patch.responsibleRole;
  if (patch.deadline !== undefined) update.deadline = patch.deadline;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.priority !== undefined) update.priority = patch.priority;
  if (patch.completionPercentage !== undefined) update.completion_percentage = patch.completionPercentage;
  if (patch.completedAt !== undefined) update.completed_at = patch.completedAt;
  if (patch.metadata !== undefined) update.metadata = patch.metadata;

  const { error } = await supabase.from("corrective_actions").update(update).eq("id", id);
  if (error) {
    console.warn("updateCorrectiveAction:", error.message);
    return false;
  }
  return true;
}

/* ================================================================== */
/* CREATE FROM RISK FINDING                                             */
/* ================================================================== */

/** Risk kategorisi (fiziksel, kimyasal, vs.) → Ishikawa kategorisi map'i. */
function mapRiskCategoryToIshikawa(riskCategory: string | null | undefined): IshikawaCategory {
  const k = (riskCategory ?? "").toLowerCase().trim();
  if (k === "mekanik" || k === "elektrik") return "makine";
  if (k === "kimyasal" || k === "biyolojik") return "malzeme";
  if (k === "ergonomik" || k === "psikososyal") return "insan";
  if (k === "cevre" || k === "yangin" || k === "trafik") return "cevre";
  // fiziksel + bilinmeyen → metot (süreç/prosedür eksikliği genel kategorisi)
  return "metot";
}

/** Severity → DÖF priority map'i. */
function mapSeverityToPriority(severity: string | null | undefined): CorrectiveActionPriority {
  const s = (severity ?? "").toLowerCase();
  if (s === "critical") return "Kritik";
  if (s === "high") return "Yüksek";
  if (s === "medium") return "Orta";
  return "Düşük";
}

/** Severity → default termin gün sayısı (ne kadar acil). */
function defaultDeadlineDaysFromSeverity(severity: string | null | undefined): number {
  const s = (severity ?? "").toLowerCase();
  if (s === "critical") return 3;
  if (s === "high") return 7;
  if (s === "medium") return 21;
  return 60;
}

export type CreateFromFindingInput = {
  companyWorkspaceId: string;
  findingId: string;
  assessmentId: string;
  findingTitle: string;
  /** Risk kategorisi (fiziksel/kimyasal/vs.) — Ishikawa'ya çevrilir. */
  riskCategoryKey: string;
  severity: string;
  /** AI'in önerisi (varsa) — yoksa generic bir metin üretilir. */
  recommendation?: string | null;
  actionText?: string | null;
  /** Analizin kaynağı — metadata'ya yazılır (ileride filtreleme için). */
  sourceType?: "risk" | "field" | "inspection";
};

/**
 * Bir risk findings'ten direkt DÖF (corrective_action) oluşturur.
 * - incident_id null bırakılır (finding bağlamı metadata'ya yazılır)
 * - code generator trigger'ı tarafından otomatik atanır (DÖF-YYYY-NNN)
 * - termin tarihi severity'ye göre default'lanır (override edilebilir)
 */
export async function createCorrectiveActionFromFinding(
  input: CreateFromFindingInput,
): Promise<CorrectiveActionRecord | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const auth = await resolveOrganizationId();
  if (!auth) {
    console.warn("[corrective-actions] createFromFinding: auth failed");
    return null;
  }

  const ishikawa = mapRiskCategoryToIshikawa(input.riskCategoryKey);
  const priority = mapSeverityToPriority(input.severity);
  const deadlineDays = defaultDeadlineDaysFromSeverity(input.severity);
  const deadline = new Date(Date.now() + deadlineDays * 86400000)
    .toISOString()
    .split("T")[0];

  const correctiveActionText =
    input.actionText?.trim() ||
    input.recommendation?.trim() ||
    `${input.findingTitle} bulgusu için kök neden analizi ve düzeltici aksiyon planı oluşturulması gerekmektedir.`;

  const { data, error } = await supabase
    .from("corrective_actions")
    .insert({
      organization_id: auth.orgId,
      company_workspace_id: input.companyWorkspaceId,
      incident_id: null,
      title: input.findingTitle,
      root_cause: input.recommendation?.trim() || `${input.findingTitle} bulgusunun kök nedeni`,
      category: ishikawa,
      corrective_action: correctiveActionText,
      preventive_action: null,
      deadline,
      status: "tracking",
      priority,
      ai_generated: false,
      metadata: {
        source: "risk_finding",
        finding_id: input.findingId,
        assessment_id: input.assessmentId,
        risk_category_key: input.riskCategoryKey,
        analysis_source_type: input.sourceType ?? "risk",
      },
      created_by: auth.userId,
    })
    .select("*, incidents(incident_code), company_workspaces(display_name)")
    .single();

  if (error || !data) {
    console.warn("createCorrectiveActionFromFinding:", error?.message);
    return null;
  }

  return mapCorrectiveActionRow(data);
}

function mapInspectionCategoryToIshikawa(category: string | null | undefined): IshikawaCategory {
  const k = (category ?? "").toLowerCase();
  if (
    k.includes("elektrik") ||
    k.includes("makine") ||
    k.includes("ekipman") ||
    k.includes("trafik")
  ) {
    return "makine";
  }
  if (k.includes("kimyasal") || k.includes("biyolojik")) return "malzeme";
  if (k.includes("ergonom") || k.includes("kkd") || k.includes("kişisel") || k.includes("insan")) return "insan";
  if (k.includes("yangın") || k.includes("cevre") || k.includes("çevre") || k.includes("acil")) return "cevre";
  if (k.includes("ölçüm")) return "olcum";
  return "metot";
}

function mapInspectionResponseToPriority(status: "uygunsuz" | "kritik"): CorrectiveActionPriority {
  return status === "kritik" ? "Kritik" : "Yüksek";
}

function inspectionDefaultDeadline(
  status: "uygunsuz" | "kritik",
  actionDeadline: string | null | undefined,
): string {
  const trimmed = actionDeadline?.trim();
  if (trimmed) return trimmed;
  const days = status === "kritik" ? 7 : 21;
  return new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
}

export type CreateFromInspectionAnswerInput = {
  companyWorkspaceId: string;
  inspectionRunId: string;
  inspectionRunCode: string | null;
  inspectionAnswerId: string;
  questionId: string;
  questionText: string;
  questionCategory: string | null | undefined;
  responseStatus: "uygunsuz" | "kritik";
  note: string | null | undefined;
  actionTitle: string | null | undefined;
  actionDeadline: string | null | undefined;
};

/**
 * Saha denetimi (inspection) tespitinden DÖF (corrective_action) oluşturur.
 * Olay kaynaklı DÖF'lerden ayrıştırmak için metadata.source = "field_inspection" kullanılır.
 */
export async function createCorrectiveActionFromInspectionAnswer(
  input: CreateFromInspectionAnswerInput,
): Promise<CorrectiveActionRecord | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const auth = await resolveOrganizationId();
  if (!auth) {
    console.warn("[corrective-actions] createFromInspectionAnswer: auth failed");
    return null;
  }

  const ishikawa = mapInspectionCategoryToIshikawa(input.questionCategory);
  const priority = mapInspectionResponseToPriority(input.responseStatus);
  const deadline = inspectionDefaultDeadline(input.responseStatus, input.actionDeadline);

  const titleBase = input.questionText.trim() || "Saha denetimi tespiti";
  const title = titleBase.length > 200 ? `${titleBase.slice(0, 197)}…` : titleBase;

  const rootCause =
    input.note?.trim() ||
    `"${titleBase.slice(0, 120)}${titleBase.length > 120 ? "…" : ""}" maddesi için saha gözlemi.`;

  const correctiveActionText =
    input.actionTitle?.trim() ||
    "Saha denetimi tespitine yönelik düzeltici faaliyet planlanacak ve uygulanacak.";

  const { data, error } = await supabase
    .from("corrective_actions")
    .insert({
      organization_id: auth.orgId,
      company_workspace_id: input.companyWorkspaceId,
      incident_id: null,
      title,
      root_cause: rootCause,
      category: ishikawa,
      corrective_action: correctiveActionText,
      preventive_action: null,
      deadline,
      status: "tracking",
      priority,
      ai_generated: false,
      metadata: {
        source: "field_inspection",
        inspection_run_id: input.inspectionRunId,
        inspection_run_code: input.inspectionRunCode,
        inspection_answer_id: input.inspectionAnswerId,
        question_id: input.questionId,
        response_status: input.responseStatus,
      },
      created_by: auth.userId,
    })
    .select("*, incidents(incident_code), company_workspaces(display_name)")
    .single();

  if (error || !data) {
    console.warn("createCorrectiveActionFromInspectionAnswer:", error?.message);
    return null;
  }

  return mapCorrectiveActionRow(data);
}

export async function addCorrectiveActionUpdate(input: {
  correctiveActionId: string;
  organizationId: string;
  userId?: string | null;
  updateType: CorrectiveActionUpdateType;
  content?: string | null;
  fileUrl?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
}) {
  const supabase = createClient();
  if (!supabase) return false;

  const { error } = await supabase.from("corrective_action_updates").insert({
    corrective_action_id: input.correctiveActionId,
    organization_id: input.organizationId,
    user_id: input.userId ?? null,
    update_type: input.updateType,
    content: input.content ?? null,
    file_url: input.fileUrl ?? null,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
  });

  if (error) {
    console.warn("addCorrectiveActionUpdate:", error.message);
    return false;
  }
  return true;
}
