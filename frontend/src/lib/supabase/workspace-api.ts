import { createClient } from "@/lib/supabase/client";

export type WorkspaceRow = {
  id: string;
  organization_id: string;
  country_code: string;
  name: string;
  default_language: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkspaceMembership = {
  workspace: WorkspaceRow;
  role_key: string;
  certification_id: string | null;
  is_primary: boolean;
  joined_at: string;
};

type LocalWorkspaceContext = {
  workspace: WorkspaceRow;
  membership: WorkspaceMembership;
};

const LOCAL_WORKSPACE_KEY = "risknova.localWorkspaceContext";

function isBrowser() {
  return typeof window !== "undefined";
}

function readLocalWorkspaceContext(): LocalWorkspaceContext | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(LOCAL_WORKSPACE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalWorkspaceContext;
  } catch {
    return null;
  }
}

export function setLocalWorkspaceContext(input: {
  id: string;
  organizationId: string;
  countryCode: string;
  name: string;
  defaultLanguage: string;
  timezone: string;
  roleKey: string;
  certificationId?: string | null;
  isPrimary?: boolean;
}) {
  if (!isBrowser()) return;

  const now = new Date().toISOString();
  const workspace: WorkspaceRow = {
    id: input.id,
    organization_id: input.organizationId,
    country_code: input.countryCode,
    name: input.name,
    default_language: input.defaultLanguage,
    timezone: input.timezone,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  const membership: WorkspaceMembership = {
    workspace,
    role_key: input.roleKey,
    certification_id: input.certificationId ?? null,
    is_primary: input.isPrimary ?? true,
    joined_at: now,
  };

  window.localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify({ workspace, membership }));
}

export function clearLocalWorkspaceContext() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(LOCAL_WORKSPACE_KEY);
}

/**
 * Lists workspaces the current user belongs to, joined with their membership
 * row. Ordered: primary first, then alphabetical by name.
 */
export async function listMyWorkspaces(): Promise<WorkspaceMembership[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("nova_workspace_members")
    .select(
      `
      role_key,
      certification_id,
      is_primary,
      joined_at,
      workspace:nova_workspaces!inner (
        id,
        organization_id,
        country_code,
        name,
        default_language,
        timezone,
        is_active,
        created_at,
        updated_at
      )
    `,
    )
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("joined_at", { ascending: true });

  if (error || !data) {
    const local = readLocalWorkspaceContext();
    return local ? [local.membership] : [];
  }

  return data
    .filter((row): row is typeof row & { workspace: WorkspaceRow } => !!row.workspace)
    .map((row) => ({
      workspace: row.workspace as WorkspaceRow,
      role_key: row.role_key,
      certification_id: row.certification_id,
      is_primary: row.is_primary,
      joined_at: row.joined_at,
    }));
}

/**
 * Returns the user's currently active workspace (as stored on user_profiles).
 * Null when the profile row has no active_workspace_id yet (fresh account
 * before backfill runs, or a freshly created user).
 */
export async function getActiveWorkspace(): Promise<WorkspaceRow | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select(
      `
      active_workspace_id,
      active_workspace:nova_workspaces!user_profiles_active_workspace_id_fkey (
        id,
        organization_id,
        country_code,
        name,
        default_language,
        timezone,
        is_active,
        created_at,
        updated_at
      )
    `,
    )
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("active_workspace_id")) {
      const memberships = await listMyWorkspaces();
      return memberships[0]?.workspace ?? readLocalWorkspaceContext()?.workspace ?? null;
    }
    return readLocalWorkspaceContext()?.workspace ?? null;
  }

  if (!data?.active_workspace) {
    const memberships = await listMyWorkspaces();
    return memberships[0]?.workspace ?? readLocalWorkspaceContext()?.workspace ?? null;
  }

  // Supabase embed types as an array for any relationship; normalize to one.
  const raw = data.active_workspace as unknown;
  const workspace = Array.isArray(raw) ? raw[0] : raw;
  return (workspace as WorkspaceRow) ?? readLocalWorkspaceContext()?.workspace ?? null;
}

/**
 * Updates user_profiles.active_workspace_id. Verifies membership server-side
 * via RLS: a user can only switch into a workspace they belong to.
 * Caller is expected to trigger a router.refresh() afterwards so server
 * components (Nova RAG, data lists) re-fetch with the new workspace context.
 */
export async function setActiveWorkspace(workspaceId: string): Promise<boolean> {
  if (workspaceId.startsWith("local-")) {
    const local = readLocalWorkspaceContext();
    return local?.workspace.id === workspaceId;
  }

  const supabase = createClient();
  if (!supabase) return false;

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return false;

  const { error } = await supabase
    .from("user_profiles")
    .update({ active_workspace_id: workspaceId })
    .eq("auth_user_id", userId);

  if (error?.message.includes("active_workspace_id")) {
    const local = readLocalWorkspaceContext();
    return local ? local.workspace.id === workspaceId : true;
  }

  if (!error && isBrowser()) {
    window.dispatchEvent(new CustomEvent("risknova:active-workspace-changed"));
  }

  return !error;
}
