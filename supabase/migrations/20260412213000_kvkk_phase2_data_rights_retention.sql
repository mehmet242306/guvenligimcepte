alter table public.user_profiles
  add column if not exists delete_requested_at timestamptz;

create index if not exists idx_user_profiles_delete_requested_at
  on public.user_profiles(delete_requested_at desc);

create table if not exists public.data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  company_workspace_id uuid references public.company_workspaces(id) on delete set null,
  requested_by uuid references auth.users(id) on delete set null,
  request_scope text not null default 'self' check (request_scope in ('self', 'admin')),
  target_full_name text,
  target_email text,
  requested_by_name text,
  requested_by_email text,
  reason text,
  status text not null default 'scheduled' check (status in ('scheduled', 'processing', 'completed', 'cancelled', 'rejected')),
  requested_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  scheduled_purge_at timestamptz not null,
  processed_at timestamptz,
  completed_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  requested_ip_address text,
  requested_user_agent text,
  admin_notes text,
  error_message text,
  audit_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_data_deletion_requests_active_target
  on public.data_deletion_requests(target_user_id)
  where status in ('scheduled', 'processing');

create index if not exists idx_data_deletion_requests_status
  on public.data_deletion_requests(status, requested_at desc);

create index if not exists idx_data_deletion_requests_scheduled
  on public.data_deletion_requests(scheduled_purge_at asc)
  where status = 'scheduled';

