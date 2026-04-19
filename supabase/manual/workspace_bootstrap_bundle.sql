-- RiskNova workspace + certification bootstrap bundle
-- Purpose:
-- 1. Create workspaces / certifications / workspace_members tables
-- 2. Add user_profiles.active_workspace_id
-- 3. Seed pilot-country certification dictionary
-- 4. Backfill one default workspace + membership for existing organizations/users
--
-- Run this in Supabase SQL Editor when the onboarding UI says:
-- - "Sertifika sozlugu bu veritabaninda henuz kurulu degil"
-- - "Workspace tabloları bu veritabaninda henuz kurulu degil"

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. workspaces
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  country_code       text        NOT NULL,
  name               text        NOT NULL,
  default_language   text        NOT NULL DEFAULT 'tr',
  timezone           text        NOT NULL DEFAULT 'Europe/Istanbul',
  is_active          boolean     NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspaces_country_code_format CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT workspaces_language_format CHECK (default_language ~ '^[a-z]{2}$'),
  UNIQUE (organization_id, country_code)
);

CREATE INDEX IF NOT EXISTS workspaces_org_idx ON public.workspaces (organization_id);
CREATE INDEX IF NOT EXISTS workspaces_country_idx ON public.workspaces (country_code);

-- ---------------------------------------------------------------------------
-- 2. certifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.certifications (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code   text        NOT NULL,
  role_key       text        NOT NULL,
  code           text        NOT NULL,
  name_en        text        NOT NULL,
  name_local     text,
  issuer         text        NOT NULL,
  level          text,
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT certifications_country_format CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT certifications_role_key_enum CHECK (role_key IN (
    'safety_professional',
    'occupational_physician',
    'industrial_hygienist',
    'safety_officer',
    'auditor',
    'workspace_admin',
    'viewer'
  )),
  UNIQUE (country_code, code)
);

CREATE INDEX IF NOT EXISTS certifications_country_role_idx
  ON public.certifications (country_code, role_key)
  WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- 3. workspace_members
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_key          text        NOT NULL,
  certification_id  uuid        REFERENCES public.certifications(id) ON DELETE SET NULL,
  is_primary        boolean     NOT NULL DEFAULT false,
  joined_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_members_role_key_enum CHECK (role_key IN (
    'safety_professional',
    'occupational_physician',
    'industrial_hygienist',
    'safety_officer',
    'auditor',
    'workspace_admin',
    'viewer'
  )),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS workspace_members_user_idx ON public.workspace_members (user_id);
CREATE INDEX IF NOT EXISTS workspace_members_workspace_idx ON public.workspace_members (workspace_id);
CREATE INDEX IF NOT EXISTS workspace_members_primary_idx
  ON public.workspace_members (user_id)
  WHERE is_primary = true;

-- ---------------------------------------------------------------------------
-- 4. user_profiles.active_workspace_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS active_workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS user_profiles_active_workspace_idx
  ON public.user_profiles (active_workspace_id)
  WHERE active_workspace_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. updated_at trigger for workspaces
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.workspaces_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workspaces_set_updated_at ON public.workspaces;
CREATE TRIGGER workspaces_set_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.workspaces_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Helper functions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT active_workspace_id
  FROM public.user_profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_has_workspace_access(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- 7. RLS bootstrap
-- ---------------------------------------------------------------------------
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "certifications_read_all" ON public.certifications;
CREATE POLICY "certifications_read_all"
  ON public.certifications
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "workspaces_read_members" ON public.workspaces;
CREATE POLICY "workspaces_read_members"
  ON public.workspaces
  FOR SELECT
  USING (public.user_has_workspace_access(id));

DROP POLICY IF EXISTS "workspace_members_read_self_and_peers" ON public.workspace_members;
CREATE POLICY "workspace_members_read_self_and_peers"
  ON public.workspace_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.user_has_workspace_access(workspace_id)
  );

