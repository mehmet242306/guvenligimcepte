-- =============================================================================
-- P0 fix: consume_rate_limit "column reference window_start is ambiguous"
-- =============================================================================
-- RETURNS TABLE içindeki window_start output kolonu, function gövdesinde
-- rate_limits tablosunun window_start kolonuyla çakışıyordu (INSERT'in
-- RETURNING * INTO aşamasında). PL/pgSQL'e tablo kolonunu tercih etmesini
-- söyleyen #variable_conflict use_column direktifi eklendi. API değişmedi.
-- =============================================================================

create or replace function public.consume_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_scope text,
  p_limit_count integer,
  p_window_seconds integer,
  p_plan_key text default null,
  p_organization_id uuid default null,
  p_ip_address text default null,
  p_user_agent text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamp with time zone,
  request_count integer,
  limit_count integer,
  window_start timestamp with time zone
)
language plpgsql
security definer
set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_row public.rate_limits%rowtype;
begin
  if p_user_id is null then
    raise exception 'consume_rate_limit requires p_user_id';
  end if;

  if p_limit_count <= 0 or p_window_seconds <= 0 then
    raise exception 'Invalid rate limit configuration';
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits (
    user_id,
    organization_id,
    endpoint,
    scope,
    window_start,
    window_seconds,
    request_count,
    limit_count,
    plan_key,
    metadata
  )
  values (
    p_user_id,
    p_organization_id,
    p_endpoint,
    case when p_scope in ('api', 'ai', 'auth') then p_scope else 'api' end,
    v_window_start,
    p_window_seconds,
    1,
    p_limit_count,
    p_plan_key,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id, endpoint, scope, window_start, window_seconds)
  do update set
    request_count = public.rate_limits.request_count + 1,
    limit_count = excluded.limit_count,
    plan_key = coalesce(excluded.plan_key, public.rate_limits.plan_key),
    metadata = public.rate_limits.metadata || excluded.metadata,
    updated_at = now()
  returning * into v_row;

  if v_row.request_count > v_row.limit_count then
    perform public.log_security_event(
      p_event_type => 'rate_limit.exceeded',
      p_severity => 'warning',
      p_endpoint => p_endpoint,
      p_user_id => p_user_id,
      p_organization_id => p_organization_id,
      p_ip_address => p_ip_address,
      p_user_agent => p_user_agent,
      p_details => jsonb_build_object(
        'scope', v_row.scope,
        'limit_count', v_row.limit_count,
        'request_count', v_row.request_count,
        'window_seconds', v_row.window_seconds,
        'window_start', v_row.window_start,
        'plan_key', v_row.plan_key
      ) || coalesce(p_metadata, '{}'::jsonb)
    );
  end if;

  return query
  select
    v_row.request_count <= v_row.limit_count,
    greatest(v_row.limit_count - v_row.request_count, 0),
    v_row.window_start + make_interval(secs => v_row.window_seconds),
    v_row.request_count,
    v_row.limit_count,
    v_row.window_start;
end;
$function$;
