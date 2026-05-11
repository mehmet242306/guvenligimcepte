-- =============================================================================
-- Survey public flow: RLS lockdown after moving token validation + submit to API
-- =============================================================================
-- Önce deploy: Next.js `/api/survey/public/session` ve `/api/survey/public/submit`
-- service role ile çalışır (RLS bypass). Bu migration JWT (anon/authenticated)
-- ile doğrudan survey_tokens / survey_responses / okuma yollarını kapatır.
--
-- Kaldırılan permissive davranış:
--   - surveys + survey_questions SELECT artık yalnızca kendi org üyeleri
--   - survey_tokens SELECT/UPDATE yalnızca ilgili org üyeleri (dashboard)
--   - survey_responses INSERT politikası kaldırıldı — yalnızca service_role yazar
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS surveys_select ON public.surveys;
CREATE POLICY surveys_select ON public.surveys
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS survey_questions_select ON public.survey_questions;
CREATE POLICY survey_questions_select ON public.survey_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_questions.survey_id
        AND s.organization_id = public.current_user_organization_id()
    )
  );

DROP POLICY IF EXISTS survey_tokens_select ON public.survey_tokens;
DROP POLICY IF EXISTS survey_tokens_update ON public.survey_tokens;

CREATE POLICY survey_tokens_select ON public.survey_tokens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_tokens.survey_id
        AND s.organization_id = public.current_user_organization_id()
    )
  );

CREATE POLICY survey_tokens_update ON public.survey_tokens
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_tokens.survey_id
        AND s.organization_id = public.current_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_tokens.survey_id
        AND s.organization_id = public.current_user_organization_id()
    )
  );

DROP POLICY IF EXISTS survey_responses_insert ON public.survey_responses;

COMMIT;