-- ---------------------------------------------------------------------------
-- 8. Seed certifications
-- ---------------------------------------------------------------------------
INSERT INTO public.certifications (country_code, role_key, code, name_en, name_local, issuer, level) VALUES
  ('TR', 'safety_professional',   'ISG-A',   'OHS Specialist Class A', 'İSG Uzmanı (A Sınıfı)', 'ÇSGB', 'A'),
  ('TR', 'safety_professional',   'ISG-B',   'OHS Specialist Class B', 'İSG Uzmanı (B Sınıfı)', 'ÇSGB', 'B'),
  ('TR', 'safety_professional',   'ISG-C',   'OHS Specialist Class C', 'İSG Uzmanı (C Sınıfı)', 'ÇSGB', 'C'),
  ('TR', 'occupational_physician','IYH',     'Workplace Physician', 'İşyeri Hekimi', 'ÇSGB', NULL),
  ('TR', 'safety_officer',        'DSP',     'Other Health Personnel', 'Diğer Sağlık Personeli', 'ÇSGB', NULL),
  ('US', 'safety_professional',   'CSP',     'Certified Safety Professional', NULL, 'BCSP', NULL),
  ('US', 'safety_professional',   'ASP',     'Associate Safety Professional', NULL, 'BCSP', NULL),
  ('US', 'safety_professional',   'OHST',    'Occupational Health and Safety Technician', NULL, 'BCSP', NULL),
  ('US', 'safety_professional',   'CHST',    'Construction Health and Safety Technician', NULL, 'BCSP', NULL),
  ('US', 'industrial_hygienist',  'CIH',     'Certified Industrial Hygienist', NULL, 'ABIH', NULL),
  ('US', 'industrial_hygienist',  'CAIH',    'Certified Associate Industrial Hygienist', NULL, 'ABIH', NULL),
  ('US', 'occupational_physician','ABPM-OM', 'Board Certified in Occupational Medicine', NULL, 'ABPM', NULL),
  ('US', 'safety_officer',        'OSHA-30', 'OSHA 30-Hour Outreach', NULL, 'OSHA', '30h'),
  ('GB', 'safety_professional',   'CMIOSH',      'Chartered Member of IOSH', NULL, 'IOSH', 'Chartered'),
  ('GB', 'safety_professional',   'GradIOSH',    'Graduate Member of IOSH', NULL, 'IOSH', 'Graduate'),
  ('GB', 'safety_professional',   'TechIOSH',    'Technical Member of IOSH', NULL, 'IOSH', 'Technical'),
  ('GB', 'safety_professional',   'NEB-NAT-DIP', 'NEBOSH National Diploma', NULL, 'NEBOSH', NULL),
  ('GB', 'safety_professional',   'NEB-INT-DIP', 'NEBOSH International Diploma', NULL, 'NEBOSH', NULL),
  ('GB', 'safety_professional',   'NEB-IGC',     'NEBOSH International General Certificate', NULL, 'NEBOSH', NULL),
  ('GB', 'occupational_physician','FOM',         'Fellow of the Faculty of Occupational Medicine', NULL, 'FOM', NULL),
  ('GB', 'industrial_hygienist',  'CertOH',      'Certificate of Operational Competence in OH', NULL, 'BOHS', NULL),
  ('DE', 'safety_officer',        'SIFA',        'Safety Specialist', 'Fachkraft für Arbeitssicherheit', 'BG', NULL),
  ('DE', 'safety_officer',        'SIBE',        'Safety Representative', 'Sicherheitsbeauftragter', 'BG', NULL),
  ('DE', 'safety_professional',   'SI-ING',      'Safety Engineer', 'Sicherheitsingenieur', 'VDSI', NULL),
  ('DE', 'occupational_physician','BETR-ARZT',   'Occupational Physician', 'Betriebsarzt', 'BÄK', NULL),
  ('DE', 'industrial_hygienist',  'AMTECH',      'Occupational Hygiene Technician', 'Fachkraft für Arbeitshygiene', 'DGUV', NULL)
ON CONFLICT (country_code, code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 9. Backfill default workspace and memberships
-- ---------------------------------------------------------------------------
INSERT INTO public.workspaces (organization_id, country_code, name, default_language, timezone)
SELECT
  o.id,
  COALESCE(NULLIF(o.country_code, ''), 'TR'),
  o.name,
  CASE COALESCE(NULLIF(o.country_code, ''), 'TR')
    WHEN 'US' THEN 'en'
    WHEN 'GB' THEN 'en'
    WHEN 'DE' THEN 'de'
    WHEN 'FR' THEN 'fr'
    WHEN 'ES' THEN 'es'
    WHEN 'RU' THEN 'ru'
    WHEN 'JP' THEN 'ja'
    WHEN 'KR' THEN 'ko'
    WHEN 'CN' THEN 'zh'
    WHEN 'IN' THEN 'hi'
    WHEN 'SA' THEN 'ar'
    WHEN 'AZ' THEN 'az'
    WHEN 'ID' THEN 'id'
    ELSE 'tr'
  END,
  CASE COALESCE(NULLIF(o.country_code, ''), 'TR')
    WHEN 'US' THEN 'America/New_York'
    WHEN 'GB' THEN 'Europe/London'
    WHEN 'DE' THEN 'Europe/Berlin'
    WHEN 'FR' THEN 'Europe/Paris'
    WHEN 'ES' THEN 'Europe/Madrid'
    WHEN 'RU' THEN 'Europe/Moscow'
    WHEN 'JP' THEN 'Asia/Tokyo'
    WHEN 'KR' THEN 'Asia/Seoul'
    WHEN 'CN' THEN 'Asia/Shanghai'
    WHEN 'IN' THEN 'Asia/Kolkata'
    WHEN 'SA' THEN 'Asia/Riyadh'
    WHEN 'AZ' THEN 'Asia/Baku'
    WHEN 'ID' THEN 'Asia/Jakarta'
    ELSE 'Europe/Istanbul'
  END
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1
  FROM public.workspaces w
  WHERE w.organization_id = o.id
    AND w.country_code = COALESCE(NULLIF(o.country_code, ''), 'TR')
);

INSERT INTO public.workspace_members (workspace_id, user_id, role_key, is_primary)
SELECT
  w.id,
  up.auth_user_id,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_profile_id = up.id
        AND r.name IN ('super_admin', 'platform_admin', 'organization_admin')
    ) THEN 'workspace_admin'
    ELSE 'safety_professional'
  END,
  true
FROM public.user_profiles up
JOIN public.workspaces w ON w.organization_id = up.organization_id
WHERE up.auth_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.workspace_members m
    WHERE m.workspace_id = w.id
      AND m.user_id = up.auth_user_id
  );

UPDATE public.user_profiles up
SET active_workspace_id = picked.workspace_id
FROM (
  SELECT DISTINCT ON (m.user_id)
    m.user_id,
    m.workspace_id
  FROM public.workspace_members m
  ORDER BY m.user_id, m.is_primary DESC, m.joined_at ASC
) picked
WHERE up.active_workspace_id IS NULL
  AND up.auth_user_id = picked.user_id;

COMMIT;
