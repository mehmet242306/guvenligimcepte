-- Idempotency ledger for transactional email notifications.

begin;

create table if not exists public.email_notification_logs (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  notification_type text not null,
  user_id uuid null,
  organization_id uuid null,
  recipient_email text not null,
  status text not null default 'sent'
    check (status in ('sent', 'skipped', 'failed')),
  provider text not null default 'resend',
  provider_message_id text null,
  error_message text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_notification_logs_user
  on public.email_notification_logs(user_id, created_at desc);

create index if not exists idx_email_notification_logs_org
  on public.email_notification_logs(organization_id, created_at desc);

create index if not exists idx_email_notification_logs_type
  on public.email_notification_logs(notification_type, created_at desc);

alter table public.email_notification_logs enable row level security;

drop policy if exists email_notification_logs_admin_select on public.email_notification_logs;
create policy email_notification_logs_admin_select
on public.email_notification_logs
for select
using (
  public.user_has_permission('admin.notifications.view')
  or public.user_has_permission('admin.billing.view')
);

comment on table public.email_notification_logs is
'Transactional email idempotency and audit ledger. Service role writes email send attempts; admins can inspect status without exposing provider secrets.';

commit;
