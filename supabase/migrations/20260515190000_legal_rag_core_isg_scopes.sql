-- Core ISG RAG retrieval scopes on legal_documents + legal_chunks.
-- Does not delete sources; only scopes what hybrid retrieval returns.

BEGIN;

ALTER TABLE public.legal_documents
  ADD COLUMN IF NOT EXISTS core_isg_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS excluded_from_default_retrieval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rag_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS retrieval_scopes text[] NOT NULL DEFAULT ARRAY['core_isg']::text[],
  ADD COLUMN IF NOT EXISTS disable_reason text,
  ADD COLUMN IF NOT EXISTS scope_reason text;

ALTER TABLE public.legal_documents
  DROP CONSTRAINT IF EXISTS legal_documents_rag_status_check;

ALTER TABLE public.legal_documents
  ADD CONSTRAINT legal_documents_rag_status_check
  CHECK (
    rag_status IN (
      'active',
      'disabled_for_core_isg_rag',
      'legal_procedure_only',
      'sectoral_only'
    )
  );

ALTER TABLE public.legal_chunks
  ADD COLUMN IF NOT EXISTS core_isg_enabled boolean,
  ADD COLUMN IF NOT EXISTS excluded_from_default_retrieval boolean,
  ADD COLUMN IF NOT EXISTS rag_status text,
  ADD COLUMN IF NOT EXISTS retrieval_scopes text[],
  ADD COLUMN IF NOT EXISTS disable_reason text;

COMMENT ON COLUMN public.legal_documents.rag_status IS
  'RAG scope status; does not deactivate the catalog row (is_active unchanged).';

CREATE INDEX IF NOT EXISTS idx_legal_documents_rag_status
  ON public.legal_documents (rag_status)
  WHERE corpus_scope = 'official';

CREATE INDEX IF NOT EXISTS idx_legal_documents_retrieval_scopes
  ON public.legal_documents USING GIN (retrieval_scopes);

-- Backfill chunk denormalized fields from parent documents.
UPDATE public.legal_chunks lc
SET
  core_isg_enabled = ld.core_isg_enabled,
  excluded_from_default_retrieval = ld.excluded_from_default_retrieval,
  rag_status = ld.rag_status,
  retrieval_scopes = ld.retrieval_scopes,
  disable_reason = ld.disable_reason
FROM public.legal_documents ld
WHERE ld.id = lc.document_id
  AND lc.core_isg_enabled IS NULL;

DROP FUNCTION IF EXISTS public.search_legal_chunks_v3(text[], date, integer, text, uuid);

CREATE OR REPLACE FUNCTION public.search_legal_chunks_v3(
  search_terms text[],
  as_of_date date DEFAULT CURRENT_DATE,
  result_limit integer DEFAULT 15,
  jurisdiction_code text DEFAULT 'TR',
  workspace_id uuid DEFAULT NULL,
  retrieval_mode text DEFAULT 'core_isg'
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  version_id uuid,
  doc_title text,
  doc_type text,
  doc_number text,
  article_number text,
  article_title text,
  content text,
  rank double precision
)
LANGUAGE sql
STABLE
AS $$
  WITH j AS (
    SELECT coalesce(nullif(trim(jurisdiction_code), ''), 'TR') AS code
  ),
  mode AS (
    SELECT coalesce(nullif(trim(retrieval_mode), ''), 'core_isg') AS m
  )
  SELECT
    lc.id AS chunk_id,
    ld.id AS document_id,
    ldv.id AS version_id,
    ld.title AS doc_title,
    ld.doc_type,
    ld.doc_number,
    lc.article_number,
    lc.article_title,
    lc.content,
    ts_rank(lc.search_vector, to_tsquery('simple', array_to_string(search_terms, ' | '))) AS rank
  FROM public.legal_chunks lc
  JOIN public.legal_document_versions ldv ON ldv.id = lc.version_id
  JOIN public.legal_documents ld ON ld.id = ldv.document_id
  CROSS JOIN j
  CROSS JOIN mode
  WHERE ld.is_active = true
    AND as_of_date >= ldv.effective_from
    AND (ldv.effective_to IS NULL OR as_of_date <= ldv.effective_to)
    AND (ld.jurisdiction_code = 'GLOBAL' OR ld.jurisdiction_code = j.code)
    AND lc.search_vector @@ to_tsquery('simple', array_to_string(search_terms, ' | '))
    AND (
      mode.m = 'all'
      OR (
        mode.m = 'core_isg'
        AND coalesce(lc.core_isg_enabled, ld.core_isg_enabled, true) = true
        AND coalesce(lc.excluded_from_default_retrieval, ld.excluded_from_default_retrieval, false) = false
        AND coalesce(lc.rag_status, ld.rag_status, 'active') NOT IN (
          'disabled_for_core_isg_rag',
          'legal_procedure_only'
        )
        AND (
          coalesce(lc.retrieval_scopes, ld.retrieval_scopes, ARRAY['core_isg']::text[]) IS NULL
          OR 'core_isg' = ANY(coalesce(lc.retrieval_scopes, ld.retrieval_scopes, ARRAY['core_isg']::text[]))
        )
      )
      OR (
        mode.m = 'legal_procedure'
        AND coalesce(lc.rag_status, ld.rag_status, 'active') IN ('active', 'legal_procedure_only')
        AND (
          coalesce(lc.retrieval_scopes, ld.retrieval_scopes, ARRAY['core_isg']::text[]) IS NULL
          OR 'core_isg' = ANY(coalesce(lc.retrieval_scopes, ld.retrieval_scopes, ARRAY['core_isg']::text[]))
          OR 'legal_procedure' = ANY(coalesce(lc.retrieval_scopes, ld.retrieval_scopes, ARRAY['core_isg']::text[]))
        )
      )
    )
  ORDER BY rank DESC, lc.chunk_index ASC
  LIMIT result_limit;
