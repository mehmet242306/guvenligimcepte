-- Signed-in user product feedback (distinct from nova_feedback / AI thumbs)

create table if not exists public.platform_user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  category text not null
    check (category in ('bug', 'idea', 'usability', 'other')),
  message text not null
    check (char_length(message) >= 10 and char_length(message) <= 4000),
  page_path text
    check (page_path is null or char_length(page_path) <= 2000),
  locale text
    check (locale is null or char_length(locale) <= 16),
  created_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.platform_user_feedback is
  'Product feedback submitted from the in-app feedback control (authenticated users).';

create index if not exists idx_platform_user_feedback_created_at
  on public.platform_user_feedback (created_at desc);
create index if not exists idx_platform_user_feedback_user_id
  on public.platform_user_feedback (user_id);
create index if not exists idx_platform_user_feedback_org_id
  on public.platform_user_feedback (organization_id);

alter table public.platform_user_feedback enable row level security;

drop policy if exists "Users insert own platform feedback" on public.platform_user_feedback;
create policy "Users insert own platform feedback"
  on public.platform_user_feedback for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Platform admins read all platform feedback" on public.platform_user_feedback;
create policy "Platform admins read all platform feedback"
  on public.platform_user_feedback for select to authenticated
  using (public.is_platform_admin(auth.uid()));

revoke all on public.platform_user_feedback from authenticated;
grant insert on public.platform_user_feedback to authenticated;
grant select on public.platform_user_feedback to authenticated;
