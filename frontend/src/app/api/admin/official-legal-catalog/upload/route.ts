import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  detectLegalUploadKind,
  extractLegalDocumentText,
} from "@/lib/legal-corpus/document-text-extract";
import { OFFICIAL_LEGAL_DOC_TYPES } from "@/lib/legal-corpus/doc-types";
import { ingestOfficialDocumentFromPdfText } from "@/lib/legal-corpus/ingest-official-document";
import { requireSuperAdmin } from "@/lib/supabase/api-auth";
import { createServiceClient, sanitizePlainText, validateUploadedFile } from "@/lib/security/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const uploadSchema = z.object({
  document_id: z.string().uuid().optional().nullable(),
  title: z.string().min(3).max(500),
  doc_number: z.string().min(2).max(120),
  doc_type: z.enum(OFFICIAL_LEGAL_DOC_TYPES),
  manual_text: z.string().max(500_000).optional().nullable(),
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
      manual_text: String(formData.get("manual_text") || "").trim() || null,
      source_url: sanitizePlainText(String(formData.get("source_url") || ""), 2000) || null,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz katalog bilgisi.", details: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }

    const manualText = parsed.success ? parsed.data.manual_text?.trim() || null : null;

    if (!file && !manualText) {
      return NextResponse.json({ error: "PDF/Word dosyası veya manuel metin gerekli." }, { status: 400 });
    }

    const kind = file ? detectLegalUploadKind(file) : "text";
    if (!kind || (kind !== "text" && !file)) {
      return NextResponse.json(
        { error: "Yalnızca PDF (.pdf), Word (.docx) veya manuel metin desteklenir." },
        { status: 400 },
      );
    }

    if (file) {
      const fileError = await validateUploadedFile(file, {
        allowedMimeTypes: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        maxBytes: 25 * 1024 * 1024,
        allowedExtensions: [".pdf", ".docx"],
      });
      if (fileError) {
        return NextResponse.json({ error: fileError }, { status: 400 });
      }
    }

    const service = createServiceClient();
    let fileUrl: string | null = null;
    let extraction: { text: string | null; method: string | null; error: string | null };

    if (file && kind !== "text") {
      const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, "_");
      const storagePath = `official-legal-catalog/${Date.now()}_${safeName}`;
      const fileBuffer = await file.arrayBuffer();

      const { error: uploadError } = await service.storage.from("slide-media").upload(storagePath, fileBuffer, {
        contentType: file.type || (kind === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        upsert: false,
      });
      if (uploadError) {
        return NextResponse.json(
          {
            error: `Dosya depolamaya yüklenemedi: ${uploadError.message}`,
          },
          { status: 500 },
        );
      }

      const { data: publicUrlData } = service.storage.from("slide-media").getPublicUrl(storagePath);
      fileUrl = publicUrlData.publicUrl;
      extraction = await extractLegalDocumentText(fileBuffer, kind);
    } else {
      extraction = {
        text: manualText && manualText.length > 80 ? manualText.slice(0, 500_000) : null,
        method: "manual_text",
        error: manualText && manualText.length <= 80 ? "Manuel metin çok kısa; en az 80 karakter olmalı." : null,
      };
    }

    const extractedText = extraction.text;
    const sourceHash = `official-${kind}:${parsed.data.doc_number}:${Date.now()}`;
    const baseMetadata = {
      source_type: kind === "text" ? "manual_text_upload" : kind === "docx" ? "manual_docx_upload" : "manual_pdf_upload",
      file_kind: kind,
      pdf_url: kind === "pdf" ? fileUrl : null,
      docx_url: kind === "docx" ? fileUrl : null,
      official_url: parsed.data.source_url || null,
      uploaded_by: auth.userId,
      last_status: extractedText ? "manual_file_indexed" : "manual_file_uploaded_without_text",
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
            source_url: parsed.data.source_url || fileUrl,
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
            source_url: parsed.data.source_url || fileUrl,
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
          source_url: parsed.data.source_url || fileUrl,
          catalog_metadata: baseMetadata,
        },
        extractedText,
        {
          source: kind === "text" ? "manual_text_upload" : kind === "docx" ? "manual_docx_upload" : "manual_pdf_upload",
          file_kind: kind,
          file_url: fileUrl,
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
          source_url: parsed.data.source_url || fileUrl,
          chunk_count: chunkCount,
        },
        extraction_error: extractedText ? null : extraction.error,
        hints: extractedText
          ? []
          : [
              extraction.error ?? "Metin çıkarılamadı.",
              kind === "docx"
                ? "Word dosyasının .docx (Office 2007+) olduğundan emin olun."
                : "PDF yerine aynı metni .docx olarak kaydedip yüklemeyi deneyin.",
            ],
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
