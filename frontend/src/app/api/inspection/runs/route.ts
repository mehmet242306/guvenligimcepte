import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeEntitlement } from "@/lib/billing/entitlements";
import { createServiceClient, parseJsonBody } from "@/lib/security/server";
import { requireAuth } from "@/lib/supabase/api-auth";

const inspectionRunCreateSchema = z.object({
  templateId: z.string().uuid(),
  runMode: z.enum(["official", "preview"]).optional().default("official"),
  siteLabel: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  lineOrShift: z.string().nullable().optional(),
  companyWorkspaceId: z.string().uuid().nullable().optional(),
  totalQuestions: z.number().int().min(0).optional().default(0),
  clientGeneratedAt: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, inspectionRunCreateSchema);
  if (!parsed.ok) return parsed.response;

  const service = createServiceClient();
  const { data: template, error: templateError } = await service
    .from("inspection_checklist_templates")
    .select("id, organization_id")
    .eq("id", parsed.data.templateId)
    .maybeSingle();

  if (templateError || !template?.id || template.organization_id !== auth.organizationId) {
    return NextResponse.json(
      { errorKey: "templateNotFound", error: "Şablon bulunamadı veya erişim yok." },
      { status: 404 },
    );
  }

  if (parsed.data.runMode !== "preview") {
    const quota = await consumeEntitlement(auth, "field_inspection");
    if (quota) return quota;
  }

  const { data: row, error: insertError } = await service
    .from("inspection_runs")
    .insert({
      organization_id: auth.organizationId,
      company_workspace_id: parsed.data.companyWorkspaceId ?? null,
      template_id: parsed.data.templateId,
      run_mode: parsed.data.runMode,
      site_label: parsed.data.siteLabel ?? null,
      location: parsed.data.location ?? null,
      line_or_shift: parsed.data.lineOrShift ?? null,
      total_questions: parsed.data.totalQuestions ?? 0,
      client_generated_at: parsed.data.clientGeneratedAt ?? null,
      synced_at: new Date().toISOString(),
      created_by: auth.userId,
    })
    .select("*, inspection_checklist_templates(title)")
    .single();

  if (insertError || !row) {
    console.error("[inspection/runs] insert failed:", insertError?.message);
    return NextResponse.json(
      { errorKey: "runInsertFailed", error: "Denetim oturumu oluşturulamadı." },
      { status: 500 },
    );
  }

  return NextResponse.json({ run: row });
}
