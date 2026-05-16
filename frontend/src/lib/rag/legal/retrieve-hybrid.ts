import type { SupabaseClient } from "@supabase/supabase-js";
import { getRetrievalModeForUserQuery } from "./applyCoreIsgLawScopes";
import { generateLegalEmbedding } from "./embeddings";
import { buildSearchTerms } from "./query-expand";

export type LegalEvidenceHit = {
  chunk_id: string;
  document_id: string;
  version_id: string | null;
  law: string;
  article: string | null;
  title: string | null;
  content: string;
  doc_number: string | null;
  doc_type: string | null;
  relevance_score: number;
  match_type: "exact" | "lexical" | "dense";
  rank_fusion_score?: number;
  citation_id?: string;
};

type RpcRow = {
  chunk_id: string;
  document_id: string;
  version_id: string;
  doc_title: string;
  doc_type: string;
  doc_number: string;
  article_number: string | null;
  article_title: string | null;
  content: string;
  rank?: number;
  similarity?: number;
};

function minMaxNorm(scores: number[]): (score: number) => number {
  if (scores.length === 0) return () => 0;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max === min) return () => 1;
  return (score) => (score - min) / (max - min);
}

function reciprocalRankFusion(lists: LegalEvidenceHit[][], weights: number[]): LegalEvidenceHit[] {
  const fused = new Map<string, LegalEvidenceHit>();
  const k = 60;

  lists.forEach((list, listIndex) => {
    const weight = weights[listIndex] ?? 1;
    list.forEach((hit, rank) => {
      const key = hit.chunk_id;
      const contribution = weight * (1 / (k + rank + 1));
      const existing = fused.get(key);
      if (existing) {
        existing.rank_fusion_score = (existing.rank_fusion_score ?? 0) + contribution;
      } else {
        fused.set(key, { ...hit, rank_fusion_score: contribution });
      }
    });
  });

  return Array.from(fused.values()).sort(
    (a, b) => Number(b.rank_fusion_score ?? 0) - Number(a.rank_fusion_score ?? 0),
  );
}

function mapRow(row: RpcRow, matchType: "lexical" | "dense", score: number): LegalEvidenceHit {
  return {
    chunk_id: row.chunk_id,
    document_id: row.document_id,
    version_id: row.version_id,
    law: row.doc_title,
    article: row.article_number,
    title: row.article_title,
    content: row.content,
    doc_number: row.doc_number,
    doc_type: row.doc_type,
    relevance_score: score,
    match_type: matchType,
  };
}

export async function retrieveLegalEvidenceHybrid(
  service: SupabaseClient,
  params: {
    query: string;
    jurisdictionCode?: string;
    workspaceId?: string | null;
    organizationId?: string | null;
    asOfDate?: string;
    resultLimit?: number;
  },
): Promise<{
  hits: LegalEvidenceHit[];
  retrievalMode: string;
  topLexicalRank: number;
  topDenseSimilarity: number;
}> {
  const searchTerms = buildSearchTerms(params.query);
  const retrievalMode = getRetrievalModeForUserQuery(params.query);
  const asOfDate = params.asOfDate ?? new Date().toISOString().slice(0, 10);
  const jurisdictionCode = params.jurisdictionCode ?? "TR";
  const workspaceId = params.workspaceId ?? null;
  const organizationId = params.organizationId ?? null;
  const limit = params.resultLimit ?? 24;

  const rpcBase = {
    as_of_date: asOfDate,
    result_limit: limit,
    jurisdiction_code: jurisdictionCode,
    workspace_id: workspaceId,
    organization_id: organizationId,
    retrieval_mode: retrievalMode,
  };

  let lexicalHits: LegalEvidenceHit[] = [];
  let denseHits: LegalEvidenceHit[] = [];

  if (searchTerms.length > 0) {
    const { data: lexicalRows } = await service.rpc("search_legal_chunks_v3", {
      search_terms: searchTerms,
      ...rpcBase,
    });
    const lexicalScores = ((lexicalRows as RpcRow[]) ?? []).map((r) => Number(r.rank ?? 0));
    const norm = minMaxNorm(lexicalScores);
    lexicalHits = ((lexicalRows as RpcRow[]) ?? []).map((row, index) =>
      mapRow(row, "lexical", norm(lexicalScores[index] ?? 0)),
    );
  }

  const queryEmbedding = await generateLegalEmbedding(params.query);
  if (queryEmbedding) {
    const { data: denseRows } = await service.rpc("search_legal_chunks_dense_v1", {
      query_embedding: queryEmbedding,
      match_threshold: 0.52,
      ...rpcBase,
    });
    const denseScores = ((denseRows as RpcRow[]) ?? []).map((r) => Number(r.similarity ?? 0));
    const norm = minMaxNorm(denseScores);
    denseHits = ((denseRows as RpcRow[]) ?? []).map((row, index) =>
      mapRow(row, "dense", norm(denseScores[index] ?? 0)),
    );
  }

  const fused = reciprocalRankFusion([lexicalHits, denseHits], [1.25, 1]).slice(0, 12);
  const topLexicalRank = Math.max(0, ...lexicalHits.map((h) => h.relevance_score));
  const topDenseSimilarity = Math.max(0, ...denseHits.map((h) => h.relevance_score));

  return {
    hits: fused.map((hit, index) => ({ ...hit, citation_id: `CIT-${index + 1}` })),
    retrievalMode,
    topLexicalRank,
    topDenseSimilarity,
  };
}
