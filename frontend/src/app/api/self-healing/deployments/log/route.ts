import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/supabase/api-auth";
import { createServiceClient, parseJsonBody } from "@/lib/security/server";

const bodySchema = z.object({
  environment: z.enum(["development", "staging", "production"]).default("production"),
  source: z.string().trim().max(120).default("github_actions"),
  status: z.enum(["started", "success", "failed", "rolled_back"]).default("started"),
  smokeTestStatus: z.enum(["pending", "success", "failed", "skipped"]).default("pending"),
  commitSha: z.string().trim().max(120).optional().nullable(),
  branch: z.string().trim().max(120).optional().nullable(),
  buildUrl: z.string().trim().max(500).optional().nullable(),
  initiatedBy: z.string().trim().max(200).optional().nullable(),
  details: z.record(z.string(), z.any()).optional().default({}),
});

function isCronAuthorized(request: NextRequest) {
  const configuredSecret = process.env.SELF_HEALING_CRON_SECRET?.trim();
  if (!configuredSecret) return false;
  return request.headers.get("x-self-healing-key")?.trim() === configuredSecret;
}

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    const auth = await requirePermission(request, "self_healing.manage");
    if (!auth.ok) return auth.response;
  }

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("log_deployment_event", {
    p_environment: parsed.data.environment,
    p_source: parsed.data.source,
    p_status: parsed.data.status,
    p_commit_sha: parsed.data.commitSha ?? null,
    p_branch: parsed.data.branch ?? null,
    p_build_url: parsed.data.buildUrl ?? null,
    p_initiated_by: parsed.data.initiatedBy ?? null,
    p_smoke_test_status: parsed.data.smokeTestStatus,
    p_details: parsed.data.details,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data });
}
