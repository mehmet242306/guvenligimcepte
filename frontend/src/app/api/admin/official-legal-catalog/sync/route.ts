import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ingestOfficialDocumentFromMevzuat } from "@/lib/legal-corpus/ingest-official-document";
import { requireSuperAdmin } from "@/lib/supabase/api-auth";
import { createServiceClient, parseJsonBody } from "@/lib/security/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const bodySchema = z.object({
  document_id: z.string().uuid(),
});

/**
 * POST — mevzuat.gov.tr HTML veya resmi PDF üzerinden senkron (super admin).
 * Edge function yerine Vercel API: daha okunaklı hata + PDF yedek yolu.
 */
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const service = createServiceClient();
  const { data: doc, error } = await service
    .from("legal_documents")
    .select("*")
    .eq("id", parsed.data.document_id)
    .eq("corpus_scope", "official")
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Belge bulunamadı." }, { status: 404 });
  }

  const result = await ingestOfficialDocumentFromMevzuat(service, {
    id: doc.id,
    doc_number: doc.doc_number,
    title: doc.title,
    doc_type: doc.doc_type,
    source_url: doc.source_url,
    effective_date: doc.effective_date,
    official_gazette_date: doc.official_gazette_date,
    source_hash: doc.source_hash,
    catalog_metadata: doc.catalog_metadata as Record<string, unknown> | null,
  });

  if (!result.ok) {
    const existingMeta = (doc.catalog_metadata as Record<string, unknown> | null) ?? {};
    const sourceType = typeof existingMeta.source_type === "string" ? existingMeta.source_type : "";
    const lastStatus = typeof existingMeta.last_status === "string" ? existingMeta.last_status : "";
    const isManualIndexed =
      sourceType.startsWith("manual_") ||
      lastStatus === "manual_text_indexed" ||
      lastStatus === "manual_docx_indexed" ||
      lastStatus === "manual_pdf_indexed" ||
      lastStatus === "manual_file_indexed";

    const { count: chunkCount } = await service
      .from("legal_chunks")
      .select("id", { count: "exact", head: true })
      .eq("document_id", doc.id);

    const preserveManualIndex = isManualIndexed && (chunkCount ?? 0) > 0;

    await service
      .from("legal_documents")
      .update({
        catalog_metadata: {
          ...existingMeta,
          ...(preserveManualIndex
            ? {
                last_status: lastStatus || "manual_text_indexed",
                last_web_sync_failed_at: new Date().toISOString(),
                last_web_sync_error: result.error,
                last_hints: result.hints ?? [],
              }
            : {
                last_status: "sync_failed",
                last_error: result.error,
                last_hints: result.hints ?? [],
              }),
        },
      })
      .eq("id", doc.id);

    return NextResponse.json(
      {
        error: result.error,
        hints: result.hints ?? [],
        preserved_manual_index: preserveManualIndex,
        chunk_count: chunkCount ?? 0,
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    success: true,
    document: doc.title,
    articles_added: result.articles_added,
    source: result.source,
    article_types: result.article_types,
  });
}
