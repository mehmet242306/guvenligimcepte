import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/supabase/api-auth";
import { parseJsonBody } from "@/lib/security/server";
import { processSelfHealingQueue } from "@/lib/self-healing/queue";

const bodySchema = z.object({
  batchSize: z.number().int().min(1).max(20).optional().default(5),
});

function isCronAuthorized(request: NextRequest) {
  const configuredSecret = process.env.SELF_HEALING_CRON_SECRET?.trim();
  if (!configuredSecret) return false;
  return request.headers.get("x-self-healing-key")?.trim() === configuredSecret;
}

export async function POST(request: NextRequest) {
  let workerId = "self-healing-worker";

  if (!isCronAuthorized(request)) {
    const auth = await requirePermission(request, "self_healing.manage");
    if (!auth.ok) return auth.response;
    workerId = `manual-${auth.userId}`;
  }

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const result = await processSelfHealingQueue({
    batchSize: parsed.data.batchSize,
    workerId,
  });

  return NextResponse.json(result);
}
