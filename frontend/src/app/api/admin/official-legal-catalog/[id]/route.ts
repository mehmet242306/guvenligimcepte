import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OFFICIAL_LEGAL_DOC_TYPES } from "@/lib/legal-corpus/doc-types";
import { requireSuperAdmin } from "@/lib/supabase/api-auth";
import { createServiceClient, parseJsonBody } from "@/lib/security/server";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    title: z.string().min(3).max(500).optional(),
    doc_number: z.string().min(2).max(120).optional(),
    doc_type: z.enum(OFFICIAL_LEGAL_DOC_TYPES).optional(),
    source_url: z
      .union([z.string().url().max(2000), z.literal("")])
      .optional()
      .nullable()
      .transform((v) => (v === "" ? null : v)),
    is_active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "empty_patch" });

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * PATCH — Başlık, tür, numara veya kaynak bağlantısını güncelle.
 */
export async function PATCH(request: NextRequest, { params }: RouteCtx) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const parsed = await parseJsonBody(request, patchSchema);
  if (!parsed.ok) return parsed.response;

  const service = createServiceClient();

  const { data: existing, error: fetchErr } = await service
    .from("legal_documents")
    .select("id, corpus_scope")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (existing.corpus_scope !== "official") {
    return NextResponse.json({ error: "not_official_catalog" }, { status: 403 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.title !== undefined) updates.title = parsed.data.title.trim();
  if (parsed.data.doc_number !== undefined) updates.doc_number = parsed.data.doc_number.trim();
  if (parsed.data.doc_type !== undefined) updates.doc_type = parsed.data.doc_type;
  if (parsed.data.source_url !== undefined) {
    updates.source_url = parsed.data.source_url?.trim() || null;
  }
  if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active;

  const { data, error } = await service
    .from("legal_documents")
    .update(updates)
    .eq("id", id)
    .select(
      "id, title, doc_type, doc_number, source_url, last_synced_at, jurisdiction_code, catalog_metadata, is_active",
    )
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ document: data });
}

/**
 * DELETE — Katalogdan kaldır (chunk'lar CASCADE).
 */
export async function DELETE(_request: NextRequest, { params }: RouteCtx) {
  const auth = await requireSuperAdmin(_request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: existing } = await service
    .from("legal_documents")
    .select("id, corpus_scope, title")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (existing.corpus_scope !== "official") {
    return NextResponse.json({ error: "not_official_catalog" }, { status: 403 });
  }

  const { error } = await service.from("legal_documents").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: { id, title: existing.title } });
}
