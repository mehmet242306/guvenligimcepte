import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/supabase/api-auth";
import {
  normalizeManagedAccountType,
  resolveAllowedAccountTypes,
} from "@/lib/account/account-type-access";
import { createServiceClient } from "@/lib/security/server";

type RoleUserRow = {
  user_profile_id: string;
  auth_user_id: string;
  full_name: string | null;
  email: string | null;
  organization_id: string | null;
  organization_name: string | null;
  role_codes: string[];
  effective_role: string;
  is_active: boolean;
};

type OrganizationAccountTypeRow = {
  id: string;
  account_type: "individual" | "osgb" | "enterprise" | null;
  organization_type: string | null;
};

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "admin.users.manage");
  if (!auth.ok) return auth.response;

  const supabase = createServiceClient();

  const [{ data: roleUsers, error: roleUsersError }, { data: lockouts, error: lockoutsError }, { data: securityRows, error: securityError }] =
    await Promise.all([
      supabase.rpc("list_role_management_users"),
      supabase
        .from("auth_login_lockouts")
        .select("email, user_id, failed_attempts, locked_until, last_failed_at"),
      supabase
        .from("security_events")
        .select("user_id, created_at, event_type")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

  if (roleUsersError || lockoutsError || securityError) {
    return NextResponse.json(
      { error: roleUsersError?.message ?? lockoutsError?.message ?? securityError?.message ?? "Kullanici verileri alinamadi." },
      { status: 500 },
    );
  }

  const { data: authUsersData, error: authUsersError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 500,
  });

  if (authUsersError) {
    return NextResponse.json({ error: authUsersError.message }, { status: 500 });
  }

  const authUsers = authUsersData?.users ?? [];
  const organizationIds = Array.from(
    new Set(
      ((roleUsers ?? []) as RoleUserRow[])
        .map((row) => row.organization_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );
  const { data: organizations, error: organizationsError } = organizationIds.length
    ? await supabase
        .from("organizations")
        .select("id, account_type, organization_type")
        .in("id", organizationIds)
    : { data: [], error: null };

  if (organizationsError) {
    return NextResponse.json({ error: organizationsError.message }, { status: 500 });
  }

  const organizationAccountTypeMap = new Map(
    ((organizations ?? []) as OrganizationAccountTypeRow[]).map((row) => [
      row.id,
      row.account_type ?? normalizeManagedAccountType(row.organization_type),
    ]),
  );
  const userAccountTypeMap = new Map(
    ((roleUsers ?? []) as RoleUserRow[]).map((row) => [
      row.auth_user_id,
      row.organization_id ? organizationAccountTypeMap.get(row.organization_id) ?? null : null,
    ]),
  );
  const authUserMap = new Map(
    authUsers.map((user) => [
      user.id,
      {
        id: user.id,
        email: user.email ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
        createdAt: user.created_at ?? null,
        mfaEnabled: Array.isArray((user as { factors?: unknown[] }).factors) && ((user as { factors?: unknown[] }).factors?.length ?? 0) > 0,
        allowedAccountTypes: resolveAllowedAccountTypes({
          appMetadata: user.app_metadata,
          userMetadata: user.user_metadata,
          currentAccountType: userAccountTypeMap.get(user.id) ?? null,
        }),
      },
    ]),
  );

  const lockoutByUser = new Map(
    (lockouts ?? []).map((row) => [row.user_id ?? row.email, row]),
  );
  const lastActivityByUser = new Map<string, { created_at: string; event_type: string }>();
  for (const row of securityRows ?? []) {
    if (!row.user_id || lastActivityByUser.has(row.user_id)) continue;
    lastActivityByUser.set(row.user_id, {
      created_at: row.created_at,
      event_type: row.event_type,
    });
  }

  const items = ((roleUsers ?? []) as RoleUserRow[]).map((row) => {
    const authUser = authUserMap.get(row.auth_user_id);
    const lockout =
      lockoutByUser.get(row.auth_user_id) ??
      lockoutByUser.get(row.email ?? "");
    const activity = lastActivityByUser.get(row.auth_user_id);

    return {
      ...row,
      last_sign_in_at: authUser?.lastSignInAt ?? null,
      created_at: authUser?.createdAt ?? null,
      mfa_enabled: authUser?.mfaEnabled ?? false,
      allowed_account_types: authUser?.allowedAccountTypes ?? ["individual"],
      failed_attempts: lockout?.failed_attempts ?? 0,
      locked_until: lockout?.locked_until ?? null,
      last_failed_at: lockout?.last_failed_at ?? null,
      last_activity_at: activity?.created_at ?? null,
      last_activity_event: activity?.event_type ?? null,
    };
  });

  return NextResponse.json({ items });
}
