-- 9 ai_* tables had RLS enabled with no policies — already deny-by-default for
-- non-service-role clients, but the advisor flags this as INFO. These tables
-- are written exclusively by edge functions and admin-ai API routes (both use
-- the service-role client, which bypasses RLS).
--
-- Adding minimal explicit policies to make intent unambiguous:
--   * tables with user_id  -> user reads own rows + platform_admin reads all
--   * tables without scope -> platform_admin reads all
-- All writes remain service-role-only (no INSERT/UPDATE/DELETE policies).

BEGIN;

-- Per-user scoped tables -----------------------------------------------------

DROP POLICY IF EXISTS ai_user_interactions_self_read ON public.ai_user_interactions;
CREATE POLICY ai_user_interactions_self_read
  ON public.ai_user_interactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS ai_search_queries_self_read ON public.ai_search_queries;
CREATE POLICY ai_search_queries_self_read
  ON public.ai_search_queries
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

-- Platform-admin-only catalog/observability tables ---------------------------

DROP POLICY IF EXISTS ai_daily_summary_admin_read ON public.ai_daily_summary;
CREATE POLICY ai_daily_summary_admin_read
  ON public.ai_daily_summary
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS ai_external_data_admin_read ON public.ai_external_data;
CREATE POLICY ai_external_data_admin_read
  ON public.ai_external_data
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS ai_learned_patterns_admin_read ON public.ai_learned_patterns;
CREATE POLICY ai_learned_patterns_admin_read
  ON public.ai_learned_patterns
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS ai_learning_sessions_admin_read ON public.ai_learning_sessions;
CREATE POLICY ai_learning_sessions_admin_read
  ON public.ai_learning_sessions
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS ai_model_versions_admin_read ON public.ai_model_versions;
CREATE POLICY ai_model_versions_admin_read
  ON public.ai_model_versions
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS ai_training_data_admin_read ON public.ai_training_data;
CREATE POLICY ai_training_data_admin_read
  ON public.ai_training_data
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS ai_training_logs_admin_read ON public.ai_training_logs;
CREATE POLICY ai_training_logs_admin_read
  ON public.ai_training_logs
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

COMMIT;
