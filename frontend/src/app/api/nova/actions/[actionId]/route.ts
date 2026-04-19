import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/supabase/api-auth";
import { enforceRateLimit } from "@/lib/security/server";
import {
  buildActionStateResponse,
  loadNovaActionRunForUser,
} from "@/lib/nova/action-endpoint";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> },
) {
  try {
    const auth = await requirePermission(request, "ai.use");
    if (!auth.ok) return auth.response;

    const { actionId } = await params;

    const rateLimited = await enforceRateLimit(request, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      endpoint: `/api/nova/actions/${actionId}`,
      scope: "api",
      limit: 90,
      windowSeconds: 60,
      metadata: { feature: "nova_action_status" },
    });
    if (rateLimited) return rateLimited;

    const actionRun = await loadNovaActionRunForUser(actionId, auth.userId, auth.organizationId);
    if (!actionRun) {
      return NextResponse.json({ message: "Nova aksiyonu bulunamadi." }, { status: 404 });
    }

    return NextResponse.json(buildActionStateResponse(actionRun), { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ message }, { status: 500 });
  }
}
