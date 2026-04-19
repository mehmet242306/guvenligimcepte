-- Workplace OHS Archive — scope presets (which categories are packaged for
-- each jurisdiction).
--
-- The UI reads this table to render the "kapsam" (scope) checkbox list; the
-- worker reads it when a job's scope JSON is empty or says {preset: 'TR_BASE'}.
-- TR first; US/GB/DE added as separate rows in later migrations.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ohs_archive_scope_presets (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_code   text        NOT NULL,
  preset_key          text        NOT NULL,
  display_name_tr     text        NOT NULL,
  display_name_en     text        NOT NULL,
  description_tr      text,
  description_en      text,
  categories          jsonb       NOT NULL,
  is_default          boolean     NOT NULL DEFAULT false,
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ohs_archive_scope_presets_jurisdiction_format CHECK (jurisdiction_code ~ '^[A-Z]{2}$'),
  CONSTRAINT ohs_archive_scope_presets_categories_shape CHECK (jsonb_typeof(categories) = 'array'),
  UNIQUE (jurisdiction_code, preset_key)
);

CREATE INDEX IF NOT EXISTS ohs_archive_scope_presets_jurisdiction_idx
  ON public.ohs_archive_scope_presets (jurisdiction_code)
  WHERE is_active = true;

COMMENT ON TABLE  public.ohs_archive_scope_presets IS 'Per-jurisdiction templates describing which data categories go into a Workplace OHS File.';
COMMENT ON COLUMN public.ohs_archive_scope_presets.categories IS
  'Array of category objects: [{key, label_tr, label_en, required, order}]. The worker has a collector registered for each key.';


-- RLS: read-only dictionary; anyone authenticated can read active presets.
ALTER TABLE public.ohs_archive_scope_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ohs_archive_scope_presets_read" ON public.ohs_archive_scope_presets;
CREATE POLICY "ohs_archive_scope_presets_read"
  ON public.ohs_archive_scope_presets
  FOR SELECT
  TO authenticated
  USING (is_active = true);


-- ---------------------------------------------------------------------------
-- TR base preset — 6331 / İSG Hizmetleri Yönetmeliği md.29 kapsamı.
--
-- Each category has:
--   key      — stable machine id (worker collector maps to this)
--   label_tr — UI text (Turkish)
--   label_en — UI text (English)
--   required — must be included (greyed-out checkbox, user can't uncheck)
--   order    — sort order in UI
--
-- Required categories are the mevzuat-mandated core; optional categories are
-- value-adds (notes, planner history) that some users skip to trim file size.
-- ---------------------------------------------------------------------------
INSERT INTO public.ohs_archive_scope_presets
  (jurisdiction_code, preset_key, display_name_tr, display_name_en,
   description_tr, description_en, categories, is_default)
VALUES (
  'TR',
  'TR_BASE',
  'İşyeri İSG Dosyası (Standart)',
  'Workplace OHS File (Standard)',
  '6331 Sayılı İş Sağlığı ve Güvenliği Kanunu ile İSG Hizmetleri Yönetmeliği md.29 kapsamında tutulması zorunlu tüm belge ve kayıtları içerir.',
  'Includes every document and record mandated by Law 6331 and the OHS Services Regulation, Article 29.',
  jsonb_build_array(
    jsonb_build_object('key', 'risk_assessments',      'label_tr', 'Risk Değerlendirmeleri',           'label_en', 'Risk Assessments',            'required', true,  'order', 10),
    jsonb_build_object('key', 'emergency_plan',        'label_tr', 'Acil Durum Planı',                  'label_en', 'Emergency Action Plan',        'required', true,  'order', 20),
    jsonb_build_object('key', 'incidents',             'label_tr', 'İş Kazaları ve Ramak Kala',         'label_en', 'Incidents & Near Misses',      'required', true,  'order', 30),
    jsonb_build_object('key', 'corrective_actions',    'label_tr', 'DÖF Kayıtları',                     'label_en', 'Corrective Actions',           'required', true,  'order', 40),
    jsonb_build_object('key', 'training_records',      'label_tr', 'İSG Eğitim Kayıtları',              'label_en', 'OHS Training Records',         'required', true,  'order', 50),
    jsonb_build_object('key', 'health_examinations',   'label_tr', 'Sağlık Muayeneleri',                'label_en', 'Health Examinations',          'required', true,  'order', 60),
    jsonb_build_object('key', 'periodic_inspections',  'label_tr', 'Periyodik Kontroller (Makine/Ekipman)','label_en','Periodic Inspections',      'required', true,  'order', 70),
    jsonb_build_object('key', 'committee_minutes',     'label_tr', 'İSG Kurul Tutanakları',             'label_en', 'OHS Committee Minutes',        'required', true,  'order', 80),
    jsonb_build_object('key', 'rca_analyses',          'label_tr', 'Kök Neden Analizleri (Ishikawa / R₂D-RCA)','label_en', 'Root-Cause Analyses',  'required', false, 'order', 90),
    jsonb_build_object('key', 'planner',               'label_tr', 'Yıllık Çalışma Planı / Ajanda',     'label_en', 'Annual Plan / Planner',        'required', false, 'order', 100),
    jsonb_build_object('key', 'documents',             'label_tr', 'Yüklenen Belgeler ve Sertifikalar', 'label_en', 'Uploaded Documents & Certificates','required', true, 'order', 110),
    jsonb_build_object('key', 'notes',                 'label_tr', 'Notlar ve Yazışmalar',              'label_en', 'Notes & Correspondence',       'required', false, 'order', 120)
  ),
  true
)
ON CONFLICT (jurisdiction_code, preset_key) DO NOTHING;

COMMIT;
