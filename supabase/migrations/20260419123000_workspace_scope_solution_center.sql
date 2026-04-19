BEGIN;

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

ALTER TABLE public.solution_queries
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.solution_documents
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.legal_retrieval_runs
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.legal_answer_reviews
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.solution_queries
  ALTER COLUMN workspace_id SET DEFAULT public.current_workspace_id();

ALTER TABLE public.legal_retrieval_runs
  ALTER COLUMN workspace_id SET DEFAULT public.current_workspace_id();

UPDATE public.solution_queries sq
SET workspace_id = up.active_workspace_id
FROM public.user_profiles up
JOIN public.workspaces w ON w.id = up.active_workspace_id
WHERE sq.workspace_id IS NULL
  AND up.auth_user_id = sq.user_id
  AND (
    sq.organization_id IS NULL
    OR w.organization_id = sq.organization_id
  );

UPDATE public.solution_queries sq
SET workspace_id = org_ws.id
FROM (
  SELECT organization_id, min(id) AS id
  FROM public.workspaces
  GROUP BY organization_id
  HAVING count(*) = 1
) AS org_ws
WHERE sq.workspace_id IS NULL
  AND sq.organization_id = org_ws.organization_id;

UPDATE public.solution_documents sd
SET workspace_id = sq.workspace_id
FROM public.solution_queries sq
WHERE sd.workspace_id IS NULL
  AND sd.query_id = sq.id;

UPDATE public.legal_retrieval_runs lrr
SET workspace_id = up.active_workspace_id
FROM public.user_profiles up
JOIN public.workspaces w ON w.id = up.active_workspace_id
WHERE lrr.workspace_id IS NULL
  AND up.auth_user_id = lrr.user_id
  AND (
    lrr.organization_id IS NULL
    OR w.organization_id = lrr.organization_id
  );

UPDATE public.legal_retrieval_runs lrr
SET workspace_id = org_ws.id
FROM (
  SELECT organization_id, min(id) AS id
  FROM public.workspaces
  GROUP BY organization_id
  HAVING count(*) = 1
) AS org_ws
WHERE lrr.workspace_id IS NULL
  AND lrr.organization_id = org_ws.organization_id;

UPDATE public.legal_answer_reviews lar
SET workspace_id = lrr.workspace_id
FROM public.legal_retrieval_runs lrr
WHERE lar.workspace_id IS NULL
  AND lar.retrieval_run_id = lrr.id;

