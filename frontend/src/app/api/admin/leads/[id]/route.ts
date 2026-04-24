import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, parseJsonBody } from "@/lib/security/server";
import { getAccountContextForUser } from "@/lib/account/account-routing";

// =============================================================================
// PATCH /api/admin/leads/[id]
// =============================================================================
// Platform admin, enterprise_leads.status alanını günceller. Sadece izin
// verilen durum değerleri kabul edilir. Diğer tüm alanlar read-only (admin
// UI'dan değişmesi beklenmez).
// =============================================================================

const bodySchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "converted", "rejected"]),
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
    const { error } = await service
      .from("enterprise_leads")
      .update({ status: parsed.data.status })
      .eq("id", id);

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
