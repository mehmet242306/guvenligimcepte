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
      'professional',
      'professional_149',
      'professional_199',
      'business',
      'enterprise'
    )
  );

update public.subscription_plans
   set display_name = 'Professional 99',
       description = 'Bireysel ISG profesyonelleri icin giris Professional kademesi',
       price_usd = 99,
       price_try = null,
       message_limit = 500,
       analysis_limit = 200,
       document_limit = 30,
       company_limit = 10,
       personnel_limit_per_company = 999999,
       allowed_tools = '[
         "search_legislation",
         "search_past_answers",
         "save_conversation",
         "get_personnel_count",
         "get_recent_assessments",
         "get_personnel_details",
         "get_training_status",
         "get_incidents",
         "get_documents",
         "get_ppe_records"
       ]'::jsonb,
       has_semantic_cache = true,
       has_proactive_suggestions = true,
       has_api_access = true,
       has_priority_support = true,
       has_white_label = false,
       has_dedicated_manager = false,
       has_action_tools = false,
       sort_order = 3,
       is_active = true,
       is_visible = true,
       updated_at = now()
 where plan_key = 'professional';

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
  is_visible
) values
(
  'professional_149',
  'Professional 149',
  'Daha yuksek Nova kullanimi isteyen bireysel profesyoneller icin orta kademe',
  149,
  null,
  1000,
  500,
  75,
  20,
  999999,
  '[
    "search_legislation",
    "search_past_answers",
    "save_conversation",
    "get_personnel_count",
    "get_recent_assessments",
    "get_personnel_details",
    "get_training_status",
    "get_incidents",
    "get_documents",
    "get_ppe_records",
    "get_risk_findings",
    "get_periodic_controls"
  ]'::jsonb,
  true,
  true,
  true,
  true,
  false,
  false,
  false,
  4,
  true,
  true
),
(
  'professional_199',
  'Professional 199',
  'Yuksek hacimli bireysel profesyonel kullanim icin ust kademe',
  199,
  null,
  2000,
  1000,
  150,
  35,
  999999,
  '[
    "search_legislation",
    "search_past_answers",
    "save_conversation",
    "get_personnel_count",
    "get_recent_assessments",
    "get_personnel_details",
    "get_training_status",
    "get_incidents",
    "get_documents",
    "get_ppe_records",
    "get_risk_findings",
    "get_periodic_controls",
    "get_health_exams",
    "get_company_info",
    "get_user_context"
  ]'::jsonb,
  true,
  true,
  true,
  true,
  false,
  false,
  false,
  5,
  true,
  true
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
       updated_at = now();

update public.subscription_plans
   set sort_order = 6,
       is_custom_pricing = true,
       is_visible = false,
       updated_at = now()
 where plan_key = 'business';

update public.subscription_plans
   set sort_order = 7,
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
      when 'starter' then 75
      else 25
    end;
end;
$$;

commit;
