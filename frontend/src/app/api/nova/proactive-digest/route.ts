import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/security/server";

export const runtime = "nodejs";

function isAuthorizedCronRequest(request: NextRequest) {
  if (request.headers.get("x-vercel-cron") === "1") return true;
  const cronSecret = process.env.CRON_SECRET?.trim() || process.env.SELF_HEALING_CRON_SECRET?.trim();
  if (cronSecret) {
    return request.headers.get("authorization") === `Bearer ${cronSecret}`;
  }
  return process.env.NODE_ENV !== "production";
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [
    orgsRes,
    overdueTasksRes,
    openDofRes,
    upcomingTrainingsRes,
  ] = await Promise.all([
    service.from("organizations").select("id").limit(300),
    service
      .from("isg_tasks")
      .select("organization_id,id", { count: "exact" })
      .eq("status", "overdue")
      .limit(5000),
    service
      .from("corrective_actions")
      .select("organization_id,id", { count: "exact" })
      .in("status", ["tracking", "in_progress", "overdue"])
      .limit(5000),
    service
      .from("company_trainings")
      .select("organization_id,id", { count: "exact" })
      .eq("status", "planned")
      .lte("training_date", upcoming)
      .limit(5000),
  ]);

  if (orgsRes.error || overdueTasksRes.error || openDofRes.error || upcomingTrainingsRes.error) {
    return NextResponse.json(
      {
        error:
          orgsRes.error?.message ||
          overdueTasksRes.error?.message ||
          openDofRes.error?.message ||
          upcomingTrainingsRes.error?.message ||
          "query_failed",
      },
      { status: 500 },
    );
  }

  const orgIds = ((orgsRes.data ?? []) as Array<{ id: string }>).map((row) => row.id);
  const overdueByOrg = new Map<string, number>();
  const dofByOrg = new Map<string, number>();
  const trainingByOrg = new Map<string, number>();

  for (const row of (overdueTasksRes.data ?? []) as Array<{ organization_id: string }>) {
    overdueByOrg.set(row.organization_id, (overdueByOrg.get(row.organization_id) ?? 0) + 1);
  }
  for (const row of (openDofRes.data ?? []) as Array<{ organization_id: string }>) {
    dofByOrg.set(row.organization_id, (dofByOrg.get(row.organization_id) ?? 0) + 1);
  }
  for (const row of (upcomingTrainingsRes.data ?? []) as Array<{ organization_id: string }>) {
    trainingByOrg.set(row.organization_id, (trainingByOrg.get(row.organization_id) ?? 0) + 1);
  }

  const { data: usersRes, error: usersError } = await service
    .from("user_profiles")
    .select("auth_user_id, organization_id")
    .in("organization_id", orgIds)
    .not("auth_user_id", "is", null)
    .limit(10000);

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const usersByOrg = new Map<string, string[]>();
  for (const row of (usersRes ?? []) as Array<{ auth_user_id: string; organization_id: string }>) {
    const current = usersByOrg.get(row.organization_id) ?? [];
    current.push(row.auth_user_id);
    usersByOrg.set(row.organization_id, current);
  }

  let created = 0;
  let skipped = 0;
  const dateKey = todayKey();

  for (const orgId of orgIds) {
    const overdue = overdueByOrg.get(orgId) ?? 0;
    const openDof = dofByOrg.get(orgId) ?? 0;
    const upcomingTraining = trainingByOrg.get(orgId) ?? 0;
    if (overdue + openDof + upcomingTraining === 0) continue;

    const title = "Nova proaktif ozet";
    const message = `Bugun icin: ${overdue} gecikmis gorev, ${openDof} acik DOF, ${upcomingTraining} yaklasan egitim.`;
    const users = usersByOrg.get(orgId) ?? [];
    if (users.length === 0) continue;

    for (const userId of users) {
      const dedupeTitle = `${title} (${dateKey})`;
      const { data: existing } = await service
        .from("notifications")
        .select("id")
        .eq("organization_id", orgId)
        .eq("user_id", userId)
        .eq("title", dedupeTitle)
        .maybeSingle();
      if (existing?.id) {
        skipped += 1;
        continue;
      }

      const { error: insertError } = await service.from("notifications").insert({
        organization_id: orgId,
        user_id: userId,
        title: dedupeTitle,
        message,
        type: "system",
        level: overdue > 0 ? "critical" : openDof > 0 ? "warning" : "info",
        link: "/planner",
        actor_name: "Nova",
      });
      if (!insertError) {
        created += 1;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    created,
    skipped,
    range: { today, upcoming },
  });
}
