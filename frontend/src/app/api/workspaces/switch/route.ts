import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/supabase/api-auth";
import { createServiceClient, parseJsonBody } from "@/lib/security/server";

const switchWorkspaceSchema = z.object({
  workspaceId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, switchWorkspaceSchema);
  if (!parsed.ok) return parsed.response;

  const { workspaceId } = parsed.data;
  const supabase = createServiceClient();

  const membershipResult = await supabase
    .from("nova_workspace_members")
    .select(
      `
      id,
      workspace:nova_workspaces!inner (
        id,
        organization_id
      )
    `,
    )
    .eq("user_id", auth.userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (membershipResult.error) {
    return NextResponse.json({ error: membershipResult.error.message }, { status: 500 });
  }

  const membership = membershipResult.data;
  const workspace = Array.isArray(membership?.workspace) ? membership.workspace[0] : membership?.workspace;

  if (!membership?.id || !workspace?.id) {
    return NextResponse.json({ error: "Bu calisma alanina erisim yetkin yok." }, { status: 403 });
  }

  if (workspace.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "Farkli organizasyon calisma alani secilemez." }, { status: 403 });
  }

  const updateResult = await supabase
    .from("user_profiles")
    .update({ active_workspace_id: workspaceId })
    .eq("auth_user_id", auth.userId);

  if (updateResult.error && !String(updateResult.error.message).includes("active_workspace_id")) {
    return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, workspaceId });
}

