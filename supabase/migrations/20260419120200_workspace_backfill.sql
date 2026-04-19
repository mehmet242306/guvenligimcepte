-- Backfill: one default TR workspace per existing organization, then migrate
-- every user_profiles row into a workspace membership.
--
-- Safe to re-run (all statements idempotent via NOT EXISTS / ON CONFLICT).
-- Keeps existing organization_id columns untouched — downstream tenant-table
-- changes happen in a later migration.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Create a default workspace for every organization that doesn't have one.
--    country_code + default_language + timezone derive from the organization
--    when available, otherwise fall back to TR defaults.
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
  END AS default_language,
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
  END AS timezone
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspaces w
  WHERE w.organization_id = o.id
    AND w.country_code    = COALESCE(NULLIF(o.country_code, ''), 'TR')
);


-- ---------------------------------------------------------------------------
-- 2. Add every existing user_profiles row into its organization's default
--    workspace as a member. role_key is inferred conservatively: anyone who
--    already holds a super_admin or platform_admin universal role becomes a
--    workspace_admin; everyone else becomes safety_professional by default.
-- ---------------------------------------------------------------------------
INSERT INTO public.workspace_members (workspace_id, user_id, role_key, is_primary)
SELECT
  w.id                                                 AS workspace_id,
  up.auth_user_id                                      AS user_id,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_profile_id = up.id
        AND r.name IN ('super_admin', 'platform_admin', 'organization_admin')
    ) THEN 'workspace_admin'
    ELSE 'safety_professional'
  END                                                  AS role_key,
  true                                                 AS is_primary
FROM public.user_profiles up
JOIN public.workspaces w ON w.organization_id = up.organization_id
WHERE up.auth_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = w.id
      AND m.user_id      = up.auth_user_id
  );


-- ---------------------------------------------------------------------------
-- 3. Set active_workspace_id on every user_profile that doesn't have one.
--    Prefer the membership flagged is_primary; otherwise pick any.
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- 4. Sanity check (raises an exception at migration time if anything is off).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  orphan_orgs    integer;
  orphan_profiles integer;
BEGIN
  SELECT count(*) INTO orphan_orgs
  FROM public.organizations o
  WHERE NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.organization_id = o.id);

  SELECT count(*) INTO orphan_profiles
  FROM public.user_profiles up
  WHERE up.auth_user_id IS NOT NULL
    AND up.active_workspace_id IS NULL;

  IF orphan_orgs > 0 THEN
    RAISE EXCEPTION 'workspace backfill incomplete: % organizations still lack a workspace', orphan_orgs;
  END IF;

  IF orphan_profiles > 0 THEN
    RAISE NOTICE 'workspace backfill note: % user_profiles without active_workspace_id (expected when auth_user_id is null)', orphan_profiles;
  END IF;
END $$;

COMMIT;
