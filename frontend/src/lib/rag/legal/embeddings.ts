import type { SupabaseClient } from "@supabase/supabase-js";
import { getOpenAIKey } from "@/lib/ai/provider-keys";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 24;

export function buildChunkEmbeddingInput(articleTitle: string | null, content: string): string {
  const title = (articleTitle ?? "").trim();
  const body = content.trim();
  const combined = title ? `${title}\n\n${body}` : body;
  return combined.slice(0, 12_000);
}

export async function generateLegalEmbedding(text: string): Promise<number[] | null> {
  const apiKey = getOpenAIKey();
  if (!apiKey || !text.trim()) return null;

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as { data?: Array<{ embedding?: number[] }> };
  return payload.data?.[0]?.embedding ?? null;
}

export async function embedLegalChunksForDocument(
  service: SupabaseClient,
  documentId: string,
  options?: { onlyMissing?: boolean },
): Promise<{ updated: number; failed: number }> {
  let query = service
    .from("legal_chunks")
    .select("id, article_title, content")
    .eq("document_id", documentId)
    .order("chunk_index", { ascending: true });

  if (options?.onlyMissing !== false) {
    query = query.is("embedding", null);
  }

  const { data: chunks, error } = await query;
  if (error) throw new Error(error.message);
  if (!chunks?.length) return { updated: 0, failed: 0 };

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (chunk) => {
        const embedding = await generateLegalEmbedding(
          buildChunkEmbeddingInput(chunk.article_title, chunk.content),
        );
        if (!embedding) {
          failed += 1;
          return;
        }
        const { error: updateError } = await service
          .from("legal_chunks")
          .update({ embedding })
          .eq("id", chunk.id);
        if (updateError) failed += 1;
        else updated += 1;
      }),
    );
  }

  return { updated, failed };
}

export async function embedMissingLegalChunks(
  service: SupabaseClient,
  options?: { limit?: number },
): Promise<{ updated: number; failed: number; scanned: number }> {
  const limit = options?.limit ?? 500;
  const { data: chunks, error } = await service
    .from("legal_chunks")
    .select("id, article_title, content, document_id")
    .is("embedding", null)
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!chunks?.length) return { updated: 0, failed: 0, scanned: 0 };

  let updated = 0;
  let failed = 0;

  for (const chunk of chunks) {
    const embedding = await generateLegalEmbedding(
      buildChunkEmbeddingInput(chunk.article_title, chunk.content),
    );
    if (!embedding) {
      failed += 1;
      continue;
    }
    const { error: updateError } = await service
      .from("legal_chunks")
      .update({ embedding })
      .eq("id", chunk.id);
    if (updateError) failed += 1;
    else updated += 1;
  }

  return { updated, failed, scanned: chunks.length };
}
