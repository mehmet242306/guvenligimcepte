import { createClient } from "@/lib/supabase/client";

export type OhsArchiveStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "expired"
  | "cancelled";

export type OhsArchiveJob = {
  id: string;
  company_workspace_id: string;
  year: number;
  jurisdiction_code: string;
  status: OhsArchiveStatus;
  progress: number;
  error_message: string | null;
  error_code: string | null;
  scope: { version: number; categories: string[] };
  file_size_bytes: number | null;
  download_url_expires_at: string | null;
  download_count: number;
  last_downloaded_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OhsArchiveScopePreset = {
  id: string;
  jurisdiction_code: string;
  preset_key: string;
  display_name_tr: string;
  display_name_en: string;
  description_tr: string | null;
  description_en: string | null;
  categories: Array<{
    key: string;
    label_tr: string;
    label_en: string;
    required: boolean;
    order: number;
  }>;
  is_default: boolean;
};

// ---------------------------------------------------------------------------
// Scope presets (read-only dictionary)
// ---------------------------------------------------------------------------

export async function listScopePresets(
  jurisdictionCode: string,
): Promise<OhsArchiveScopePreset[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("ohs_archive_scope_presets")
    .select(
      "id, jurisdiction_code, preset_key, display_name_tr, display_name_en, description_tr, description_en, categories, is_default",
    )
    .eq("jurisdiction_code", jurisdictionCode)
    .eq("is_active", true)
    .order("is_default", { ascending: false });

  if (error || !data) return [];
  return data as OhsArchiveScopePreset[];
}

// ---------------------------------------------------------------------------
// Jobs list (scoped to user's organization by RLS)
// ---------------------------------------------------------------------------

export async function listArchiveJobs(
  companyWorkspaceId: string,
  limit = 20,
): Promise<OhsArchiveJob[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("ohs_archive_jobs")
    .select(
      "id, company_workspace_id, year, jurisdiction_code, status, progress, error_message, error_code, scope, file_size_bytes, download_url_expires_at, download_count, last_downloaded_at, started_at, completed_at, created_at, updated_at",
    )
    .eq("company_workspace_id", companyWorkspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as OhsArchiveJob[];
}

export async function listRecentArchiveJobs(limit = 5): Promise<OhsArchiveJob[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("ohs_archive_jobs")
    .select(
      "id, company_workspace_id, year, jurisdiction_code, status, progress, error_message, error_code, scope, file_size_bytes, download_url_expires_at, download_count, last_downloaded_at, started_at, completed_at, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as OhsArchiveJob[];
}

// ---------------------------------------------------------------------------
// Create + poll via Next.js API routes
// ---------------------------------------------------------------------------

export type CreateArchiveRequest = {
  company_workspace_id: string;
  year: number;
  jurisdiction_code?: string;
  categories?: string[];
  preset_key?: string;
};

export async function createArchiveJob(
  req: CreateArchiveRequest,
): Promise<{ ok: true; jobId: string } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/ohs-archive/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: body.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, jobId: body.jobId as string };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getArchiveJob(jobId: string): Promise<OhsArchiveJob | null> {
  try {
    const res = await fetch(`/api/ohs-archive/${jobId}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as OhsArchiveJob;
  } catch {
    return null;
  }
}

/** URL the browser can navigate to in order to download the ZIP. */
export function archiveDownloadUrl(jobId: string): string {
  return `/api/ohs-archive/${jobId}/download`;
}

// ---------------------------------------------------------------------------
// Cancel (only for jobs the caller requested, in pending/processing status)
// ---------------------------------------------------------------------------

export async function cancelArchiveJob(jobId: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("ohs_archive_jobs")
    .update({ status: "cancelled" })
    .eq("id", jobId);

  return !error;
}
