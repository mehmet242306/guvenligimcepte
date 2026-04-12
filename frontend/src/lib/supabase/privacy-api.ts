import { createClient } from "./client";
import { logKvkkApiError } from "./kvkk-api-utils";

export type DataDeletionRequestRow = {
  id: string;
  target_user_id: string;
  organization_id: string | null;
  requested_by: string | null;
  request_scope: "self" | "admin";
  target_full_name: string | null;
  target_email: string | null;
  requested_by_name: string | null;
  requested_by_email: string | null;
  reason: string | null;
  status: "scheduled" | "processing" | "completed" | "cancelled" | "rejected";
  requested_at: string;
  acknowledged_at: string | null;
  scheduled_purge_at: string;
  processed_at: string | null;
  completed_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  admin_notes: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type DataExportRow = {
  id: string;
  target_user_id: string;
  organization_id: string | null;
  requested_by: string | null;
  request_scope: "self" | "admin";
  export_format: "json" | "csv";
  status: "completed" | "failed" | "expired";
  target_full_name: string | null;
  target_email: string | null;
  requested_by_name: string | null;
  requested_by_email: string | null;
  file_name: string;
  requested_at: string;
  completed_at: string | null;
  expires_at: string | null;
  last_downloaded_at: string | null;
  download_count: number;
  error_message: string | null;
};

export type RetentionPolicyRow = {
  id: string;
  entity_type: string;
  retention_days: number;
  action: "delete" | "anonymize";
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RetentionExecutionRow = {
  id: string;
  policy_id: string | null;
  entity_type: string;
  action: string;
  status: "completed" | "failed" | "skipped";
  affected_count: number;
  details: Record<string, unknown>;
  executed_at: string;
};

export type MaskingEventRow = {
  id: string;
  organization_id: string | null;
  company_workspace_id: string | null;
  actor_user_id: string | null;
  source_context: "live_scan" | "photo_upload" | "vision_capture" | "manual_redaction";
  media_type: "frame" | "image" | "video";
  masking_status: "masked" | "skipped" | "failed";
  detected_faces: number;
  detected_plates: number;
  detected_identity_cards: number;
  original_persisted: boolean;
  details: Record<string, unknown>;
  processed_at: string;
  created_at: string;
};

export type InternationalTransferRow = {
  id: string;
  organization_id: string | null;
  company_workspace_id: string | null;
  actor_user_id: string | null;
  provider: string;
  destination_region: string;
  destination_country: string | null;
  transfer_context: "claude_vision" | "claude_chat" | "ai_document" | "mevzuat_rag" | "manual_export";
  reason: string;
  data_category: string;
  legal_basis_version: string | null;
  payload_reference: string | null;
  frame_count: number;
  details: Record<string, unknown>;
  created_at: string;
};

export type BreachNotificationTemplateRow = {
  id: string;
  title: string;
  notification_window_hours: number;
  summary: string | null;
  authority_template: string;
  customer_template: string;
  internal_checklist: string[];
  notification_contacts: Array<Record<string, unknown>>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BreachIncidentRow = {
  id: string;
  organization_id: string | null;
  company_workspace_id: string | null;
  reported_by: string | null;
  owner_user_id: string | null;
  template_id: string | null;
  title: string;
  summary: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "notification_prepared" | "notified" | "closed";
  detected_at: string;
  reported_at: string;
  authority_notification_due_at: string | null;
  authority_notified_at: string | null;
  customer_notified_at: string | null;
  requires_authority_notification: boolean;
  transfer_related: boolean;
  affected_subject_count: number;
  data_categories: string[];
  affected_systems: string[];
  actions_taken: string | null;
  evidence_notes: string | null;
  created_at: string;
  updated_at: string;
};

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string" ? payload.error : "Istek basarisiz oldu.",
    );
  }

  return payload as T;
}

export async function listOwnDeletionRequests(): Promise<DataDeletionRequestRow[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("data_deletion_requests")
    .select("*")
    .order("requested_at", { ascending: false });

  if (error) {
    logKvkkApiError("[privacy-api] listOwnDeletionRequests:", error);
    return [];
  }

  return (data ?? []) as DataDeletionRequestRow[];
}

