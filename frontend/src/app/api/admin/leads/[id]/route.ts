import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, parseJsonBody } from "@/lib/security/server";
import { getAccountContextForUser } from "@/lib/account/account-routing";

// =============================================================================
// PATCH /api/admin/leads/[id]
// =============================================================================
// Platform admin: enterprise_leads.status ve admin_notes (manuel teklif/limit).
// =============================================================================

const bodySchema = z
  .object({
    status: z.enum(["new", "contacted", "qualified", "converted", "rejected"]).optional(),
    admin_notes: z.string().max(8000).optional().nullable(),
  })
  .refine((d) => d.status !== undefined || d.admin_notes !== undefined, {
    message: "status_or_admin_notes_required",
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const context = await getAccountContextForUser(user.id);
    if (!context?.isPlatformAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const parsed = await parseJsonBody(request, bodySchema);
    if (!parsed.ok) return parsed.response;

    const service = createServiceClient();
    const updates: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.admin_notes !== undefined) updates.admin_notes = parsed.data.admin_notes;

    const { error } = await service.from("enterprise_leads").update(updates).eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: `Güncellenemedi: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Beklenmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
