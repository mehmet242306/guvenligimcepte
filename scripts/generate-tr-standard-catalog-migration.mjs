import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function pickSourceUrl(item) {
  return (
    item.isoProductUrl ??
    item.isoUrl ??
    item.isoSearchUrl ??
    item.iecSearchUrl ??
    item.cenSearchUrl ??
    item.tseSearchUrl ??
    item.turkakUrl ??
    null
  );
}

function retrievalRankKey(standardNo) {
  const n = (standardNo ?? "").toUpperCase();
  if (/^TS\s/.test(n) || n.includes("TS EN") || n.includes("TS HD")) return "ts_tse_standard";
  return "iso_en_iec_standard";
}

function toCatalogRow(item) {
  return {
    id: item.id,
    order: item.order,
    doc_type: "standard",
    source_type: item.sourceType,
    title: item.title,
    doc_number: item.id,
    standard_no: item.standardNo,
    category: item.category,
    priority: item.priority,
    authority: item.authority,
    main_use: item.mainUse,
    legal_weight: item.legalWeight,
    binding_status: item.bindingStatus,
    license_mode: item.licenseMode,
    retrieval_rank_key: retrievalRankKey(item.standardNo),
    source_url: pickSourceUrl(item),
    iso_url: item.isoUrl ?? null,
    iso_product_url: item.isoProductUrl ?? null,
    iso_search_url: item.isoSearchUrl ?? null,
    iec_search_url: item.iecSearchUrl ?? null,
    cen_search_url: item.cenSearchUrl ?? null,
    tse_search_url: item.tseSearchUrl ?? null,
    turkak_url: item.turkakUrl ?? null,
    rag_key_prefix: item.ragKeyPrefix,
    sync_interval_days: item.syncIntervalDays ?? 30,
    admin_sync_only: item.adminSyncOnly !== false,
    last_status: "metadata_only",
  };
}

function parseArrayFromTs(tsPath, exportName) {
  const ts = fs.readFileSync(tsPath, "utf8");
  const re = new RegExp(
    `export const ${exportName}\\s*=\\s*(\\[[\\s\\S]*?\\])\\s*as const\\s*;`,
  );
  const match = ts.match(re);
  if (!match) throw new Error(`Could not parse ${exportName} from ${tsPath}`);
  return Function(`"use strict"; return (${match[1]});`)();
}

const standardSources = parseArrayFromTs(
  path.join(root, "frontend/src/lib/legal-corpus/standard-sources.ts"),
  "standardSources",
);
const catalog = standardSources.map(toCatalogRow);
const raw = JSON.stringify(catalog, null, 2);
fs.writeFileSync(path.join(root, "supabase/seeds/tr_standard_catalog.json"), raw);

const metadataBuild = `jsonb_strip_nulls(jsonb_build_object(
      'catalog_id', r.id,
      'catalog_order', r."order",
      'source_type', r.source_type,
      'standard_no', r.standard_no,
      'category', r.category,
      'priority', r.priority,
      'authority', r.authority,
      'main_use', r.main_use,
      'legal_weight', r.legal_weight,
      'binding_status', r.binding_status,
      'license_mode', r.license_mode,
      'retrieval_rank_key', r.retrieval_rank_key,
      'corpus_role', 'technical_reference',
      'binding_override', false,
      'iso_url', r.iso_url,
      'iso_product_url', r.iso_product_url,
      'iso_search_url', r.iso_search_url,
      'iec_search_url', r.iec_search_url,
      'cen_search_url', r.cen_search_url,
      'tse_search_url', r.tse_search_url,
      'turkak_url', r.turkak_url,
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
  doc_number text,
  standard_no text,
  category text,
  priority text,
  authority text,
  main_use text,
  legal_weight text,
  binding_status text,
  license_mode text,
  retrieval_rank_key text,
  source_url text,
  iso_url text,
  iso_product_url text,
  iso_search_url text,
  iec_search_url text,
  cen_search_url text,
  tse_search_url text,
  turkak_url text,
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
WHERE ld.doc_type = 'standard'
  AND (ld.catalog_metadata->>'catalog_id' = c.catalog_metadata->>'catalog_id'
    OR ld.title = c.title);

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

const out = path.join(root, "supabase/migrations/20260512170000_tr_standard_catalog_seed.sql");
fs.writeFileSync(out, sql);
console.log("standards:", catalog.length);
console.log("wrote", out);
