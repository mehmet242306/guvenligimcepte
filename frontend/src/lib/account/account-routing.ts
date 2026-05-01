import { createServiceClient } from "@/lib/security/server";
import {
  normalizeManagedAccountType,
  resolveAllowedAccountTypes,
} from "./account-type-access";

export type AccountType = "individual" | "osgb" | "enterprise";

/** Bireysel tenant org'un bagli oldugu OSGB catilari (Faz 3). */
export type OsgbUmbrellaAffiliation = {
  linkId: string;
  status: string;
  osgbOrganizationId: string;
  osgbName: string | null;
};

/** OSGB tenant org'un yonetmek uzere bagladigi bireysel tenant org'lar (Faz 3). */
export type ManagedProfessionalAffiliation = {
  linkId: string;
  status: string;
  professionalOrganizationId: string;
  professionalName: string | null;
};

export type AccountContext = {
  userId: string;
  isPlatformAdmin: boolean;
  organizationId: string | null;
  organizationName: string | null;
  accountType: AccountType | null;
  allowedAccountTypes: AccountType[];
  membershipRole: "owner" | "admin" | "staff" | "viewer" | null;
  currentPlanCode: string | null;
  activeWorkspaceId?: string | null;
  workspaceCount?: number;
  /** Hesap individual ise: bu org'u catisi altinda toplayan OSGB'ler */
  osgbUmbrellas: OsgbUmbrellaAffiliation[];
  /** Hesap osgb ise: bu catiya baglanan bireysel org'lar */
  managedProfessionals: ManagedProfessionalAffiliation[];
};

type MembershipRole = AccountContext["membershipRole"];
export type AccountSurface = "platform-admin" | "osgb-manager" | "standard";

function isMissingRelationError(message: string | undefined | null): boolean {
  const normalized = String(message ?? "").toLowerCase();
  return (
    normalized.includes("relation") ||
    normalized.includes("schema cache") ||
    normalized.includes("does not exist")
  );
}

function mapOrganizationTypeToAccountType(
  value: string | null | undefined,
): AccountType | null {
  const normalized = normalizeManagedAccountType(value);
  if (normalized) {
    return normalized;
  }

  return String(value ?? "").trim() ? "individual" : null;
}

async function resolveProfileWithOrganization(service: ReturnType<typeof createServiceClient>, userId: string) {
  const preferred = await service
    .from("user_profiles")
    .select(
      `
      id,
      auth_user_id,
      organization_id,
      organization:organizations!user_profiles_organization_id_fkey (
        id,
        name,
        account_type,
        organization_type,
        current_plan_id
      )
    `,
    )
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (!preferred.error) {
    return preferred;
  }

  if (!isMissingRelationError(preferred.error.message)) {
    return preferred;
  }

  return service
    .from("user_profiles")
    .select(
      `
      id,
      auth_user_id,
      organization_id,
      organization:organizations!user_profiles_organization_id_fkey (
        id,
        name,
        organization_type
      )
    `,
    )
    .eq("auth_user_id", userId)
    .maybeSingle();
}

function flattenLegacyRoleCodes(
  rows: Array<{ roles?: { code?: string } | Array<{ code?: string }> | null }>,
): string[] {
  return rows.flatMap((row) => {
    if (Array.isArray(row.roles)) {
      return row.roles
        .map((role) => String(role?.code ?? "").trim().toLowerCase())
        .filter(Boolean);
    }

    const code = String(row.roles?.code ?? "").trim().toLowerCase();
    return code ? [code] : [];
  });
}

