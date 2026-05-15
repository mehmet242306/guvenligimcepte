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
    await service
      .from("legal_documents")
      .update({
        catalog_metadata: {
          ...((doc.catalog_metadata as Record<string, unknown> | null) ?? {}),
          last_status: "sync_failed",
          last_error: result.error,
          last_hints: result.hints ?? [],
        },
      })
      .eq("id", doc.id);

    return NextResponse.json(
      { error: result.error, hints: result.hints ?? [] },
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
