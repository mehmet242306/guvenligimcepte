import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/supabase/api-auth";
import { parseJsonBody } from "@/lib/security/server";
import { restoreSnapshotBackup } from "@/lib/self-healing/backup";

const bodySchema = z.object({
  dryRun: z.boolean().optional().default(false),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission(request, "backups.manage");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;

  try {
    const result = await restoreSnapshotBackup({
      sourceBackupRunId: id,
      initiatedBy: auth.userId,
      initiatedByName: "Admin",
      dryRun: parsed.data.dryRun,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yedek geri yükleme başarısız oldu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
