import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/supabase/api-auth";
import { buildUserDataExportBundle, buildUserDataExportCsv } from "@/lib/privacy/data-export";
import {
  createServiceClient,
  enforceRateLimit,
  logSecurityEvent,
  parseJsonBody,
} from "@/lib/security/server";

const bodySchema = z.object({
  format: z.enum(["json", "csv"]),
  targetUserId: z.string().uuid().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const targetUserId = parsed.data.targetUserId ?? auth.userId;
  const isAdminExport = targetUserId !== auth.userId;

  if (isAdminExport) {
    const permission = await requirePermission(request, "compliance.kvkk.manage");
    if (!permission.ok) return permission.response;
  }

  const limitResponse = await enforceRateLimit(request, {
    userId: auth.userId,
    organizationId: auth.organizationId,
    endpoint: "/api/privacy/export",
    scope: "api",
    limit: isAdminExport ? 30 : 10,
    windowSeconds: 24 * 60 * 60,
    metadata: {
      feature: "privacy_export",
      format: parsed.data.format,
      targetUserId,
      scope: isAdminExport ? "admin" : "self",
    },
  });
  if (limitResponse) return limitResponse;

  try {
    const supabase = createServiceClient();
    const bundle = await buildUserDataExportBundle(supabase, targetUserId);

    const retentionPolicy = await supabase
      .from("retention_policies")
      .select("retention_days")
      .eq("entity_type", "data_exports")
      .eq("is_active", true)
      .maybeSingle();

    const retentionDays = Number(retentionPolicy.data?.retention_days ?? 7);
    const targetProfile = bundle.profile ?? {};
    const requestedByProfile = await supabase
      .from("user_profiles")
      .select("full_name, email")
      .eq("auth_user_id", auth.userId)
      .maybeSingle();

    const fileName = `risknova-${targetUserId}-${bundle.exportedAt.slice(0, 10)}.${parsed.data.format}`;
    const payloadJson = parsed.data.format === "json" ? bundle : null;
    const payloadCsv = parsed.data.format === "csv" ? buildUserDataExportCsv(bundle) : null;

    const { data, error } = await supabase
      .from("data_exports")
      .insert({
        target_user_id: targetUserId,
        organization_id: (targetProfile.organization_id as string | null | undefined) ?? auth.organizationId ?? null,
        requested_by: auth.userId,
        request_scope: isAdminExport ? "admin" : "self",
        export_format: parsed.data.format,
        status: "completed",
        target_full_name: (targetProfile.full_name as string | null | undefined) ?? null,
        target_email: (targetProfile.email as string | null | undefined) ?? null,
        requested_by_name: requestedByProfile.data?.full_name ?? null,
        requested_by_email: requestedByProfile.data?.email ?? null,
        file_name: fileName,
        payload_json: payloadJson,
        payload_csv: payloadCsv,
        completed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id, file_name")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Export kaydi olusturulamadi." }, { status: 500 });
    }

    await logSecurityEvent(request, "privacy.export_generated", {
      severity: "info",
      userId: targetUserId,
      organizationId: auth.organizationId,
      details: {
        exportId: data.id,
        requestedBy: auth.userId,
        format: parsed.data.format,
        scope: isAdminExport ? "admin" : "self",
      },
    });

    return NextResponse.json({
      exportId: data.id,
      fileName: data.file_name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
