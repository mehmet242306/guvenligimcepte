begin;

alter table public.enterprise_leads
  add column if not exists requested_account_type text not null default 'enterprise',
  add column if not exists estimated_company_count integer,
  add column if not exists estimated_professional_count integer,
  add column if not exists source_page text not null default 'unknown';

update public.enterprise_leads
   set requested_account_type = coalesce(nullif(requested_account_type, ''), 'enterprise');

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'enterprise_leads_requested_account_type_check'
       and conrelid = 'public.enterprise_leads'::regclass
  ) then
    alter table public.enterprise_leads
      add constraint enterprise_leads_requested_account_type_check
      check (requested_account_type in ('osgb', 'enterprise'));
  end if;
end $$;

commit;