CREATE INDEX IF NOT EXISTS idx_solution_queries_workspace_created
  ON public.solution_queries(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_solution_documents_workspace_created
  ON public.solution_documents(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_legal_retrieval_runs_workspace_created
  ON public.legal_retrieval_runs(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_legal_answer_reviews_workspace_created
  ON public.legal_answer_reviews(workspace_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.sync_solution_document_workspace()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.workspace_id IS NULL AND NEW.query_id IS NOT NULL THEN
    SELECT sq.workspace_id
      INTO NEW.workspace_id
      FROM public.solution_queries sq
     WHERE sq.id = NEW.query_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_solution_documents_sync_workspace ON public.solution_documents;
CREATE TRIGGER trg_solution_documents_sync_workspace
  BEFORE INSERT OR UPDATE ON public.solution_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_solution_document_workspace();

CREATE OR REPLACE FUNCTION public.sync_legal_answer_review_workspace()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.workspace_id IS NULL AND NEW.retrieval_run_id IS NOT NULL THEN
    SELECT lrr.workspace_id
      INTO NEW.workspace_id
      FROM public.legal_retrieval_runs lrr
     WHERE lrr.id = NEW.retrieval_run_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_legal_answer_reviews_sync_workspace ON public.legal_answer_reviews;
CREATE TRIGGER trg_legal_answer_reviews_sync_workspace
  BEFORE INSERT OR UPDATE ON public.legal_answer_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_legal_answer_review_workspace();

DROP POLICY IF EXISTS "sq_select" ON public.solution_queries;
DROP POLICY IF EXISTS "sq_insert" ON public.solution_queries;
DROP POLICY IF EXISTS "sq_update" ON public.solution_queries;
DROP POLICY IF EXISTS "sq_delete" ON public.solution_queries;
CREATE POLICY "sq_select" ON public.solution_queries
  FOR SELECT USING (
    user_id = auth.uid()
    AND (
      workspace_id IS NULL
      OR public.user_has_workspace_access(workspace_id)
    )
  );
CREATE POLICY "sq_insert" ON public.solution_queries
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      workspace_id IS NULL
      OR public.user_has_workspace_access(workspace_id)
    )
  );
CREATE POLICY "sq_update" ON public.solution_queries
  FOR UPDATE USING (
    user_id = auth.uid()
    AND (
      workspace_id IS NULL
      OR public.user_has_workspace_access(workspace_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (
      workspace_id IS NULL
      OR public.user_has_workspace_access(workspace_id)
    )
  );
CREATE POLICY "sq_delete" ON public.solution_queries
  FOR DELETE USING (
    user_id = auth.uid()
    AND (
      workspace_id IS NULL
      OR public.user_has_workspace_access(workspace_id)
    )
  );

DROP POLICY IF EXISTS "sd_select" ON public.solution_documents;
DROP POLICY IF EXISTS "sd_insert" ON public.solution_documents;
DROP POLICY IF EXISTS "sd_delete" ON public.solution_documents;
CREATE POLICY "sd_select" ON public.solution_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.solution_queries sq
      WHERE sq.id = solution_documents.query_id
        AND sq.user_id = auth.uid()
        AND (
          sq.workspace_id IS NULL
          OR public.user_has_workspace_access(sq.workspace_id)
        )
    )
  );
CREATE POLICY "sd_insert" ON public.solution_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.solution_queries sq
      WHERE sq.id = solution_documents.query_id
        AND sq.user_id = auth.uid()
        AND (
          sq.workspace_id IS NULL
          OR public.user_has_workspace_access(sq.workspace_id)
        )
    )
  );
CREATE POLICY "sd_delete" ON public.solution_documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.solution_queries sq
      WHERE sq.id = solution_documents.query_id
        AND sq.user_id = auth.uid()
        AND (
          sq.workspace_id IS NULL
          OR public.user_has_workspace_access(sq.workspace_id)
        )
    )
  );

DROP POLICY IF EXISTS "legal_retrieval_runs_own_read" ON public.legal_retrieval_runs;
DROP POLICY IF EXISTS "legal_retrieval_runs_own_insert" ON public.legal_retrieval_runs;
CREATE POLICY "legal_retrieval_runs_own_read"
  ON public.legal_retrieval_runs
  FOR SELECT USING (
    user_id = auth.uid()
    AND (
      workspace_id IS NULL
      OR public.user_has_workspace_access(workspace_id)
    )
  );
CREATE POLICY "legal_retrieval_runs_own_insert"
  ON public.legal_retrieval_runs
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      workspace_id IS NULL
      OR public.user_has_workspace_access(workspace_id)
    )
  );

DROP POLICY IF EXISTS "legal_answer_reviews_own_read" ON public.legal_answer_reviews;
DROP POLICY IF EXISTS "legal_answer_reviews_own_insert" ON public.legal_answer_reviews;
CREATE POLICY "legal_answer_reviews_own_read"
  ON public.legal_answer_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.legal_retrieval_runs lrr
      WHERE lrr.id = legal_answer_reviews.retrieval_run_id
        AND lrr.user_id = auth.uid()
        AND (
          lrr.workspace_id IS NULL
          OR public.user_has_workspace_access(lrr.workspace_id)
        )
    )
  );
CREATE POLICY "legal_answer_reviews_own_insert"
  ON public.legal_answer_reviews
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.legal_retrieval_runs lrr
      WHERE lrr.id = legal_answer_reviews.retrieval_run_id
        AND lrr.user_id = auth.uid()
        AND (
          lrr.workspace_id IS NULL
          OR public.user_has_workspace_access(lrr.workspace_id)
        )
    )
  );

COMMIT;
