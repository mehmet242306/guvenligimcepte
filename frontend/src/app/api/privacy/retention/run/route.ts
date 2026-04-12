import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/supabase/api-auth";
import { createServiceClient, logSecurityEvent } from "@/lib/security/server";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "compliance.kvkk.manage");
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("run_retention_policies");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logSecurityEvent(request, "privacy.retention_run", {
      severity: "info",
      userId: auth.userId,
      organizationId: auth.organizationId,
      details: {
        resultCount: Array.isArray(data) ? data.length : 0,
      },
    });

    return NextResponse.json({
      results: Array.isArray(data) ? data : [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
