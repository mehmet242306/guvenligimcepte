import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OFFICIAL_LEGAL_DOC_TYPES } from "@/lib/legal-corpus/doc-types";
import { ingestOfficialDocumentFromPdfText } from "@/lib/legal-corpus/ingest-official-document";
import { extractPdfTextFromBuffer } from "@/lib/legal-corpus/pdf-text-extract";
import { requireSuperAdmin } from "@/lib/supabase/api-auth";
import { createServiceClient, sanitizePlainText, validateUploadedFile } from "@/lib/security/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const uploadSchema = z.object({
  document_id: z.string().uuid().optional().nullable(),
  title: z.string().min(3).max(500),
  doc_number: z.string().min(2).max(120),
  doc_type: z.enum(OFFICIAL_LEGAL_DOC_TYPES),
  source_url: z
    .union([z.string().url().max(2000), z.literal("")])
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v)),
});

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const parsed = uploadSchema.safeParse({
      document_id: sanitizePlainText(String(formData.get("document_id") || ""), 80) || null,
      title: sanitizePlainText(String(formData.get("title") || ""), 500),
      doc_number: sanitizePlainText(String(formData.get("doc_number") || ""), 120),
      doc_type: sanitizePlainText(String(formData.get("doc_type") || ""), 40),
      source_url: sanitizePlainText(String(formData.get("source_url") || ""), 2000) || null,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz katalog bilgisi.", details: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }

    if (!file) {
      return NextResponse.json({ error: "PDF dosyası gerekli." }, { status: 400 });
    }

    const fileError = await validateUploadedFile(file, {
      allowedMimeTypes: ["application/pdf"],
      maxBytes: 20 * 1024 * 1024,
      allowedExtensions: [".pdf"],
    });
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }

    const service = createServiceClient();
    const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, "_");
    const storagePath = `official-legal-catalog/${Date.now()}_${safeName}`;
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await service.storage.from("slide-media").upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      return NextResponse.json(
        {
          error: `PDF depolamaya yüklenemedi: ${uploadError.message}. Supabase Storage'da slide-media bucket'ının tanımlı olduğundan emin olun.`,
        },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = service.storage.from("slide-media").getPublicUrl(storagePath);
    const pdfUrl = publicUrlData.publicUrl;
    const extraction = await extractPdfTextFromBuffer(fileBuffer);
    const extractedText = extraction.text;
    const sourceHash = `official-pdf:${parsed.data.doc_number}:${storagePath}`;
    const baseMetadata = {
      source_type: "manual_pdf_upload",
      pdf_url: pdfUrl,
      official_url: parsed.data.source_url || null,
      uploaded_by: auth.userId,
      last_status: extractedText ? "manual_pdf_indexed" : "manual_pdf_uploaded_without_text",
      extraction_method: extraction.method,
      extraction_error: extractedText ? null : extraction.error,
    };

    const documentQuery = parsed.data.document_id
      ? service
          .from("legal_documents")
          .update({
            title: parsed.data.title.trim(),
            doc_number: parsed.data.doc_number.trim(),
            doc_type: parsed.data.doc_type,
            source_url: parsed.data.source_url || pdfUrl,
            full_text: extractedText,
            source_hash: sourceHash,
            catalog_metadata: baseMetadata,
          })
          .eq("id", parsed.data.document_id)
          .eq("corpus_scope", "official")
          .select("id, title, doc_type, doc_number, source_url, last_synced_at, jurisdiction_code, catalog_metadata, is_active")
          .single()
      : service
          .from("legal_documents")
          .insert({
            title: parsed.data.title.trim(),
            doc_number: parsed.data.doc_number.trim(),
            doc_type: parsed.data.doc_type,
            source_url: parsed.data.source_url || pdfUrl,
            jurisdiction_code: "TR",
            corpus_scope: "official",
            is_active: true,
            full_text: extractedText,
            source_hash: sourceHash,
            catalog_metadata: baseMetadata,
          })
          .select("id, title, doc_type, doc_number, source_url, last_synced_at, jurisdiction_code, catalog_metadata, is_active")
          .single();

    const { data: document, error: docError } = await documentQuery;

    if (docError) {
      return NextResponse.json({ error: `Katalog kaydı kaydedilemedi: ${docError.message}` }, { status: 500 });
    }

    let chunkCount = 0;
    if (extractedText) {
      chunkCount = await ingestOfficialDocumentFromPdfText(
        service,
        {
          id: document.id,
          doc_number: parsed.data.doc_number,
          title: parsed.data.title,
          doc_type: parsed.data.doc_type,
          source_url: parsed.data.source_url || pdfUrl,
          catalog_metadata: baseMetadata,
        },
        extractedText,
        {
          source: "manual_pdf_upload",
          pdf_url: pdfUrl,
          official_url: parsed.data.source_url || null,
          corpus_scope: "official",
          jurisdiction_code: "TR",
          extraction_method: extraction.method,
        },
      );
    }

    return NextResponse.json(
      {
        document: {
          ...document,
          source_url: parsed.data.source_url || pdfUrl,
          chunk_count: chunkCount,
        },
        extraction_error: extractedText ? null : extraction.error,
        hints: extractedText
          ? []
          : [
              extraction.error ?? "Metin çıkarılamadı.",
              "Taranmış PDF ise Vercel ortamında ANTHROPIC_API_KEY tanımlayın.",
              "Alternatif: mevzuat.gov.tr’den metin seçilebilir PDF indirip tekrar yükleyin.",
            ],
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
