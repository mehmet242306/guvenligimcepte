import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function retrievalRankKey(sourceType) {
  if (sourceType === "eu_directive") return "eu_directive";
  if (sourceType === "international_convention") return "ilo_convention";
  return "international_reference";
}

function toCatalogRow(item) {
  return {
    id: item.id,
    order: item.order,
    doc_type: "announcement",
    source_type: item.sourceType,
    title: item.title,
    doc_number: item.id,
    category: item.category,
    priority: item.priority,
    authority: item.authority,
    main_use: item.mainUse,
    legal_weight: item.legalWeight,
    retrieval_rank_key: retrievalRankKey(item.sourceType),
    source_url: item.officialUrl ?? null,
    rag_key_prefix: item.ragKeyPrefix,
    sync_interval_days: item.syncIntervalDays ?? 90,
    admin_sync_only: item.adminSyncOnly !== false,
    last_status: "metadata_only",
  };
}

const tsPath = path.join(root, "frontend/src/lib/legal-corpus/international-reference-sources.ts");
const ts = fs.readFileSync(tsPath, "utf8");
const match = ts.match(
  /export const internationalReferenceSources\s*=\s*(\[[\s\S]*?\])\s*as const\s*;/,
);
if (!match) throw new Error("Could not parse internationalReferenceSources");

const sources = Function(`"use strict"; return (${match[1]});`)();
const catalog = sources.map(toCatalogRow);
const raw = JSON.stringify(catalog, null, 2);
fs.writeFileSync(path.join(root, "supabase/seeds/tr_international_catalog.json"), raw);

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
      'corpus_role', 'international_reference',
      'binding_override', false,
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
  category text,
  priority text,
  authority text,
  main_use text,
  legal_weight text,
  retrieval_rank_key text,
  source_url text,
  rag_key_prefix text,
  sync_interval_days int,
  admin_sync_only boolean,
  last_status text
`;

const sql = `BEGIN;

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
  'GLOBAL'::text,
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

const out = path.join(
  root,
  "supabase/migrations/20260512171000_tr_international_catalog_seed.sql",
);
fs.writeFileSync(out, sql);
console.log("international:", catalog.length);
console.log("wrote", out);
