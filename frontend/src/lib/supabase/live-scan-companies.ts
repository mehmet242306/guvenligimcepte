import { createClient } from "@/lib/supabase/client";
import { getActiveWorkspace } from "@/lib/supabase/workspace-api";

export type LiveScanCompanyOption = {
  id: string;
  displayName: string;
};

/**
 * Firma workspace listesi — mobildeki `fetchActiveCompanies` ile aynı tablo.
 * Canlı tarama oturumu RLS için `can_manage_company_workspace` gerekir.
 */
export async function fetchLiveScanCompanyOptions(): Promise<LiveScanCompanyOption[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();

  if (profileErr || !profile?.organization_id) return [];

  const { data, error } = await supabase
    .from("company_workspaces")
    .select("id, display_name, is_archived, status")
    .eq("organization_id", profile.organization_id)
    .eq("is_archived", false);

  if (error || !data) return [];

  return data
    .filter((row) => (row.status ?? "active") === "active")
    .map((row) => ({
      id: row.id,
      displayName: row.display_name || row.id.slice(0, 8),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "tr"));
}

export async function pickDefaultLiveScanCompanyId(
  options: LiveScanCompanyOption[],
): Promise<string | null> {
  if (options.length === 0) return null;
  const active = await getActiveWorkspace();
  if (active?.id && options.some((o) => o.id === active.id)) {
    return active.id;
  }
  return options[0]?.id ?? null;
}
