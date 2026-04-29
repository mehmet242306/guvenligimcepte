-- Wrap bare `auth.uid()` calls in `(SELECT auth.uid())` so PostgreSQL evaluates
-- the function once per query (initplan) instead of once per row. Identified
-- by the `auth_rls_initplan` advisor lint on the highest-traffic tables.
--
-- Pure performance fix: semantics unchanged. Only the priority tables are
-- touched here (risk_assessments, incidents, notifications, company_workspaces,
-- company_trainings, company_periodic_controls). Other 209 policies on lower-
-- traffic tables can be batched in a follow-up.

BEGIN;

-- ============================================================
-- company_periodic_controls
-- ============================================================
DROP POLICY IF EXISTS controls_select ON public.company_periodic_controls;
CREATE POLICY controls_select ON public.company_periodic_controls
  FOR SELECT TO public
  USING ((organization_id = current_organization_id()) OR (organization_id IN (
    SELECT user_profiles.organization_id FROM user_profiles
    WHERE ((user_profiles.auth_user_id = (SELECT auth.uid())) AND (user_profiles.organization_id IS NOT NULL))
    LIMIT 1)));

DROP POLICY IF EXISTS controls_insert ON public.company_periodic_controls;
CREATE POLICY controls_insert ON public.company_periodic_controls
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS controls_update ON public.company_periodic_controls;
CREATE POLICY controls_update ON public.company_periodic_controls
  FOR UPDATE TO public
  USING ((organization_id = current_organization_id()) OR (organization_id IN (
    SELECT user_profiles.organization_id FROM user_profiles
    WHERE ((user_profiles.auth_user_id = (SELECT auth.uid())) AND (user_profiles.organization_id IS NOT NULL))
    LIMIT 1)));

DROP POLICY IF EXISTS controls_delete ON public.company_periodic_controls;
CREATE POLICY controls_delete ON public.company_periodic_controls
  FOR DELETE TO public
  USING ((organization_id = current_organization_id()) OR (organization_id IN (
    SELECT user_profiles.organization_id FROM user_profiles
    WHERE ((user_profiles.auth_user_id = (SELECT auth.uid())) AND (user_profiles.organization_id IS NOT NULL))
    LIMIT 1)));

-- ============================================================
-- company_trainings
-- ============================================================
DROP POLICY IF EXISTS trainings_select ON public.company_trainings;
CREATE POLICY trainings_select ON public.company_trainings
  FOR SELECT TO public
  USING ((organization_id = current_organization_id()) OR (organization_id IN (
    SELECT user_profiles.organization_id FROM user_profiles
    WHERE ((user_profiles.auth_user_id = (SELECT auth.uid())) AND (user_profiles.organization_id IS NOT NULL))
    LIMIT 1)));

DROP POLICY IF EXISTS trainings_insert ON public.company_trainings;
CREATE POLICY trainings_insert ON public.company_trainings
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS trainings_update ON public.company_trainings;
CREATE POLICY trainings_update ON public.company_trainings
  FOR UPDATE TO public
  USING ((organization_id = current_organization_id()) OR (organization_id IN (
    SELECT user_profiles.organization_id FROM user_profiles
    WHERE ((user_profiles.auth_user_id = (SELECT auth.uid())) AND (user_profiles.organization_id IS NOT NULL))
    LIMIT 1)));

DROP POLICY IF EXISTS trainings_delete ON public.company_trainings;
CREATE POLICY trainings_delete ON public.company_trainings
  FOR DELETE TO public
  USING ((organization_id = current_organization_id()) OR (organization_id IN (
    SELECT user_profiles.organization_id FROM user_profiles
    WHERE ((user_profiles.auth_user_id = (SELECT auth.uid())) AND (user_profiles.organization_id IS NOT NULL))
    LIMIT 1)));

-- ============================================================
-- company_workspaces
-- ============================================================
DROP POLICY IF EXISTS company_workspaces_select_account_or_assignment ON public.company_workspaces;
CREATE POLICY company_workspaces_select_account_or_assignment ON public.company_workspaces
  FOR SELECT TO authenticated
  USING (is_platform_admin((SELECT auth.uid())) OR is_account_owner_or_admin(organization_id) OR can_access_company_workspace(id));

