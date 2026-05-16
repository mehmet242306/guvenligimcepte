import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildEmbeddingInput(row: { article_title: string | null; content: string | null }) {
  const title = (row.article_title ?? "").trim();
  const body = (row.content ?? "").trim();
  return (title ? `${title}\n\n${body}` : body).slice(0, 12_000);
}

function readJwtRole(authHeader: string) {
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const [, payload] = token.split(".");
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized)) as { role?: string };
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

async function generateEmbedding(openaiKey: string, input: string) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`openai_${response.status}:${message.slice(0, 240)}`);
  }

  const payload = await response.json() as { data?: Array<{ embedding?: number[] }> };
  const embedding = payload.data?.[0]?.embedding;
  if (!embedding) throw new Error("openai_empty_embedding");
  return embedding;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = req.headers.get("authorization") ?? "";
  if (!serviceRoleKey || readJwtRole(auth) !== "service_role") {
    return json({ error: "unauthorized" }, 401);
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (!openaiKey) return json({ error: "missing_openai_key" }, 500);

  const body = await req.json().catch(() => ({})) as { limit?: number };
  const limit = Math.min(Math.max(Number(body.limit ?? 100), 1), 500);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    serviceRoleKey,
    { auth: { persistSession: false } },
  );

  const { data: chunks, error } = await supabase
    .from("legal_chunks")
    .select("id, article_title, content")
    .is("embedding", null)
    .order("chunk_index", { ascending: true })
    .limit(limit);

  if (error) return json({ error: error.message }, 500);
  if (!chunks?.length) return json({ ok: true, scanned: 0, updated: 0, failed: 0 });

  let updated = 0;
  let failed = 0;
  const failures: Array<{ id: string; error: string }> = [];

  for (const chunk of chunks) {
    try {
      const input = buildEmbeddingInput(chunk);
      if (!input) throw new Error("empty_content");
      const embedding = await generateEmbedding(openaiKey, input);
      const { error: updateError } = await supabase
        .from("legal_chunks")
        .update({ embedding })
        .eq("id", chunk.id);
      if (updateError) throw updateError;
      updated += 1;
    } catch (err) {
      failed += 1;
      failures.push({
        id: chunk.id,
        error: err instanceof Error ? err.message.slice(0, 240) : "unknown_error",
      });
    }
  }

  return json({
    ok: true,
    scanned: chunks.length,
    updated,
    failed,
    failures: failures.slice(0, 5),
  });
});
