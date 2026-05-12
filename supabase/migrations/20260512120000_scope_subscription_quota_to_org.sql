begin;

create or replace function public.consume_subscription_quota(
  p_user_id uuid,
  p_organization_id uuid,
  p_action text,
  p_amount integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription record;
  v_plan record;
  v_usage record;
  v_current_month date := date_trunc('month', now())::date;
  v_limit integer;
  v_used integer;
  v_remaining integer;
  v_amount integer := greatest(coalesce(p_amount, 1), 1);
begin
  if p_action not in (
    'nova_message',
    'ai_analysis',
    'document_generation',
    'risk_analysis',
    'field_inspection',
    'incident_analysis',
    'training_slide',
    'export'
  ) then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'unknown_action',
      'message', 'Bilinmeyen abonelik aksiyonu.'
    );
  end if;

  select us.id as subscription_id,
         us.custom_limits,
         sp.plan_key,
         sp.display_name,
         sp.action_limits
    into v_subscription
    from public.user_subscriptions us
    join public.subscription_plans sp on sp.id = us.plan_id
   where us.user_id = p_user_id
     and us.organization_id = p_organization_id
     and us.status in ('active', 'trialing')
     and (us.end_date is null or us.end_date > now())
   order by us.updated_at desc nulls last, us.created_at desc
   limit 1;

  if v_subscription is null then
    select *
      into v_plan
      from public.subscription_plans
     where plan_key = 'free'
     limit 1;

    if v_plan.id is null then
      return jsonb_build_object(
        'allowed', false,
        'reason', 'plan_missing',
        'message', 'Free plan bulunamadi.'
      );
    end if;

    insert into public.user_subscriptions (
      user_id,
      organization_id,
      plan_id,
      status,
      billing_cycle,
      provider
    )
    values (
      p_user_id,
      p_organization_id,
      v_plan.id,
      'active',
      'monthly',
      'system'
    )
    returning id as subscription_id,
              '{}'::jsonb as custom_limits,
              v_plan.plan_key as plan_key,
              v_plan.display_name as display_name,
              v_plan.action_limits as action_limits
      into v_subscription;
  end if;

  v_limit := coalesce(
    nullif(v_subscription.custom_limits ->> p_action, '')::integer,
    nullif(v_subscription.action_limits ->> p_action, '')::integer,
    case p_action
      when 'nova_message' then nullif(v_subscription.action_limits ->> 'nova_message', '')::integer
      when 'document_generation' then nullif(v_subscription.action_limits ->> 'document_generation', '')::integer
      else nullif(v_subscription.action_limits ->> 'ai_analysis', '')::integer
    end,
    0
  );

  perform pg_advisory_xact_lock(
    hashtextextended(v_subscription.subscription_id::text || ':' || v_current_month::text, 0)
  );

  select *
    into v_usage
    from public.subscription_usage
   where subscription_id = v_subscription.subscription_id
     and usage_month = v_current_month
   for update;

  v_used := case
    when p_action = 'nova_message' then coalesce(v_usage.message_count, 0)
    when p_action = 'document_generation' then coalesce(v_usage.document_count, 0)
    else coalesce((v_usage.tool_usage ->> p_action)::integer, 0)
  end;

  if v_limit < 999999 and (v_used + v_amount) > v_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'limit_exceeded',
      'plan_key', v_subscription.plan_key,
      'plan_name', v_subscription.display_name,
      'action', p_action,
      'limit', v_limit,
      'used', v_used,
      'remaining', greatest(v_limit - v_used, 0),
      'message', 'Bu ayki paket limitiniz doldu.'
    );
  end if;

  insert into public.subscription_usage (
    subscription_id,
    user_id,
    usage_month,
    message_count,
    analysis_count,
    document_count,
    tool_usage
  )
  values (
    v_subscription.subscription_id,
    p_user_id,
    v_current_month,
    case when p_action = 'nova_message' then v_amount else 0 end,
    case when p_action = 'ai_analysis' then v_amount else 0 end,
    case when p_action = 'document_generation' then v_amount else 0 end,
    jsonb_build_object(p_action, v_amount)
  )
  on conflict (subscription_id, usage_month)
  do update set
    message_count = subscription_usage.message_count
      + case when p_action = 'nova_message' then v_amount else 0 end,
    analysis_count = subscription_usage.analysis_count
      + case when p_action = 'ai_analysis' then v_amount else 0 end,
    document_count = subscription_usage.document_count
      + case when p_action = 'document_generation' then v_amount else 0 end,
    tool_usage = subscription_usage.tool_usage || jsonb_build_object(
      p_action,
      coalesce((subscription_usage.tool_usage ->> p_action)::integer, 0) + v_amount
    ),
    updated_at = now();

  v_remaining := case
    when v_limit >= 999999 then 999999
    else greatest(v_limit - v_used - v_amount, 0)
  end;

  return jsonb_build_object(
    'allowed', true,
    'plan_key', v_subscription.plan_key,
    'plan_name', v_subscription.display_name,
    'action', p_action,
    'limit', v_limit,
    'used', v_used + v_amount,
    'remaining', v_remaining,
    'subscription_id', v_subscription.subscription_id
  );
end;
$$;

commit;
