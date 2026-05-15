import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function mapDocType(sourceType) {
  if (sourceType === "annual_table") return "announcement";
  return "communique";
}

function resolveSourceUrl(item) {
  if (item.officialUrl) return item.officialUrl;
  if (item.canonicalUrl) return item.canonicalUrl;
  return null;
}

function toCatalogRow(item) {
  return {
    id: item.id,
    order: item.order,
    doc_type: mapDocType(item.sourceType),
    source_type: item.sourceType,
    title: item.title,
    category: item.category,
    priority: item.priority,
    authority: item.authority,
    main_use: item.mainUse ?? null,
    source_url: resolveSourceUrl(item),
    doc_number: item.id,
    mevzuat_tur: item.mevzuatTur ?? 9,
    mevzuat_tertip: item.mevzuatTertip ?? 5,
    mevzuat_lookup_url: item.mevzuatLookupUrl ?? null,
    resmi_gazete_issue_url: item.resmiGazeteIssueUrl ?? null,
    resmi_gazete_issue_no: item.resmiGazeteIssueNo ?? null,
    resmi_gazete_lookup_url: item.resmiGazeteLookupUrl ?? null,
    first_publication_date: item.firstPublicationDate ?? null,
    official_lookup_url: item.officialLookupUrl ?? null,
    official_url: item.officialUrl ?? null,
    change_resolver_title_contains: item.changeResolverTitleContains ?? null,
    resolver_title_contains: item.resolverTitleContains ?? null,
    expected_document_pattern: item.expectedDocumentPattern ?? null,
    rag_key_prefix: item.ragKeyPrefix ?? null,
    sync_interval_days: item.syncIntervalDays ?? 14,
    admin_sync_only: item.adminSyncOnly !== false,
  };
}

const tsPath = path.join(root, "frontend/src/lib/legal-corpus/teblig-and-table-sources.ts");
const ts = fs.readFileSync(tsPath, "utf8");
const match = ts.match(
  /export const tebligAndTableSources\s*=\s*(\[[\s\S]*?\])\s*as const\s*;/,
);
if (!match) throw new Error("Could not parse tebligAndTableSources from TS file");

const sources = Function(`"use strict"; return (${match[1]});`)();
const catalog = sources.map(toCatalogRow);
const raw = JSON.stringify(catalog, null, 2);

fs.writeFileSync(path.join(root, "supabase/seeds/tr_teblig_catalog.json"), raw);

