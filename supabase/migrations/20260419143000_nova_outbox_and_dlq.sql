create table if not exists public.nova_outbox (
  id uuid primary key default gen_random_uuid(),
  action_run_id uuid not null references public.nova_action_runs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_workspace_id uuid null references public.company_workspaces(id) on delete set null,
  task_queue_id uuid null references public.task_queue(id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'succeeded', 'failed', 'dead_letter', 'cancelled')),
  retry_count integer not null default 0,
  max_retries integer not null default 5,
  last_error text null,
  payload jsonb not null default '{}'::jsonb,
  last_attempt_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (action_run_id),
  unique (task_queue_id)
);

create index if not exists idx_nova_outbox_status_created_at
  on public.nova_outbox(status, created_at desc);

create index if not exists idx_nova_outbox_org_status
  on public.nova_outbox(organization_id, status, created_at desc);

create index if not exists idx_nova_outbox_task_queue_id
  on public.nova_outbox(task_queue_id);

alter table public.nova_outbox enable row level security;

drop policy if exists "nova_outbox_select_own_org" on public.nova_outbox;
create policy "nova_outbox_select_own_org"
on public.nova_outbox
for select
using (
  organization_id = public.current_organization_id()
  or public.is_super_admin(auth.uid())
);

drop policy if exists "nova_outbox_manage_service" on public.nova_outbox;
create policy "nova_outbox_manage_service"
on public.nova_outbox
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop trigger if exists trg_nova_outbox_updated_at on public.nova_outbox;
create trigger trg_nova_outbox_updated_at
before update on public.nova_outbox
for each row execute function public.set_updated_at();