$$;

DROP FUNCTION IF EXISTS public.search_legal_chunks_dense_v1(vector, date, double precision, integer, text, uuid);

CREATE OR REPLACE FUNCTION public.search_legal_chunks_dense_v1(
  query_embedding vector(1536),
  as_of_date date DEFAULT CURRENT_DATE,
  match_threshold double precision DEFAULT 0.65,
  result_limit integer DEFAULT 15,
  jurisdiction_code text DEFAULT 'TR',
  workspace_id uuid DEFAULT NULL,
  retrieval_mode text DEFAULT 'core_isg'
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  version_id uuid,
  doc_title text,
  doc_type text,
  doc_number text,
  article_number text,
  article_title text,
  content text,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $$
  WITH j AS (
    SELECT coalesce(nullif(trim(jurisdiction_code), ''), 'TR') AS code
  ),
  mode AS (
    SELECT coalesce(nullif(trim(retrieval_mode), ''), 'core_isg') AS m
  )
  SELECT
    lc.id AS chunk_id,
    ld.id AS document_id,
    ldv.id AS version_id,
    ld.title AS doc_title,
    ld.doc_type,
    ld.doc_number,
    lc.article_number,
    lc.article_title,
    lc.content,
    (1 - (lc.embedding <=> query_embedding))::double precision AS similarity
  FROM public.legal_chunks lc
  JOIN public.legal_document_versions ldv ON ldv.id = lc.version_id
  JOIN public.legal_documents ld ON ld.id = ldv.document_id
  CROSS JOIN j
  CROSS JOIN mode
  WHERE ld.is_active = true
    AND lc.embedding IS NOT NULL
    AND as_of_date >= ldv.effective_from
    AND (ldv.effective_to IS NULL OR as_of_date <= ldv.effective_to)
    AND (ld.jurisdiction_code = 'GLOBAL' OR ld.jurisdiction_code = j.code)
    AND (1 - (lc.embedding <=> query_embedding)) > match_threshold
    AND (
      mode.m = 'all'
      OR (
        mode.m = 'core_isg'
        AND coalesce(lc.core_isg_enabled, ld.core_isg_enabled, true) = true
        AND coalesce(lc.excluded_from_default_retrieval, ld.excluded_from_default_retrieval, false) = false
        AND coalesce(lc.rag_status, ld.rag_status, 'active') NOT IN (
          'disabled_for_core_isg_rag',
          'legal_procedure_only'
        )
        AND (
          coalesce(lc.retrieval_scopes, ld.retrieval_scopes, ARRAY['core_isg']::text[]) IS NULL
          OR 'core_isg' = ANY(coalesce(lc.retrieval_scopes, ld.retrieval_scopes, ARRAY['core_isg']::text[]))
        )
      )
      OR (
        mode.m = 'legal_procedure'
        AND coalesce(lc.rag_status, ld.rag_status, 'active') IN ('active', 'legal_procedure_only')
        AND (
          coalesce(lc.retrieval_scopes, ld.retrieval_scopes, ARRAY['core_isg']::text[]) IS NULL
          OR 'core_isg' = ANY(coalesce(lc.retrieval_scopes, ld.retrieval_scopes, ARRAY['core_isg']::text[]))
          OR 'legal_procedure' = ANY(coalesce(lc.retrieval_scopes, ld.retrieval_scopes, ARRAY['core_isg']::text[]))
        )
      )
    )
  ORDER BY lc.embedding <=> query_embedding ASC
  LIMIT result_limit;
$$;

ALTER FUNCTION public.search_legal_chunks_v3(text[], date, integer, text, uuid, text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.search_legal_chunks_dense_v1(vector, date, double precision, integer, text, uuid, text)
  SET search_path = public, pg_temp;

COMMIT;
