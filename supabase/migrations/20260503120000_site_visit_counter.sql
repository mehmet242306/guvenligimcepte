-- Public site visit counter.
-- Starts at 94,750 and is incremented by the server-side API only.

begin;

create table if not exists public.site_counters (
  counter_key text primary key,
  count_value bigint not null default 0 check (count_value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_counters enable row level security;

insert into public.site_counters (counter_key, count_value)
values ('site_visits', 94750)
on conflict (counter_key) do nothing;

create or replace function public.increment_site_counter(
  p_counter_key text default 'site_visits',
  p_increment integer default 1
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_count bigint;
begin
  insert into public.site_counters (counter_key, count_value)
  values (p_counter_key, greatest(p_increment, 0))
  on conflict (counter_key)
  do update set
    count_value = public.site_counters.count_value + greatest(p_increment, 0),
    updated_at = now()
  returning count_value into next_count;

  return next_count;
end;
$$;

revoke all on function public.increment_site_counter(text, integer) from public;
grant execute on function public.increment_site_counter(text, integer) to service_role;

commit;
