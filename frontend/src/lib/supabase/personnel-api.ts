/**
 * Supabase Personnel API Helper
 *
 * Provides CRUD operations for the `personnel` table via Supabase.
 * All functions gracefully return null when Supabase is unavailable,
 * allowing the app to fall back to localStorage.
 *
 * NEW SCHEMA: `personnel` table (replaces old `company_personnel`)
 * Child tables: personnel_special_policies, personnel_trainings,
 *               personnel_health_exams, personnel_ppe_records, personnel_documents
 */
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/* PersonnelRecord — the canonical frontend type                       */
/* ------------------------------------------------------------------ */
export type PersonnelRecord = {
  id: string;
  employeeCode: string;
  tcIdentityNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  nationality: string;
  bloodType: string;
  maritalStatus: string;
  phone: string;
  email: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  address: string;
  department: string;
  positionTitle: string;
  location: string;
  hireDate: string;
  terminationDate: string;
  employmentStatus: string;
  employmentType: string;
  shiftType: string;
  educationLevel: string;
  isActive: boolean;
  notes: string;
};

/* ------------------------------------------------------------------ */
/* SpecialPolicyRecord — from personnel_special_policies               */
/* ------------------------------------------------------------------ */
export type SpecialPolicyRecord = {
  id: string;
  personnelId: string;
  policyType: string;
  startDate: string;
  endDate: string;
  description: string;
  isActive: boolean;
};

/* ------------------------------------------------------------------ */
/* DB row types                                                        */
/* ------------------------------------------------------------------ */
type PersonnelRow = {
  id: string;
  organization_id: string;
  company_identity_id: string;
  employee_code: string | null;
  tc_identity_number: string | null;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: string | null;
  nationality: string | null;
  blood_type: string | null;
  marital_status: string | null;
  phone: string | null;
  email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  address: string | null;
  department: string | null;
  position_title: string | null;
  location: string | null;
  hire_date: string | null;
  termination_date: string | null;
  employment_status: string;
  employment_type: string | null;
  shift_type: string | null;
  education_level: string | null;
  is_active: boolean;
  notes: string | null;
};

type SpecialPolicyRow = {
  id: string;
  personnel_id: string;
  policy_type: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  is_active: boolean;
};

/* ------------------------------------------------------------------ */
/* Mapping: DB → PersonnelRecord                                       */
/* ------------------------------------------------------------------ */
function dbToPersonnelRecord(row: PersonnelRow): PersonnelRecord {
  return {
    id: row.id,
    employeeCode: row.employee_code ?? "",
    tcIdentityNumber: row.tc_identity_number ?? "",
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date ?? "",
    gender: row.gender ?? "",
    nationality: row.nationality ?? "TR",
    bloodType: row.blood_type ?? "",
    maritalStatus: row.marital_status ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    emergencyContactName: row.emergency_contact_name ?? "",
    emergencyContactPhone: row.emergency_contact_phone ?? "",
    address: row.address ?? "",
    department: row.department ?? "",
    positionTitle: row.position_title ?? "",
    location: row.location ?? "",
    hireDate: row.hire_date ?? "",
    terminationDate: row.termination_date ?? "",
    employmentStatus: row.employment_status ?? "active",
    employmentType: row.employment_type ?? "full_time",
    shiftType: row.shift_type ?? "day",
    educationLevel: row.education_level ?? "",
    isActive: row.is_active,
    notes: row.notes ?? "",
  };
}

function dbToSpecialPolicyRecord(row: SpecialPolicyRow): SpecialPolicyRecord {
  return {
    id: row.id,
    personnelId: row.personnel_id,
    policyType: row.policy_type,
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    description: row.description ?? "",
    isActive: row.is_active,
  };
}

/* ------------------------------------------------------------------ */
/* Mapping: PersonnelRecord → DB insert/update                         */
/* ------------------------------------------------------------------ */
function personnelToDbRow(
  record: PersonnelRecord,
  companyIdentityId: string,
  organizationId: string,
): Record<string, unknown> {
  return {
    id: record.id,
    organization_id: organizationId,
    company_identity_id: companyIdentityId,
    employee_code: record.employeeCode || null,
    tc_identity_number: record.tcIdentityNumber || null,
    first_name: record.firstName,
    last_name: record.lastName,
    birth_date: record.birthDate || null,
    gender: record.gender || null,
    nationality: record.nationality || "TR",
    blood_type: record.bloodType || null,
    marital_status: record.maritalStatus || null,
    phone: record.phone || null,
    email: record.email || null,
    emergency_contact_name: record.emergencyContactName || null,
    emergency_contact_phone: record.emergencyContactPhone || null,
    address: record.address || null,
    department: record.department || null,
    position_title: record.positionTitle || null,
    location: record.location || null,
    hire_date: record.hireDate || null,
    termination_date: record.terminationDate || null,
    employment_status: record.employmentStatus || "active",
    employment_type: record.employmentType || "full_time",
    shift_type: record.shiftType || "day",
    education_level: record.educationLevel || null,
    is_active: record.isActive !== false,
    notes: record.notes || null,
  };
}

