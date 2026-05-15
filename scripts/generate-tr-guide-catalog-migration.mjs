import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** Maps catalog source_type → legal_source_priority rank key. */
function retrievalRankKey(sourceType) {
  if (sourceType === "official_template_catalog") return "official_template";
  if (
    sourceType === "official_guide_catalog" ||
    sourceType === "official_guide" ||
    sourceType === "official_book" ||
    sourceType === "sector_guide"
  ) {
    return "official_guide";
  }
  return "official_guide";
}

function mapDocType(sourceType) {
  return "guide";
}

function resolveSourceUrl(item) {
  return item.officialUrl ?? null;
}

function resolveLastStatus(item) {
  if (item.discoveryMode) return "catalog_discovery";
  if (item.officialUrl) return "resolved";
  if (item.resolverTitleContains?.length) return "pending";
  return "pending";
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
    main_use: item.mainUse,
    legal_weight: item.legalWeight,
    retrieval_rank_key: retrievalRankKey(item.sourceType),
    source_url: resolveSourceUrl(item),
    doc_number: item.id,
    official_url: item.officialUrl ?? null,
    fallback_url: item.fallbackUrl ?? null,
    source_catalog_url: item.sourceCatalogUrl ?? null,
    resolver_title_contains: item.resolverTitleContains ?? null,
    discovery_mode: item.discoveryMode ?? null,
    link_match_patterns: item.linkMatchPatterns ?? null,
    parse_mode: item.parseMode ?? null,
    extract_forms: item.extractForms ?? false,
    rag_key_prefix: item.ragKeyPrefix,
    sync_interval_days: item.syncIntervalDays ?? 14,
    admin_sync_only: item.adminSyncOnly !== false,
    last_status: resolveLastStatus(item),
  };
}

const tsPath = path.join(root, "frontend/src/lib/legal-corpus/official-guide-sources.ts");
const ts = fs.readFileSync(tsPath, "utf8");
const match = ts.match(
  /export const officialGuideSources\s*=\s*(\[[\s\S]*?\])\s*as const\s*;/,
);
if (!match) throw new Error("Could not parse officialGuideSources from TS file");

const sources = Function(`"use strict"; return (${match[1]});`)();
const catalog = sources.map(toCatalogRow);
const raw = JSON.stringify(catalog, null, 2);

fs.writeFileSync(path.join(root, "supabase/seeds/tr_guide_catalog.json"), raw);

const metadataBuild = `jsonb_strip_nulls(jsonb_build_object(
      'catalog_id', r.id,
      'catalog_order', r."order",
      'source_type', r.source_type,
      'category', r.category,
      'priority', r.priority,
      'authority', r.authority,
      'main_use', r.main_use,
      'legal_weight', r.legal_weight,
      'retrieval_rank_key', r.retrieval_rank_key,
      'corpus_role', 'guidance',
      'binding_override', true,
      'official_url', r.official_url,
      'fallback_url', r.fallback_url,
      'source_catalog_url', r.source_catalog_url,
      'resolver_title_contains', r.resolver_title_contains,
      'discovery_mode', r.discovery_mode,
      'link_match_patterns', r.link_match_patterns,
      'parse_mode', r.parse_mode,
      'extract_forms', CASE WHEN r.extract_forms THEN true ELSE NULL END,
      'rag_key_prefix', r.rag_key_prefix,
      'admin_sync_only', r.admin_sync_only,
      'sync_interval_days', r.sync_interval_days,
      'last_status', r.last_status
    ))`;

const recordCols = `
  id text,
  "order" int,
  doc_type text,
  source_type text,
  title text,
  category text,
  priority text,
  authority text,
  main_use text,
  legal_weight text,
  retrieval_rank_key text,
  source_url text,
  doc_number text,
  official_url text,
  fallback_url text,
  source_catalog_url text,
  resolver_title_contains jsonb,
  discovery_mode text,
  link_match_patterns jsonb,
  parse_mode text,
  extract_forms boolean,
  rag_key_prefix text,
  sync_interval_days int,
  admin_sync_only boolean,
  last_status text
`;

const sql = `BEGIN;

WITH catalog AS (
  SELECT
    r.doc_type::text,
    r.doc_number::text,
    r.title::text,
    r.source_url::text,
    ${metadataBuild} AS catalog_metadata
  FROM jsonb_to_recordset($catalog$${raw}$catalog$::jsonb) AS r(${recordCols})
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
  AND ld.doc_type = 'guide';

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
  ${metadataBuild}
FROM jsonb_to_recordset($catalog$${raw}$catalog$::jsonb) AS r(${recordCols})
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

const out = path.join(root, "supabase/migrations/20260512160000_tr_guide_catalog_seed.sql");
fs.writeFileSync(out, sql);
const withPdf = catalog.filter((r) => r.official_url).length;
const pending = catalog.filter((r) => r.last_status === "pending").length;
console.log("guides:", catalog.length, "pdf ready:", withPdf, "pending resolve:", pending);
console.log("wrote", out);
