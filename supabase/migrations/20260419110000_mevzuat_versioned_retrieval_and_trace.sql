CREATE TABLE IF NOT EXISTS public.legal_document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  version_label text,
  effective_from date NOT NULL,
  effective_to date,
  publication_date date,
  repealed_at date,
  source_hash text,
  raw_text text,
  normalized_text text,
  official_url text,
  source_type text DEFAULT 'official_document',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (document_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_legal_document_versions_document
  ON public.legal_document_versions(document_id);

CREATE INDEX IF NOT EXISTS idx_legal_document_versions_effective
  ON public.legal_document_versions(document_id, effective_from, effective_to);

ALTER TABLE public.legal_chunks
  ADD COLUMN IF NOT EXISTS version_id uuid REFERENCES public.legal_document_versions(id) ON DELETE CASCADE;

INSERT INTO public.legal_document_versions (
  document_id,
  version_label,
  effective_from,
  publication_date,
  source_hash,
  raw_text,
  normalized_text,
  official_url,
  source_type
)
SELECT
  ld.id,
  coalesce(ld.doc_number, ld.title, 'initial'),
  coalesce(ld.effective_date, ld.official_gazette_date, ld.created_at::date, current_date),
  coalesce(ld.official_gazette_date, ld.created_at::date, current_date),
  ld.source_hash,
  ld.full_text,
  coalesce(ld.full_text, ld.full_text_html),
  ld.source_url,
  'official_document'
FROM public.legal_documents ld
WHERE NOT EXISTS (
  SELECT 1
  FROM public.legal_document_versions ldv
  WHERE ldv.document_id = ld.id
);

UPDATE public.legal_chunks lc
SET version_id = ldv.id
FROM public.legal_document_versions ldv
WHERE ldv.document_id = lc.document_id
  AND lc.version_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_legal_chunks_version
  ON public.legal_chunks(version_id);

CREATE TABLE IF NOT EXISTS public.legal_retrieval_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid,
  query_text text NOT NULL,
  as_of_date date NOT NULL,
  answer_mode text NOT NULL DEFAULT 'extractive' CHECK (answer_mode IN ('extractive', 'polish')),
  retrieval_trace jsonb NOT NULL DEFAULT '{}'::jsonb,
  answer_preview text,
  confidence numeric(5,4),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_retrieval_runs_user_created
  ON public.legal_retrieval_runs(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.legal_answer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retrieval_run_id uuid NOT NULL REFERENCES public.legal_retrieval_runs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid,
  label text NOT NULL CHECK (label IN ('supported', 'incomplete', 'wrong_version', 'wrong_scope', 'incorrect_citation')),
  notes text,
  corrected_citations jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.legal_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_retrieval_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_answer_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "legal_document_versions_read_all" ON public.legal_document_versions;
CREATE POLICY "legal_document_versions_read_all"
  ON public.legal_document_versions
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "legal_retrieval_runs_own_read" ON public.legal_retrieval_runs;
DROP POLICY IF EXISTS "legal_retrieval_runs_own_insert" ON public.legal_retrieval_runs;
CREATE POLICY "legal_retrieval_runs_own_read"
  ON public.legal_retrieval_runs
  FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "legal_retrieval_runs_own_insert"
  ON public.legal_retrieval_runs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "legal_answer_reviews_own_read" ON public.legal_answer_reviews;
DROP POLICY IF EXISTS "legal_answer_reviews_own_insert" ON public.legal_answer_reviews;
CREATE POLICY "legal_answer_reviews_own_read"
  ON public.legal_answer_reviews
  FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "legal_answer_reviews_own_insert"
  ON public.legal_answer_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.exact_legal_reference_lookup(
  law_number text,
  article_patterns text[] DEFAULT NULL,
  as_of_date date DEFAULT current_date,
  result_limit integer DEFAULT 5
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
  WHERE ld.is_active = true
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

CREATE OR REPLACE FUNCTION public.search_legal_chunks_v3(
  search_terms text[],
  as_of_date date DEFAULT current_date,
  result_limit integer DEFAULT 15
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
  WHERE ld.is_active = true
    AND as_of_date >= ldv.effective_from
    AND (ldv.effective_to IS NULL OR as_of_date <= ldv.effective_to)
    AND lc.search_vector @@ to_tsquery('simple', array_to_string(search_terms, ' | '))
  ORDER BY rank DESC, lc.chunk_index ASC
  LIMIT result_limit;
$$;

CREATE OR REPLACE FUNCTION public.search_legal_chunks_dense_v1(
  query_embedding vector(1536),
  as_of_date date DEFAULT current_date,
  match_threshold double precision DEFAULT 0.65,
  result_limit integer DEFAULT 15
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
  WHERE ld.is_active = true
    AND lc.embedding IS NOT NULL
    AND as_of_date >= ldv.effective_from
    AND (ldv.effective_to IS NULL OR as_of_date <= ldv.effective_to)
    AND (1 - (lc.embedding <=> query_embedding)) > match_threshold
  ORDER BY lc.embedding <=> query_embedding ASC
  LIMIT result_limit;
$$;

ALTER FUNCTION public.exact_legal_reference_lookup(text, text[], date, integer)
  SET search_path = '';

ALTER FUNCTION public.search_legal_chunks_v3(text[], date, integer)
  SET search_path = '';

ALTER FUNCTION public.search_legal_chunks_dense_v1(vector, date, double precision, integer)
  SET search_path = '';
