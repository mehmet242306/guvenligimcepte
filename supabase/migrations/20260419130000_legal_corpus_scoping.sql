BEGIN;

ALTER TABLE public.legal_documents
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS jurisdiction_code text,
  ADD COLUMN IF NOT EXISTS corpus_scope text;

UPDATE public.legal_documents
SET jurisdiction_code = COALESCE(NULLIF(jurisdiction_code, ''), 'TR'),
    corpus_scope = COALESCE(NULLIF(corpus_scope, ''), 'official')
WHERE jurisdiction_code IS NULL
   OR corpus_scope IS NULL;

ALTER TABLE public.legal_documents
  ALTER COLUMN jurisdiction_code SET DEFAULT 'TR',
  ALTER COLUMN corpus_scope SET DEFAULT 'official';

ALTER TABLE public.legal_documents
  DROP CONSTRAINT IF EXISTS legal_documents_jurisdiction_code_format,
  DROP CONSTRAINT IF EXISTS legal_documents_corpus_scope_check;

ALTER TABLE public.legal_documents
  ADD CONSTRAINT legal_documents_jurisdiction_code_format
    CHECK (jurisdiction_code ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT legal_documents_corpus_scope_check
    CHECK (corpus_scope IN ('official', 'tenant_private'));

CREATE INDEX IF NOT EXISTS idx_legal_documents_scope_jurisdiction
  ON public.legal_documents(corpus_scope, jurisdiction_code, is_active);

CREATE INDEX IF NOT EXISTS idx_legal_documents_workspace_scope
  ON public.legal_documents(workspace_id, corpus_scope)
  WHERE workspace_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.exact_legal_reference_lookup(
  law_number text,
  article_patterns text[] DEFAULT NULL,
  as_of_date date DEFAULT current_date,
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
  corpus_scope text,
  jurisdiction_code text,
  workspace_id uuid,
  match_rank double precision
)
LANGUAGE sql
STABLE
AS $$
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
    ld.corpus_scope,
    ld.jurisdiction_code,
    ld.workspace_id,
    CASE
      WHEN article_patterns IS NULL OR cardinality(article_patterns) = 0 THEN 0.95::double precision
      ELSE 1::double precision
    END
    + CASE WHEN ld.corpus_scope = 'official' THEN 0.05::double precision ELSE 0::double precision END
    AS match_rank
  FROM public.legal_chunks lc
  JOIN public.legal_document_versions ldv ON ldv.id = lc.version_id
  JOIN public.legal_documents ld ON ld.id = ldv.document_id
  WHERE ld.is_active = true
    AND ld.doc_number = law_number
    AND as_of_date >= ldv.effective_from
    AND (ldv.effective_to IS NULL OR as_of_date <= ldv.effective_to)
    AND (
      (ld.corpus_scope = 'official' AND (jurisdiction_code IS NULL OR ld.jurisdiction_code = jurisdiction_code))
      OR (workspace_id IS NOT NULL AND ld.corpus_scope = 'tenant_private' AND ld.workspace_id = workspace_id)
    )
    AND (
      article_patterns IS NULL
      OR cardinality(article_patterns) = 0
      OR EXISTS (
        SELECT 1
        FROM unnest(article_patterns) pattern
        WHERE lc.article_number ILIKE '%' || pattern || '%'
      )
    )
  ORDER BY
    CASE WHEN ld.corpus_scope = 'official' THEN 0 ELSE 1 END,
    match_rank DESC,
    lc.chunk_index ASC
  LIMIT result_limit;
$$;

CREATE OR REPLACE FUNCTION public.search_legal_chunks_v3(
  search_terms text[],
  as_of_date date DEFAULT current_date,
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
  corpus_scope text,
  jurisdiction_code text,
  workspace_id uuid,
  rank double precision
)
LANGUAGE sql
STABLE
AS $$
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
    ld.corpus_scope,
    ld.jurisdiction_code,
    ld.workspace_id,
    (
      ts_rank(lc.search_vector, to_tsquery('simple', array_to_string(search_terms, ' | ')))
      + CASE WHEN ld.corpus_scope = 'official' THEN 0.08::double precision ELSE 0::double precision END
    ) AS rank
  FROM public.legal_chunks lc
  JOIN public.legal_document_versions ldv ON ldv.id = lc.version_id
  JOIN public.legal_documents ld ON ld.id = ldv.document_id
  WHERE ld.is_active = true
    AND as_of_date >= ldv.effective_from
    AND (ldv.effective_to IS NULL OR as_of_date <= ldv.effective_to)
    AND (
      (ld.corpus_scope = 'official' AND (jurisdiction_code IS NULL OR ld.jurisdiction_code = jurisdiction_code))
      OR (workspace_id IS NOT NULL AND ld.corpus_scope = 'tenant_private' AND ld.workspace_id = workspace_id)
    )
    AND lc.search_vector @@ to_tsquery('simple', array_to_string(search_terms, ' | '))
  ORDER BY
    CASE WHEN ld.corpus_scope = 'official' THEN 0 ELSE 1 END,
    rank DESC,
    lc.chunk_index ASC
  LIMIT result_limit;
$$;

CREATE OR REPLACE FUNCTION public.search_legal_chunks_dense_v1(
  query_embedding vector(1536),
  as_of_date date DEFAULT current_date,
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
  corpus_scope text,
  jurisdiction_code text,
  workspace_id uuid,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $$
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
    ld.corpus_scope,
    ld.jurisdiction_code,
    ld.workspace_id,
    (
      (1 - (lc.embedding <=> query_embedding))::double precision
      + CASE WHEN ld.corpus_scope = 'official' THEN 0.04::double precision ELSE 0::double precision END
    ) AS similarity
  FROM public.legal_chunks lc
  JOIN public.legal_document_versions ldv ON ldv.id = lc.version_id
  JOIN public.legal_documents ld ON ld.id = ldv.document_id
  WHERE ld.is_active = true
    AND lc.embedding IS NOT NULL
    AND as_of_date >= ldv.effective_from
    AND (ldv.effective_to IS NULL OR as_of_date <= ldv.effective_to)
    AND (
      (ld.corpus_scope = 'official' AND (jurisdiction_code IS NULL OR ld.jurisdiction_code = jurisdiction_code))
      OR (workspace_id IS NOT NULL AND ld.corpus_scope = 'tenant_private' AND ld.workspace_id = workspace_id)
    )
    AND (1 - (lc.embedding <=> query_embedding)) > match_threshold
  ORDER BY
    CASE WHEN ld.corpus_scope = 'official' THEN 0 ELSE 1 END,
    lc.embedding <=> query_embedding ASC
  LIMIT result_limit;
$$;

ALTER FUNCTION public.exact_legal_reference_lookup(text, text[], date, integer, text, uuid)
  SET search_path = '';

ALTER FUNCTION public.search_legal_chunks_v3(text[], date, integer, text, uuid)
  SET search_path = '';

ALTER FUNCTION public.search_legal_chunks_dense_v1(vector, date, double precision, integer, text, uuid)
  SET search_path = '';

DROP POLICY IF EXISTS "legal_documents_read" ON public.legal_documents;
CREATE POLICY "legal_documents_read" ON public.legal_documents
  FOR SELECT
  USING (
    corpus_scope = 'official'
    OR (workspace_id IS NOT NULL AND public.user_has_workspace_access(workspace_id))
  );

DROP POLICY IF EXISTS "legal_chunks_read" ON public.legal_chunks;
CREATE POLICY "legal_chunks_read" ON public.legal_chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.legal_documents ld
      WHERE ld.id = legal_chunks.document_id
        AND (
          ld.corpus_scope = 'official'
          OR (ld.workspace_id IS NOT NULL AND public.user_has_workspace_access(ld.workspace_id))
        )
    )
  );

COMMIT;