create table if not exists public.data_exports (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  request_scope text not null default 'self' check (request_scope in ('self', 'admin')),
  export_format text not null check (export_format in ('json', 'csv')),
  status text not null default 'completed' check (status in ('completed', 'failed', 'expired')),
  target_full_name text,
  target_email text,
  requested_by_name text,
  requested_by_email text,
  file_name text not null,
  payload_json jsonb,
  payload_csv text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz,
  last_downloaded_at timestamptz,
  download_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_data_exports_target
  on public.data_exports(target_user_id, requested_at desc);

create index if not exists idx_data_exports_status
  on public.data_exports(status, expires_at desc nulls last);

create table if not exists public.retention_policies (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null unique,
  retention_days integer not null check (retention_days >= 0),
  action text not null check (action in ('delete', 'anonymize')),
  description text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.retention_executions (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid references public.retention_policies(id) on delete set null,
  entity_type text not null,
  action text not null,
  status text not null default 'completed' check (status in ('completed', 'failed', 'skipped')),
  affected_count integer not null default 0,
  details jsonb not null default '{}'::jsonb,
  executed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_retention_executions_entity
  on public.retention_executions(entity_type, executed_at desc);

drop trigger if exists trg_data_deletion_requests_updated_at on public.data_deletion_requests;
create trigger trg_data_deletion_requests_updated_at
before update on public.data_deletion_requests
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_data_exports_updated_at on public.data_exports;
create trigger trg_data_exports_updated_at
before update on public.data_exports
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_retention_policies_updated_at on public.retention_policies;
create trigger trg_retention_policies_updated_at
before update on public.retention_policies
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.data_deletion_requests enable row level security;
alter table public.data_exports enable row level security;
alter table public.retention_policies enable row level security;
alter table public.retention_executions enable row level security;

drop policy if exists data_deletion_requests_select on public.data_deletion_requests;
create policy data_deletion_requests_select
on public.data_deletion_requests
for select
using (
  target_user_id = auth.uid()
  or public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
);

drop policy if exists data_deletion_requests_insert on public.data_deletion_requests;
create policy data_deletion_requests_insert
on public.data_deletion_requests
for insert
with check (
  target_user_id = auth.uid()
  or public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
);

drop policy if exists data_deletion_requests_manage on public.data_deletion_requests;
create policy data_deletion_requests_manage
on public.data_deletion_requests
for update
using (
  public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
)
with check (
  public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
);

drop policy if exists data_exports_select on public.data_exports;
create policy data_exports_select
on public.data_exports
for select
using (
  target_user_id = auth.uid()
  or requested_by = auth.uid()
  or public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
);

drop policy if exists data_exports_manage on public.data_exports;
create policy data_exports_manage
on public.data_exports
for all
using (
  public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
)
with check (
  public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
);

drop policy if exists retention_policies_select on public.retention_policies;
create policy retention_policies_select
on public.retention_policies
for select
using (
  public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
);

drop policy if exists retention_policies_manage on public.retention_policies;
create policy retention_policies_manage
on public.retention_policies
for all
using (
  public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
)
with check (
  public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
);

drop policy if exists retention_executions_select on public.retention_executions;
create policy retention_executions_select
on public.retention_executions
for select
using (
  public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
);

create or replace function public.submit_data_deletion_request(
  p_reason text default null,
  p_ip_address text default null,
  p_user_agent text default null
)
returns public.data_deletion_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_request public.data_deletion_requests;
  v_profile public.user_profiles;
  v_retention_days integer := 30;
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadi.';
  end if;

  select *
  into v_profile
  from public.user_profiles
  where auth_user_id = auth.uid()
  limit 1;

  if v_profile.id is null then
    raise exception 'Kullanici profili bulunamadi.';
  end if;

  if exists (
    select 1
    from public.data_deletion_requests ddr
    where ddr.target_user_id = auth.uid()
      and ddr.status in ('scheduled', 'processing')
  ) then
    raise exception 'Aktif bir veri silme talebiniz zaten bulunuyor.';
  end if;

  select retention_days
  into v_retention_days
  from public.retention_policies
  where entity_type = 'user_account'
    and is_active = true
  limit 1;

  v_retention_days := coalesce(v_retention_days, 30);

  insert into public.data_deletion_requests (
    target_user_id,
    organization_id,
    requested_by,
    request_scope,
    target_full_name,
    target_email,
    requested_by_name,
    requested_by_email,
    reason,
    status,
    requested_at,
    acknowledged_at,
    scheduled_purge_at,
    requested_ip_address,
    requested_user_agent,
    audit_metadata
  )
  values (
    auth.uid(),
    v_profile.organization_id,
    auth.uid(),
    'self',
    v_profile.full_name,
    v_profile.email,
    v_profile.full_name,
    v_profile.email,
    nullif(trim(p_reason), ''),
    'scheduled',
    now(),
    now(),
    now() + make_interval(days => v_retention_days),
    p_ip_address,
    p_user_agent,
    jsonb_build_object(
      'requested_by', auth.uid(),
      'retention_days', v_retention_days
    )
  )
  returning *
  into v_request;

  update public.user_profiles
  set
    delete_requested_at = coalesce(delete_requested_at, now()),
    deleted_at = coalesce(deleted_at, now()),
    is_active = false,
    updated_at = now()
  where auth_user_id = auth.uid();

  update public.user_consents
  set
    revoked_at = coalesce(revoked_at, now()),
    updated_at = now()
  where user_id = auth.uid()
    and revoked_at is null;

  perform public.log_security_event(
    p_event_type => 'privacy.deletion_requested',
    p_severity => 'warning',
    p_endpoint => '/privacy/delete-request',
    p_user_id => auth.uid(),
    p_organization_id => v_profile.organization_id,
    p_ip_address => p_ip_address,
    p_user_agent => p_user_agent,
    p_details => jsonb_build_object(
      'request_id', v_request.id,
      'scheduled_purge_at', v_request.scheduled_purge_at,
      'scope', 'self'
    )
  );

  return v_request;
end;
$$;

create or replace function public.set_data_deletion_request_status(
  p_request_id uuid,
  p_status text,
  p_admin_notes text default null
)
returns public.data_deletion_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.data_deletion_requests;
begin
  if not (
    public.user_has_permission('settings.manage')
    or public.user_has_permission('compliance.kvkk.manage')
  ) then
    raise exception 'Bu islem icin yetkiniz yok.';
  end if;

  if p_status not in ('scheduled', 'cancelled', 'rejected') then
    raise exception 'Gecersiz talep durumu.';
  end if;

  update public.data_deletion_requests
  set
    status = p_status,
    admin_notes = nullif(trim(p_admin_notes), ''),
    acknowledged_at = coalesce(acknowledged_at, now()),
    rejected_at = case when p_status = 'rejected' then now() else null end,
    cancelled_at = case when p_status = 'cancelled' then now() else null end,
    error_message = null,
    updated_at = now()
  where id = p_request_id
  returning *
  into v_request;

  if v_request.id is null then
    raise exception 'Silme talebi bulunamadi.';
  end if;

  perform public.log_security_event(
    p_event_type => 'privacy.deletion_status_changed',
    p_severity => 'info',
    p_endpoint => '/settings/kvkk',
    p_user_id => v_request.target_user_id,
    p_organization_id => v_request.organization_id,
    p_details => jsonb_build_object(
      'request_id', v_request.id,
      'status', v_request.status,
      'admin_notes', v_request.admin_notes
    )
  );

  return v_request;
end;
$$;

create or replace function public.run_retention_policies()
returns table (
  entity_type text,
  action text,
  affected_count integer,
  status text,
  details jsonb
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_policy public.retention_policies;
  v_request public.data_deletion_requests;
  v_count integer := 0;
  v_details jsonb := '{}'::jsonb;
begin
  if auth.uid() is not null and not (
    public.user_has_permission('settings.manage')
    or public.user_has_permission('compliance.kvkk.manage')
  ) then
    raise exception 'Bu islem icin yetkiniz yok.';
  end if;

  for v_policy in
    select *
    from public.retention_policies
    where is_active = true
    order by entity_type
  loop
    v_count := 0;
    v_details := '{}'::jsonb;

    if v_policy.entity_type = 'user_account' then
      for v_request in
        select *
        from public.data_deletion_requests
        where status = 'scheduled'
          and scheduled_purge_at <= now()
        order by scheduled_purge_at
      loop
        update public.data_deletion_requests
        set status = 'processing',
            processed_at = now(),
            updated_at = now()
        where id = v_request.id;

        begin
          delete from public.data_exports
          where target_user_id = v_request.target_user_id
             or requested_by = v_request.target_user_id;

          delete from auth.users
          where id = v_request.target_user_id;

          update public.data_deletion_requests
          set status = 'completed',
              completed_at = now(),
              error_message = null,
              updated_at = now()
          where id = v_request.id;

          perform public.log_security_event(
            p_event_type => 'privacy.deletion_completed',
            p_severity => 'critical',
            p_endpoint => '/cron/kvkk-retention',
            p_user_id => v_request.target_user_id,
            p_organization_id => v_request.organization_id,
            p_details => jsonb_build_object(
              'request_id', v_request.id,
              'scheduled_purge_at', v_request.scheduled_purge_at
            )
          );

          v_count := v_count + 1;
        exception
          when others then
            update public.data_deletion_requests
            set status = 'scheduled',
                error_message = left(sqlerrm, 400),
                updated_at = now()
            where id = v_request.id;
        end;
      end loop;
    elsif v_policy.entity_type = 'data_exports' then
      if v_policy.action = 'delete' then
        delete from public.data_exports
        where status in ('completed', 'failed', 'expired')
          and coalesce(completed_at, requested_at) <= now() - make_interval(days => v_policy.retention_days);
        get diagnostics v_count = row_count;
      elsif v_policy.action = 'anonymize' then
        update public.data_exports
        set
          payload_json = null,
          payload_csv = null,
          status = 'expired',
          updated_at = now()
        where coalesce(completed_at, requested_at) <= now() - make_interval(days => v_policy.retention_days)
          and (payload_json is not null or payload_csv is not null);
        get diagnostics v_count = row_count;
      else
        v_details := jsonb_build_object('warning', 'unsupported_action');
      end if;
    else
      v_details := jsonb_build_object('warning', 'unsupported_entity_type');
    end if;

    insert into public.retention_executions (
      policy_id,
      entity_type,
      action,
      status,
      affected_count,
      details,
      executed_at
    )
    values (
      v_policy.id,
      v_policy.entity_type,
      v_policy.action,
      case
        when v_details ? 'warning' then 'skipped'
        else 'completed'
      end,
      v_count,
      coalesce(v_details, '{}'::jsonb),
      now()
    );

    entity_type := v_policy.entity_type;
    action := v_policy.action;
    affected_count := v_count;
    status := case
      when v_details ? 'warning' then 'skipped'
      else 'completed'
    end;
    details := coalesce(v_details, '{}'::jsonb);
    return next;
  end loop;
end;
$$;

revoke all on function public.submit_data_deletion_request(text, text, text) from public;
grant execute on function public.submit_data_deletion_request(text, text, text) to authenticated, service_role;

revoke all on function public.set_data_deletion_request_status(uuid, text, text) from public;
grant execute on function public.set_data_deletion_request_status(uuid, text, text) to authenticated, service_role;

revoke all on function public.run_retention_policies() from public;
grant execute on function public.run_retention_policies() to authenticated, service_role;

insert into public.retention_policies (
  entity_type,
  retention_days,
  action,
  description,
  is_active
)
values
  ('user_account', 30, 'delete', 'Veri silme talebi sonrasinda kullanici hesabi 30 gun sonra kalici olarak silinir.', true),
  ('data_exports', 7, 'delete', 'Kullanicinin indirdigi veri ihraclari 7 gun sonra sistemden temizlenir.', true)
on conflict (entity_type) do update
set
  retention_days = excluded.retention_days,
  action = excluded.action,
  description = excluded.description,
  is_active = excluded.is_active;
