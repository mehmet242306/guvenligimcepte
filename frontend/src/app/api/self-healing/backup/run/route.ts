import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/supabase/api-auth";
import { parseJsonBody } from "@/lib/security/server";
import { runSnapshotBackup } from "@/lib/self-healing/backup";

const bodySchema = z.object({
  backupType: z.string().trim().max(120).optional().default("manual_snapshot"),
});

function isCronAuthorized(request: NextRequest) {
  const configuredSecret = process.env.SELF_HEALING_CRON_SECRET?.trim();
  if (!configuredSecret) return false;
  return request.headers.get("x-self-healing-key")?.trim() === configuredSecret;
}

export async function POST(request: NextRequest) {
  let initiatedBy: string | null = null;
  let initiatedByName: string | null = "System Scheduler";
  let source: "manual" | "scheduled" | "queued" = "scheduled";

  if (!isCronAuthorized(request)) {
    const auth = await requirePermission(request, "backups.manage");
    if (!auth.ok) return auth.response;
    initiatedBy = auth.userId;
    initiatedByName = "Admin";
    source = "manual";
  }

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const result = await runSnapshotBackup({
    backupType: parsed.data.backupType,
    initiatedBy,
    initiatedByName,
    source,
  });

  return NextResponse.json(result);
}