DROP POLICY IF EXISTS company_workspaces_insert_account_admin ON public.company_workspaces;
CREATE POLICY company_workspaces_insert_account_admin ON public.company_workspaces
  FOR INSERT TO authenticated
  WITH CHECK (is_platform_admin((SELECT auth.uid())) OR is_account_owner_or_admin(organization_id));

DROP POLICY IF EXISTS company_workspaces_update_account_admin ON public.company_workspaces;
CREATE POLICY company_workspaces_update_account_admin ON public.company_workspaces
  FOR UPDATE TO authenticated
  USING (is_platform_admin((SELECT auth.uid())) OR is_account_owner_or_admin(organization_id))
  WITH CHECK (is_platform_admin((SELECT auth.uid())) OR is_account_owner_or_admin(organization_id));

-- ============================================================
-- incidents
-- ============================================================
DROP POLICY IF EXISTS incidents_select ON public.incidents;
CREATE POLICY incidents_select ON public.incidents
  FOR SELECT TO public
  USING (((company_workspace_id IS NOT NULL) AND can_access_company_workspace(company_workspace_id))
         OR ((company_workspace_id IS NULL) AND (created_by = (SELECT auth.uid()))));

DROP POLICY IF EXISTS incidents_insert ON public.incidents;
CREATE POLICY incidents_insert ON public.incidents
  FOR INSERT TO public
  WITH CHECK ((organization_id = current_organization_id())
              AND (((company_workspace_id IS NOT NULL) AND can_manage_company_workspace(company_workspace_id))
                   OR ((company_workspace_id IS NULL) AND (created_by = (SELECT auth.uid())))));

DROP POLICY IF EXISTS incidents_update ON public.incidents;
CREATE POLICY incidents_update ON public.incidents
  FOR UPDATE TO public
  USING (((company_workspace_id IS NOT NULL) AND can_manage_company_workspace(company_workspace_id))
         OR ((company_workspace_id IS NULL) AND (created_by = (SELECT auth.uid()))))
  WITH CHECK ((organization_id = current_organization_id())
              AND (((company_workspace_id IS NOT NULL) AND can_manage_company_workspace(company_workspace_id))
                   OR ((company_workspace_id IS NULL) AND (created_by = (SELECT auth.uid())))));

DROP POLICY IF EXISTS incidents_delete ON public.incidents;
CREATE POLICY incidents_delete ON public.incidents
  FOR DELETE TO public
  USING (((company_workspace_id IS NOT NULL) AND can_manage_company_workspace(company_workspace_id))
         OR ((company_workspace_id IS NULL) AND (created_by = (SELECT auth.uid()))));

-- ============================================================
-- notifications
-- ============================================================
DROP POLICY IF EXISTS notifications_select_self ON public.notifications;
CREATE POLICY notifications_select_self ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notifications_insert_self ON public.notifications;
CREATE POLICY notifications_insert_self ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = (SELECT auth.uid())) AND (organization_id = current_organization_id()));

DROP POLICY IF EXISTS notifications_update_self ON public.notifications;
CREATE POLICY notifications_update_self ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notifications_delete_self ON public.notifications;
CREATE POLICY notifications_delete_self ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- risk_assessments
-- ============================================================
DROP POLICY IF EXISTS risk_assessments_select_own_org ON public.risk_assessments;
CREATE POLICY risk_assessments_select_own_org ON public.risk_assessments
  FOR SELECT TO authenticated
  USING (is_platform_admin((SELECT auth.uid()))
         OR is_account_owner_or_admin(organization_id)
         OR ((company_workspace_id IS NOT NULL) AND (EXISTS (
              SELECT 1 FROM workspace_assignments wa
              WHERE ((wa.company_workspace_id = risk_assessments.company_workspace_id)
                AND (wa.user_id = (SELECT auth.uid()))
                AND (wa.assignment_status = 'active'::text)
                AND (wa.can_view = true)))))
         OR ((company_workspace_id IS NULL) AND (organization_id = current_organization_id())));