export async function listOwnDataExports(): Promise<DataExportRow[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("data_exports")
    .select("id, target_user_id, organization_id, requested_by, request_scope, export_format, status, target_full_name, target_email, requested_by_name, requested_by_email, file_name, requested_at, completed_at, expires_at, last_downloaded_at, download_count, error_message")
    .order("requested_at", { ascending: false });

  if (error) {
    logKvkkApiError("[privacy-api] listOwnDataExports:", error);
    return [];
  }

  return (data ?? []) as DataExportRow[];
}

export async function requestSelfDeletion(reason: string) {
  const response = await fetch("/api/privacy/delete-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });

  return parseApiResponse<{ request: DataDeletionRequestRow }>(response);
}

export async function requestDataExport(format: "json" | "csv", targetUserId?: string) {
  const response = await fetch("/api/privacy/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format, targetUserId: targetUserId ?? null }),
  });

  return parseApiResponse<{ exportId: string; fileName: string }>(response);
}

export async function downloadDataExport(exportId: string) {
  const response = await fetch(`/api/privacy/exports/${exportId}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      typeof payload?.error === "string" ? payload.error : "Export indirilemedi.",
    );
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/i);
  return {
    blob,
    fileName: match?.[1] ?? `risknova-export-${exportId}.json`,
  };
}

export async function listDeletionRequestsForAdmin(): Promise<DataDeletionRequestRow[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("data_deletion_requests")
    .select("*")
    .order("requested_at", { ascending: false });

  if (error) {
    logKvkkApiError("[privacy-api] listDeletionRequestsForAdmin:", error);
    return [];
  }

  return (data ?? []) as DataDeletionRequestRow[];
}

export async function listDataExportsForAdmin(): Promise<DataExportRow[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("data_exports")
    .select("id, target_user_id, organization_id, requested_by, request_scope, export_format, status, target_full_name, target_email, requested_by_name, requested_by_email, file_name, requested_at, completed_at, expires_at, last_downloaded_at, download_count, error_message")
    .order("requested_at", { ascending: false });

  if (error) {
    logKvkkApiError("[privacy-api] listDataExportsForAdmin:", error);
    return [];
  }

  return (data ?? []) as DataExportRow[];
}

export async function setDeletionRequestStatus(
  requestId: string,
  status: "scheduled" | "cancelled" | "rejected",
  adminNotes?: string,
) {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("set_data_deletion_request_status", {
    p_request_id: requestId,
    p_status: status,
    p_admin_notes: adminNotes ?? null,
  });

  if (error) {
    logKvkkApiError("[privacy-api] setDeletionRequestStatus:", error);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as DataDeletionRequestRow | null;
}

export async function listRetentionPolicies(): Promise<RetentionPolicyRow[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("retention_policies")
    .select("*")
    .order("entity_type", { ascending: true });

  if (error) {
    logKvkkApiError("[privacy-api] listRetentionPolicies:", error);
    return [];
  }

  return (data ?? []) as RetentionPolicyRow[];
}

export async function saveRetentionPolicy(
  input: Pick<RetentionPolicyRow, "entity_type" | "retention_days" | "action" | "description" | "is_active"> & {
    id?: string;
  },
) {
  const supabase = createClient();
  if (!supabase) return null;

  const payload = {
    entity_type: input.entity_type,
    retention_days: input.retention_days,
    action: input.action,
    description: input.description ?? null,
    is_active: input.is_active,
  };

  const query = input.id
    ? supabase.from("retention_policies").update(payload).eq("id", input.id)
    : supabase.from("retention_policies").insert(payload);

  const { data, error } = await query.select().single();
  if (error) {
    logKvkkApiError("[privacy-api] saveRetentionPolicy:", error);
    return null;
  }

  return data as RetentionPolicyRow;
}

export async function listRetentionExecutions(limit = 20): Promise<RetentionExecutionRow[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("retention_executions")
    .select("*")
    .order("executed_at", { ascending: false })
    .limit(limit);

  if (error) {
    logKvkkApiError("[privacy-api] listRetentionExecutions:", error);
    return [];
  }

  return (data ?? []) as RetentionExecutionRow[];
}

export async function runRetentionPoliciesNow() {
  const response = await fetch("/api/privacy/retention/run", {
    method: "POST",
  });

  return parseApiResponse<{ results: Array<Record<string, unknown>> }>(response);
}

export async function listMaskingEvents(limit = 20): Promise<MaskingEventRow[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("masking_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logKvkkApiError("[privacy-api] listMaskingEvents:", error);
    return [];
  }

  return (data ?? []) as MaskingEventRow[];
}

export async function listInternationalTransfers(limit = 20): Promise<InternationalTransferRow[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("international_transfers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logKvkkApiError("[privacy-api] listInternationalTransfers:", error);
    return [];
  }

  return (data ?? []) as InternationalTransferRow[];
}

export async function listBreachNotificationTemplates(): Promise<BreachNotificationTemplateRow[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("breach_notification_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    logKvkkApiError("[privacy-api] listBreachNotificationTemplates:", error);
    return [];
  }

  return (data ?? []) as BreachNotificationTemplateRow[];
}

export async function saveBreachNotificationTemplate(
  input: Pick<
    BreachNotificationTemplateRow,
    "title" | "notification_window_hours" | "summary" | "authority_template" | "customer_template" | "is_active"
  > & {
    id?: string;
    internal_checklist: string[];
    notification_contacts: Array<Record<string, unknown>>;
  },
) {
  const supabase = createClient();
  if (!supabase) return null;

  const payload = {
    title: input.title,
    notification_window_hours: input.notification_window_hours,
    summary: input.summary ?? null,
    authority_template: input.authority_template,
    customer_template: input.customer_template,
    internal_checklist: input.internal_checklist,
    notification_contacts: input.notification_contacts,
    is_active: input.is_active,
  };

  const query = input.id
    ? supabase.from("breach_notification_templates").update(payload).eq("id", input.id)
    : supabase.from("breach_notification_templates").insert(payload);

  const { data, error } = await query.select().single();
  if (error) {
    logKvkkApiError("[privacy-api] saveBreachNotificationTemplate:", error);
    return null;
  }

  return data as BreachNotificationTemplateRow;
}

export async function listBreachIncidents(limit = 20): Promise<BreachIncidentRow[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("breach_incidents")
    .select("*")
    .order("reported_at", { ascending: false })
    .limit(limit);

  if (error) {
    logKvkkApiError("[privacy-api] listBreachIncidents:", error);
    return [];
  }

  return (data ?? []) as BreachIncidentRow[];
}

export async function saveBreachIncident(
  input: Pick<
    BreachIncidentRow,
    | "title"
    | "summary"
    | "severity"
    | "status"
    | "detected_at"
    | "reported_at"
    | "authority_notification_due_at"
    | "authority_notified_at"
    | "customer_notified_at"
    | "requires_authority_notification"
    | "transfer_related"
    | "affected_subject_count"
    | "actions_taken"
    | "evidence_notes"
  > & {
    id?: string;
    template_id?: string | null;
    data_categories: string[];
    affected_systems: string[];
  },
) {
  const supabase = createClient();
  if (!supabase) return null;

  const payload = {
    template_id: input.template_id ?? null,
    title: input.title,
    summary: input.summary,
    severity: input.severity,
    status: input.status,
    detected_at: input.detected_at,
    reported_at: input.reported_at,
    authority_notification_due_at: input.authority_notification_due_at,
    authority_notified_at: input.authority_notified_at,
    customer_notified_at: input.customer_notified_at,
    requires_authority_notification: input.requires_authority_notification,
    transfer_related: input.transfer_related,
    affected_subject_count: input.affected_subject_count,
    data_categories: input.data_categories,
    affected_systems: input.affected_systems,
    actions_taken: input.actions_taken ?? null,
    evidence_notes: input.evidence_notes ?? null,
  };

  const query = input.id
    ? supabase.from("breach_incidents").update(payload).eq("id", input.id)
    : supabase.from("breach_incidents").insert(payload);

  const { data, error } = await query.select().single();
  if (error) {
    logKvkkApiError("[privacy-api] saveBreachIncident:", error);
    return null;
  }

  return data as BreachIncidentRow;
}
