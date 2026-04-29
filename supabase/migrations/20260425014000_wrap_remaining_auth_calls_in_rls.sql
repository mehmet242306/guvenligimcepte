-- Wrap the remaining ~180 policies that still have bare `auth.uid()` (or
-- `auth.role()` / `auth.jwt()`) inside `(SELECT auth.<fn>())`. This is the
-- non-priority counterpart to the earlier hand-written migration on
-- risk_assessments / incidents / notifications / company_workspaces /
-- company_trainings / company_periodic_controls (`20260425013500`).
--
-- Approach: a one-shot DO block that loops pg_policies, replaces only bare
-- occurrences (idempotent — already-wrapped calls are protected via a
-- placeholder pass), then DROP+CREATEs each policy with the rewritten body.
-- Pure performance change: semantics unchanged.

BEGIN;

-- Idempotent string transform: protects existing `(SELECT auth.<fn>())`
-- before wrapping bare calls, then restores. Created in pg_temp so it
-- vanishes after the migration commits.
CREATE OR REPLACE FUNCTION pg_temp.wrap_auth_calls(expr text)
RETURNS text
LANGUAGE plpgsql
AS $fn$
DECLARE
  result text := expr;
BEGIN
  IF result IS NULL THEN RETURN NULL; END IF;

  -- 1. Protect already-wrapped forms (case-insensitive, tolerant of spacing).
  result := regexp_replace(result, '\(\s*SELECT\s+auth\.uid\s*\(\s*\)\s*\)',  '__W_AUID__',  'gi');
  result := regexp_replace(result, '\(\s*SELECT\s+auth\.role\s*\(\s*\)\s*\)', '__W_AROLE__', 'gi');
  result := regexp_replace(result, '\(\s*SELECT\s+auth\.jwt\s*\(\s*\)\s*\)',  '__W_AJWT__',  'gi');

  -- 2. Wrap bare calls.
  result := regexp_replace(result, 'auth\.uid\s*\(\s*\)',  '(SELECT auth.uid())',  'g');
  result := regexp_replace(result, 'auth\.role\s*\(\s*\)', '(SELECT auth.role())', 'g');
  result := regexp_replace(result, 'auth\.jwt\s*\(\s*\)',  '(SELECT auth.jwt())',  'g');

  -- 3. Restore the protected forms.
  result := replace(result, '__W_AUID__',  '(SELECT auth.uid())');
  result := replace(result, '__W_AROLE__', '(SELECT auth.role())');
  result := replace(result, '__W_AJWT__',  '(SELECT auth.jwt())');

  RETURN result;
END
$fn$;

DO $do$
DECLARE
  pol          RECORD;
  new_qual     text;
  new_check    text;
  perm_clause  text;
  roles_clause text;
  using_clause text;
  check_clause text;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check
    FROM   pg_policies
    WHERE  schemaname = 'public'
      AND (
        qual       ~ 'auth\.(uid|role|jwt)\s*\(\s*\)'
        OR with_check ~ 'auth\.(uid|role|jwt)\s*\(\s*\)'
      )
  LOOP
    new_qual  := pg_temp.wrap_auth_calls(pol.qual);
    new_check := pg_temp.wrap_auth_calls(pol.with_check);

    -- Skip if nothing actually changed (already fully wrapped).
    IF new_qual IS NOT DISTINCT FROM pol.qual
       AND new_check IS NOT DISTINCT FROM pol.with_check THEN
      CONTINUE;
    END IF;

    perm_clause := CASE
      WHEN pol.permissive = 'PERMISSIVE'  THEN 'AS PERMISSIVE'
      WHEN pol.permissive = 'RESTRICTIVE' THEN 'AS RESTRICTIVE'
      ELSE ''
    END;

    roles_clause := (
      SELECT string_agg(quote_ident(r), ', ')
      FROM   unnest(pol.roles) r
    );

    using_clause := CASE
      WHEN new_qual IS NOT NULL THEN format('USING (%s)', new_qual)
      ELSE ''
    END;
    check_clause := CASE
      WHEN new_check IS NOT NULL THEN format('WITH CHECK (%s)', new_check)
      ELSE ''
    END;

    EXECUTE format(
      'DROP POLICY %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I %s FOR %s TO %s %s %s',
      pol.policyname, pol.schemaname, pol.tablename,
      perm_clause, pol.cmd, roles_clause,
      using_clause, check_clause
    );
  END LOOP;
END
$do$;

COMMIT;