DROP POLICY IF EXISTS risk_assessments_select_own_scope ON public.risk_assessments;
CREATE POLICY risk_assessments_select_own_scope ON public.risk_assessments
  FOR SELECT TO authenticated
  USING (((company_workspace_id IS NOT NULL) AND can_access_company_workspace(company_workspace_id))
         OR ((company_workspace_id IS NULL) AND (created_by_user_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS risk_assessments_insert_own_org ON public.risk_assessments;
CREATE POLICY risk_assessments_insert_own_org ON public.risk_assessments
  FOR INSERT TO authenticated
  WITH CHECK (is_platform_admin((SELECT auth.uid()))
              OR is_account_owner_or_admin(organization_id)
              OR ((company_workspace_id IS NOT NULL) AND (EXISTS (
                   SELECT 1 FROM workspace_assignments wa
                   WHERE ((wa.company_workspace_id = risk_assessments.company_workspace_id)
                     AND (wa.user_id = (SELECT auth.uid()))
                     AND (wa.assignment_status = 'active'::text)
                     AND (wa.can_create_risk = true))))));

DROP POLICY IF EXISTS risk_assessments_insert_own_scope ON public.risk_assessments;
CREATE POLICY risk_assessments_insert_own_scope ON public.risk_assessments
  FOR INSERT TO authenticated
  WITH CHECK ((organization_id = current_organization_id())
              AND (created_by_user_id = (SELECT auth.uid()))
              AND (((company_workspace_id IS NOT NULL) AND can_manage_company_workspace(company_workspace_id))
                   OR (company_workspace_id IS NULL)));

DROP POLICY IF EXISTS risk_assessments_update_own_org ON public.risk_assessments;
CREATE POLICY risk_assessments_update_own_org ON public.risk_assessments
  FOR UPDATE TO authenticated
  USING (is_platform_admin((SELECT auth.uid()))
         OR is_account_owner_or_admin(organization_id)
         OR ((company_workspace_id IS NOT NULL) AND (EXISTS (
              SELECT 1 FROM workspace_assignments wa
              WHERE ((wa.company_workspace_id = risk_assessments.company_workspace_id)
                AND (wa.user_id = (SELECT auth.uid()))
                AND (wa.assignment_status = 'active'::text)
                AND (wa.can_edit_risk = true))))))
  WITH CHECK (is_platform_admin((SELECT auth.uid()))
              OR is_account_owner_or_admin(organization_id)
              OR ((company_workspace_id IS NOT NULL) AND (EXISTS (
                   SELECT 1 FROM workspace_assignments wa
                   WHERE ((wa.company_workspace_id = risk_assessments.company_workspace_id)
                     AND (wa.user_id = (SELECT auth.uid()))
                     AND (wa.assignment_status = 'active'::text)
                     AND (wa.can_edit_risk = true))))));

DROP POLICY IF EXISTS risk_assessments_update_own_scope ON public.risk_assessments;
CREATE POLICY risk_assessments_update_own_scope ON public.risk_assessments
  FOR UPDATE TO authenticated
  USING (((company_workspace_id IS NOT NULL) AND can_manage_company_workspace(company_workspace_id))
         OR ((company_workspace_id IS NULL) AND (created_by_user_id = (SELECT auth.uid()))))
  WITH CHECK ((organization_id = current_organization_id())
              AND (((company_workspace_id IS NOT NULL) AND can_manage_company_workspace(company_workspace_id))
                   OR ((company_workspace_id IS NULL) AND (created_by_user_id = (SELECT auth.uid())))));

DROP POLICY IF EXISTS risk_assessments_delete_own_org ON public.risk_assessments;
CREATE POLICY risk_assessments_delete_own_org ON public.risk_assessments
  FOR DELETE TO authenticated
  USING (is_platform_admin((SELECT auth.uid())) OR is_account_owner_or_admin(organization_id));

DROP POLICY IF EXISTS risk_assessments_delete_own_scope ON public.risk_assessments;
CREATE POLICY risk_assessments_delete_own_scope ON public.risk_assessments
  FOR DELETE TO authenticated
  USING (((company_workspace_id IS NOT NULL) AND can_manage_company_workspace(company_workspace_id))
         OR ((company_workspace_id IS NULL) AND (created_by_user_id = (SELECT auth.uid()))));

COMMIT;
