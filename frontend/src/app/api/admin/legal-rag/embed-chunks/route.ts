import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { embedLegalChunksForDocument, embedMissingLegalChunks } from "@/lib/rag/legal/embeddings";
import { requireSuperAdmin } from "@/lib/supabase/api-auth";
import { createServiceClient, parseJsonBody } from "@/lib/security/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
  document_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(2000).optional().default(500),
});

/**
 * POST — Eksik legal chunk embedding'lerini üretir (super admin).
 */
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const service = createServiceClient();

  try {
    if (parsed.data.document_id) {
      const result = await embedLegalChunksForDocument(service, parsed.data.document_id, {
        onlyMissing: true,
      });
      return NextResponse.json({ ok: true, scope: "document", ...result });
    }

    const result = await embedMissingLegalChunks(service, { limit: parsed.data.limit });
    return NextResponse.json({ ok: true, scope: "batch", ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Embedding üretilemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