async function resolveLegacyMembershipRole(
  service: ReturnType<typeof createServiceClient>,
  profileId: string | null | undefined,
  accountType: AccountType | null,
): Promise<MembershipRole> {
  if (!profileId) {
    return accountType === "individual" ? "owner" : null;
  }

  const { data, error } = await service
    .from("user_roles")
    .select("roles(code)")
    .eq("user_profile_id", profileId);

  if (error) {
    if (isMissingRelationError(error.message)) {
      return accountType === "individual" ? "owner" : null;
    }
    throw new Error(error.message);
  }

  const roleCodes = flattenLegacyRoleCodes(
    (data ?? []) as Array<{ roles?: { code?: string } | Array<{ code?: string }> | null }>,
  );

  if (
    roleCodes.some((code) =>
      [
        "owner",
        "admin",
        "organization_admin",
        "osgb_manager",
        "super_admin",
        "platform_admin",
      ].includes(code),
    )
  ) {
    return accountType === "individual" ? "owner" : "admin";
  }

  if (roleCodes.some((code) => ["viewer", "readonly_admin"].includes(code))) {
    return "viewer";
  }

  if (roleCodes.length > 0) {
    return accountType === "individual" ? "owner" : "staff";
  }

  return accountType === "individual" ? "owner" : null;
}

async function resolveCurrentPlanCode(
  service: ReturnType<typeof createServiceClient>,
  planId: string | null | undefined,
): Promise<string | null> {
  if (!planId) return null;

  const { data, error } = await service
    .from("plans")
    .select("code")
    .eq("id", planId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error.message)) {
      return null;
    }
    throw new Error(error.message);
  }

  return data?.code ?? null;
}

async function resolveWorkspaceAccessState(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<{ activeWorkspaceId: string | null; workspaceCount: number }> {
  let activeWorkspaceId: string | null = null;

  const activeWorkspaceResult = await service
    .from("user_profiles")
    .select("active_workspace_id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (!activeWorkspaceResult.error) {
    activeWorkspaceId = activeWorkspaceResult.data?.active_workspace_id ?? null;
  } else if (
    !isMissingRelationError(activeWorkspaceResult.error.message) &&
    !String(activeWorkspaceResult.error.message ?? "").includes("active_workspace_id")
  ) {
    throw new Error(activeWorkspaceResult.error.message);
  }

  const membershipCountResult = await service
    .from("nova_workspace_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (membershipCountResult.error) {
    if (isMissingRelationError(membershipCountResult.error.message)) {
      return {
        activeWorkspaceId,
        workspaceCount: activeWorkspaceId ? 1 : 0,
      };
    }

    throw new Error(membershipCountResult.error.message);
  }

  const workspaceCount = membershipCountResult.count ?? 0;

  if (activeWorkspaceId || workspaceCount === 0) {
    return { activeWorkspaceId, workspaceCount };
  }

  const firstMembershipResult = await service
    .from("nova_workspace_members")
    .select(
      `
      workspace:nova_workspaces!inner (
        id
      )
    `,
    )
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstMembershipResult.error) {
    if (isMissingRelationError(firstMembershipResult.error.message)) {
      return { activeWorkspaceId, workspaceCount };
    }

    throw new Error(firstMembershipResult.error.message);
  }

  const rawWorkspace = firstMembershipResult.data?.workspace as
    | { id?: string | null }
    | Array<{ id?: string | null }>
    | null
    | undefined;
  const firstWorkspace = Array.isArray(rawWorkspace) ? rawWorkspace[0] : rawWorkspace;

  return {
    activeWorkspaceId: typeof firstWorkspace?.id === "string" ? firstWorkspace.id : null,
    workspaceCount,
  };
}

async function resolvePlatformAdminStatus(
  userId: string,
): Promise<boolean> {
  const service = createServiceClient();

  const { data: rpcData, error: rpcError } = await service.rpc("is_platform_admin", {
    uid: userId,
  });

  if (!rpcError) {
    return rpcData === true;
  }

  if (!isMissingRelationError(rpcError.message)) {
    throw new Error(rpcError.message);
  }

  const { data: platformAdminRow, error: platformAdminTableError } = await service
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!platformAdminTableError) {
    return !!platformAdminRow;
  }

  if (!isMissingRelationError(platformAdminTableError.message)) {
    throw new Error(platformAdminTableError.message);
  }

  const { data: legacySuperAdmin, error: legacySuperAdminError } = await service.rpc(
    "is_super_admin",
    { uid: userId },
  );

  if (legacySuperAdminError) {
    if (isMissingRelationError(legacySuperAdminError.message)) {
      return false;
    }
    throw new Error(legacySuperAdminError.message);
  }

  return legacySuperAdmin === true;
}

