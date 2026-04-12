create or replace function public.rls_tests()
returns setof text
language plpgsql
set search_path = public, extensions
as $$
declare
  v_org_id uuid := '00000000-0000-0000-0000-00000000a001';
  v_uid_a uuid := '00000000-0000-0000-0000-00000000a011';
  v_uid_b uuid := '00000000-0000-0000-0000-00000000a012';
  v_profile_a uuid := '00000000-0000-0000-0000-00000000a021';
  v_profile_b uuid := '00000000-0000-0000-0000-00000000a022';
  v_role_viewer uuid;
  v_role_admin uuid;
  v_notification_a uuid := '00000000-0000-0000-0000-00000000a031';
  v_notification_b uuid := '00000000-0000-0000-0000-00000000a032';
  v_rate_limit_id uuid := '00000000-0000-0000-0000-00000000a041';
begin
  return next plan(8);

  insert into public.organizations (id, name, slug)
  values (v_org_id, 'RLS Test Org', 'rls-test-' || substr(v_org_id::text, 1, 8))
  on conflict (id) do update
  set
    name = excluded.name,
    slug = excluded.slug,
    is_active = true,
    updated_at = now();

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values
    ('00000000-0000-0000-0000-000000000000', v_uid_a, 'authenticated', 'authenticated', 'rls_a_' || substr(v_uid_a::text,1,8) || '@risknova.test', crypt('Passw0rd!234', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}'::jsonb, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_uid_b, 'authenticated', 'authenticated', 'rls_b_' || substr(v_uid_b::text,1,8) || '@risknova.test', crypt('Passw0rd!234', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}'::jsonb, now(), now())
  on conflict (id) do update
  set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now();

  insert into public.user_profiles (id, auth_user_id, organization_id, email, full_name)
  values
    (v_profile_a, v_uid_a, v_org_id, 'rls_a@risknova.test', 'RLS Test A'),
    (v_profile_b, v_uid_b, v_org_id, 'rls_b@risknova.test', 'RLS Test B')
  on conflict (auth_user_id) do update
  set
    organization_id = excluded.organization_id,
    email = excluded.email,
    full_name = excluded.full_name,
    updated_at = now(),
    deleted_at = null;

  select id into v_role_viewer from public.roles where code = 'viewer' limit 1;
  select id into v_role_admin from public.roles where code in ('admin', 'organization_admin', 'platform_admin') order by case code when 'admin' then 1 else 2 end limit 1;

  delete from public.user_roles where user_profile_id in (v_profile_a, v_profile_b);

  insert into public.user_roles (user_profile_id, role_id)
  values
    (v_profile_a, v_role_viewer),
    (v_profile_b, v_role_admin)
  on conflict do nothing;

  insert into public.notifications (id, organization_id, user_id, title, message, type, level)
  values
    (v_notification_a, v_org_id, v_uid_a, 'RLS A', 'A only', 'system', 'info'),
    (v_notification_b, v_org_id, v_uid_b, 'RLS B', 'B only', 'system', 'info')
  on conflict (id) do update
  set
    organization_id = excluded.organization_id,
    user_id = excluded.user_id,
    title = excluded.title,
    message = excluded.message,
    type = excluded.type,
    level = excluded.level;

  insert into public.rate_limits (
    id, user_id, organization_id, endpoint, scope, window_start, window_seconds, request_count, limit_count
  )
  values (
    v_rate_limit_id, v_uid_a, v_org_id, '/test', 'api', date_trunc('minute', now()), 60, 1, 60
  )
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    organization_id = excluded.organization_id,
    endpoint = excluded.endpoint,
    scope = excluded.scope,
    window_start = excluded.window_start,
    window_seconds = excluded.window_seconds,
    request_count = excluded.request_count,
    limit_count = excluded.limit_count,
    updated_at = now();

  perform set_config('row_security', 'on', true);
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_uid_a::text, true);
  perform set_config('request.jwt.claim.organization_id', v_org_id::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'role', 'authenticated',
      'sub', v_uid_a::text,
      'organization_id', v_org_id::text
    )::text,
    true
  );
  return next is((select count(*)::integer from public.notifications), 1, 'Kullanici A sadece kendi bildirimini gorur');
  return next ok(exists(select 1 from public.notifications where id = v_notification_a), 'Kullanici A kendi bildirimine erisir');
  return next ok(not exists(select 1 from public.notifications where id = v_notification_b), 'Kullanici A diger kullanicinin bildirimini goremez');
  return next is((select count(*)::integer from public.rate_limits), 1, 'Kullanici A kendi rate limit kovasini gorur');

  perform set_config('request.jwt.claim.sub', v_uid_b::text, true);
  perform set_config('request.jwt.claim.organization_id', v_org_id::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'role', 'authenticated',
      'sub', v_uid_b::text,
      'organization_id', v_org_id::text
    )::text,
    true
  );
  return next is((select count(*)::integer from public.notifications), 1, 'Kullanici B sadece kendi bildirimini gorur');
  return next ok(exists(select 1 from public.notifications where id = v_notification_b), 'Kullanici B kendi bildirimine erisir');
  return next ok(public.user_has_permission('security.events.view', v_uid_b), 'Admin kullanici guvenlik olaylarini gorur');
  return next ok(not public.user_has_permission('security.events.view', v_uid_a), 'Viewer guvenlik olaylarini goremez');

  return query select * from finish();
end;
$$;

comment on function public.rls_tests() is
  'pgTAP tabanli temel RLS dogrulama suiti. Idempotent test verisiyle deployment oncesi calistirilir.';
