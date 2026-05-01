-- RAG jurisdiction: legal_documents + ai_knowledge_base rows carry ISO 3166-1 alpha-2
-- or GLOBAL (hybrid pool). Retrieval returns rows matching workspace country OR GLOBAL.

BEGIN;

ALTER TABLE public.legal_documents
  ADD COLUMN IF NOT EXISTS jurisdiction_code text NOT NULL DEFAULT 'TR';

ALTER TABLE public.legal_documents
  DROP CONSTRAINT IF EXISTS legal_documents_jurisdiction_code_check;

ALTER TABLE public.legal_documents
  ADD CONSTRAINT legal_documents_jurisdiction_code_check
  CHECK (
    jurisdiction_code = 'GLOBAL'
    OR jurisdiction_code ~ '^[A-Z]{2}$'
  );

COMMENT ON COLUMN public.legal_documents.jurisdiction_code IS
  'ISO 3166-1 alpha-2 country corpus for this document, or GLOBAL for jurisdiction-agnostic reference material ingested into the same vector pipeline.';

CREATE INDEX IF NOT EXISTS idx_legal_documents_jurisdiction_code
  ON public.legal_documents (jurisdiction_code);

ALTER TABLE public.ai_knowledge_base
  ADD COLUMN IF NOT EXISTS jurisdiction_code text NOT NULL DEFAULT 'TR';

ALTER TABLE public.ai_knowledge_base
  DROP CONSTRAINT IF EXISTS ai_knowledge_base_jurisdiction_code_check;

ALTER TABLE public.ai_knowledge_base
  ADD CONSTRAINT ai_knowledge_base_jurisdiction_code_check
  CHECK (
    jurisdiction_code = 'GLOBAL'
    OR jurisdiction_code ~ '^[A-Z]{2}$'
  );

COMMENT ON COLUMN public.ai_knowledge_base.jurisdiction_code IS
  'Same semantics as legal_documents.jurisdiction_code for knowledge-base RAG rows.';

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_base_jurisdiction_code
  ON public.ai_knowledge_base (jurisdiction_code);

-- Replace retrieval functions: workspace sees GLOBAL + own country (default TR).

DROP FUNCTION IF EXISTS public.search_legal_chunks_v3(text[], date, integer);

CREATE OR REPLACE FUNCTION public.search_legal_chunks_v3(
  search_terms text[],
  as_of_date date DEFAULT CURRENT_DATE,
  result_limit integer DEFAULT 15,
  jurisdiction_code text DEFAULT 'TR',
  workspace_id uuid DEFAULT NULL
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
  WHERE ld.is_active = true
    AND as_of_date >= ldv.effective_from
    AND (ldv.effective_to IS NULL OR as_of_date <= ldv.effective_to)
    AND (ld.jurisdiction_code = 'GLOBAL' OR ld.jurisdiction_code = j.code)
    AND lc.search_vector @@ to_tsquery('simple', array_to_string(search_terms, ' | '))
  ORDER BY rank DESC, lc.chunk_index ASC
  LIMIT result_limit;
$$;

DROP FUNCTION IF EXISTS public.search_legal_chunks_dense_v1(vector, date, double precision, integer);

CREATE OR REPLACE FUNCTION public.search_legal_chunks_dense_v1(
  query_embedding vector(1536),
  as_of_date date DEFAULT CURRENT_DATE,
  match_threshold double precision DEFAULT 0.65,
  result_limit integer DEFAULT 15,
  jurisdiction_code text DEFAULT 'TR',
  workspace_id uuid DEFAULT NULL
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
  WHERE ld.is_active = true
    AND lc.embedding IS NOT NULL
    AND as_of_date >= ldv.effective_from
    AND (ldv.effective_to IS NULL OR as_of_date <= ldv.effective_to)
    AND (ld.jurisdiction_code = 'GLOBAL' OR ld.jurisdiction_code = j.code)
    AND (1 - (lc.embedding <=> query_embedding)) > match_threshold
  ORDER BY lc.embedding <=> query_embedding ASC
  LIMIT result_limit;
$$;

DROP FUNCTION IF EXISTS public.exact_legal_reference_lookup(text, text[], date, integer);

CREATE OR REPLACE FUNCTION public.exact_legal_reference_lookup(
  law_number text,
  article_patterns text[] DEFAULT NULL,
  as_of_date date DEFAULT CURRENT_DATE,
  result_limit integer DEFAULT 5,
  jurisdiction_code text DEFAULT 'TR',
  workspace_id uuid DEFAULT NULL
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
  match_rank double precision
)
LANGUAGE sql
STABLE
AS $$
  WITH j AS (
    SELECT coalesce(nullif(trim(jurisdiction_code), ''), 'TR') AS code
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
    CASE
      WHEN article_patterns IS NULL OR cardinality(article_patterns) = 0 THEN 0.95::double precision
      ELSE 1::double precision
    END AS match_rank
  FROM public.legal_chunks lc
  JOIN public.legal_document_versions ldv ON ldv.id = lc.version_id
  JOIN public.legal_documents ld ON ld.id = ldv.document_id
  CROSS JOIN j
  WHERE ld.is_active = true
    AND (ld.jurisdiction_code = 'GLOBAL' OR ld.jurisdiction_code = j.code)
    AND ld.doc_number = law_number
    AND as_of_date >= ldv.effective_from
    AND (ldv.effective_to IS NULL OR as_of_date <= ldv.effective_to)
    AND (
      article_patterns IS NULL
      OR cardinality(article_patterns) = 0
      OR EXISTS (
        SELECT 1
        FROM unnest(article_patterns) pattern
        WHERE lc.article_number ILIKE '%' || pattern || '%'
      )
    )
  ORDER BY match_rank DESC, lc.chunk_index ASC
  LIMIT result_limit;
$$;

DROP FUNCTION IF EXISTS public.search_isg_knowledge(vector, text, double precision, integer);

CREATE OR REPLACE FUNCTION public.search_isg_knowledge(
  query_embedding vector(1536),
  category_filter text DEFAULT NULL,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 10,
  jurisdiction_code text DEFAULT 'TR'
)
RETURNS TABLE (
  id uuid,
  category text,
  title text,
  content text,
  source_type text,
  reliability_score float,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  j text := coalesce(nullif(trim(jurisdiction_code), ''), 'TR');
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.category,
    kb.title,
    kb.content,
    kb.source_type,
    kb.reliability_score,
    (1 - (kb.content_embedding <=> query_embedding))::float AS similarity
  FROM public.ai_knowledge_base kb
  WHERE kb.content_embedding IS NOT NULL
    AND (1 - (kb.content_embedding <=> query_embedding)) > match_threshold
    AND (category_filter IS NULL OR kb.category = category_filter)
    AND (kb.jurisdiction_code = 'GLOBAL' OR kb.jurisdiction_code = j)
  ORDER BY kb.content_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

ALTER FUNCTION public.search_legal_chunks_v3(text[], date, integer, text, uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.search_legal_chunks_dense_v1(vector, date, double precision, integer, text, uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.exact_legal_reference_lookup(text, text[], date, integer, text, uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.search_isg_knowledge(vector, text, double precision, integer, text)
  SET search_path = public, pg_temp;

COMMIT;
