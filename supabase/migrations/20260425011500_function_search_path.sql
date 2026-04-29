-- Pin search_path on the four functions flagged by the database linter
-- (function_search_path_mutable). With a mutable search_path an attacker who
-- can create objects in another schema visible to the function's role could
-- shadow built-ins and hijack execution.

BEGIN;

ALTER FUNCTION public.touch_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.exact_legal_reference_lookup(
  law_number text,
  article_patterns text[],
  as_of_date date,
  result_limit integer
) SET search_path = public, pg_temp;

ALTER FUNCTION public.search_legal_chunks_v3(
  search_terms text[],
  as_of_date date,
  result_limit integer
) SET search_path = public, pg_temp;

ALTER FUNCTION public.search_legal_chunks_dense_v1(
  query_embedding vector,
  as_of_date date,
  match_threshold double precision,
  result_limit integer
) SET search_path = public, pg_temp;

COMMIT;
