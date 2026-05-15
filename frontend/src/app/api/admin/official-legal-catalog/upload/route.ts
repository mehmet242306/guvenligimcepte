import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OFFICIAL_LEGAL_DOC_TYPES } from "@/lib/legal-corpus/doc-types";
import { getAnthropicKey } from "@/lib/ai/provider-keys";
import { requireSuperAdmin } from "@/lib/supabase/api-auth";
import { createServiceClient, sanitizePlainText, validateUploadedFile } from "@/lib/security/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const uploadSchema = z.object({
  document_id: z.string().uuid().optional().nullable(),
  title: z.string().min(3).max(500),
  doc_number: z.string().min(2).max(120),
  doc_type: z.enum(OFFICIAL_LEGAL_DOC_TYPES),
  source_url: z.string().url().max(2000).optional().nullable(),
});

let anthropicClient: Anthropic | null = null;

function getAnthropicClient() {
  const apiKey = getAnthropicKey();
  if (!apiKey) return null;
  anthropicClient ??= new Anthropic({ apiKey, maxRetries: 0 });
  return anthropicClient;
}

async function extractPdfText(file: File) {
  const client = getAnthropicClient();
  const buffer = await file.arrayBuffer();
  const fallbackText = extractLoosePdfText(buffer);
  if (!client) {
    return {
      text: fallbackText,
      method: fallbackText ? "loose_pdf_text" : null,
      error: "Anthropic API anahtari bulunamadigi icin PDF metin cikarimi yapilamadi.",
    };
  }

  const base64 = Buffer.from(buffer).toString("base64");
  try {
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6",
      max_tokens: 8192,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text:
                "Bu PDF mevzuat/kilavuz kaynagi olarak yuklenecek. Metni madde basliklari, tablo satirlari ve alt basliklari koruyarak duz metin/Markdown biciminde cikar. Yorum ekleme.",
            },
          ],
        },
      ],
    });

    const text = response.content.find((block) => block.type === "text")?.text?.trim();
    return {
      text: text && text.length > 80 ? text.slice(0, 120_000) : fallbackText,
      method: text && text.length > 80 ? "anthropic_pdf" : fallbackText ? "loose_pdf_text" : null,
      error: text && text.length > 80 ? null : "PDF metni AI tarafinda cikarilamadi.",
    };
  } catch (error) {
    return {
      text: fallbackText,
      method: fallbackText ? "loose_pdf_text" : null,
      error: error instanceof Error ? error.message : "PDF metni cikarilamadi.",
    };
  }
}

function extractLoosePdfText(buffer: ArrayBuffer) {
  const raw = new TextDecoder("latin1", { fatal: false }).decode(new Uint8Array(buffer));
  const parts = Array.from(raw.matchAll(/\(([^()\r\n]{3,500})\)\s*Tj/g), (match) => match[1])
    .concat(Array.from(raw.matchAll(/\(([^()\r\n]{3,500})\)\s*TJ/g), (match) => match[1]))
    .map((part) => part.replace(/\\([()\\])/g, "$1").trim())
    .filter((part) => /[A-Za-zÇĞİÖŞÜçğıöşü0-9]/.test(part));
  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  return text.length > 80 ? text.slice(0, 120_000) : null;
}

function chunkText(text: string, size = 10_000) {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    const part = text.slice(i, i + size).trim();
    if (part) chunks.push(part);
  }
  return chunks;
}

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
      return NextResponse.json({ error: "Gecersiz katalog bilgisi.", details: z.treeifyError(parsed.error) }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "PDF dosyasi gerekli." }, { status: 400 });
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
      return NextResponse.json({ error: `PDF yuklenemedi: ${uploadError.message}` }, { status: 500 });
    }

    const { data: publicUrlData } = service.storage.from("slide-media").getPublicUrl(storagePath);
    const pdfUrl = publicUrlData.publicUrl;
    const extraction = await extractPdfText(file);
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
      return NextResponse.json({ error: `Katalog kaydi kaydedilemedi: ${docError.message}` }, { status: 500 });
    }

    let chunkCount = 0;
    if (extractedText) {
      const effectiveFrom = new Date().toISOString().slice(0, 10);
      const { data: version, error: versionError } = await service
        .from("legal_document_versions")
        .insert({
          document_id: document.id,
          version_label: parsed.data.doc_number,
          effective_from: effectiveFrom,
          publication_date: effectiveFrom,
          source_hash: sourceHash,
          raw_text: extractedText,
          normalized_text: extractedText,
          official_url: parsed.data.source_url || pdfUrl,
          source_type: "manual_pdf_upload",
        })
        .select("id")
        .single();

      if (versionError) {
        return NextResponse.json({ error: `Belge surumu olusturulamadi: ${versionError.message}` }, { status: 500 });
      }

      await service.from("legal_chunks").delete().eq("document_id", document.id);

      const chunks = chunkText(extractedText).map((content, index) => ({
        document_id: document.id,
        version_id: version.id,
        chunk_index: index,
        article_title: index === 0 ? parsed.data.title : `${parsed.data.title} (${index + 1})`,
        content,
        metadata: {
          source: "manual_pdf_upload",
          pdf_url: pdfUrl,
          official_url: parsed.data.source_url || null,
          corpus_scope: "official",
          jurisdiction_code: "TR",
        },
      }));

      const { error: chunkError } = await service.from("legal_chunks").insert(chunks);
      if (chunkError) {
        return NextResponse.json({ error: `PDF metni chunklara ayrilamadi: ${chunkError.message}` }, { status: 500 });
      }
      chunkCount = chunks.length;

      await service
        .from("legal_documents")
        .update({
          last_synced_at: new Date().toISOString(),
          catalog_metadata: {
            ...((document.catalog_metadata as Record<string, unknown> | null) ?? {}),
            ...baseMetadata,
            last_status: "manual_pdf_indexed",
            chunk_count: chunks.length,
          },
        })
        .eq("id", document.id);
    }

    return NextResponse.json({
      document: {
        ...document,
        source_url: parsed.data.source_url || pdfUrl,
        chunk_count: chunkCount,
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