async function resolveAllowedAccountTypesForUser(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
  currentAccountType: AccountType | null,
  isPlatformAdmin: boolean,
): Promise<AccountType[]> {
  const { data, error } = await service.auth.admin.getUserById(userId);

  if (error || !data.user) {
    return resolveAllowedAccountTypes({
      currentAccountType,
      isPlatformAdmin,
    });
  }

  return resolveAllowedAccountTypes({
    appMetadata: data.user?.app_metadata,
    userMetadata: data.user?.user_metadata,
    currentAccountType,
    isPlatformAdmin,
  });
}

export async function getAccountContextForUser(
  userId: string,
): Promise<AccountContext> {
  const service = createServiceClient();

  const [
    isPlatformAdminData,
    { data: profile, error: profileError },
  ] = await Promise.all([
    resolvePlatformAdminStatus(userId),
    resolveProfileWithOrganization(service, userId),
  ]);

  if (profileError && !isMissingRelationError(profileError.message)) {
    throw new Error(profileError.message);
  }

  const organization = profile?.organization as
    | {
        id: string;
        name: string;
        account_type: AccountType | null;
        organization_type?: string | null;
        current_plan_id?: string | null;
      }
    | null
    | undefined;
  const profileId =
    profile && typeof profile === "object" && "id" in profile && typeof profile.id === "string"
      ? profile.id
      : null;
  const accountType =
    organization?.account_type ??
    mapOrganizationTypeToAccountType(organization?.organization_type) ??
    null;
  const allowedAccountTypes = await resolveAllowedAccountTypesForUser(
    service,
    userId,
    accountType,
    isPlatformAdminData === true,
  );
  const currentPlanCode = await resolveCurrentPlanCode(service, organization?.current_plan_id);
  const workspaceAccess = await resolveWorkspaceAccessState(service, userId);

  let membershipRole: MembershipRole = null;
  if (organization?.id) {
    const { data: membership, error: membershipError } = await service
      .from("organization_memberships")
      .select("role")
      .eq("organization_id", organization.id)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError && !isMissingRelationError(membershipError.message)) {
      throw new Error(membershipError.message);
    }

    membershipRole = (membership?.role as AccountContext["membershipRole"]) ?? null;
  }

  if (!membershipRole) {
    membershipRole = await resolveLegacyMembershipRole(service, profileId, accountType);
  }

  const { osgbUmbrellas, managedProfessionals } = await resolveOsgbAffiliationSummaries(
    service,
    organization?.id ?? profile?.organization_id ?? null,
    accountType,
  );

  return {
    userId,
    isPlatformAdmin: isPlatformAdminData === true,
    organizationId: organization?.id ?? profile?.organization_id ?? null,
    organizationName: organization?.name ?? null,
    accountType,
    allowedAccountTypes,
    membershipRole,
    currentPlanCode,
    activeWorkspaceId: workspaceAccess.activeWorkspaceId,
    workspaceCount: workspaceAccess.workspaceCount,
    osgbUmbrellas,
    managedProfessionals,
  };
}

