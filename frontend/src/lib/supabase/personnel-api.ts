/**
 * Supabase Personnel API Helper
 *
 * Provides CRUD operations for company personnel via Supabase.
 * All functions gracefully return null when Supabase is unavailable,
 * allowing the app to fall back to localStorage.
 */
import { createClient } from "@/lib/supabase/client";
import type { PersonnelRecord } from "@/components/companies/PersonnelManagementPanel";

/* ------------------------------------------------------------------ */
/* Types for DB rows                                                   */
/* ------------------------------------------------------------------ */
type PersonnelRow = {
  id: string;
  company_identity_id: string;
  company_workspace_id: string | null;
  employee_id: string | null;
  first_name: string;
  last_name: string;
  national_id: string | null;
  nationality: string | null;
  department: string | null;
  position: string | null;
  location: string | null;
  employment_type: string | null;
  start_date: string | null;
  shift_pattern: string | null;
  manager: string | null;
  phone: string | null;
  email: string | null;
  emergency_contact: string | null;
  training_status: string | null;
  periodic_exam_status: string | null;
  ppe_requirement: string | null;
  high_risk_duty: boolean;
  special_monitoring: string | null;
  special_monitoring_categories: string[] | null;
  notes: string | null;
  is_active: boolean;
};

/* ------------------------------------------------------------------ */
/* Mapping: DB → PersonnelRecord                                       */
/* ------------------------------------------------------------------ */
function dbToPersonnelRecord(row: PersonnelRow): PersonnelRecord {
  return {
    id: row.id,
    employeeId: row.employee_id ?? "",
    firstName: row.first_name,
    lastName: row.last_name,
    nationalId: row.national_id ?? "",
    nationality: row.nationality ?? "TC",
    department: row.department ?? "",
    position: row.position ?? "",
    location: row.location ?? "",
    employmentType: row.employment_type ?? "",
    startDate: row.start_date ?? "",
    shiftPattern: row.shift_pattern ?? "",
    manager: row.manager ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    emergencyContact: row.emergency_contact ?? "",
    trainingStatus: row.training_status ?? "",
    periodicExamStatus: row.periodic_exam_status ?? "",
    ppeRequirement: row.ppe_requirement ?? "",
    highRiskDuty: row.high_risk_duty,
    specialMonitoring: row.special_monitoring ?? "",
    specialMonitoringCategories: Array.isArray(row.special_monitoring_categories) ? row.special_monitoring_categories : [],
    notes: row.notes ?? "",
  };
}

/* ------------------------------------------------------------------ */
/* Mapping: PersonnelRecord → DB insert/update                         */
/* ------------------------------------------------------------------ */
function personnelToDbRow(
  record: PersonnelRecord,
  companyIdentityId: string,
  workspaceId: string | null,
): Record<string, unknown> {
  return {
    id: record.id,
    company_identity_id: companyIdentityId,
    company_workspace_id: workspaceId,
    employee_id: record.employeeId || null,
    first_name: record.firstName,
    last_name: record.lastName,
    national_id: record.nationalId || null,
    nationality: record.nationality || "TC",
    department: record.department || null,
    position: record.position || null,
    location: record.location || null,
    employment_type: record.employmentType || null,
    start_date: record.startDate || null,
    shift_pattern: record.shiftPattern || null,
    manager: record.manager || null,
    phone: record.phone || null,
    email: record.email || null,
    emergency_contact: record.emergencyContact || null,
    training_status: record.trainingStatus || null,
    periodic_exam_status: record.periodicExamStatus || null,
    ppe_requirement: record.ppeRequirement || null,
    high_risk_duty: record.highRiskDuty,
    special_monitoring: record.specialMonitoring || null,
    special_monitoring_categories: record.specialMonitoringCategories?.length ? record.specialMonitoringCategories : [],
    notes: record.notes || null,
    is_active: true,
  };
}

