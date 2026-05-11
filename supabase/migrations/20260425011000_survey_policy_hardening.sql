-- Survey/exam tables had policies of `true` for write operations and PII reads,
-- meaning any authenticated (or even anonymous) user could mutate or exfiltrate
-- another tenant's surveys, tokens, and PII-containing response data.
--
-- This migration tightens the highest-impact policies:
--   * surveys / survey_questions DELETE+UPDATE+INSERT  -> org members only
--   * survey_tokens INSERT                              -> org members only
--   * survey_responses SELECT (PII: names/emails/phones via tokens) -> org members only
--
-- Sonraki adım (tamamlandı — bkz. 20260511203000_survey_public_flow_rls_lockdown.sql):
-- Public anket akışı Next.js `/api/survey/public/session` + `/api/survey/public/submit`
-- üzerinden service role ile çalışır; ardından bu tablolarda geniş anon/JWT INSERT
-- ve token enumerasyonuna izin veren politikalar kaldırıldı.

BEGIN;

-- ---------------------------------------------------------------------------
-- surveys: DELETE/UPDATE/INSERT scoped to org
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS surveys_delete ON public.surveys;
CREATE POLICY surveys_delete
  ON public.surveys
  FOR DELETE
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS surveys_update ON public.surveys;
CREATE POLICY surveys_update
  ON public.surveys
  FOR UPDATE
  TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS surveys_insert ON public.surveys;
CREATE POLICY surveys_insert
  ON public.surveys
  FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.current_user_organization_id());

-- ---------------------------------------------------------------------------
-- survey_questions: DELETE/UPDATE/INSERT scoped to parent survey's org
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS survey_questions_delete ON public.survey_questions;
CREATE POLICY survey_questions_delete
  ON public.survey_questions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_questions.survey_id
        AND s.organization_id = public.current_user_organization_id()
    )
  );

DROP POLICY IF EXISTS survey_questions_update ON public.survey_questions;
CREATE POLICY survey_questions_update
  ON public.survey_questions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_questions.survey_id
        AND s.organization_id = public.current_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_questions.survey_id
        AND s.organization_id = public.current_user_organization_id()
    )
  );

DROP POLICY IF EXISTS survey_questions_insert ON public.survey_questions;
CREATE POLICY survey_questions_insert
  ON public.survey_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_questions.survey_id
        AND s.organization_id = public.current_user_organization_id()
    )
  );

-- ---------------------------------------------------------------------------
-- survey_tokens: INSERT scoped to parent survey's org (still need permissive
--                SELECT/UPDATE for public token flow, see header note)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS survey_tokens_insert ON public.survey_tokens;
CREATE POLICY survey_tokens_insert
  ON public.survey_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_tokens.survey_id
        AND s.organization_id = public.current_user_organization_id()
    )
  );

-- ---------------------------------------------------------------------------
-- survey_responses: SELECT contains PII (joined names/emails/phones via
--                   tokens). Restrict reads to authenticated org members.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS survey_responses_select ON public.survey_responses;
CREATE POLICY survey_responses_select
  ON public.survey_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_responses.survey_id
        AND s.organization_id = public.current_user_organization_id()
    )
  );

COMMIT;
