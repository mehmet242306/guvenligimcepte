import type { SupabaseClient } from "@supabase/supabase-js";
import {
  chunkPlainText,
  parseArticlesFromHtml,
  parseArticlesFromPlainText,
  resolveMevzuatFetchUrls,
  type ParsedArticle,
} from "@/lib/legal-corpus/mevzuat-parse";
import { extractPdfTextFromUrl } from "@/lib/legal-corpus/pdf-text-extract";

export type IngestResult =
  | {
      ok: true;
      articles_added: number;
      source: "html" | "pdf";
      article_types?: Record<string, number>;
    }
  | { ok: false; error: string; hints?: string[] };

type DocRow = {
  id: string;
  doc_number: string;
  title: string;
  doc_type: string;
  source_url?: string | null;
  effective_date?: string | null;
  official_gazette_date?: string | null;
  source_hash?: string | null;
  catalog_metadata?: Record<string, unknown> | null;
};

async function ensureVersion(
  service: SupabaseClient,
  doc: DocRow,
  fullText: string | null,
  officialUrl: string | null,
) {
  const effectiveFrom =
    doc.effective_date ?? doc.official_gazette_date ?? new Date().toISOString().slice(0, 10);

  const { data: existing } = await service
    .from("legal_document_versions")
    .select("id")
    .eq("document_id", doc.id)
    .eq("effective_from", effectiveFrom)
    .maybeSingle();

  if (existing?.id) {
    await service
      .from("legal_document_versions")
      .update({
        version_label: doc.doc_number,
        raw_text: fullText,
        normalized_text: fullText,
        official_url: officialUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return existing.id as string;
  }

  const { data, error } = await service
    .from("legal_document_versions")
    .insert({
      document_id: doc.id,
      version_label: doc.doc_number,
      effective_from: effectiveFrom,
      publication_date: effectiveFrom,
      source_hash: doc.source_hash,
      raw_text: fullText,
      normalized_text: fullText,
      official_url: officialUrl,
      source_type: "official_document",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

async function persistArticles(
  service: SupabaseClient,
  doc: DocRow,
  articles: ParsedArticle[],
  versionId: string,
  fullText: string | null,
  officialUrl: string | null,
) {
  await service.from("legal_chunks").delete().eq("document_id", doc.id);

  const chunks = articles.map((article, index) => ({
    document_id: doc.id,
    version_id: versionId,
    chunk_index: index,
    article_number: article.article_number,
    article_title: article.article_title,
    content: article.content,
    article_type: article.article_type,
    is_repealed: article.is_repealed,
    content_tokens: Math.ceil(article.content.length / 4),
  }));

  const { error: insertError } = await service.from("legal_chunks").insert(chunks);
  if (insertError) throw new Error(insertError.message);

  await service
    .from("legal_documents")
    .update({
      last_synced_at: new Date().toISOString(),
      full_text: fullText,
      source_url: officialUrl ?? doc.source_url,
      catalog_metadata: {
        ...((doc.catalog_metadata as Record<string, unknown> | null) ?? {}),
        last_status: "synced",
        last_sync_source: "mevzuat",
        chunk_count: chunks.length,
      },
    })
    .eq("id", doc.id);

  return chunks.length;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) return null;
    const text = await response.text();
    return text.length >= 500 ? text : null;
  } catch {
    return null;
  }
}

export async function ingestOfficialDocumentFromMevzuat(
  service: SupabaseClient,
  doc: DocRow,
): Promise<IngestResult> {
  const { htmlUrl, pdfUrl, mevzuatNo } = resolveMevzuatFetchUrls(doc);

  if (!mevzuatNo && !htmlUrl && !pdfUrl) {
    return {
      ok: false,
      error: "MevzuatNo bulunamadı. Kayıt numarasını (ör. 6306) veya mevzuat.gov.tr bağlantısını düzeltin.",
    };
  }

  const hints: string[] = [];
  let articles: ParsedArticle[] = [];
  let fullText: string | null = null;
  let source: "html" | "pdf" = "html";
  let officialUrl = htmlUrl ?? doc.source_url ?? null;

  if (htmlUrl) {
    const html = await fetchHtml(htmlUrl);
    if (html) {
      articles = parseArticlesFromHtml(html, doc.title);
      if (articles.length > 0 && articles[0].article_number !== "Giriş") {
        fullText = html;
        const versionId = await ensureVersion(service, doc, fullText, officialUrl);
        const count = await persistArticles(service, doc, articles, versionId, fullText, officialUrl);
        return {
          ok: true,
          articles_added: count,
          source: "html",
          article_types: summarizeTypes(articles),
        };
      }
      hints.push("HTML sayfasından madde çıkarılamadı (site SPA olabilir).");
    } else {
      hints.push("HTML sayfası okunamadı.");
    }
  }

  if (pdfUrl) {
    const pdf = await extractPdfTextFromUrl(pdfUrl);
    if (pdf.text && pdf.text.length > 80) {
      source = "pdf";
      fullText = pdf.text;
      officialUrl = pdfUrl;
      articles = parseArticlesFromHtml(
        `<pre>${pdf.text.replace(/</g, "&lt;")}</pre>`,
        doc.title,
      );
      if (articles.length === 1 && articles[0].article_number === "Giriş") {
        const parts = chunkPlainText(pdf.text);
        articles = parts.map((content, index) => ({
          article_number: `Bölüm ${index + 1}`,
          article_title: index === 0 ? doc.title : `${doc.title} (${index + 1})`,
          content,
          article_type: "normal",
          is_repealed: false,
        }));
      }
      const versionId = await ensureVersion(service, doc, fullText, officialUrl);
      const count = await persistArticles(service, doc, articles, versionId, fullText, officialUrl);

      await service
        .from("legal_documents")
        .update({
          catalog_metadata: {
            ...((doc.catalog_metadata as Record<string, unknown> | null) ?? {}),
            pdf_url: pdfUrl,
            last_status: "synced",
            last_sync_source: "mevzuat_pdf",
            extraction_method: pdf.method,
          },
        })
        .eq("id", doc.id);

      return {
        ok: true,
        articles_added: count,
        source: "pdf",
        article_types: summarizeTypes(articles),
      };
    }
    hints.push(pdf.error ?? "Resmi PDF metni çıkarılamadı.");
  }

  return {
    ok: false,
    error: "Mevzuat.gov.tr üzerinden ne HTML ne PDF ile içerik alınamadı.",
    hints: [
      ...hints,
      "1) Ayarlar → mevzuat.gov.tr’den PDF indirip aynı satırdaki yükleme ikonuyla yükleyin.",
      "2) Vercel’de ANTHROPIC_API_KEY tanımlı olmalı (taranmış PDF için).",
      "3) Bağlantıda MevzuatNo ve MevzuatTur doğru olmalı.",
    ],
  };
}

function summarizeTypes(articles: ParsedArticle[]) {
  return {
    normal: articles.filter((a) => a.article_type === "normal").length,
    gecici: articles.filter((a) => a.article_type === "gecici").length,
    ek: articles.filter((a) => a.article_type === "ek").length,
    mukerrer: articles.filter((a) => a.article_type === "mukerrer").length,
    mulga: articles.filter((a) => a.is_repealed).length,
  };
}

export async function ingestOfficialDocumentFromPdfText(
  service: SupabaseClient,
  doc: DocRow,
  extractedText: string,
  meta: Record<string, unknown>,
) {
  let articles = parseArticlesFromPlainText(extractedText, doc.title);
  if (articles.length === 1 && articles[0].article_number === "Giriş") {
    const parts = chunkPlainText(extractedText);
    articles = parts.map((content, index) => ({
      article_number: `Bölüm ${index + 1}`,
      article_title: index === 0 ? doc.title : `${doc.title} (${index + 1})`,
      content,
      article_type: "normal",
      is_repealed: false,
    }));
  }

  const versionId = await ensureVersion(service, doc, extractedText, doc.source_url ?? null);
  await service.from("legal_chunks").delete().eq("document_id", doc.id);

  const chunks = articles.map((article, index) => ({
    document_id: doc.id,
    version_id: versionId,
    chunk_index: index,
    article_number: article.article_number,
    article_title: article.article_title,
    content: article.content,
    article_type: article.article_type,
    is_repealed: false,
    content_tokens: Math.ceil(article.content.length / 4),
    metadata: meta,
  }));

  const { error } = await service.from("legal_chunks").insert(chunks);
  if (error) throw new Error(error.message);

  await service
    .from("legal_documents")
    .update({
      last_synced_at: new Date().toISOString(),
      full_text: extractedText,
      catalog_metadata: {
        ...((doc.catalog_metadata as Record<string, unknown> | null) ?? {}),
        ...meta,
        last_status: getManualIndexedStatus(meta),
        chunk_count: chunks.length,
      },
    })
    .eq("id", doc.id);

  return chunks.length;
}

function getManualIndexedStatus(meta: Record<string, unknown>) {
  if (meta.source === "manual_text_upload" || meta.file_kind === "text") return "manual_text_indexed";
  if (meta.source === "manual_docx_upload" || meta.file_kind === "docx") return "manual_docx_indexed";
  if (meta.source === "manual_pdf_upload" || meta.file_kind === "pdf") return "manual_pdf_indexed";
  return "manual_file_indexed";
}