const sql = `BEGIN;

WITH catalog AS (
  SELECT
    r.doc_type::text,
    r.doc_number::text,
    r.title::text,
    r.source_url::text,
    jsonb_strip_nulls(jsonb_build_object(
      'catalog_id', r.id,
      'catalog_order', r."order",
      'source_type', r.source_type,
      'category', r.category,
      'priority', r.priority,
      'authority', r.authority,
      'main_use', r.main_use,
      'mevzuat_tur', r.mevzuat_tur,
      'mevzuat_tertip', r.mevzuat_tertip,
      'mevzuat_lookup_url', r.mevzuat_lookup_url,
      'resmi_gazete_issue_url', r.resmi_gazete_issue_url,
      'resmi_gazete_issue_no', r.resmi_gazete_issue_no,
      'resmi_gazete_lookup_url', r.resmi_gazete_lookup_url,
      'first_publication_date', r.first_publication_date,
      'official_lookup_url', r.official_lookup_url,
      'official_url', r.official_url,
      'change_resolver_title_contains', r.change_resolver_title_contains,
      'resolver_title_contains', r.resolver_title_contains,
      'expected_document_pattern', r.expected_document_pattern,
      'rag_key_prefix', r.rag_key_prefix,
      'admin_sync_only', r.admin_sync_only,
      'sync_interval_days', r.sync_interval_days,
      'canonical_resolved', (r.source_url IS NOT NULL AND r.source_url ~* 'mevzuat\\.gov\\.tr.*MevzuatNo='),
      'last_status', CASE
        WHEN r.source_type = 'annual_table' THEN 'external_table'
        WHEN r.source_url IS NOT NULL AND r.source_url ~* 'mevzuat\\.gov\\.tr.*MevzuatNo=' THEN 'resolved'
        WHEN r.source_url IS NOT NULL AND r.source_url !~* 'mevzuat\\.gov\\.tr' THEN 'external_source'
        ELSE 'pending'
      END
    )) AS catalog_metadata
  FROM jsonb_to_recordset($catalog$${raw}$catalog$::jsonb) AS r(
    id text,
    "order" int,
    doc_type text,
    source_type text,
    title text,
    category text,
    priority text,
    authority text,
    main_use text,
    source_url text,
    doc_number text,
    mevzuat_tur int,
    mevzuat_tertip int,
    mevzuat_lookup_url text,
    resmi_gazete_issue_url text,
    resmi_gazete_issue_no text,
    resmi_gazete_lookup_url text,
    first_publication_date text,
    official_lookup_url text,
    official_url text,
    change_resolver_title_contains jsonb,
    resolver_title_contains jsonb,
    expected_document_pattern jsonb,
    rag_key_prefix text,
    sync_interval_days int,
    admin_sync_only boolean
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
  doc_type = c.doc_type,
  updated_at = now()
FROM catalog c
WHERE ld.title = c.title
  AND ld.doc_type IN ('communique', 'announcement');

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
  r.doc_type::text,
  r.doc_number::text,
  r.title::text,
  r.source_url::text,
  'official'::text,
  'TR'::text,
  true,
  jsonb_strip_nulls(jsonb_build_object(
    'catalog_id', r.id,
    'catalog_order', r."order",
    'source_type', r.source_type,
    'category', r.category,
    'priority', r.priority,
    'authority', r.authority,
    'main_use', r.main_use,
    'mevzuat_tur', r.mevzuat_tur,
    'mevzuat_tertip', r.mevzuat_tertip,
    'mevzuat_lookup_url', r.mevzuat_lookup_url,
    'resmi_gazete_issue_url', r.resmi_gazete_issue_url,
    'resmi_gazete_issue_no', r.resmi_gazete_issue_no,
    'resmi_gazete_lookup_url', r.resmi_gazete_lookup_url,
    'first_publication_date', r.first_publication_date,
    'official_lookup_url', r.official_lookup_url,
    'official_url', r.official_url,
    'change_resolver_title_contains', r.change_resolver_title_contains,
    'resolver_title_contains', r.resolver_title_contains,
    'expected_document_pattern', r.expected_document_pattern,
    'rag_key_prefix', r.rag_key_prefix,
    'admin_sync_only', r.admin_sync_only,
    'sync_interval_days', r.sync_interval_days,
    'canonical_resolved', (r.source_url IS NOT NULL AND r.source_url ~* 'mevzuat\\.gov\\.tr.*MevzuatNo='),
    'last_status', CASE
      WHEN r.source_type = 'annual_table' THEN 'external_table'
      WHEN r.source_url IS NOT NULL AND r.source_url ~* 'mevzuat\\.gov\\.tr.*MevzuatNo=' THEN 'resolved'
      WHEN r.source_url IS NOT NULL AND r.source_url !~* 'mevzuat\\.gov\\.tr' THEN 'external_source'
      ELSE 'pending'
    END
  ))
FROM jsonb_to_recordset($catalog$${raw}$catalog$::jsonb) AS r(
  id text,
  "order" int,
  doc_type text,
  source_type text,
  title text,
  category text,
  priority text,
  authority text,
  main_use text,
  source_url text,
  doc_number text,
  mevzuat_tur int,
  mevzuat_tertip int,
  mevzuat_lookup_url text,
  resmi_gazete_issue_url text,
  resmi_gazete_issue_no text,
  resmi_gazete_lookup_url text,
  first_publication_date text,
  official_lookup_url text,
  official_url text,
  change_resolver_title_contains jsonb,
  resolver_title_contains jsonb,
  expected_document_pattern jsonb,
  rag_key_prefix text,
  sync_interval_days int,
  admin_sync_only boolean
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

const out = path.join(root, "supabase/migrations/20260512153000_tr_teblig_catalog_seed.sql");
fs.writeFileSync(out, sql);
console.log("teblig/table sources:", catalog.length);
console.log("wrote", out);
