import type { SupabaseClient } from "@supabase/supabase-js";
import {
  catalogLawNo,
  docNumberMatchesLawNo,
  type LegalChunkPatch,
  type LegalDocumentPatch,
  type LegalDocumentRepository,
} from "./applyCoreIsgLawScopes";

type LawDocumentRow = {
  id: string;
  doc_number: string | null;
  catalog_metadata: Record<string, unknown> | null;
};

async function findLawDocumentIds(
  service: SupabaseClient,
  lawNo: string,
): Promise<string[]> {
  const { data, error } = await service
    .from("legal_documents")
    .select("id, doc_number, catalog_metadata")
    .eq("doc_type", "law")
    .eq("corpus_scope", "official");

  if (error) throw new Error(error.message);

  return (data as LawDocumentRow[] | null ?? [])
    .filter(
      (row) =>
        docNumberMatchesLawNo(row.doc_number, lawNo) || catalogLawNo(row.catalog_metadata) === lawNo,
    )
    .map((row) => row.id);
}

function toDocumentRow(patch: LegalDocumentPatch) {
  return {
    core_isg_enabled: patch.coreIsgEnabled,
    excluded_from_default_retrieval: patch.excludedFromDefaultRetrieval,
    rag_status: patch.ragStatus,
    retrieval_scopes: patch.retrievalScopes,
    disable_reason: patch.disableReason ?? null,
    scope_reason: patch.scopeReason ?? null,
    updated_at: patch.updatedAt,
  };
}

function toChunkRow(patch: LegalChunkPatch) {
  return {
    core_isg_enabled: patch.coreIsgEnabled,
    excluded_from_default_retrieval: patch.excludedFromDefaultRetrieval,
    rag_status: patch.ragStatus,
    retrieval_scopes: patch.retrievalScopes,
    disable_reason: patch.disableReason ?? null,
  };
}

export function createSupabaseLegalDocumentRepository(
  service: SupabaseClient,
): LegalDocumentRepository {
  return {
    async updateLegalDocumentByLawNo(lawNo: string, patch: LegalDocumentPatch): Promise<number> {
      const ids = await findLawDocumentIds(service, lawNo);
      if (ids.length === 0) return 0;

      const { data, error } = await service
        .from("legal_documents")
        .update(toDocumentRow(patch))
        .in("id", ids)
        .select("id");

      if (error) throw new Error(error.message);
      return data?.length ?? 0;
    },

    async updateChunksByLawNo(lawNo: string, patch: LegalChunkPatch): Promise<number> {
      const ids = await findLawDocumentIds(service, lawNo);
      if (ids.length === 0) return 0;

      const { data, error } = await service
        .from("legal_chunks")
        .update(toChunkRow(patch))
        .in("document_id", ids)
        .select("id");

      if (error) throw new Error(error.message);
      return data?.length ?? 0;
    },
  };
}
