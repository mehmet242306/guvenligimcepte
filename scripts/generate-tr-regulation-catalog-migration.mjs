import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function extractMevzuatNo(url) {
  if (!url) return null;
  const m = /MevzuatNo=(\d+)/i.exec(url);
  return m ? m[1] : null;
}

function toCatalogRow(item) {
  const mevzuatNo = extractMevzuatNo(item.canonicalUrl);
  return {
    id: item.id,
    order: item.order,
    title: item.title,
    category: item.category,
    priority: item.priority,
    authority: item.authority,
    canonical_url: item.canonicalUrl ?? null,
    official_lookup_url: item.officialLookupUrl ?? "https://www.mevzuat.gov.tr/",
    rg_issue_url: item.rgIssueUrl ?? null,
    sync_mode: item.syncMode ?? "admin_only_weekly",
    mevzuat_no: mevzuatNo,
    doc_number: mevzuatNo ?? item.id,
  };
}

const tsPath = path.join(root, "frontend/src/lib/legal-corpus/regulation-sources.ts");
const ts = fs.readFileSync(tsPath, "utf8");
const match = ts.match(
  /export const regulationSources\s*=\s*(\[[\s\S]*?\])\s*as const\s*;/,
);
if (!match) {
  throw new Error("Could not parse regulationSources from TS file");
}
// Data-only array; safe for build-time extraction.
const regulationSources = Function(`"use strict"; return (${match[1]});`)();
const catalog = regulationSources.map(toCatalogRow);
const raw = JSON.stringify(catalog, null, 2);

fs.writeFileSync(path.join(root, "supabase/seeds/tr_regulation_catalog.json"), raw);

const sql = `BEGIN;

-- Merge legacy regulation rows (old doc_number / PDF-only seeds) by title.
WITH catalog AS (
  SELECT
    r.doc_number::text AS doc_number,
    r.title::text AS title,
    nullif(r.canonical_url, '')::text AS source_url,
    jsonb_strip_nulls(jsonb_build_object(
      'catalog_id', r.id,
      'catalog_order', r."order",
      'category', r.category,
      'priority', r.priority,
      'authority', r.authority,
      'canonical_url', nullif(r.canonical_url, ''),
      'official_lookup_url', r.official_lookup_url,
      'rg_issue_url', nullif(r.rg_issue_url, ''),
      'sync_mode', r.sync_mode,
      'mevzuat_no', r.mevzuat_no,
      'canonical_resolved', (r.canonical_url IS NOT NULL AND r.canonical_url <> ''),
      'admin_sync_only', true,
      'sync_interval_days', 7,
      'last_status', CASE
        WHEN r.canonical_url IS NOT NULL AND r.canonical_url <> '' THEN 'resolved'
        ELSE 'pending'
      END
    )) AS catalog_metadata
  FROM jsonb_to_recordset($catalog$${raw}$catalog$::jsonb) AS r(
    id text,
    "order" int,
    title text,
    category text,
    priority text,
    authority text,
    canonical_url text,
    official_lookup_url text,
    rg_issue_url text,
    sync_mode text,
    mevzuat_no text,
    doc_number text
  )
)
UPDATE public.legal_documents ld
SET
  doc_number = c.doc_number,
  source_url = c.source_url,
  catalog_metadata = c.catalog_metadata,
  corpus_scope = 'official',
  jurisdiction_code = 'TR',
  is_active = true,
  doc_type = 'regulation',
  updated_at = now()
FROM catalog c
WHERE ld.doc_type = 'regulation'
  AND ld.title = c.title;

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
  'regulation'::text,
  r.doc_number::text,
  r.title::text,
  nullif(r.canonical_url, '')::text,
  'official'::text,
  'TR'::text,
  true,
  jsonb_strip_nulls(jsonb_build_object(
    'catalog_id', r.id,
    'catalog_order', r."order",
    'category', r.category,
    'priority', r.priority,
    'authority', r.authority,
    'canonical_url', nullif(r.canonical_url, ''),
    'official_lookup_url', r.official_lookup_url,
    'rg_issue_url', nullif(r.rg_issue_url, ''),
    'sync_mode', r.sync_mode,
    'mevzuat_no', r.mevzuat_no,
    'canonical_resolved', (r.canonical_url IS NOT NULL AND r.canonical_url <> ''),
    'admin_sync_only', true,
    'sync_interval_days', 7,
    'last_status', CASE
      WHEN r.canonical_url IS NOT NULL AND r.canonical_url <> '' THEN 'resolved'
      ELSE 'pending'
    END
  ))
FROM jsonb_to_recordset($catalog$${raw}$catalog$::jsonb) AS r(
  id text,
  "order" int,
  title text,
  category text,
  priority text,
  authority text,
  canonical_url text,
  official_lookup_url text,
  rg_issue_url text,
  sync_mode text,
  mevzuat_no text,
  doc_number text
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

const out = path.join(root, "supabase/migrations/20260512150000_tr_regulation_catalog_seed.sql");
fs.writeFileSync(out, sql);
console.log("regulations:", catalog.length);
console.log("with canonical_url:", catalog.filter((r) => r.canonical_url).length);
console.log("wrote", out);
