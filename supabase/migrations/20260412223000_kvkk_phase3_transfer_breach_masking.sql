create table if not exists public.masking_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  company_workspace_id uuid references public.company_workspaces(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  source_context text not null check (source_context in ('live_scan', 'photo_upload', 'vision_capture', 'manual_redaction')),
  media_type text not null check (media_type in ('frame', 'image', 'video')),
  masking_status text not null check (masking_status in ('masked', 'skipped', 'failed')),
  detected_faces integer not null default 0 check (detected_faces >= 0),
  detected_plates integer not null default 0 check (detected_plates >= 0),
  detected_identity_cards integer not null default 0 check (detected_identity_cards >= 0),
  original_persisted boolean not null default false,
  details jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_masking_events_created_at
  on public.masking_events(created_at desc);

create index if not exists idx_masking_events_org_context
  on public.masking_events(organization_id, source_context, created_at desc);

create table if not exists public.international_transfers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  company_workspace_id uuid references public.company_workspaces(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  destination_region text not null,
  destination_country text,
  transfer_context text not null check (transfer_context in ('claude_vision', 'claude_chat', 'ai_document', 'mevzuat_rag', 'manual_export')),
  reason text not null,
  data_category text not null,
  legal_basis_version text,
  payload_reference text,
  frame_count integer not null default 0 check (frame_count >= 0),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_international_transfers_created_at
  on public.international_transfers(created_at desc);

create index if not exists idx_international_transfers_org_context
  on public.international_transfers(organization_id, transfer_context, created_at desc);

create table if not exists public.breach_notification_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notification_window_hours integer not null default 72 check (notification_window_hours > 0),
  summary text,
  authority_template text not null,
  customer_template text not null,
  internal_checklist jsonb not null default '[]'::jsonb,
  notification_contacts jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.breach_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  company_workspace_id uuid references public.company_workspaces(id) on delete set null,
  reported_by uuid references auth.users(id) on delete set null,
  owner_user_id uuid references auth.users(id) on delete set null,
  template_id uuid references public.breach_notification_templates(id) on delete set null,
  title text not null,
  summary text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'investigating', 'notification_prepared', 'notified', 'closed')),
  detected_at timestamptz not null default now(),
  reported_at timestamptz not null default now(),
  authority_notification_due_at timestamptz,
  authority_notified_at timestamptz,
  customer_notified_at timestamptz,
  requires_authority_notification boolean not null default true,
  transfer_related boolean not null default false,
  affected_subject_count integer not null default 0 check (affected_subject_count >= 0),
  data_categories text[] not null default '{}'::text[],
  affected_systems text[] not null default '{}'::text[],
  actions_taken text,
  evidence_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_breach_incidents_status
  on public.breach_incidents(status, reported_at desc);

create index if not exists idx_breach_incidents_due_at
  on public.breach_incidents(authority_notification_due_at asc)
  where requires_authority_notification = true;

drop trigger if exists trg_breach_notification_templates_updated_at on public.breach_notification_templates;
create trigger trg_breach_notification_templates_updated_at
before update on public.breach_notification_templates
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_breach_incidents_updated_at on public.breach_incidents;
create trigger trg_breach_incidents_updated_at
before update on public.breach_incidents
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.masking_events enable row level security;
alter table public.international_transfers enable row level security;
alter table public.breach_notification_templates enable row level security;
alter table public.breach_incidents enable row level security;

drop policy if exists masking_events_select on public.masking_events;
create policy masking_events_select
on public.masking_events
for select
using (
  public.user_has_permission('compliance.kvkk.manage')
  or public.user_has_permission('settings.manage')
);

drop policy if exists masking_events_manage on public.masking_events;
create policy masking_events_manage
on public.masking_events
for all
using (
  public.user_has_permission('compliance.kvkk.manage')
  or public.user_has_permission('settings.manage')
)
with check (
  public.user_has_permission('compliance.kvkk.manage')
  or public.user_has_permission('settings.manage')
);

drop policy if exists international_transfers_select on public.international_transfers;
create policy international_transfers_select
on public.international_transfers
for select
using (
  public.user_has_permission('compliance.kvkk.manage')
  or public.user_has_permission('settings.manage')
);

drop policy if exists international_transfers_manage on public.international_transfers;
create policy international_transfers_manage
on public.international_transfers
for all
using (
  public.user_has_permission('compliance.kvkk.manage')
  or public.user_has_permission('settings.manage')
)
with check (
  public.user_has_permission('compliance.kvkk.manage')
  or public.user_has_permission('settings.manage')
);

drop policy if exists breach_templates_select on public.breach_notification_templates;
create policy breach_templates_select
on public.breach_notification_templates
for select
using (
  public.user_has_permission('compliance.kvkk.manage')
  or public.user_has_permission('settings.manage')
);

