import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyCoreIsgLawScopeRules } from "@/lib/rag/legal/applyCoreIsgLawScopes";
import { createSupabaseLegalDocumentRepository } from "@/lib/rag/legal/supabase-legal-document-repository";
import { requireSuperAdmin } from "@/lib/supabase/api-auth";
import { createServiceClient, parseJsonBody } from "@/lib/security/server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  dry_run: z.boolean().optional().default(false),
});

/**
 * POST — Çekirdek İSG kanun scope kurallarını legal_documents + legal_chunks üzerinde uygular.
 */
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const service = createServiceClient();
  const repository = createSupabaseLegalDocumentRepository(service);

  try {
    const result = await applyCoreIsgLawScopeRules(repository, {
      dryRun: parsed.data.dry_run,
    });

    return NextResponse.json({
      ok: true,
      dry_run: result.dryRun,
      total_rules: result.totalRules,
      document_rows_updated: result.documentRowsUpdated,
      chunk_rows_updated: result.chunkRowsUpdated,
      results: result.results.map((row) => ({
        law_no: row.lawNo,
        title: row.title,
        action: row.action,
        document_rows_updated: row.documentRowsUpdated,
        chunk_rows_updated: row.chunkRowsUpdated,
        rag_status: row.documentPatch.ragStatus,
        retrieval_scopes: row.documentPatch.retrievalScopes,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scope uygulanamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
