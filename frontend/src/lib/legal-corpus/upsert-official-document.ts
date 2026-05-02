import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type UpsertOfficialLegalDocumentInput = {
  sourceKey: string;
  jurisdictionCode: string;
  docType: "law" | "regulation" | "communique" | "guide" | "announcement" | "circular";
  docNumber: string;
  title: string;
  sourceUrl: string;
  summaryText: string;
};

function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

export async function upsertOfficialLegalDocument(
  supabase: SupabaseClient,
  input: UpsertOfficialLegalDocumentInput,
): Promise<{ inserted: boolean; documentId: string }> {
  const canonicalUrl = input.sourceUrl.replace(/^http:\/\//i, "https://");
  const sourceHash = hashUrl(canonicalUrl);

  const { data: existing } = await supabase
    .from("legal_documents")
    .select("id")
    .eq("source_url", canonicalUrl)
    .maybeSingle();

  if (existing?.id) {
    return { inserted: false, documentId: existing.id };
  }

  const { data: sourceRow, error: sourceErr } = await supabase
    .from("legal_sources")
    .select("id")
    .eq("source_key", input.sourceKey)
    .maybeSingle();

  if (sourceErr || !sourceRow?.id) {
    throw new Error(`Kaynak bulunamadı: ${input.sourceKey}`);
  }

  const fullText =
    input.summaryText.trim().length > 0 ? input.summaryText.trim() : input.title.trim();

  const { data: doc, error: docErr } = await supabase
    .from("legal_documents")
    .insert({
      source_id: sourceRow.id,
      doc_type: input.docType,
      doc_number: input.docNumber,
      title: input.title.trim(),
      source_url: canonicalUrl,
      source_hash: sourceHash,
      full_text: fullText,
      is_active: true,
      jurisdiction_code: input.jurisdictionCode,
      corpus_scope: "official",
      organization_id: null,
      workspace_id: null,
      last_updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (docErr || !doc?.id) {
    throw new Error(docErr?.message ?? "legal_documents insert failed");
  }

  const effectiveFrom = new Date().toISOString().slice(0, 10);

  const { data: version, error: verErr } = await supabase
    .from("legal_document_versions")
    .insert({
      document_id: doc.id,
      version_label: input.docNumber,
      effective_from: effectiveFrom,
      publication_date: effectiveFrom,
      source_hash: sourceHash,
      raw_text: fullText,
      normalized_text: fullText,
      official_url: canonicalUrl,
      source_type: "official_document",
    })
    .select("id")
    .single();

  if (verErr || !version?.id) {
    await supabase.from("legal_documents").delete().eq("id", doc.id);
    throw new Error(verErr?.message ?? "legal_document_versions insert failed");
  }

  const chunkBody = fullText.slice(0, 12000);
  if (chunkBody.length >= 40) {
    const { error: chunkErr } = await supabase.from("legal_chunks").insert({
      document_id: doc.id,
      version_id: version.id,
      chunk_index: 0,
      article_title: input.title.trim(),
      content: chunkBody,
      metadata: {
        corpus_scope: "official",
        jurisdiction_code: input.jurisdictionCode,
        ingest_connector: input.sourceKey,
        source_url: canonicalUrl,
      },
    });
    if (chunkErr) {
      console.warn("[upsertOfficialLegalDocument] chunk insert:", chunkErr.message);
    }
  }

  return { inserted: true, documentId: doc.id };
}
