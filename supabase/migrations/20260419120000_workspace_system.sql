-- Workspace System (Phase 1 of multi-country rollout)
--
-- Introduces a 2-level tenant model:
--   organization (top)  →  workspace (per-country operation)  →  user membership
--
-- Rationale: a single company (organization) may operate under different OHS
-- regulatory regimes (TR/6331, US/OSHA, GB/HSE, DE/ArbSchG, ...). Each
-- workspace pins a country_code and drives Nova's RAG jurisdiction filter,
-- default language, time zone, and role certifications.
--
-- This migration is additive only. It does NOT touch organization_members,
-- user_profiles, risk_analyses, or RLS policies. Those come in a later
-- migration once the shape is stable and tested.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. workspaces
--   One row per (organization, country_code) pair.
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
  CONSTRAINT workspaces_language_format     CHECK (default_language ~ '^[a-z]{2}$'),
  UNIQUE (organization_id, country_code)
);

CREATE INDEX IF NOT EXISTS workspaces_org_idx     ON public.workspaces (organization_id);
CREATE INDEX IF NOT EXISTS workspaces_country_idx ON public.workspaces (country_code);

COMMENT ON TABLE  public.workspaces IS 'A country-scoped operational space belonging to an organization. Drives Nova RAG jurisdiction, default language, and role certifications.';
COMMENT ON COLUMN public.workspaces.country_code IS 'ISO 3166-1 alpha-2 country code (TR, US, GB, DE, ...).';
COMMENT ON COLUMN public.workspaces.default_language IS 'ISO 639-1 language code (tr, en, de, ...).';


-- ---------------------------------------------------------------------------
-- 2. certifications
--   Level-2 role dictionary. Each row is a country-specific certification
--   (e.g. TR/ISG-A, US/CSP, GB/CMIOSH, DE/SIFA). Level-1 role_key lives in
--   workspace_members and is a small enum of universal categories.
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

COMMENT ON TABLE  public.certifications IS 'Country-scoped OHS certifications (CSP, CMIOSH, ISG-A, SiFa, ...). role_key is the universal category; code is jurisdiction-specific.';
COMMENT ON COLUMN public.certifications.role_key IS 'Universal category enum. Filter UI dropdowns by (country_code, role_key).';
COMMENT ON COLUMN public.certifications.code IS 'Short identifier used by the issuer (e.g. CSP, CMIOSH, ISG-A).';


-- ---------------------------------------------------------------------------
-- 3. workspace_members
--   A user may belong to N workspaces (e.g. multi-country OSGB experts).
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

CREATE INDEX IF NOT EXISTS workspace_members_user_idx      ON public.workspace_members (user_id);
CREATE INDEX IF NOT EXISTS workspace_members_workspace_idx ON public.workspace_members (workspace_id);
CREATE INDEX IF NOT EXISTS workspace_members_primary_idx   ON public.workspace_members (user_id) WHERE is_primary = true;

COMMENT ON TABLE  public.workspace_members IS 'User membership in a workspace, with universal role_key and optional country-specific certification.';
COMMENT ON COLUMN public.workspace_members.role_key IS 'Level-1 universal role. Level-2 certification is optional and country-specific.';
COMMENT ON COLUMN public.workspace_members.is_primary IS 'Marks the user''s default workspace for initial sign-in load.';


-- ---------------------------------------------------------------------------
-- 4. user_profiles.active_workspace_id
--   Tracks which workspace the user is currently viewing.
--   Switcher UI updates this column; server-side helpers read from it.
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS active_workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS user_profiles_active_workspace_idx
  ON public.user_profiles (active_workspace_id)
  WHERE active_workspace_id IS NOT NULL;

COMMENT ON COLUMN public.user_profiles.active_workspace_id IS 'The workspace the user is currently viewing. Set by the workspace switcher.';


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
-- 6. Helper functions used by later RLS migration
--    (Safe to define now; no policies reference them until migration 4.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT active_workspace_id FROM public.user_profiles WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.current_workspace_id() IS 'Returns the caller''s currently active workspace. Used by workspace-scoped RLS.';

CREATE OR REPLACE FUNCTION public.user_has_workspace_access(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id      = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.user_has_workspace_access(uuid) IS 'True if the caller is a member of the given workspace.';


-- ---------------------------------------------------------------------------
-- 7. RLS bootstrap for the new tables (self-scoped; no cross-table joins yet)
-- ---------------------------------------------------------------------------
ALTER TABLE public.workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications    ENABLE ROW LEVEL SECURITY;

-- Certifications are a shared dictionary: everyone reads, only admins write.
DROP POLICY IF EXISTS "certifications_read_all"       ON public.certifications;
CREATE POLICY "certifications_read_all"
  ON public.certifications
  FOR SELECT
  USING (is_active = true);

-- Workspaces: members can read their own workspaces.
DROP POLICY IF EXISTS "workspaces_read_members" ON public.workspaces;
CREATE POLICY "workspaces_read_members"
  ON public.workspaces
  FOR SELECT
  USING (public.user_has_workspace_access(id));

-- workspace_members: members can see their own membership rows + peers in
-- the same workspace.
DROP POLICY IF EXISTS "workspace_members_read_self_and_peers" ON public.workspace_members;
CREATE POLICY "workspace_members_read_self_and_peers"
  ON public.workspace_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.user_has_workspace_access(workspace_id)
  );

COMMIT;
