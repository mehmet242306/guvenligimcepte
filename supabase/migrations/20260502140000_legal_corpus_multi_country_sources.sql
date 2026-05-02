-- Multi-country legal corpus: tag sources by jurisdiction, optional corpus_scope columns,
-- admin-friendly aggregate view for platform dashboard.

BEGIN;

-- Align legal_documents with tenant upload route (safe IF NOT EXISTS).
ALTER TABLE public.legal_documents
  ADD COLUMN IF NOT EXISTS corpus_scope text;

ALTER TABLE public.legal_documents
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.legal_documents
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

UPDATE public.legal_documents
SET corpus_scope = 'tenant_private'
WHERE corpus_scope IS NULL
  AND organization_id IS NOT NULL;

UPDATE public.legal_documents
SET corpus_scope = 'official'
WHERE corpus_scope IS NULL;

ALTER TABLE public.legal_documents
  ALTER COLUMN corpus_scope SET DEFAULT 'official';

ALTER TABLE public.legal_documents
  ALTER COLUMN corpus_scope SET NOT NULL;

ALTER TABLE public.legal_documents
  DROP CONSTRAINT IF EXISTS legal_documents_corpus_scope_check;

ALTER TABLE public.legal_documents
  ADD CONSTRAINT legal_documents_corpus_scope_check
  CHECK (corpus_scope IN ('official', 'tenant_private'));

COMMENT ON COLUMN public.legal_documents.corpus_scope IS
  'official = shared regulatory corpus; tenant_private = workspace/org uploads for RAG.';

-- Tag catalogue rows by ISO jurisdiction (TR seeds + future connectors).
ALTER TABLE public.legal_sources
  ADD COLUMN IF NOT EXISTS jurisdiction_code text;

UPDATE public.legal_sources
SET jurisdiction_code = 'TR'
WHERE jurisdiction_code IS NULL;

ALTER TABLE public.legal_sources
  ALTER COLUMN jurisdiction_code SET DEFAULT 'TR';

ALTER TABLE public.legal_sources
  ALTER COLUMN jurisdiction_code SET NOT NULL;

ALTER TABLE public.legal_sources
  DROP CONSTRAINT IF EXISTS legal_sources_jurisdiction_code_check;

ALTER TABLE public.legal_sources
  ADD CONSTRAINT legal_sources_jurisdiction_code_check
  CHECK (
    jurisdiction_code = 'GLOBAL'
    OR jurisdiction_code ~ '^[A-Z]{2}$'
  );

CREATE INDEX IF NOT EXISTS idx_legal_sources_jurisdiction_code
  ON public.legal_sources (jurisdiction_code);

COMMENT ON COLUMN public.legal_sources.jurisdiction_code IS
  'ISO 3166-1 alpha-2 for the authority publishing this catalogue, or GLOBAL for cross-border portals (e.g. EUR-Lex).';

INSERT INTO public.legal_sources (source_key, source_name, base_url, jurisdiction_code, scrape_enabled)
VALUES
  (
    'legislation_gov_uk',
    'UK Legislation (legislation.gov.uk)',
    'https://www.legislation.gov.uk',
    'GB',
    true
  ),
  (
    'eur_lex_portal',
    'EUR-Lex',
    'https://eur-lex.europa.eu',
    'GLOBAL',
    false
  ),
  (
    'gesetze_im_internet_de',
    'Gesetze im Internet (DE)',
    'https://www.gesetze-im-internet.de',
    'DE',
    false
  )
ON CONFLICT (source_key) DO NOTHING;

-- Stats for admin UI (service_role reads via PostgREST).
CREATE OR REPLACE VIEW public.legal_document_stats_by_jurisdiction AS
SELECT
  ld.jurisdiction_code,
  COUNT(*)::bigint AS document_count,
  COUNT(*) FILTER (WHERE ld.is_active)::bigint AS active_document_count,
  COUNT(*) FILTER (WHERE ld.corpus_scope = 'official')::bigint AS official_document_count,
  COUNT(*) FILTER (WHERE ld.corpus_scope = 'tenant_private')::bigint AS tenant_private_document_count
FROM public.legal_documents ld
GROUP BY ld.jurisdiction_code;

COMMENT ON VIEW public.legal_document_stats_by_jurisdiction IS
  'Aggregates legal_documents rows by jurisdiction_code for platform-admin dashboards.';

GRANT SELECT ON public.legal_document_stats_by_jurisdiction TO service_role;

COMMIT;
