/**
 * Resolve operational company_workspaces row for the active nova workspace,
 * and load unit/location picklists (structured tables + workspace metadata).
 */
import { createClient } from "@/lib/supabase/client";

export type SitePickOption = { id: string; name: string };

const META_DEPT = "meta:dept:";
const META_LOC = "meta:loc:";

export function isMetaDeptId(id: string) {
  return id.startsWith(META_DEPT);
}

export function isMetaLocId(id: string) {
  return id.startsWith(META_LOC);
}

export function labelFromSitePickId(id: string) {
  if (isMetaDeptId(id)) return decodeURIComponent(id.slice(META_DEPT.length));
  if (isMetaLocId(id)) return decodeURIComponent(id.slice(META_LOC.length));
  return null;
}

/**
 * Returns company_workspaces.id for incidents/personnel APIs.
 * Tries direct id match first, then maps via nova_workspaces.organization_id.
 */
export async function resolveCompanyWorkspaceIdFromActiveWorkspaceId(
  activeWorkspaceId: string,
): Promise<{
  companyWorkspaceId: string;
  displayLabel: string;
  sector: string;
} | null> {
  const supabase = createClient();
  if (!supabase || !activeWorkspaceId) return null;

  const { data: direct, error: directErr } = await supabase
    .from("company_workspaces")
    .select(
      "id, display_name, metadata, company_identities(official_name, sector)",
    )
    .eq("id", activeWorkspaceId)
    .eq("is_archived", false)
    .maybeSingle();

  if (!directErr && direct?.id) {
    return mapWorkspaceRow(direct);
  }

  const { data: nova, error: novaErr } = await supabase
    .from("nova_workspaces")
    .select("id, organization_id, name")
    .eq("id", activeWorkspaceId)
    .maybeSingle();

  if (novaErr || !nova?.organization_id) return null;

  const { data: rows, error: cwErr } = await supabase
    .from("company_workspaces")
    .select(
      "id, display_name, metadata, company_identities(official_name, sector)",
    )
    .eq("organization_id", nova.organization_id)
    .eq("is_archived", false)
    .order("created_at", { ascending: true });

  if (cwErr || !rows?.length) return null;

  const nwName = String(nova.name ?? "").trim();
  const matchName = rows.find((r) => String(r.display_name ?? "").trim() === nwName);
  const picked = matchName ?? rows[0];
  return mapWorkspaceRow(picked);
}

function mapWorkspaceRow(row: Record<string, unknown>): {
  companyWorkspaceId: string;
  displayLabel: string;
  sector: string;
} {
  const identRaw = row.company_identities as Record<string, unknown> | Record<string, unknown>[] | null;
  const ident = Array.isArray(identRaw) ? identRaw[0] ?? null : identRaw;
  const official = (ident?.official_name as string) || (row.display_name as string) || "";
  const sector = (ident?.sector as string) || "";
  return {
    companyWorkspaceId: row.id as string,
    displayLabel: official.trim() || (row.display_name as string) || "—",
    sector: sector.trim(),
  };
}

function uniqueByName(items: SitePickOption[]) {
  const seen = new Set<string>();
  const out: SitePickOption[] = [];
  for (const item of items) {
    const k = item.name.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function metadataStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => (typeof v === "string" ? v.trim() : String(v ?? "").trim()))
    .filter(Boolean);
}

/**
 * Units = `departments` table + metadata.departments strings.
 * Locations = `locations` table + metadata.locations strings.
 */
export async function fetchWorkspaceUnitAndLocationOptions(
  companyWorkspaceId: string,
): Promise<{ units: SitePickOption[]; locations: SitePickOption[] }> {
  const supabase = createClient();
  if (!supabase) return { units: [], locations: [] };

  const [{ data: wsRow }, { data: deptRows }, { data: locRows }] = await Promise.all([
    supabase.from("company_workspaces").select("metadata").eq("id", companyWorkspaceId).maybeSingle(),
    supabase
      .from("departments")
      .select("id, name")
      .eq("company_workspace_id", companyWorkspaceId)
      .eq("is_archived", false)
      .order("name", { ascending: true }),
    supabase
      .from("locations")
      .select("id, name")
      .eq("company_workspace_id", companyWorkspaceId)
      .eq("is_archived", false)
      .order("name", { ascending: true }),
  ]);

  const metadata = (wsRow?.metadata as Record<string, unknown> | null) ?? {};
  const metaDepartments = metadataStringList(metadata.departments);
  const metaLocations = metadataStringList(metadata.locations);

  const unitsFromDb: SitePickOption[] = (deptRows ?? [])
    .filter((r): r is { id: string; name: string } => !!r?.id && !!r?.name)
    .map((r) => ({ id: r.id, name: r.name.trim() }));

  const locsFromDb: SitePickOption[] = (locRows ?? [])
    .filter((r): r is { id: string; name: string } => !!r?.id && !!r?.name)
    .map((r) => ({ id: r.id, name: r.name.trim() }));

  const dbUnitNames = new Set(unitsFromDb.map((u) => u.name.toLowerCase()));
  const dbLocNames = new Set(locsFromDb.map((u) => u.name.toLowerCase()));

  const unitsMeta: SitePickOption[] = metaDepartments
    .filter((n) => !dbUnitNames.has(n.toLowerCase()))
    .map((n) => ({ id: `${META_DEPT}${encodeURIComponent(n)}`, name: n }));

  const locsMeta: SitePickOption[] = metaLocations
    .filter((n) => !dbLocNames.has(n.toLowerCase()))
    .map((n) => ({ id: `${META_LOC}${encodeURIComponent(n)}`, name: n }));

  return {
    units: uniqueByName([...unitsFromDb, ...unitsMeta]),
    locations: uniqueByName([...locsFromDb, ...locsMeta]),
  };
}