async function resolveOsgbAffiliationSummaries(
  service: ReturnType<typeof createServiceClient>,
  organizationId: string | null,
  accountType: AccountType | null,
): Promise<{
  osgbUmbrellas: OsgbUmbrellaAffiliation[];
  managedProfessionals: ManagedProfessionalAffiliation[];
}> {
  const empty = { osgbUmbrellas: [] as OsgbUmbrellaAffiliation[], managedProfessionals: [] as ManagedProfessionalAffiliation[] };
  if (!organizationId || !accountType) {
    return empty;
  }

  const activeStatuses = ["invited", "active", "suspended"];

  if (accountType === "individual") {
    const { data, error } = await service
      .from("organization_osgb_affiliations")
      .select(
        `
        id,
        status,
        osgb_organization_id,
        osgb:organizations!organization_osgb_affiliations_osgb_organization_id_fkey (
          id,
          name
        )
      `,
      )
      .eq("professional_organization_id", organizationId)
      .in("status", activeStatuses);

    if (error) {
      if (isMissingRelationError(error.message)) {
        return empty;
      }
      throw new Error(error.message);
    }

    return {
      osgbUmbrellas: (data ?? []).map((row) => {
        const osgb = row.osgb as { id?: string; name?: string } | null;
        return {
          linkId: String(row.id),
          status: String(row.status),
          osgbOrganizationId: String(row.osgb_organization_id),
          osgbName: osgb?.name ?? null,
        };
      }),
      managedProfessionals: [],
    };
  }

  if (accountType === "osgb") {
    const { data, error } = await service
      .from("organization_osgb_affiliations")
      .select(
        `
        id,
        status,
        professional_organization_id,
        professional:organizations!organization_osgb_affiliations_professional_organization_id_fkey (
          id,
          name
        )
      `,
      )
      .eq("osgb_organization_id", organizationId)
      .in("status", activeStatuses);

    if (error) {
      if (isMissingRelationError(error.message)) {
        return empty;
      }
      throw new Error(error.message);
    }

    return {
      osgbUmbrellas: [],
      managedProfessionals: (data ?? []).map((row) => {
        const professional = row.professional as { id?: string; name?: string } | null;
        return {
          linkId: String(row.id),
          status: String(row.status),
          professionalOrganizationId: String(row.professional_organization_id),
          professionalName: professional?.name ?? null,
        };
      }),
    };
  }

  return empty;
}

export function hasOsgbManagementAccess(
  context: Pick<AccountContext, "accountType" | "membershipRole">,
): boolean {
  if (context.accountType !== "osgb") {
    return false;
  }

  return (
    context.membershipRole === "owner" ||
    context.membershipRole === "admin"
  );
}

export function resolveAccountSurface(
  context: Pick<AccountContext, "accountType" | "membershipRole" | "isPlatformAdmin">,
): AccountSurface {
  if (context.isPlatformAdmin) {
    return "platform-admin";
  }

  if (hasOsgbManagementAccess(context)) {
    return "osgb-manager";
  }

  return "standard";
}

export function resolvePostLoginPath(context: AccountContext): string {
  const surface = resolveAccountSurface(context);

  if (surface === "platform-admin") {
    return "/platform-admin";
  }

  if (!context.organizationId || !context.accountType) {
    return "/workspace/onboarding";
  }

  if (context.accountType === "enterprise") {
    return "/enterprise";
  }

  if (!context.activeWorkspaceId) {
    return "/workspace/onboarding";
  }

  if (surface === "osgb-manager") {
    return "/osgb";
  }

  if (context.accountType === "individual") {
    return "/dashboard";
  }

  return "/companies";
}

/** Self-servis giris (sifre / OAuth cookie oturumu) OSGB ve kurumsal icin kapali; platform admin haric. */
export function isPrivilegedAccountSelfServiceLoginBlocked(
  context: Pick<AccountContext, "accountType" | "isPlatformAdmin">,
): boolean {
  if (context.isPlatformAdmin) {
    return false;
  }
  return context.accountType === "osgb" || context.accountType === "enterprise";
}

export const PRIVILEGED_ACCOUNT_LOGIN_BLOCKED_MESSAGE =
  "OSGB ve kurumsal hesaplar icin bu giris yolu kapalidir. Teklif ve erisim icin ekibimizle iletisime gecin.";
