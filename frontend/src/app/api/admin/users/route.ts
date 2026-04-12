import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/supabase/api-auth";
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
  const authUserMap = new Map(
    authUsers.map((user) => [
      user.id,
      {
        id: user.id,
        email: user.email ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
        createdAt: user.created_at ?? null,
        mfaEnabled: Array.isArray((user as { factors?: unknown[] }).factors) && ((user as { factors?: unknown[] }).factors?.length ?? 0) > 0,
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
      failed_attempts: lockout?.failed_attempts ?? 0,
      locked_until: lockout?.locked_until ?? null,
      last_failed_at: lockout?.last_failed_at ?? null,
      last_activity_at: activity?.created_at ?? null,
      last_activity_event: activity?.event_type ?? null,
    };
  });

  return NextResponse.json({ items });
}
