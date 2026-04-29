begin;

alter table public.subscription_plans
  add column if not exists paddle_product_id text,
  add column if not exists paddle_price_id_monthly text,
  add column if not exists paddle_price_id_yearly text,
  add column if not exists action_limits jsonb not null default '{}'::jsonb;

alter table public.user_subscriptions
  add column if not exists paddle_customer_id text,
  add column if not exists paddle_subscription_id text,
  add column if not exists paddle_transaction_id text,
  add column if not exists paddle_price_id text,
  add column if not exists provider text not null default 'manual',
  add column if not exists provider_status text;

create index if not exists idx_user_subscriptions_paddle_subscription
  on public.user_subscriptions(paddle_subscription_id);

create index if not exists idx_user_subscriptions_paddle_customer
  on public.user_subscriptions(paddle_customer_id);

create table if not exists public.paddle_webhook_events (
  event_id text primary key,
  event_type text not null,
  occurred_at timestamptz,
  processed_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

alter table public.paddle_webhook_events enable row level security;

drop policy if exists "Service role can manage paddle webhook events"
  on public.paddle_webhook_events;

create policy "Service role can manage paddle webhook events"
  on public.paddle_webhook_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

update public.subscription_plans
   set action_limits = '{
     "nova_message": 10,
     "ai_analysis": 3,
     "document_generation": 1,
     "risk_analysis": 1,
     "field_inspection": 1,
     "incident_analysis": 0,
     "training_slide": 0,
     "export": 1
   }'::jsonb,
       updated_at = now()
 where plan_key = 'free';

update public.subscription_plans
   set action_limits = '{
     "nova_message": 100,
     "ai_analysis": 50,
     "document_generation": 10,
     "risk_analysis": 10,
     "field_inspection": 10,
     "incident_analysis": 3,
     "training_slide": 0,
     "export": 10
   }'::jsonb,
       updated_at = now()
 where plan_key = 'starter';

update public.subscription_plans
   set action_limits = '{
     "nova_message": 500,
     "ai_analysis": 200,
     "document_generation": 30,
     "risk_analysis": 50,
     "field_inspection": 50,
     "incident_analysis": 15,
     "training_slide": 5,
     "export": 50
   }'::jsonb,
       updated_at = now()
 where plan_key = 'professional';

update public.subscription_plans
   set action_limits = '{
     "nova_message": 1000,
     "ai_analysis": 500,
     "document_generation": 75,
     "risk_analysis": 150,
     "field_inspection": 150,
     "incident_analysis": 50,
     "training_slide": 20,
     "export": 150
   }'::jsonb,
       updated_at = now()
 where plan_key = 'professional_149';

update public.subscription_plans
   set action_limits = '{
     "nova_message": 2000,
     "ai_analysis": 1000,
     "document_generation": 150,
     "risk_analysis": 300,
     "field_inspection": 300,
     "incident_analysis": 100,
     "training_slide": 50,
     "export": 300
   }'::jsonb,
       updated_at = now()
 where plan_key = 'professional_199';

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
     and us.status in ('active', 'trialing')
     and (us.end_date is null or us.end_date > now())
   order by us.created_at desc
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
