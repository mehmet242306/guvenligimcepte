create table if not exists public.auth_login_lockouts (
  email text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  failed_attempts integer not null default 0,
  first_failed_at timestamptz,
  last_failed_at timestamptz,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_auth_login_lockouts_user_id
  on public.auth_login_lockouts(user_id);

create index if not exists idx_auth_login_lockouts_locked_until
  on public.auth_login_lockouts(locked_until desc);

drop trigger if exists trg_auth_login_lockouts_updated_at on public.auth_login_lockouts;
create trigger trg_auth_login_lockouts_updated_at
before update on public.auth_login_lockouts
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.auth_login_lockouts enable row level security;

drop policy if exists auth_login_lockouts_select_none on public.auth_login_lockouts;
create policy auth_login_lockouts_select_none
on public.auth_login_lockouts
for select
to authenticated
using (false);

create or replace function public.get_login_lockout(
  p_email text,
  p_user_id uuid default null
)
returns table (
  is_locked boolean,
  locked_until timestamptz,
  failed_attempts integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.auth_login_lockouts%rowtype;
  v_email text := lower(coalesce(trim(p_email), ''));
begin
  if v_email = '' and p_user_id is null then
    return query select false, null::timestamptz, 0;
    return;
  end if;

  select *
  into v_row
  from public.auth_login_lockouts
  where (v_email <> '' and email = v_email)
     or (p_user_id is not null and user_id = p_user_id)
  order by case when user_id = p_user_id then 0 else 1 end
  limit 1;

  return query
  select
    coalesce(v_row.locked_until > now(), false),
    v_row.locked_until,
    coalesce(v_row.failed_attempts, 0);
end;
$$;

create or replace function public.register_login_failure(
  p_email text,
  p_user_id uuid default null,
  p_organization_id uuid default null,
  p_ip_address text default null,
  p_user_agent text default null
)
returns table (
  is_locked boolean,
  locked_until timestamptz,
  failed_attempts integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(trim(p_email), ''));
  v_existing public.auth_login_lockouts%rowtype;
  v_attempts integer := 1;
  v_locked_until timestamptz := null;
begin
  if v_email = '' and p_user_id is null then
    return query select false, null::timestamptz, 0;
    return;
  end if;

  select *
  into v_existing
  from public.auth_login_lockouts
  where (v_email <> '' and email = v_email)
     or (p_user_id is not null and user_id = p_user_id)
  order by case when user_id = p_user_id then 0 else 1 end
  limit 1;

  if v_existing.email is not null
     and v_existing.last_failed_at is not null
     and v_existing.last_failed_at > now() - interval '15 minutes' then
    v_attempts := v_existing.failed_attempts + 1;
  end if;

  if v_attempts >= 5 then
    v_locked_until := now() + interval '30 minutes';
  end if;

  insert into public.auth_login_lockouts (
    email,
    user_id,
    organization_id,
    failed_attempts,
    first_failed_at,
    last_failed_at,
    locked_until
  )
  values (
    coalesce(nullif(v_email, ''), coalesce(v_existing.email, 'unknown-' || gen_random_uuid()::text)),
    coalesce(p_user_id, v_existing.user_id),
    coalesce(p_organization_id, v_existing.organization_id),
    v_attempts,
    case
      when v_existing.email is not null
        and v_existing.last_failed_at is not null
        and v_existing.last_failed_at > now() - interval '15 minutes'
      then v_existing.first_failed_at
      else now()
    end,
    now(),
    v_locked_until
  )
  on conflict (email) do update
  set
    user_id = coalesce(excluded.user_id, auth_login_lockouts.user_id),
    organization_id = coalesce(excluded.organization_id, auth_login_lockouts.organization_id),
    failed_attempts = excluded.failed_attempts,
    first_failed_at = excluded.first_failed_at,
    last_failed_at = excluded.last_failed_at,
    locked_until = excluded.locked_until,
    updated_at = now();

  if v_locked_until is not null then
    perform public.log_security_event(
      p_event_type => 'auth.account_locked',
      p_severity => 'critical',
      p_endpoint => '/auth/login',
      p_user_id => p_user_id,
      p_organization_id => p_organization_id,
      p_ip_address => p_ip_address,
      p_user_agent => p_user_agent,
      p_details => jsonb_build_object(
        'email', v_email,
        'failed_attempts', v_attempts,
        'locked_until', v_locked_until
      )
    );
  end if;

  return query
  select
    v_locked_until is not null and v_locked_until > now(),
    v_locked_until,
    v_attempts;
end;
$$;

create or replace function public.clear_login_failures(
  p_email text default null,
  p_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(trim(p_email), ''));
begin
  delete from public.auth_login_lockouts
  where (v_email <> '' and email = v_email)
     or (p_user_id is not null and user_id = p_user_id);
end;
$$;

create or replace function public.list_role_management_users()
returns table (
  user_profile_id uuid,
  auth_user_id uuid,
  full_name text,
  email text,
  organization_id uuid,
  organization_name text,
  role_codes text[],
  effective_role text,
  is_active boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.user_has_permission('security.roles.manage') then
    raise exception 'Yetkisiz erisim';
  end if;

  return query
  select
    up.id as user_profile_id,
    up.auth_user_id,
    up.full_name,
    coalesce(up.email, au.email::text) as email,
    up.organization_id,
    org.name as organization_name,
    coalesce(array_agg(distinct r.code) filter (where r.code is not null), '{}'::text[]) as role_codes,
    public.effective_app_role(up.auth_user_id) as effective_role,
    up.is_active
  from public.user_profiles up
  left join auth.users au on au.id = up.auth_user_id
  left join public.organizations org on org.id = up.organization_id
  left join public.user_roles ur on ur.user_profile_id = up.id
  left join public.roles r on r.id = ur.role_id
  group by up.id, up.auth_user_id, up.full_name, up.email, au.email, up.organization_id, org.name, up.is_active
  order by coalesce(up.full_name, up.email, au.email::text);
end;
$$;

create or replace function public.list_role_management_matrix()
returns table (
  role_code text,
  role_name text,
  permission_codes text[],
  permission_count integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.user_has_permission('security.roles.manage') then
    raise exception 'Yetkisiz erisim';
  end if;

  return query
  select
    r.code as role_code,
    r.name as role_name,
    coalesce(array_agg(distinct p.code order by p.code) filter (where p.code is not null), '{}'::text[]) as permission_codes,
    count(distinct p.code)::integer as permission_count
  from public.roles r
  left join public.role_permissions rp on rp.role_id = r.id
  left join public.permissions p on p.id = rp.permission_id
  where r.code in ('super_admin', 'admin', 'inspector', 'viewer')
  group by r.id, r.code, r.name
  order by case r.code
    when 'super_admin' then 1
    when 'admin' then 2
    when 'inspector' then 3
    when 'viewer' then 4
    else 99
  end;
end;
$$;

create or replace function public.set_user_access_role(
  p_user_profile_id uuid,
  p_role_code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_profile_id uuid;
  v_target_auth_user_id uuid;
  v_target_org_id uuid;
  v_role_id uuid;
begin
  if not public.user_has_permission('security.roles.manage') then
    raise exception 'Yetkisiz erisim';
  end if;

  if p_role_code not in ('super_admin', 'admin', 'inspector', 'viewer') then
    raise exception 'Gecersiz rol kodu';
  end if;

  select up.id
  into v_actor_profile_id
  from public.user_profiles up
  where up.auth_user_id = auth.uid()
  limit 1;

  select up.auth_user_id, up.organization_id
  into v_target_auth_user_id, v_target_org_id
  from public.user_profiles up
  where up.id = p_user_profile_id
  limit 1;

  if v_target_auth_user_id is null then
    raise exception 'Kullanici bulunamadi';
  end if;

  select id
  into v_role_id
  from public.roles
  where code = p_role_code
  limit 1;

  delete from public.user_roles ur
  using public.roles r
  where ur.role_id = r.id
    and ur.user_profile_id = p_user_profile_id
    and r.code in (
      'super_admin',
      'admin',
      'viewer',
      'inspector',
      'platform_admin',
      'organization_admin',
      'osgb_manager',
      'ohs_specialist',
      'workplace_physician',
      'dsp'
    );

  insert into public.user_roles (user_profile_id, role_id, assigned_by)
  values (p_user_profile_id, v_role_id, v_actor_profile_id)
  on conflict (user_profile_id, role_id) do nothing;

  perform public.log_security_event(
    p_event_type => 'rbac.role_changed',
    p_severity => 'info',
    p_endpoint => '/settings/roles',
    p_user_id => v_target_auth_user_id,
    p_organization_id => v_target_org_id,
    p_details => jsonb_build_object(
      'user_profile_id', p_user_profile_id,
      'role_code', p_role_code,
      'assigned_by', auth.uid()
    )
  );
end;
$$;

revoke all on function public.get_login_lockout(text, uuid) from public;
grant execute on function public.get_login_lockout(text, uuid) to authenticated, service_role;

revoke all on function public.register_login_failure(text, uuid, uuid, text, text) from public;
grant execute on function public.register_login_failure(text, uuid, uuid, text, text) to authenticated, service_role;

revoke all on function public.clear_login_failures(text, uuid) from public;
grant execute on function public.clear_login_failures(text, uuid) to authenticated, service_role;

revoke all on function public.list_role_management_users() from public;
grant execute on function public.list_role_management_users() to authenticated, service_role;

revoke all on function public.list_role_management_matrix() from public;
grant execute on function public.list_role_management_matrix() to authenticated, service_role;

revoke all on function public.set_user_access_role(uuid, text) from public;
grant execute on function public.set_user_access_role(uuid, text) to authenticated, service_role;
