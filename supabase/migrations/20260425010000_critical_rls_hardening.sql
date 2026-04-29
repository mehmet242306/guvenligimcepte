-- 4 ERROR-level RLS gaps detected by get_advisors (2026-04-25):
--   public.platform_admins, public.plans, public.organization_subscriptions, public.enterprise_leads
-- All four are written/read exclusively via the service-role client (createServiceClient).
-- No browser/anon access exists in the codebase, so enabling RLS with default-deny is safe.
-- Service role bypasses RLS by definition; we add scoped policies only where authenticated
-- clients legitimately need read access (plans for upgrade UI, organization_subscriptions for
-- org members viewing their own plan).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. platform_admins  (admin allowlist — fully service-role-only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_admins_self_read ON public.platform_admins;
CREATE POLICY platform_admins_self_read
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. plans  (subscription catalog — readable by any authenticated user for the
--           upgrade UI; write only via service role)
-- ---------------------------------------------------------------------------
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plans_active_read ON public.plans;
CREATE POLICY plans_active_read
  ON public.plans
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ---------------------------------------------------------------------------
-- 3. organization_subscriptions  (per-tenant subscription record)
-- ---------------------------------------------------------------------------
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_subscriptions_member_read ON public.organization_subscriptions;
CREATE POLICY organization_subscriptions_member_read
  ON public.organization_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    OR public.is_platform_admin(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 4. enterprise_leads  (public contact-form sink — service-role-only access)
-- ---------------------------------------------------------------------------
ALTER TABLE public.enterprise_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_leads FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS enterprise_leads_admin_read ON public.enterprise_leads;
CREATE POLICY enterprise_leads_admin_read
  ON public.enterprise_leads
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

COMMIT;
