-- Faz 3: Bireysel (tenant) hesaplarin ileride bir OSGB tenant catisi altinda
-- toplanabilmesi icin hesap-duzeyi baglantilar. Sirket-sirket osgb_hizmet
-- iliskisinden (company_relationships) farkli: burada organizations.account_type
-- individual <-> osgb eslesmesi vardir.

begin;

create table if not exists public.organization_osgb_affiliations (
  id uuid primary key default gen_random_uuid(),
  osgb_organization_id uuid not null
    references public.organizations (id) on delete cascade,
  professional_organization_id uuid not null
    references public.organizations (id) on delete cascade,
  status text not null default 'invited'
    constraint organization_osgb_affiliations_status_check
      check (status in ('invited', 'active', 'suspended', 'ended')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_osgb_affiliations_no_self
    check (osgb_organization_id <> professional_organization_id),
  constraint organization_osgb_affiliations_pair_unique unique (osgb_organization_id, professional_organization_id)
);

create index if not exists idx_org_osgb_aff_osgb
  on public.organization_osgb_affiliations (osgb_organization_id)
  where status in ('invited', 'active', 'suspended');

create index if not exists idx_org_osgb_aff_prof
  on public.organization_osgb_affiliations (professional_organization_id)
  where status in ('invited', 'active', 'suspended');

comment on table public.organization_osgb_affiliations is
  'Links an OSGB tenant org to a professional (individual) tenant org for umbrella / managed-account flows.';

-- ---------------------------------------------------------------------------
-- Account type guard (osgb + individual only)
-- ---------------------------------------------------------------------------
create or replace function public.validate_organization_osgb_affiliation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  osgb_type text;
  prof_type text;
begin
  select o.account_type into osgb_type
  from public.organizations o
  where o.id = new.osgb_organization_id;

  select o.account_type into prof_type
  from public.organizations o
  where o.id = new.professional_organization_id;

  if osgb_type is distinct from 'osgb' then
    raise exception 'organization_osgb_affiliations: osgb_organization_id must have account_type osgb';
  end if;

  if prof_type is distinct from 'individual' then
    raise exception 'organization_osgb_affiliations: professional_organization_id must have account_type individual';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_organization_osgb_affiliation
  on public.organization_osgb_affiliations;
create trigger trg_validate_organization_osgb_affiliation
  before insert or update of osgb_organization_id, professional_organization_id
  on public.organization_osgb_affiliations
  for each row execute function public.validate_organization_osgb_affiliation();

drop trigger if exists trg_organization_osgb_affiliations_updated_at
  on public.organization_osgb_affiliations;
create trigger trg_organization_osgb_affiliations_updated_at
  before update on public.organization_osgb_affiliations
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.organization_osgb_affiliations enable row level security;
alter table public.organization_osgb_affiliations force row level security;

drop policy if exists organization_osgb_affiliations_select on public.organization_osgb_affiliations;
create policy organization_osgb_affiliations_select
  on public.organization_osgb_affiliations
  for select
  to authenticated
  using (
    public.is_platform_admin((select auth.uid()))
    or exists (
      select 1
      from public.organization_memberships om
      where om.user_id = (select auth.uid())
        and om.status = 'active'
        and om.organization_id in (
          organization_osgb_affiliations.osgb_organization_id,
          organization_osgb_affiliations.professional_organization_id
        )
    )
  );

drop policy if exists organization_osgb_affiliations_insert on public.organization_osgb_affiliations;
create policy organization_osgb_affiliations_insert
  on public.organization_osgb_affiliations
  for insert
  to authenticated
  with check (
    public.is_platform_admin((select auth.uid()))
    or public.is_account_owner_or_admin(
      organization_osgb_affiliations.osgb_organization_id,
      (select auth.uid())
    )
  );

drop policy if exists organization_osgb_affiliations_update on public.organization_osgb_affiliations;
create policy organization_osgb_affiliations_update
  on public.organization_osgb_affiliations
  for update
  to authenticated
  using (
    public.is_platform_admin((select auth.uid()))
    or public.is_account_owner_or_admin(
      organization_osgb_affiliations.osgb_organization_id,
      (select auth.uid())
    )
    or public.is_account_owner_or_admin(
      organization_osgb_affiliations.professional_organization_id,
      (select auth.uid())
    )
  )
  with check (
    public.is_platform_admin((select auth.uid()))
    or public.is_account_owner_or_admin(
      organization_osgb_affiliations.osgb_organization_id,
      (select auth.uid())
    )
    or public.is_account_owner_or_admin(
      organization_osgb_affiliations.professional_organization_id,
      (select auth.uid())
    )
  );

drop policy if exists organization_osgb_affiliations_delete on public.organization_osgb_affiliations;
create policy organization_osgb_affiliations_delete
  on public.organization_osgb_affiliations
  for delete
  to authenticated
  using (
    public.is_platform_admin((select auth.uid()))
    or public.is_account_owner_or_admin(
      organization_osgb_affiliations.osgb_organization_id,
      (select auth.uid())
    )
    or public.is_account_owner_or_admin(
      organization_osgb_affiliations.professional_organization_id,
      (select auth.uid())
    )
  );

commit;
