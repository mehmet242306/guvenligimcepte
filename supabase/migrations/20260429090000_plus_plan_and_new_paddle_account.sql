begin;

do $$
declare
  v_constraint_name text;
begin
  select c.conname
    into v_constraint_name
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'public'
     and t.relname = 'subscription_plans'
     and c.contype = 'c'
     and pg_get_constraintdef(c.oid) like '%plan_key%'
   limit 1;

  if v_constraint_name is not null then
    execute format('alter table public.subscription_plans drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.subscription_plans
  add constraint subscription_plans_plan_key_check
  check (
    plan_key in (
      'free',
      'starter',
      'plus',
      'professional',
      'professional_149',
      'professional_199',
      'business',
      'enterprise'
    )
  );

insert into public.subscription_plans (
  plan_key,
  display_name,
  description,
  price_usd,
  price_try,
  message_limit,
  analysis_limit,
  document_limit,
  company_limit,
  personnel_limit_per_company,
  allowed_tools,
  has_semantic_cache,
  has_proactive_suggestions,
  has_api_access,
  has_priority_support,
  has_white_label,
  has_dedicated_manager,
  has_action_tools,
  sort_order,
  is_active,
  is_visible,
  is_custom_pricing,
  paddle_product_id,
  paddle_price_id_monthly,
  paddle_price_id_yearly,
  action_limits
) values (
  'plus',
  'Plus',
  'Starter ile Professional arasinda dengeli bireysel kullanim kademesi',
  59,
  null,
  250,
  100,
  20,
  6,
  999999,
  '[
    "search_legislation",
    "search_past_answers",
    "save_conversation",
    "get_personnel_count",
    "get_recent_assessments",
    "get_training_status",
    "get_documents"
  ]'::jsonb,
  true,
  true,
  false,
  false,
  false,
  false,
  false,
  3,
  true,
  true,
  false,
  'pro_01kqc6a17etkase2yfw3b4x8m3',
  'pri_01kqc6x2n6asgyh9k6w8pp9hgz',
  'pri_01kqc6yc68s829tkh09w82r2vs',
  '{
    "nova_message": 250,
    "ai_analysis": 100,
    "document_generation": 20,
    "risk_analysis": 25,
    "field_inspection": 25,
    "incident_analysis": 8,
    "training_slide": 2,
    "export": 25
  }'::jsonb
)
on conflict (plan_key) do update
   set display_name = excluded.display_name,
       description = excluded.description,
       price_usd = excluded.price_usd,
       price_try = excluded.price_try,
       message_limit = excluded.message_limit,
       analysis_limit = excluded.analysis_limit,
       document_limit = excluded.document_limit,
       company_limit = excluded.company_limit,
       personnel_limit_per_company = excluded.personnel_limit_per_company,
       allowed_tools = excluded.allowed_tools,
       has_semantic_cache = excluded.has_semantic_cache,
       has_proactive_suggestions = excluded.has_proactive_suggestions,
       has_api_access = excluded.has_api_access,
       has_priority_support = excluded.has_priority_support,
       has_white_label = excluded.has_white_label,
       has_dedicated_manager = excluded.has_dedicated_manager,
       has_action_tools = excluded.has_action_tools,
       sort_order = excluded.sort_order,
       is_active = excluded.is_active,
       is_visible = excluded.is_visible,
       is_custom_pricing = excluded.is_custom_pricing,
       paddle_product_id = excluded.paddle_product_id,
       paddle_price_id_monthly = excluded.paddle_price_id_monthly,
       paddle_price_id_yearly = excluded.paddle_price_id_yearly,
       action_limits = excluded.action_limits,
       updated_at = now();

update public.subscription_plans
   set paddle_product_id = 'pro_01kqc6a17etkase2yfw3b4x8m3',
       paddle_price_id_monthly = 'pri_01kqc6e2nf2yy078vmfyeqtqdv',
       paddle_price_id_yearly = 'pri_01kqc6gsggq92y3m2sxgr7t6qg',
       sort_order = 2,
       updated_at = now()
 where plan_key = 'starter';

update public.subscription_plans
   set paddle_product_id = 'pro_01kqc6a17etkase2yfw3b4x8m3',
       paddle_price_id_monthly = 'pri_01kqc7478jnyev8arj20n2dvw4',
       paddle_price_id_yearly = 'pri_01kqc75z0j35mg0250jpqamjve',
       sort_order = 4,
       updated_at = now()
 where plan_key = 'professional';

update public.subscription_plans
   set paddle_product_id = 'pro_01kqc6a17etkase2yfw3b4x8m3',
       paddle_price_id_monthly = 'pri_01kqc77f5jrdfha5n5p66h4107',
       paddle_price_id_yearly = 'pri_01kqc78xy8nrfr3zcdafyrg467',
       sort_order = 5,
       updated_at = now()
 where plan_key = 'professional_149';

update public.subscription_plans
   set paddle_product_id = 'pro_01kqc6a17etkase2yfw3b4x8m3',
       paddle_price_id_monthly = 'pri_01kqc7ahbpdfbfg7c6rg5xr6t7',
       paddle_price_id_yearly = 'pri_01kqc7cfyvx2e3w0ydx2tbf58p',
       sort_order = 6,
       updated_at = now()
 where plan_key = 'professional_199';

update public.subscription_plans
   set sort_order = 7,
       is_custom_pricing = true,
       is_visible = false,
       updated_at = now()
 where plan_key = 'business';

update public.subscription_plans
   set sort_order = 8,
       updated_at = now()
 where plan_key = 'enterprise';

create or replace function public.resolve_ai_daily_limit(p_user_id uuid)
returns table(plan_key text, daily_limit integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan_key text;
begin
  select sp.plan_key
  into v_plan_key
  from public.user_subscriptions us
  join public.subscription_plans sp on sp.id = us.plan_id
  where us.user_id = p_user_id
    and us.status = 'active'
  order by us.created_at desc
  limit 1;

  v_plan_key := coalesce(v_plan_key, 'free');

  return query
  select
    v_plan_key,
    case v_plan_key
      when 'enterprise' then 500
      when 'business' then 300
      when 'professional_199' then 300
      when 'professional_149' then 240
      when 'professional' then 180
      when 'plus' then 120
      when 'starter' then 75
      else 25
    end;
end;
$$;

select
  plan_key,
  display_name,
  price_usd,
  sort_order,
  paddle_product_id,
  paddle_price_id_monthly,
  paddle_price_id_yearly
from public.subscription_plans
where plan_key in ('starter', 'plus', 'professional', 'professional_149', 'professional_199')
order by sort_order;

commit;