drop policy if exists breach_templates_manage on public.breach_notification_templates;
create policy breach_templates_manage
on public.breach_notification_templates
for all
using (
  public.user_has_permission('compliance.kvkk.manage')
  or public.user_has_permission('settings.manage')
)
with check (
  public.user_has_permission('compliance.kvkk.manage')
  or public.user_has_permission('settings.manage')
);

drop policy if exists breach_incidents_select on public.breach_incidents;
create policy breach_incidents_select
on public.breach_incidents
for select
using (
  public.user_has_permission('compliance.kvkk.manage')
  or public.user_has_permission('settings.manage')
);

drop policy if exists breach_incidents_manage on public.breach_incidents;
create policy breach_incidents_manage
on public.breach_incidents
for all
using (
  public.user_has_permission('compliance.kvkk.manage')
  or public.user_has_permission('settings.manage')
)
with check (
  public.user_has_permission('compliance.kvkk.manage')
  or public.user_has_permission('settings.manage')
);

create or replace function public.log_masking_event(
  p_source_context text,
  p_media_type text,
  p_masking_status text,
  p_detected_faces integer default 0,
  p_detected_plates integer default 0,
  p_detected_identity_cards integer default 0,
  p_organization_id uuid default null,
  p_company_workspace_id uuid default null,
  p_original_persisted boolean default false,
  p_details jsonb default '{}'::jsonb
)
returns public.masking_events
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_row public.masking_events;
begin
  insert into public.masking_events (
    organization_id,
    company_workspace_id,
    actor_user_id,
    source_context,
    media_type,
    masking_status,
    detected_faces,
    detected_plates,
    detected_identity_cards,
    original_persisted,
    details
  )
  values (
    p_organization_id,
    p_company_workspace_id,
    auth.uid(),
    p_source_context,
    p_media_type,
    p_masking_status,
    greatest(coalesce(p_detected_faces, 0), 0),
    greatest(coalesce(p_detected_plates, 0), 0),
    greatest(coalesce(p_detected_identity_cards, 0), 0),
    coalesce(p_original_persisted, false),
    coalesce(p_details, '{}'::jsonb)
  )
  returning *
  into v_row;

  return v_row;
end;
$$;

create or replace function public.log_international_transfer(
  p_provider text,
  p_destination_region text,
  p_destination_country text default null,
  p_transfer_context text default 'claude_vision',
  p_reason text default '',
  p_data_category text default 'camera_frame',
  p_legal_basis_version text default null,
  p_payload_reference text default null,
  p_frame_count integer default 0,
  p_organization_id uuid default null,
  p_company_workspace_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns public.international_transfers
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_row public.international_transfers;
begin
  insert into public.international_transfers (
    organization_id,
    company_workspace_id,
    actor_user_id,
    provider,
    destination_region,
    destination_country,
    transfer_context,
    reason,
    data_category,
    legal_basis_version,
    payload_reference,
    frame_count,
    details
  )
  values (
    p_organization_id,
    p_company_workspace_id,
    auth.uid(),
    p_provider,
    p_destination_region,
    p_destination_country,
    p_transfer_context,
    nullif(trim(p_reason), ''),
    p_data_category,
    p_legal_basis_version,
    p_payload_reference,
    greatest(coalesce(p_frame_count, 0), 0),
    coalesce(p_details, '{}'::jsonb)
  )
  returning *
  into v_row;

  return v_row;
end;
$$;

revoke all on function public.log_masking_event(text, text, text, integer, integer, integer, uuid, uuid, boolean, jsonb) from public;
grant execute on function public.log_masking_event(text, text, text, integer, integer, integer, uuid, uuid, boolean, jsonb) to authenticated, service_role;

revoke all on function public.log_international_transfer(text, text, text, text, text, text, text, text, integer, uuid, uuid, jsonb) from public;
grant execute on function public.log_international_transfer(text, text, text, text, text, text, text, text, integer, uuid, uuid, jsonb) to authenticated, service_role;

insert into public.breach_notification_templates (
  title,
  notification_window_hours,
  summary,
  authority_template,
  customer_template,
  internal_checklist,
  notification_contacts,
  is_active
)
values (
  'Varsayilan KVKK veri ihlali bildirimi',
  72,
  '72 saat icinde otoriteye ve gerekirse veri sahiplerine gidecek hazir bildirim metni.',
  'Ihlalin ozetini, etkilenen veri kategorilerini, tahmini veri sahibi sayisini, alinan onlemleri ve irtibat kisilerini bu alana ekleyin.',
  'Veri sahiplerine gidecek acik bilgilendirme metnini bu alana ekleyin.',
  '["Ihlal zamani dogrulandi","Etkilenen veri kategorileri cikarildi","KVKK bildirim metni hazirlandi","Iletisim plani onaylandi"]'::jsonb,
  '[]'::jsonb,
  true
)
on conflict do nothing;
