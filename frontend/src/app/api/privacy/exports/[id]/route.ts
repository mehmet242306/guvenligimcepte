import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/supabase/api-auth";
import { createServiceClient } from "@/lib/security/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("data_exports")
      .select("id, target_user_id, export_format, file_name, payload_json, payload_csv, status, download_count")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Export bulunamadi." }, { status: 404 });
    }

    if (data.target_user_id !== auth.userId) {
      const permission = await requirePermission(request, "compliance.kvkk.manage");
      if (!permission.ok) return permission.response;
    }

    if (data.status === "expired") {
      return NextResponse.json({ error: "Bu export suresi doldugu icin indirilemiyor." }, { status: 410 });
    }

    const payload =
      data.export_format === "json"
        ? JSON.stringify(data.payload_json ?? {}, null, 2)
        : data.payload_csv ?? "";

    if (!payload) {
      return NextResponse.json({ error: "Export icerigi bulunamadi." }, { status: 404 });
    }

    await supabase
      .from("data_exports")
      .update({
        download_count: 1 + Number((data as { download_count?: number }).download_count ?? 0),
        last_downloaded_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    return new NextResponse(payload, {
      status: 200,
      headers: {
        "Content-Type":
          data.export_format === "json"
            ? "application/json; charset=utf-8"
            : "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${data.file_name}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
