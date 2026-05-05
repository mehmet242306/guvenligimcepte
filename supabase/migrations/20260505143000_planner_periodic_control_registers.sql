-- Ajanda: Periyodik kontrol envanteri (şablon + manuel satırlar, firma bazlı)
create table if not exists public.planner_periodic_control_registers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_workspace_id uuid not null references public.company_workspaces (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, company_workspace_id)
);

create index if not exists idx_planner_periodic_registers_company
  on public.planner_periodic_control_registers (company_workspace_id)
  where deleted_at is null;

alter table public.planner_periodic_control_registers enable row level security;

drop policy if exists planner_periodic_registers_select on public.planner_periodic_control_registers;
create policy planner_periodic_registers_select
  on public.planner_periodic_control_registers
  for select
  using (
    deleted_at is null
    and public.can_access_company_workspace (company_workspace_id)
  );

drop policy if exists planner_periodic_registers_insert on public.planner_periodic_control_registers;
create policy planner_periodic_registers_insert
  on public.planner_periodic_control_registers
  for insert
  with check (public.can_manage_company_workspace (company_workspace_id));

drop policy if exists planner_periodic_registers_update on public.planner_periodic_control_registers;
create policy planner_periodic_registers_update
  on public.planner_periodic_control_registers
  for update
  using (public.can_manage_company_workspace (company_workspace_id))
  with check (public.can_manage_company_workspace (company_workspace_id));

drop policy if exists planner_periodic_registers_delete on public.planner_periodic_control_registers;
create policy planner_periodic_registers_delete
  on public.planner_periodic_control_registers
  for delete
  using (public.can_manage_company_workspace (company_workspace_id));
