import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const raw = fs.readFileSync(path.join(root, "supabase/seeds/tr_law_catalog.json"), "utf8");
JSON.parse(raw);

const sql = `BEGIN;

ALTER TABLE public.legal_documents
  ADD COLUMN IF NOT EXISTS catalog_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.legal_documents.catalog_metadata IS
  'Curated catalog metadata for official TR laws: category, priority, rag_reason, pdf_url, catalog_order, sync hints.';

INSERT INTO public.legal_documents (
  doc_type,
  doc_number,
  title,
  source_url,
  corpus_scope,
  jurisdiction_code,
  is_active,
  catalog_metadata
)
SELECT
  'law'::text,
  r.law_no::text,
  r.title::text,
  r.canonical_url::text,
  'official'::text,
  'TR'::text,
  true,
  jsonb_strip_nulls(jsonb_build_object(
    'catalog_order', r."order",
    'category', r.category,
    'priority', r.priority,
    'rag_reason', r.rag_reason,
    'pdf_url', nullif(r.pdf_url, ''),
    'authority', 'mevzuat.gov.tr',
    'admin_sync_only', true,
    'sync_interval_days', CASE WHEN r.priority IN ('critical', 'high') THEN 7 ELSE 30 END
  ))
FROM jsonb_to_recordset($catalog$${raw}$catalog$::jsonb) AS r(
  "order" int,
  law_no text,
  title text,
  category text,
  priority text,
  canonical_url text,
  pdf_url text,
  rag_reason text
)
ON CONFLICT (title, doc_number) WHERE doc_number IS NOT NULL DO UPDATE SET
  source_url = EXCLUDED.source_url,
  catalog_metadata = EXCLUDED.catalog_metadata,
  corpus_scope = EXCLUDED.corpus_scope,
  jurisdiction_code = EXCLUDED.jurisdiction_code,
  is_active = EXCLUDED.is_active,
  doc_type = EXCLUDED.doc_type,
  updated_at = now();

COMMIT;
`;

const out = path.join(root, "supabase/migrations/20260512143000_tr_law_catalog_seed.sql");
fs.writeFileSync(out, sql);
console.log("wrote", out, sql.length);
