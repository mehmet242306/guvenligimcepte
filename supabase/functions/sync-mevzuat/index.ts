import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resilientFetch } from "../_shared/resilience.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function ensureLegalDocumentVersion(supabase: ReturnType<typeof createClient>, doc: {
  id: string;
  doc_number?: string | null;
  title: string;
  effective_date?: string | null;
  official_gazette_date?: string | null;
  source_hash?: string | null;
  full_text?: string | null;
  source_url?: string | null;
}) {
  const effectiveFrom =
    doc.effective_date ??
    doc.official_gazette_date ??
    new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from('legal_document_versions')
    .select('id')
    .eq('document_id', doc.id)
    .eq('effective_from', effectiveFrom)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from('legal_document_versions')
      .update({
        version_label: doc.doc_number ?? doc.title,
        source_hash: doc.source_hash ?? null,
        raw_text: doc.full_text ?? null,
        normalized_text: doc.full_text ?? null,
        official_url: doc.source_url ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    return existing.id as string;
  }

  const { data, error } = await supabase
    .from('legal_document_versions')
    .insert({
      document_id: doc.id,
      version_label: doc.doc_number ?? doc.title,
      effective_from: effectiveFrom,
      publication_date: doc.official_gazette_date ?? effectiveFrom,
      source_hash: doc.source_hash ?? null,
      raw_text: doc.full_text ?? null,
      normalized_text: doc.full_text ?? null,
      official_url: doc.source_url ?? null,
      source_type: 'official_document',
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

function getMevzuatHtmlUrl(
  docType: string,
  mevzuatNo: string,
  opts?: { mevzuatTur?: number; mevzuatTertip?: number },
): string {
  const tertip = opts?.mevzuatTertip ?? 5;
  let tur = opts?.mevzuatTur;
  if (tur == null) {
    if (docType === 'regulation') tur = 7;
    else if (docType === 'communique') tur = 9;
    else tur = 1;
  }
  return `https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=${mevzuatNo}&MevzuatTur=${tur}&MevzuatTertip=${tertip}`;
}

/** Prefer curated HTML canonical_url (incl. MevzuatTertip=3); fall back to default builder. */
function resolveMevzuatFetchUrl(doc: {
  doc_type: string;
  doc_number?: string | null;
  source_url?: string | null;
  catalog_metadata?: Record<string, unknown> | null;
}): string {
  const sourceUrl = doc.source_url?.trim();
  if (
    sourceUrl &&
    /mevzuat\.gov\.tr/i.test(sourceUrl) &&
    /MevzuatNo=/i.test(sourceUrl)
  ) {
    return sourceUrl;
  }
  const meta = doc.catalog_metadata ?? {};
  const mevzuatNo =
    (typeof meta.mevzuat_no === 'string' && meta.mevzuat_no) ||
    (sourceUrl && /MevzuatNo=(\d+)/i.exec(sourceUrl)?.[1]) ||
    (/^\d+$/.test(doc.doc_number ?? '') ? doc.doc_number : '') ||
    '';
  if (!mevzuatNo) {
    throw new Error('MevzuatNo bulunamadi; once mevzuat.gov.tr uzerinden cozumleyin.');
  }
  return getMevzuatHtmlUrl(doc.doc_type, mevzuatNo, {
    mevzuatTur: typeof meta.mevzuat_tur === 'number' ? meta.mevzuat_tur : undefined,
    mevzuatTertip: typeof meta.mevzuat_tertip === 'number' ? meta.mevzuat_tertip : undefined,
  });
}

function parseArticlesFromHtml(html: string, docTitle: string): Array<{
  article_number: string;
  article_title: string;
  content: string;
  article_type: string;
  is_repealed: boolean;
}> {
  const articles: Array<{
    article_number: string;
    article_title: string;
    content: string;
    article_type: string;
    is_repealed: boolean;
  }> = [];
  
  let cleanText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  const patterns = [
    { regex: /GE\u00c7\u0130C\u0130\s+MADDE\s+(\d+)\s*[-\u2013\u2014]?\s*([\s\S]*?)(?=GE\u00c7\u0130C\u0130\s+MADDE\s+\d|(?:^|\n)MADDE\s+\d|EK\s+MADDE\s+\d|$)/gim, type: 'gecici', prefix: 'Ge\u00e7ici Madde' },
    { regex: /EK\s+MADDE\s+(\d+)\s*[-\u2013\u2014]?\s*([\s\S]*?)(?=GE\u00c7\u0130C\u0130\s+MADDE\s+\d|(?:^|\n)MADDE\s+\d|EK\s+MADDE\s+\d|$)/gim, type: 'ek', prefix: 'Ek Madde' },
    { regex: /(?:^|\n)MADDE\s+(\d+(?:\/[A-Z\u011e\u00dc\u015e\u0130\u00d6\u00c7])?)\s*[-\u2013\u2014]?\s*([\s\S]*?)(?=GE\u00c7\u0130C\u0130\s+MADDE\s+\d|(?:^|\n)MADDE\s+\d|EK\s+MADDE\s+\d|$)/gim, type: 'normal', prefix: 'Madde' },
  ];
  
  const foundArticles = new Map<string, boolean>();
  
  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    while ((match = regex.exec(cleanText)) !== null) {
      const articleNum = match[1].trim();
      let content = match[2].trim();
      if (content.length < 20) continue;
      if (content.length > 10000) content = content.substring(0, 10000) + '...';
      const articleKey = `${pattern.type}-${articleNum}`;
      if (foundArticles.has(articleKey)) continue;
      foundArticles.set(articleKey, true);
      const articleNumber = `${pattern.prefix} ${articleNum}`;
      let actualType = pattern.type;
      if (articleNum.includes('/')) actualType = 'mukerrer';
      const isRepealed = /\(M\u00fclga\)|m\u00fclga edilmi\u015ftir/i.test(content);
      articles.push({ article_number: articleNumber, article_title: articleNumber, content, article_type: actualType, is_repealed: isRepealed });
    }
  }
  
  if (articles.length === 0 && cleanText.length > 200) {
    articles.push({ article_number: 'Giris', article_title: docTitle, content: cleanText.substring(0, 10000), article_type: 'normal', is_repealed: false });
  }
  
  return articles;
}

type SyncDocRow = {
  id: string;
  doc_number?: string | null;
  title: string;
  doc_type: string;
  effective_date?: string | null;
  official_gazette_date?: string | null;
  source_hash?: string | null;
  source_url?: string | null;
  catalog_metadata?: Record<string, unknown> | null;
};

async function syncOneDocument(
  supabase: ReturnType<typeof createClient>,
  doc: SyncDocRow,
): Promise<{ ok: true; articles_added: number; article_types: Record<string, number> } | { ok: false; error: string; status?: number; url?: string }> {
  let htmlUrl: string;
  try {
    htmlUrl = resolveMevzuatFetchUrl(doc);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  console.log('Fetching:', htmlUrl);

  const response = await resilientFetch(
    htmlUrl,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'tr-TR,tr;q=0.9',
      },
    },
    {
      serviceKey: 'external.mevzuat_gov_tr',
      displayName: 'Mevzuat GOV',
      operationName: 'sync_mevzuat_fetch_document',
      fallbackMessage: 'Mevzuat servisi gecici olarak yanit vermiyor.',
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      error: response.fallbackMessage ?? 'Fetch failed',
      status: 503,
      url: htmlUrl,
    };
  }

  const htmlContent = await response.data.text();
  if (htmlContent.length < 500) {
    return { ok: false, error: 'Icerik cok kisa' };
  }

  const articles = parseArticlesFromHtml(htmlContent, doc.title);
  if (articles.length === 0) {
    return { ok: false, error: 'Madde bulunamadi' };
  }

  const versionId = await ensureLegalDocumentVersion(supabase, {
    id: doc.id,
    doc_number: doc.doc_number,
    title: doc.title,
    effective_date: doc.effective_date,
    official_gazette_date: doc.official_gazette_date,
    source_hash: doc.source_hash,
    full_text: htmlContent,
    source_url: doc.source_url,
  });

  await supabase.from('legal_chunks').delete().eq('document_id', doc.id);

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

  const { error: insertError } = await supabase.from('legal_chunks').insert(chunks);
  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  await supabase
    .from('legal_documents')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', doc.id);

  return {
    ok: true,
    articles_added: articles.length,
    article_types: {
      normal: articles.filter((a) => a.article_type === 'normal').length,
      gecici: articles.filter((a) => a.article_type === 'gecici').length,
      ek: articles.filter((a) => a.article_type === 'ek').length,
      mukerrer: articles.filter((a) => a.article_type === 'mukerrer').length,
      mulga: articles.filter((a) => a.is_repealed).length,
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const { action, document_id, doc_numbers } = body as {
      action?: string;
      document_id?: string;
      doc_numbers?: string[];
    };
    
    console.log('Action:', action, 'DocId:', document_id);
    
    if (action === 'list') {
      // Use RPC for efficient single-query with chunk counts
      const { data, error } = await supabase.rpc('get_legal_docs_with_counts');
      
      if (error) {
        console.error('RPC error:', error.message);
        // Fallback: simple query without counts
        const { data: docs, error: docsErr } = await supabase
          .from('legal_documents')
          .select('id, title, doc_type, doc_number, source_url, last_synced_at')
          .order('title');
        
        if (docsErr) {
          console.error('Fallback error:', docsErr.message);
          return jsonResp({ error: docsErr.message }, 500);
        }
        return jsonResp((docs || []).map(d => ({ ...d, chunk_count: 0 })));
      }
      
      return jsonResp(data || []);
      
    } else if (action === 'sync_single' && document_id) {
      const { data: doc, error: docError } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('id', document_id)
        .single();

      if (docError || !doc) {
        console.error('Doc not found:', docError?.message);
        return jsonResp({ error: 'Mevzuat bulunamadi' }, 404);
      }

      const result = await syncOneDocument(supabase, doc as SyncDocRow);
      if (!result.ok) {
        return jsonResp(
          { error: result.error, url: result.url, degraded: result.status === 503 },
          result.status ?? 400,
        );
      }

      return jsonResp({
        success: true,
        document: doc.title,
        articles_added: result.articles_added,
        article_types: result.article_types,
      });
    } else if (action === 'sync_by_doc_numbers' && Array.isArray(doc_numbers) && doc_numbers.length > 0) {
      const numbers = doc_numbers.map((n) => String(n).trim()).filter(Boolean);
      const { data: docs, error: docsErr } = await supabase
        .from('legal_documents')
        .select('id, doc_number, title, doc_type')
        .eq('doc_type', 'law')
        .in('doc_number', numbers);

      if (docsErr) {
        return jsonResp({ error: docsErr.message }, 500);
      }

      const found = new Map((docs ?? []).map((d) => [d.doc_number, d]));
      const results: Array<Record<string, unknown>> = [];

      for (const num of numbers) {
        const doc = found.get(num);
        if (!doc) {
          results.push({ doc_number: num, success: false, error: 'Belge bulunamadi' });
          continue;
        }

        try {
          const { data: fullDoc, error: docError } = await supabase
            .from('legal_documents')
            .select('*')
            .eq('id', doc.id)
            .single();

          if (docError || !fullDoc) {
            results.push({ doc_number: num, success: false, error: 'Mevzuat bulunamadi' });
            continue;
          }

          const result = await syncOneDocument(supabase, fullDoc as SyncDocRow);
          if (!result.ok) {
            results.push({
              doc_number: num,
              title: fullDoc.title,
              success: false,
              error: result.error,
              url: result.url,
            });
            continue;
          }

          results.push({
            doc_number: num,
            title: fullDoc.title,
            success: true,
            articles_added: result.articles_added,
          });

          await new Promise((r) => setTimeout(r, 1500));
        } catch (err) {
          results.push({
            doc_number: num,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      return jsonResp({
        success: results.every((r) => r.success),
        synced: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      });
    } else if (action === 'test') {
      return jsonResp({ status: 'ok', timestamp: new Date().toISOString(), message: 'Edge Function calisiyor!' });
    } else {
      return jsonResp({
        error: 'Gecersiz action',
        valid_actions: ['sync_single', 'sync_by_doc_numbers', 'list', 'test'],
      }, 400);
    }
  } catch (error) {
    console.error('Caught error:', error.message, error.stack);
    return jsonResp({ error: error.message }, 500);
  }
});

function jsonResp(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
