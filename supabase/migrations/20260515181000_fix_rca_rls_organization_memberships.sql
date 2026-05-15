-- Repair RCA policies if 20260417000000 failed mid-way (wrong table name organization_members).
BEGIN;

DROP POLICY IF EXISTS "org members select rca_analyses" ON public.rca_analyses;
CREATE POLICY "org members select rca_analyses" ON public.rca_analyses
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org members insert rca_analyses" ON public.rca_analyses;
CREATE POLICY "org members insert rca_analyses" ON public.rca_analyses
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org members update rca_analyses" ON public.rca_analyses;
CREATE POLICY "org members update rca_analyses" ON public.rca_analyses
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org members select rca_audit" ON public.rca_audit_log;
CREATE POLICY "org members select rca_audit" ON public.rca_audit_log
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.fn_compute_r2d_rca(
  p_incident_id uuid,
  p_t0 numeric[],
  p_t1 numeric[],
  p_tau_primary numeric DEFAULT 0.40,
  p_tau_secondary numeric DEFAULT 0.15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_weights constant numeric[] := ARRAY[0.120, 0.085, 0.145, 0.085, 0.145, 0.075, 0.165, 0.105, 0.075];
  v_delta numeric[] := ARRAY[0,0,0,0,0,0,0,0,0]::numeric[];
  v_priority numeric[] := ARRAY[0,0,0,0,0,0,0,0,0]::numeric[];
  v_max_delta numeric := 0;
  v_max_delta_idx int := 0;
  v_max_weighted numeric := 0;
  v_max_weighted_idx int := 0;
  v_override boolean;
  v_mode text;
  v_r_rca numeric;
  v_base_score numeric := 0;
  v_is_stable boolean;
  v_dual_reporting boolean;
  v_org_id uuid;
  v_user_id uuid;
  i int;
  v_d numeric;
  v_p numeric;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Kimlik doğrulaması gerekli';
  END IF;

  IF p_incident_id IS NOT NULL THEN
    SELECT i.organization_id INTO v_org_id FROM public.incidents i WHERE i.id = p_incident_id;
    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'Olay bulunamadı veya erişim yok';
    END IF;
  ELSE
    SELECT organization_id INTO v_org_id
    FROM public.organization_memberships
    WHERE user_id = v_user_id
    LIMIT 1;
    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'Organizasyon üyeliği bulunamadı';
    END IF;
  END IF;

  IF array_length(p_t0, 1) <> 9 OR array_length(p_t1, 1) <> 9 THEN
    RAISE EXCEPTION 't0 ve t1 tam olarak 9 elemanlı olmalı';
  END IF;

  FOR i IN 1..9 LOOP
    IF p_t0[i] < 0 OR p_t0[i] > 1 THEN RAISE EXCEPTION 't0[%] aralık dışı: %', i, p_t0[i]; END IF;
    IF p_t1[i] < 0 OR p_t1[i] > 1 THEN RAISE EXCEPTION 't1[%] aralık dışı: %', i, p_t1[i]; END IF;
  END LOOP;

  FOR i IN 1..9 LOOP
    v_d := GREATEST(0, p_t1[i] - p_t0[i]);
    v_delta[i] := ROUND(v_d::numeric, 3);
    v_p := v_d * v_weights[i];
    v_priority[i] := ROUND(v_p::numeric, 4);
    v_base_score := v_base_score + v_p;

    IF v_d > v_max_delta THEN
      v_max_delta := v_d;
      v_max_delta_idx := i - 1;
    END IF;

    IF v_p > v_max_weighted THEN
      v_max_weighted := v_p;
      v_max_weighted_idx := i - 1;
    END IF;
  END LOOP;

  v_override := v_max_delta >= p_tau_primary;
  v_mode := CASE WHEN v_override THEN 'override' ELSE 'base_score' END;
  v_r_rca := ROUND((CASE WHEN v_override THEN v_max_delta ELSE v_base_score END)::numeric, 3);
  v_is_stable := (v_max_delta_idx = v_max_weighted_idx);
  v_dual_reporting := NOT v_is_stable AND v_max_delta > 0;

  INSERT INTO public.rca_audit_log (organization_id, action, payload, performed_by)
  VALUES (
    v_org_id,
    'compute',
    jsonb_build_object(
      'incident_id', p_incident_id,
      't0', to_jsonb(p_t0),
      't1', to_jsonb(p_t1),
      'tau_primary', p_tau_primary,
      'tau_secondary', p_tau_secondary,
      'r_rca_score', v_r_rca,
      'mode', v_mode
    ),
    v_user_id
  );

  RETURN jsonb_build_object(
    'deltaHat', to_jsonb(v_delta),
    'maxDeltaHat', v_max_delta,
    'maxDeltaHatIndex', v_max_delta_idx,
    'maxWeightedIndex', v_max_weighted_idx,
    'overrideTriggered', v_override,
    'calculationMode', v_mode,
    'rRcaScore', v_r_rca,
    'isStable', v_is_stable,
    'dualReportingRequired', v_dual_reporting,
    'priorities', to_jsonb(v_priority),
    'weights', to_jsonb(v_weights),
    'tauPrimary', p_tau_primary,
    'tauSecondary', p_tau_secondary,
    'organizationId', v_org_id
  );
END;
$$;

COMMIT;
