create extension if not exists vector;

create table if not exists public.nova_risk_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete cascade,
  company_workspace_id uuid references public.company_workspaces(id) on delete set null,
  source_endpoint text not null default '/api/analyze-risk',
  source_model text,
  interpretation_model text,
  method text not null default 'r_skor',
  language text not null default 'tr',
  memory_status text not null default 'auto_captured'
    check (memory_status in ('auto_captured', 'user_confirmed', 'expert_verified', 'rejected')),
  confidence_score numeric(4,3) not null default 0.700,
  scene_summary text not null,
  risk_signature text not null,
  risks jsonb not null default '[]'::jsonb,
  legal_references jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  usage_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.nova_risk_memory is
  'Organization-scoped Nova visual risk memory. Stores approved/high-confidence risk patterns for consistency and cheaper future context.';

create index if not exists idx_nova_risk_memory_org_created
  on public.nova_risk_memory(organization_id, created_at desc);

create index if not exists idx_nova_risk_memory_org_status
  on public.nova_risk_memory(organization_id, memory_status, method);

create index if not exists idx_nova_risk_memory_embedding
  on public.nova_risk_memory
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table public.nova_risk_memory enable row level security;

drop policy if exists nova_risk_memory_admin_read on public.nova_risk_memory;
create policy nova_risk_memory_admin_read
on public.nova_risk_memory
for select
using (
  public.is_platform_admin(auth.uid())
  or organization_id in (
    select om.organization_id
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('admin', 'owner')
  )
);

create or replace function public.search_nova_risk_memory(
  query_embedding vector(1536),
  org_id uuid,
  workspace_id uuid default null,
  method_filter text default null,
  similarity_threshold double precision default 0.78,
  max_results integer default 5
)
returns table (
  id uuid,
  scene_summary text,
  risk_signature text,
  risks jsonb,
  legal_references jsonb,
  memory_status text,
  confidence_score numeric,
  similarity double precision,
  usage_count integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    m.id,
    m.scene_summary,
    m.risk_signature,
    m.risks,
    m.legal_references,
    m.memory_status,
    m.confidence_score,
    (1 - (m.embedding <=> query_embedding))::double precision as similarity,
    m.usage_count
  from public.nova_risk_memory m
  where
    m.organization_id = org_id
    and m.embedding is not null
    and m.memory_status in ('auto_captured', 'user_confirmed', 'expert_verified')
    and (workspace_id is null or m.company_workspace_id is null or m.company_workspace_id = workspace_id)
    and (method_filter is null or m.method = method_filter)
    and (1 - (m.embedding <=> query_embedding)) > similarity_threshold
  order by
    case m.memory_status
      when 'expert_verified' then 0
      when 'user_confirmed' then 1
      else 2
    end,
    m.embedding <=> query_embedding asc,
    m.created_at desc
  limit max_results;
end;
$$;

revoke all on function public.search_nova_risk_memory(vector, uuid, uuid, text, double precision, integer)
  from public, anon, authenticated;
grant execute on function public.search_nova_risk_memory(vector, uuid, uuid, text, double precision, integer)
  to service_role;

create or replace function public.touch_nova_risk_memory(p_memory_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.nova_risk_memory
     set usage_count = usage_count + 1,
         last_used_at = now(),
         updated_at = now()
   where id = any(p_memory_ids);
end;
$$;

revoke all on function public.touch_nova_risk_memory(uuid[]) from public, anon, authenticated;
grant execute on function public.touch_nova_risk_memory(uuid[]) to service_role;
