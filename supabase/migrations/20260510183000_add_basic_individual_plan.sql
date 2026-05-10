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
      'basic',
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
  'basic',
  'Basic',
  'Free ile Starter arasinda dusuk butceli bireysel kullanim kademesi',
  15,
  null,
  50,
  20,
  5,
  2,
  999999,
  '[
    "search_legislation",
    "search_past_answers",
    "save_conversation",
    "get_recent_assessments",
    "get_documents"
  ]'::jsonb,
  true,
  false,
  false,
  false,
  false,
  false,
  false,
  2,
  true,
  true,
  false,
  null,
  null,
  null,
  '{
    "nova_message": 50,
    "ai_analysis": 20,
    "document_generation": 5,
    "risk_analysis": 5,
    "field_inspection": 5,
    "incident_analysis": 1,
    "training_slide": 0,
    "export": 5
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
       action_limits = excluded.action_limits,
       updated_at = now();

update public.subscription_plans
   set sort_order = case plan_key
     when 'free' then 1
     when 'basic' then 2
     when 'starter' then 3
     when 'plus' then 4
     when 'professional' then 5
     when 'professional_149' then 6
     when 'professional_199' then 7
     when 'business' then 8
     when 'enterprise' then 9
     else sort_order
   end,
   updated_at = now()
 where plan_key in ('free', 'basic', 'starter', 'plus', 'professional', 'professional_149', 'professional_199', 'business', 'enterprise');

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
      when 'basic' then 50
      else 25
    end;
end;
$$;

commit;
