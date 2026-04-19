import type { SupabaseClient } from "@supabase/supabase-js";

type ExportSectionRow = Record<string, unknown>;

export type UserDataExportBundle = {
  exportedAt: string;
  targetUserId: string;
  profile: ExportSectionRow | null;
  roles: ExportSectionRow[];
  consents: ExportSectionRow[];
  deletionRequests: ExportSectionRow[];
  exportHistory: ExportSectionRow[];
  securityEvents: ExportSectionRow[];
};

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export async function buildUserDataExportBundle(
  supabase: SupabaseClient,
  targetUserId: string,
): Promise<UserDataExportBundle> {
  const [{ data: profile }, { data: consents }, { data: deletionRequests }, { data: exportHistory }, { data: securityEvents }] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("id, auth_user_id, organization_id, email, full_name, title, phone, avatar_url, is_active, created_at, updated_at, deleted_at, delete_requested_at")
        .eq("auth_user_id", targetUserId)
        .maybeSingle(),
      supabase
        .from("user_consents")
        .select("consent_type, version, source_context, granted_at, revoked_at, ip_address, user_agent, created_at")
        .eq("user_id", targetUserId)
        .order("granted_at", { ascending: false }),
      supabase
        .from("data_deletion_requests")
        .select("id, request_scope, status, reason, requested_at, scheduled_purge_at, completed_at, rejected_at, cancelled_at, admin_notes, error_message")
        .eq("target_user_id", targetUserId)
        .order("requested_at", { ascending: false }),
      supabase
        .from("data_exports")
        .select("id, export_format, status, file_name, requested_at, completed_at, expires_at, last_downloaded_at, download_count")
        .eq("target_user_id", targetUserId)
        .order("requested_at", { ascending: false }),
      supabase
        .from("security_events")
        .select("event_type, severity, endpoint, created_at, ip_address, details")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(250),
    ]);

  let roles: ExportSectionRow[] = [];

  if (profile?.id) {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("assigned_at, roles(code, name)")
      .eq("user_profile_id", profile.id);

    roles = (roleRows ?? []).map((row) => {
      const roleRelation = row.roles as
        | { code?: string | null; name?: string | null }
        | Array<{ code?: string | null; name?: string | null }>
        | null;
      const firstRole = Array.isArray(roleRelation) ? roleRelation[0] : roleRelation;

      return {
        assigned_at: row.assigned_at,
        role_code: firstRole?.code ?? null,
        role_name: firstRole?.name ?? null,
      };
    });
  }

  return {
    exportedAt: new Date().toISOString(),
    targetUserId,
    profile: (profile as ExportSectionRow | null) ?? null,
    roles: (roles ?? []) as ExportSectionRow[],
    consents: ((consents ?? []) as ExportSectionRow[]) ?? [],
    deletionRequests: ((deletionRequests ?? []) as ExportSectionRow[]) ?? [],
    exportHistory: ((exportHistory ?? []) as ExportSectionRow[]) ?? [],
    securityEvents: ((securityEvents ?? []) as ExportSectionRow[]) ?? [],
  };
}

export function buildUserDataExportCsv(bundle: UserDataExportBundle): string {
  const lines = ["section,index,key,value"];

  const pushObject = (section: string, index: number, object: ExportSectionRow | null) => {
    if (!object) return;
    Object.entries(object).forEach(([key, value]) => {
      const serialized = normalizeValue(value).replaceAll('"', '""');
      lines.push(`"${section}",${index},"${key}","${serialized}"`);
    });
  };

  pushObject("profile", 0, bundle.profile);
  bundle.roles.forEach((row, index) => pushObject("roles", index, row));
  bundle.consents.forEach((row, index) => pushObject("consents", index, row));
  bundle.deletionRequests.forEach((row, index) => pushObject("deletion_requests", index, row));
  bundle.exportHistory.forEach((row, index) => pushObject("export_history", index, row));
  bundle.securityEvents.forEach((row, index) => pushObject("security_events", index, row));

  return lines.join("\n");
}
