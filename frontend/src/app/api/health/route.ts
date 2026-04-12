import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/supabase/api-auth";
import { createServiceClient } from "@/lib/security/server";
import { runSelfHealingHealthChecks } from "@/lib/self-healing/health";

function isCronAuthorized(request: NextRequest) {
  const configuredSecret = process.env.SELF_HEALING_CRON_SECRET?.trim();
  if (!configuredSecret) return false;
  return request.headers.get("x-self-healing-key")?.trim() === configuredSecret;
}

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("health_checks")
    .select("component_key, component_name, status, latency_ms, summary, checked_at")
    .order("checked_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json(
      {
        status: "unknown",
        error: error.message,
      },
      { status: 500 },
    );
  }

  const latestByComponent = new Map<string, Record<string, unknown>>();
  for (const row of data ?? []) {
    if (!latestByComponent.has(row.component_key)) {
      latestByComponent.set(row.component_key, row as Record<string, unknown>);
    }
  }

  const components = Array.from(latestByComponent.values());
  const overall =
    components.some((row) => row.status === "down")
      ? "down"
      : components.some((row) => row.status === "degraded")
        ? "degraded"
        : "healthy";

  return NextResponse.json({
    status: overall,
    checkedAt: (components[0]?.checked_at as string | undefined) ?? null,
    components,
  });
}

export async function POST(request: NextRequest) {
  let createdBy: string | null = null;

  if (!isCronAuthorized(request)) {
    const auth = await requirePermission(request, "self_healing.manage");
    if (!auth.ok) return auth.response;
    createdBy = auth.userId;
  }

  const result = await runSelfHealingHealthChecks({
    mode: isCronAuthorized(request) ? "scheduled" : "manual",
    createdBy,
  });

  return NextResponse.json(result);
}