/* ------------------------------------------------------------------ */
/* Helper: resolve company_identity_id from workspace ID               */
/* ------------------------------------------------------------------ */
async function resolveIdentityId(workspaceId: string): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("company_workspaces")
      .select("company_identity_id")
      .eq("id", workspaceId)
      .single();

    if (error || !data) return null;
    return data.company_identity_id;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Fetch all active personnel for a company workspace.
 * The companyId parameter is the workspace ID (same as CompanyRecord.id).
 * Returns null if Supabase is unavailable.
 */
export async function fetchPersonnelFromSupabase(
  companyId: string,
): Promise<PersonnelRecord[] | null> {
  const supabase = createClient();
  if (!supabase) return null;

  try {
    // First resolve the identity ID
    const identityId = await resolveIdentityId(companyId);
    if (!identityId) {
      // Try querying by workspace_id directly
      const { data, error } = await supabase
        .from("company_personnel")
        .select("*")
        .eq("company_workspace_id", companyId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("[personnel-api] fetchPersonnel by workspace error:", error.message);
        return null;
      }

      return (data as PersonnelRow[]).map(dbToPersonnelRecord);
    }

    const { data, error } = await supabase
      .from("company_personnel")
      .select("*")
      .eq("company_identity_id", identityId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("[personnel-api] fetchPersonnel error:", error.message);
      return null;
    }

    return (data as PersonnelRow[]).map(dbToPersonnelRecord);
  } catch (err) {
    console.warn("[personnel-api] fetchPersonnel exception:", err);
    return null;
  }
}

/**
 * Import (bulk insert) personnel records into Supabase.
 * Returns the count of inserted records, or null if unavailable.
 */
export async function importPersonnelToSupabase(
  companyId: string,
  records: PersonnelRecord[],
): Promise<number | null> {
  const supabase = createClient();
  if (!supabase) return null;

  if (records.length === 0) return 0;

  try {
    const identityId = await resolveIdentityId(companyId);
    if (!identityId) {
      console.warn("[personnel-api] importPersonnel: could not resolve identity ID");
      return null;
    }

    const rows = records.map((r) => personnelToDbRow(r, identityId, companyId));

    const { error } = await supabase
      .from("company_personnel")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.warn("[personnel-api] importPersonnel error:", error.message);
      return null;
    }

    return records.length;
  } catch (err) {
    console.warn("[personnel-api] importPersonnel exception:", err);
    return null;
  }
}

/**
 * Remove a single personnel record from Supabase (soft delete).
 * Returns true on success, null if unavailable.
 */
export async function removePersonnelFromSupabase(
  personnelId: string,
): Promise<boolean | null> {
  const supabase = createClient();
  if (!supabase) return null;

  try {
    const { error } = await supabase
      .from("company_personnel")
      .update({ is_active: false })
      .eq("id", personnelId);

    if (error) {
      console.warn("[personnel-api] removePersonnel error:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[personnel-api] removePersonnel exception:", err);
    return false;
  }
}

/**
 * Save all personnel for a company (full replace).
 * Deactivates existing records and inserts the new set.
 * Returns true on success, null if unavailable.
 */
export async function saveAllPersonnelToSupabase(
  companyId: string,
  records: PersonnelRecord[],
): Promise<boolean | null> {
  const supabase = createClient();
  if (!supabase) return null;

  try {
    const identityId = await resolveIdentityId(companyId);
    if (!identityId) {
      console.warn("[personnel-api] saveAllPersonnel: could not resolve identity ID");
      return null;
    }

    // Deactivate all existing personnel for this company
    const { error: deactivateError } = await supabase
      .from("company_personnel")
      .update({ is_active: false })
      .eq("company_identity_id", identityId)
      .eq("is_active", true);

    if (deactivateError) {
      console.warn("[personnel-api] saveAllPersonnel deactivate error:", deactivateError.message);
      return false;
    }

    if (records.length === 0) return true;

    // Insert/upsert the new set
    const rows = records.map((r) => personnelToDbRow(r, identityId, companyId));

    const { error: insertError } = await supabase
      .from("company_personnel")
      .upsert(rows, { onConflict: "id" });

    if (insertError) {
      console.warn("[personnel-api] saveAllPersonnel insert error:", insertError.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[personnel-api] saveAllPersonnel exception:", err);
    return false;
  }
}
