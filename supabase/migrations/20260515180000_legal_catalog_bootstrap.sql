-- Idempotent bootstrap for legal catalog seeds (remote may lack newer columns).
BEGIN;

ALTER TABLE public.legal_documents
  ADD COLUMN IF NOT EXISTS catalog_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.legal_documents WHERE corpus_scope IS NULL LIMIT 1
  ) THEN
    UPDATE public.legal_documents SET corpus_scope = 'official' WHERE corpus_scope IS NULL;
  END IF;
  ALTER TABLE public.legal_documents ALTER COLUMN corpus_scope SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

ALTER TABLE public.legal_documents
  DROP CONSTRAINT IF EXISTS legal_documents_corpus_scope_check;

ALTER TABLE public.legal_documents
  ADD CONSTRAINT legal_documents_corpus_scope_check
  CHECK (corpus_scope IN ('official', 'tenant_private'));

COMMENT ON COLUMN public.legal_documents.catalog_metadata IS
  'Curated catalog metadata: category, priority, legal_weight, sync hints, source links.';

COMMIT;