/* ------------------------------------------------------------------ */
/* Helper: resolve company_identity_id + organization_id from          */
/* workspace ID. Both fields live on company_workspaces.               */
/* ------------------------------------------------------------------ */
async function resolveIds(workspaceId: string): Promise<{ identityId: string; organizationId: string; workspaceId: string } | null> {
  const supabase = createClient();
  if (!supabase) return null;

  try {
    const { data: ws, error: wsErr } = await supabase
      .from("company_workspaces")
      .select("id, company_identity_id, organization_id")
      .eq("id", workspaceId)
      .single();

    if (wsErr || !ws) {
      console.warn("[personnel-api] resolveIds: workspace lookup failed", wsErr?.message);
      return null;
    }

    return {
      identityId: ws.company_identity_id,
      organizationId: ws.organization_id,
      workspaceId: ws.id,
    };
  } catch (err) {
    console.warn("[personnel-api] resolveIds exception:", err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Fetch all active personnel for a company.
 * The companyId parameter is the workspace ID (same as CompanyRecord.id).
 * Returns null if Supabase is unavailable.
 */
export async function fetchPersonnelFromSupabase(
  companyId: string,
): Promise<PersonnelRecord[] | null> {
  const supabase = createClient();
  if (!supabase) return null;

  try {
    const ids = await resolveIds(companyId);
    if (!ids) {
      console.warn("[personnel-api] fetchPersonnel: could not resolve IDs for workspace", companyId);
      return null;
    }

    const { data, error } = await supabase
      .from("personnel")
      .select("*")
      .eq("company_identity_id", ids.identityId)
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
 * Fetch special policies for all personnel of a company.
 * Returns a map of personnelId → SpecialPolicyRecord[].
 * Returns null if Supabase is unavailable.
 */
export async function fetchSpecialPoliciesFromSupabase(
  companyId: string,
): Promise<Map<string, SpecialPolicyRecord[]> | null> {
  const supabase = createClient();
  if (!supabase) return null;

  try {
    const ids = await resolveIds(companyId);
    if (!ids) return null;

    const { data, error } = await supabase
      .from("personnel_special_policies")
      .select("*")
      .eq("company_identity_id", ids.identityId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("[personnel-api] fetchSpecialPolicies error:", error.message);
      return null;
    }

    const map = new Map<string, SpecialPolicyRecord[]>();
    for (const row of data as SpecialPolicyRow[]) {
      const rec = dbToSpecialPolicyRecord(row);
      const existing = map.get(rec.personnelId) ?? [];
      existing.push(rec);
      map.set(rec.personnelId, existing);
    }

    return map;
  } catch (err) {
    console.warn("[personnel-api] fetchSpecialPolicies exception:", err);
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
    const ids = await resolveIds(companyId);
    if (!ids) {
      console.warn("[personnel-api] importPersonnel: could not resolve IDs");
      return null;
    }

    const rows = records.map((r) => personnelToDbRow(r, ids.identityId, ids.organizationId));

    const { error } = await supabase
      .from("personnel")
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
      .from("personnel")
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
 * Bulk remove multiple personnel records from Supabase (soft delete).
 * Returns the count of removed records, or null if unavailable.
 */
export async function bulkRemovePersonnelFromSupabase(
  personnelIds: string[],
): Promise<number | null> {
  const supabase = createClient();
  if (!supabase) return null;
  if (personnelIds.length === 0) return 0;

  try {
    const { error } = await supabase
      .from("personnel")
      .update({ is_active: false })
      .in("id", personnelIds);

    if (error) {
      console.warn("[personnel-api] bulkRemovePersonnel error:", error.message);
      return null;
    }

    return personnelIds.length;
  } catch (err) {
    console.warn("[personnel-api] bulkRemovePersonnel exception:", err);
    return null;
  }
}

/**
 * Fetch live personnel statistics for a workspace.
 * Returns the active personnel count and the count of distinct departments
 * and locations that are actually in use on personnel records.
 *
 * Bu helper, hero stat kartlarının (ÇALIŞAN / BÖLÜM / LOKASYON) DB'den
 * doğrudan canlı gelmesini sağlıyor — cached metadata.employeeCount senkron
 * olmayabiliyor.
 */
export async function fetchWorkspacePersonnelStats(
  companyWorkspaceId: string,
): Promise<{
  active: number;
  distinctDepartments: number;
  distinctLocations: number;
} | null> {
  const supabase = createClient();
  if (!supabase) return null;
  try {
    const ids = await resolveIds(companyWorkspaceId);
    if (!ids) return null;

    const { data, error } = await supabase
      .from("personnel")
      .select("department, location")
      .eq("company_identity_id", ids.identityId)
      .eq("is_active", true);

    if (error) {
      console.warn("[personnel-api] fetchWorkspacePersonnelStats error:", error.message);
      return null;
    }

    const rows = (data ?? []) as Array<{ department: string | null; location: string | null }>;
    const deps = new Set<string>();
    const locs = new Set<string>();
    for (const row of rows) {
      const d = (row.department ?? "").trim();
      const l = (row.location ?? "").trim();
      if (d) deps.add(d);
      if (l) locs.add(l);
    }
    return {
      active: rows.length,
      distinctDepartments: deps.size,
      distinctLocations: locs.size,
    };
  } catch (err) {
    console.warn("[personnel-api] fetchWorkspacePersonnelStats exception:", err);
    return null;
  }
}

/**
 * Update the company_workspaces metadata with the current employee count.
 * This keeps the company hero section in sync with actual personnel data.
 */
export async function updateWorkspaceEmployeeCount(
  workspaceId: string,
  employeeCount: number,
): Promise<boolean | null> {
  const supabase = createClient();
  if (!supabase) return null;

  try {
    // First get existing metadata
    const { data: ws, error: fetchErr } = await supabase
      .from("company_workspaces")
      .select("metadata")
      .eq("id", workspaceId)
      .single();

    if (fetchErr || !ws) {
      console.warn("[personnel-api] updateWorkspaceEmployeeCount: fetch error", fetchErr?.message);
      return null;
    }

    const existingMetadata = (ws.metadata ?? {}) as Record<string, unknown>;
    const updatedMetadata = { ...existingMetadata, employeeCount };

    const { error: updateErr } = await supabase
      .from("company_workspaces")
      .update({ metadata: updatedMetadata })
      .eq("id", workspaceId);

    if (updateErr) {
      console.warn("[personnel-api] updateWorkspaceEmployeeCount: update error", updateErr.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[personnel-api] updateWorkspaceEmployeeCount exception:", err);
    return false;
  }
}

/**
 * Add a special policy for a personnel record.
 * Returns the new policy ID, or null if unavailable.
 */
export async function addSpecialPolicyToSupabase(
  companyId: string,
  personnelId: string,
  policyType: string,
  description?: string,
): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;

  try {
    const ids = await resolveIds(companyId);
    if (!ids) return null;

    const { data, error } = await supabase
      .from("personnel_special_policies")
      .insert({
        personnel_id: personnelId,
        company_identity_id: ids.identityId,
        organization_id: ids.organizationId,
        policy_type: policyType,
        description: description || null,
        start_date: new Date().toISOString().split("T")[0],
        is_active: true,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[personnel-api] addSpecialPolicy error:", error.message);
      return null;
    }

    return data?.id ?? null;
  } catch (err) {
    console.warn("[personnel-api] addSpecialPolicy exception:", err);
    return null;
  }
}

/**
 * Remove a special policy from Supabase (soft delete).
 */
export async function removeSpecialPolicyFromSupabase(
  policyId: string,
): Promise<boolean | null> {
  const supabase = createClient();
  if (!supabase) return null;

  try {
    const { error } = await supabase
      .from("personnel_special_policies")
      .update({ is_active: false })
      .eq("id", policyId);

    if (error) {
      console.warn("[personnel-api] removeSpecialPolicy error:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[personnel-api] removeSpecialPolicy exception:", err);
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
    const ids = await resolveIds(companyId);
    if (!ids) {
      console.warn("[personnel-api] saveAllPersonnel: could not resolve IDs");
      return null;
    }

    // Deactivate all existing personnel for this company
    const { error: deactivateError } = await supabase
      .from("personnel")
      .update({ is_active: false })
      .eq("company_identity_id", ids.identityId)
      .eq("is_active", true);

    if (deactivateError) {
      console.warn("[personnel-api] saveAllPersonnel deactivate error:", deactivateError.message);
      return false;
    }

    if (records.length === 0) return true;

    // Insert/upsert the new set
    const rows = records.map((r) => personnelToDbRow(r, ids.identityId, ids.organizationId));

    const { error: insertError } = await supabase
      .from("personnel")
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

/* ================================================================== */
/* HEALTH EXAMS — Sağlık Muayenesi CRUD                                */
/* ================================================================== */

export type PersonnelHealthExam = {
  id: string;
  personnelId: string;
  examType: "ise_giris" | "periyodik" | "isten_ayrilma" | "ozel";
  examDate: string;
  nextExamDate: string | null;
  result: "uygun" | "uygun_degil" | "sartli_uygun" | "izleme";
  physicianName: string;
  physicianInstitution: string;
  reportNumber: string;
  restrictions: string;
  recommendedActions: string;
  notes: string;
  createdAt: string;
};

export async function fetchHealthExamsForPersonnel(personnelId: string): Promise<PersonnelHealthExam[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("personnel_health_exams")
    .select("*")
    .eq("personnel_id", personnelId)
    .order("exam_date", { ascending: false });

  if (error) { console.warn("[personnel-api] fetchHealthExams:", error.message); return []; }

  return (data ?? []).map((r) => ({
    id: r.id,
    personnelId: r.personnel_id,
    examType: r.exam_type,
    examDate: r.exam_date,
    nextExamDate: r.next_exam_date,
    result: r.result,
    physicianName: r.physician_name ?? "",
    physicianInstitution: r.physician_institution ?? "",
    reportNumber: r.report_number ?? "",
    restrictions: r.restrictions ?? "",
    recommendedActions: r.recommended_actions ?? "",
    notes: r.notes ?? "",
    createdAt: r.created_at,
  }));
}

export async function fetchAllHealthExamsForCompany(companyWorkspaceId: string): Promise<(PersonnelHealthExam & { personnelName: string })[]> {
  const supabase = createClient();
  if (!supabase) return [];

  // Resolve company_identity_id from workspace ID
  const { data: ws } = await supabase
    .from("company_workspaces")
    .select("company_identity_id")
    .eq("id", companyWorkspaceId)
    .single();
  const identityId = ws?.company_identity_id ?? companyWorkspaceId;

  const { data, error } = await supabase
    .from("personnel_health_exams")
    .select("*, personnel:personnel_id(first_name, last_name)")
    .eq("company_identity_id", identityId)
    .order("exam_date", { ascending: false });

  if (error) { console.warn("[personnel-api] fetchAllHealthExams:", error.message); return []; }

  return (data ?? []).map((r) => {
    const p = r.personnel as { first_name?: string; last_name?: string } | null;
    return {
      id: r.id,
      personnelId: r.personnel_id,
      personnelName: p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "",
      examType: r.exam_type,
      examDate: r.exam_date,
      nextExamDate: r.next_exam_date,
      result: r.result,
      physicianName: r.physician_name ?? "",
      physicianInstitution: r.physician_institution ?? "",
      reportNumber: r.report_number ?? "",
      restrictions: r.restrictions ?? "",
      recommendedActions: r.recommended_actions ?? "",
      notes: r.notes ?? "",
      createdAt: r.created_at,
    };
  });
}

export async function createHealthExam(personnelId: string, companyWorkspaceId: string, data: {
  examType: string; examDate: string; nextExamDate: string;
  result: string; physicianName: string; physicianInstitution: string;
  reportNumber: string; restrictions: string; recommendedActions: string; notes: string;
}): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;

  // Get organization_id from personnel record
  const { data: person } = await supabase
    .from("personnel")
    .select("organization_id")
    .eq("id", personnelId)
    .single();

  if (!person) { console.warn("[personnel-api] createHealthExam: personnel not found"); return null; }

  // Resolve company_identity_id from workspace ID
  const { data: ws } = await supabase
    .from("company_workspaces")
    .select("company_identity_id")
    .eq("id", companyWorkspaceId)
    .single();

  const companyIdentityId = ws?.company_identity_id ?? companyWorkspaceId;
  console.log("[personnel-api] createHealthExam: orgId=", person.organization_id, "identityId=", companyIdentityId);

  const { data: row, error } = await supabase
    .from("personnel_health_exams")
    .insert({
      personnel_id: personnelId,
      organization_id: person.organization_id,
      company_identity_id: companyIdentityId,
      exam_type: data.examType,
      exam_date: data.examDate || null,
      next_exam_date: data.nextExamDate || null,
      result: data.result,
      physician_name: data.physicianName,
      physician_institution: data.physicianInstitution,
      report_number: data.reportNumber,
      restrictions: data.restrictions,
      recommended_actions: data.recommendedActions,
      notes: data.notes,
    })
    .select("id")
    .single();

  if (error) { console.warn("[personnel-api] createHealthExam error:", error.message, error.details); return null; }
  return row?.id ?? null;
}

export async function deleteHealthExam(examId: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const { error } = await supabase.from("personnel_health_exams").delete().eq("id", examId);
  return !error;
}
