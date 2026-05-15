import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OFFICIAL_LEGAL_DOC_TYPES } from "@/lib/legal-corpus/doc-types";
import { requireSuperAdmin } from "@/lib/supabase/api-auth";
import { createServiceClient, parseJsonBody } from "@/lib/security/server";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(3).max(500),
  doc_number: z.string().min(2).max(120),
  doc_type: z.enum(OFFICIAL_LEGAL_DOC_TYPES),
  source_url: z
    .union([z.string().url().max(2000), z.literal("")])
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v)),
  jurisdiction_code: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional()
    .default("TR"),
});

/**
 * GET — Resmi katalog + chunk sayıları (super admin).
 */
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const docType = searchParams.get("docType")?.trim() || null;
  const q = searchParams.get("q")?.trim().toLowerCase() || "";

  const service = createServiceClient();

  let query = service
    .from("legal_documents")
    .select(
      "id, title, doc_type, doc_number, source_url, last_synced_at, jurisdiction_code, catalog_metadata, is_active, legal_chunks(count)",
    )
    .eq("corpus_scope", "official")
    .order("title", { ascending: true });

  if (docType && OFFICIAL_LEGAL_DOC_TYPES.includes(docType as (typeof OFFICIAL_LEGAL_DOC_TYPES)[number])) {
    query = query.eq("doc_type", docType);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let documents = (data ?? []).map((row) => {
    const chunkAgg = row.legal_chunks as { count: number }[] | null;
    const chunkCount = chunkAgg?.[0]?.count ?? 0;
    const { legal_chunks: _chunks, ...doc } = row;
    return { ...doc, chunk_count: chunkCount };
  });

  if (q) {
    documents = documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.doc_number.toLowerCase().includes(q) ||
        (d.source_url ?? "").toLowerCase().includes(q),
    );
  }

  return NextResponse.json({ documents });
}

/**
 * POST — Yeni resmi mevzuat kaydı (super admin).
 */
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, createSchema);
  if (!parsed.ok) return parsed.response;

  const service = createServiceClient();
  const body = parsed.data;

  const { data, error } = await service
    .from("legal_documents")
    .insert({
      title: body.title.trim(),
      doc_number: body.doc_number.trim(),
      doc_type: body.doc_type,
      source_url: body.source_url?.trim() || null,
      jurisdiction_code: body.jurisdiction_code,
      corpus_scope: "official",
      is_active: true,
      catalog_metadata: {
        last_status: body.source_url ? "pending" : "needs_url",
        added_by: "super_admin",
      },
    })
    .select(
      "id, title, doc_type, doc_number, source_url, last_synced_at, jurisdiction_code, catalog_metadata, is_active",
    )
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ document: { ...data, chunk_count: 0 } }, { status: 201 });
}
