-- Single-user conversion:
-- - Remove OSGB umbrella/account affiliations.
-- - Convert the user's organization/account to individual.
-- - Attach an internal individual plan with no workspace/seat caps.
-- - Add a manual user subscription with very high quota overrides.
--
-- Usage:
-- Supabase Dashboard -> SQL Editor -> run as postgres/service role.
-- Confirm v_email before running.
--
-- Note:
-- The product treats numeric quota values >= 999999 as effectively unlimited
-- in consume_subscription_quota. Some abuse/security rate limits may still
-- apply outside the subscription quota system.

begin;

do $$
declare
  v_email text := 'mehmetyildirim2923@gmail.com';
  v_auth_id uuid;
  v_profile_id uuid;
  v_org_id uuid;
  v_internal_plan_id uuid;
  v_quota_plan_id uuid;
  v_unlimited_limits jsonb := jsonb_build_object(
    'nova_message', 999999,
    'ai_analysis', 999999,
    'document_generation', 999999,
    'risk_analysis', 999999,
    'field_inspection', 999999,
    'incident_analysis', 999999,
    'training_slide', 999999,
    'export', 999999,
    'message', 999999,
    'analysis', 999999,
    'document', 999999
  );
begin
  select up.auth_user_id, up.id, up.organization_id
    into v_auth_id, v_profile_id, v_org_id
  from public.user_profiles up
  where lower(up.email) = lower(v_email)
  limit 1;

  if v_auth_id is null then
    select au.id
      into v_auth_id
    from auth.users au
    where lower(au.email) = lower(v_email)
    limit 1;
  end if;

  if v_auth_id is null then
    raise exception 'auth/users: % not found', v_email;
  end if;

  if v_org_id is null then
    select up.id, up.organization_id
      into v_profile_id, v_org_id
    from public.user_profiles up
    where up.auth_user_id = v_auth_id
    limit 1;
  end if;

  if v_org_id is null then
    raise exception 'user_profiles: organization_id missing for auth_user_id=%', v_auth_id;
  end if;

  delete from public.organization_osgb_affiliations
  where osgb_organization_id = v_org_id
     or professional_organization_id = v_org_id;

  insert into public.plans (
    code,
    name,
    account_type,
    max_active_workspaces,
    max_active_staff_seats,
    has_personnel_module,
    has_task_tracking,
    has_announcements,
    has_advanced_reports,
    contact_required,
    is_active
  )
  values (
    'individual_internal_unlimited',
    'Bireysel (limitsiz - ic)',
    'individual',
    null,
    null,
    true,
    true,
    true,
    true,
    false,
    true
  )
  on conflict (code) do update set
    name = excluded.name,
    account_type = excluded.account_type,
    max_active_workspaces = excluded.max_active_workspaces,
    max_active_staff_seats = excluded.max_active_staff_seats,
    has_personnel_module = excluded.has_personnel_module,
    has_task_tracking = excluded.has_task_tracking,
    has_announcements = excluded.has_announcements,
    has_advanced_reports = excluded.has_advanced_reports,
    contact_required = excluded.contact_required,
    is_active = excluded.is_active;

  select id
    into v_internal_plan_id
  from public.plans
  where code = 'individual_internal_unlimited'
  limit 1;

  update public.organizations
  set
    account_type = 'individual',
    organization_type = 'bireysel',
    current_plan_id = v_internal_plan_id,
    updated_at = now()
  where id = v_org_id;

  update public.organization_subscriptions
  set
    status = 'cancelled',
    ends_at = coalesce(ends_at, now())
  where organization_id = v_org_id
    and status in ('active', 'trialing');

  insert into public.organization_subscriptions (organization_id, plan_id, status)
  values (v_org_id, v_internal_plan_id, 'active');

  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'allowed_account_types', jsonb_build_array('individual'),
      'demo_account_type', 'individual'
    )
  where id = v_auth_id;

  select id
    into v_quota_plan_id
  from public.subscription_plans
  where plan_key = 'professional_199'
  limit 1;

  if v_quota_plan_id is null then
    select id
      into v_quota_plan_id
    from public.subscription_plans
    where plan_key = 'professional'
    limit 1;
  end if;

  if v_quota_plan_id is null then
    raise exception 'subscription_plans: professional_199/professional plan not found';
  end if;

  update public.user_subscriptions
  set
    status = 'cancelled',
    cancelled_at = coalesce(cancelled_at, now()),
    end_date = coalesce(end_date, now()),
    cancellation_reason = coalesce(cancellation_reason, 'manual_individual_unlimited_conversion'),
    updated_at = now()
  where user_id = v_auth_id
    and status in ('active', 'trialing');

  insert into public.user_subscriptions (
    user_id,
    organization_id,
    plan_id,
    status,
    billing_cycle,
    provider,
    custom_limits,
    custom_features,
    notes
  )
  values (
    v_auth_id,
    v_org_id,
    v_quota_plan_id,
    'active',
    'monthly',
    'manual',
    v_unlimited_limits,
    jsonb_build_object(
      'internal_unlimited', true,
      'converted_from_osgb', true
    ),
    'Converted to individual unlimited internal account.'
  );

  raise notice 'OK: email=% auth_id=% profile_id=% org_id=% internal_plan_id=% quota_plan_id=%',
    v_email, v_auth_id, v_profile_id, v_org_id, v_internal_plan_id, v_quota_plan_id;
end $$;

commit;
