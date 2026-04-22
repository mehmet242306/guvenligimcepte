-- =============================================================================
-- Saha Denetimi (Field Inspection) — Core Tables
-- =============================================================================
-- 5 tablo: checklist şablonları, sorular, denetim oturumları (runs),
-- cevaplar, Nova öneri log'u (audit trail).
--
-- Tasarım ilkeleri:
--   - organization_id + opsiyonel company_workspace_id (kanonik tenant pattern)
--   - text + CHECK constraints (mevcut kod tabanı ENUM kullanmıyor)
--   - UUID primary keys (gen_random_uuid)
--   - RLS: her tablo için select/insert/update/delete ayrı policy
--   - corrective_actions pattern'i birebir takip ediliyor
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) CHECKLIST TEMPLATES
-- -----------------------------------------------------------------------------
create table if not exists public.inspection_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_workspace_id uuid references public.company_workspaces(id) on delete set null,

  title text not null,
  description text,
  source text not null default 'manual' check (
    source in ('manual','nova','library','risk_analysis','imported')
  ),
  mode text not null default 'standard' check (
    mode in ('quick','standard','detailed')
  ),
  status text not null default 'draft' check (
    status in ('draft','published','archived')
  ),
  version integer not null default 1 check (version > 0),

  nova_purpose text,
  nova_sources jsonb not null default '{}'::jsonb,

  -- Kütüphaneden kopyalandıysa kaynak ID (library_contents tablosu ileride
  -- gelecek; şimdilik FK yok, sadece referans)
  library_reference_id uuid,

  last_used_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,

  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by_user_id uuid references auth.users(id)
);

create index if not exists idx_icl_tmpl_org
  on public.inspection_checklist_templates (organization_id);
create index if not exists idx_icl_tmpl_org_status
  on public.inspection_checklist_templates (organization_id, status);
create index if not exists idx_icl_tmpl_workspace
  on public.inspection_checklist_templates (company_workspace_id);
create index if not exists idx_icl_tmpl_source
  on public.inspection_checklist_templates (organization_id, source);

-- -----------------------------------------------------------------------------
-- 2) CHECKLIST QUESTIONS
-- -----------------------------------------------------------------------------
create table if not exists public.inspection_checklist_questions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.inspection_checklist_templates(id) on delete cascade,

  sort_order integer not null default 0,
  section text not null,
  category text not null,
  text text not null,

  priority text not null default 'medium' check (
    priority in ('low','medium','high','critical')
  ),

  rule_hint text,
  rule_uygunsuz text,
  rule_kritik text,

  suggested_action_title text,
  suggested_action_description text,

  source_badges text[] not null default '{}'::text[],
  why_suggested text,

  linked_risk_hint text,
  open_action_hint text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_icl_q_template
  on public.inspection_checklist_questions (template_id, sort_order);
create index if not exists idx_icl_q_category
  on public.inspection_checklist_questions (category);

-- -----------------------------------------------------------------------------
-- 3) INSPECTION RUNS (her denetim oturumu)
-- -----------------------------------------------------------------------------
create table if not exists public.inspection_runs (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_workspace_id uuid references public.company_workspaces(id) on delete set null,
  template_id uuid not null references public.inspection_checklist_templates(id) on delete restrict,

  run_mode text not null default 'official' check (
    run_mode in ('official','preview')
  ),
  status text not null default 'in_progress' check (
    status in ('in_progress','completed','abandoned','report_ready')
  ),

  site_label text,
  location text,
  line_or_shift text,

  readiness_score integer not null default 0 check (
    readiness_score between 0 and 100
  ),
  total_questions integer not null default 0,
  answered_count integer not null default 0,
  uygun_count integer not null default 0,
  uygunsuz_count integer not null default 0,
  kritik_count integer not null default 0,
  na_count integer not null default 0,

  report_storage_path text,

  client_generated_at timestamptz,
  synced_at timestamptz,

  started_at timestamptz not null default now(),
  completed_at timestamptz,

  created_by uuid not null references auth.users(id) default auth.uid(),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by_user_id uuid references auth.users(id)
);

create index if not exists idx_irun_org
  on public.inspection_runs (organization_id, status);
create index if not exists idx_irun_workspace
  on public.inspection_runs (company_workspace_id);
create index if not exists idx_irun_template
  on public.inspection_runs (template_id);
create index if not exists idx_irun_user
  on public.inspection_runs (created_by, started_at desc);
create index if not exists idx_irun_mode
  on public.inspection_runs (organization_id, run_mode);

-- -----------------------------------------------------------------------------
-- 4) INSPECTION ANSWERS (soru bazında cevap)
-- -----------------------------------------------------------------------------
create table if not exists public.inspection_answers (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.inspection_runs(id) on delete cascade,
  question_id uuid not null references public.inspection_checklist_questions(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete cascade,

  response_status text check (
    response_status in ('uygun','uygunsuz','kritik','na')
  ),
  note text,
  photo_urls text[] not null default '{}'::text[],

  action_title text,
  action_responsible_user_id uuid references auth.users(id),
  action_deadline date,

  na_reason text,

  suggestion_reviewed boolean not null default false,
  decision text not null default 'pending' check (
    decision in (
      'pending','reviewed','ignored',
      'linked_risk','linked_action','started_dof','created_risk'
    )
  ),
  decision_target_table text check (
    decision_target_table in (
      'risk_assessments','risk_assessment_findings','corrective_actions'
    )
  ),
  decision_target_id uuid,
  decision_at timestamptz,

  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (run_id, question_id)
);

create index if not exists idx_ians_run
  on public.inspection_answers (run_id);
create index if not exists idx_ians_org_status
  on public.inspection_answers (organization_id, response_status)
  where response_status in ('uygunsuz','kritik');
create index if not exists idx_ians_decision_pending
  on public.inspection_answers (organization_id, decision)
  where decision = 'pending'
    and response_status in ('uygunsuz','kritik');

-- -----------------------------------------------------------------------------
-- 5) SUGGESTION LOG (Nova öneri / kullanıcı karar audit trail'i)
-- -----------------------------------------------------------------------------
create table if not exists public.inspection_suggestion_log (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.inspection_answers(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,

  suggestion_type text not null check (
    suggestion_type in (
      'linked_risk','linked_action','repeat_dof','new_risk_draft','memory_note'
    )
  ),
  suggestion_title text not null,
  suggestion_description text,
  suggestion_reason text[] not null default '{}'::text[],

  ai_confidence numeric(4,3) check (ai_confidence between 0 and 1),
  ai_model text,

  decision text not null default 'pending' check (
    decision in ('pending','accepted','ignored')
  ),
  target_table text,
  target_id uuid,

  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_isug_answer
  on public.inspection_suggestion_log (answer_id);
create index if not exists idx_isug_org
  on public.inspection_suggestion_log (organization_id);
create index if not exists idx_isug_pending
  on public.inspection_suggestion_log (organization_id, decision)
  where decision = 'pending';

-- -----------------------------------------------------------------------------
-- 6) TRIGGERS — updated_at + run code generator (DEN-YYYY-NNN)
-- -----------------------------------------------------------------------------

drop trigger if exists trg_icl_tmpl_updated_at on public.inspection_checklist_templates;
create trigger trg_icl_tmpl_updated_at
before update on public.inspection_checklist_templates
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_icl_q_updated_at on public.inspection_checklist_questions;
create trigger trg_icl_q_updated_at
before update on public.inspection_checklist_questions
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_irun_updated_at on public.inspection_runs;
create trigger trg_irun_updated_at
before update on public.inspection_runs
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_ians_updated_at on public.inspection_answers;
create trigger trg_ians_updated_at
before update on public.inspection_answers
for each row execute function public.set_current_timestamp_updated_at();

-- Inspection run code generator: DEN-2026-001 (sadece official mode)
create or replace function public.generate_inspection_run_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  year_part text;
  next_num int;
begin
  if new.run_mode <> 'official' then
    return new;
  end if;
  if new.code is not null and btrim(new.code) <> '' then
    return new;
  end if;

  year_part := to_char(now(), 'YYYY');

  select coalesce(
    max(
      case
        when code ~ ('^DEN-' || year_part || '-[0-9]+$')
          then substring(code from ('^DEN-' || year_part || '-([0-9]+)$'))::int
        else null
      end
    ),
    0
  ) + 1
  into next_num
  from public.inspection_runs;

  new.code := 'DEN-' || year_part || '-' || lpad(next_num::text, 3, '0');
  return new;
end;
$$;

drop trigger if exists trg_irun_generate_code on public.inspection_runs;
create trigger trg_irun_generate_code
before insert on public.inspection_runs
for each row execute function public.generate_inspection_run_code();

-- -----------------------------------------------------------------------------
-- 7) RLS POLICIES
-- -----------------------------------------------------------------------------

alter table public.inspection_checklist_templates enable row level security;
alter table public.inspection_checklist_questions enable row level security;
alter table public.inspection_runs                enable row level security;
alter table public.inspection_answers             enable row level security;
alter table public.inspection_suggestion_log      enable row level security;

-- Templates
drop policy if exists icl_tmpl_select on public.inspection_checklist_templates;
create policy icl_tmpl_select on public.inspection_checklist_templates
for select using (organization_id = public.current_organization_id());

drop policy if exists icl_tmpl_insert on public.inspection_checklist_templates;
create policy icl_tmpl_insert on public.inspection_checklist_templates
for insert with check (organization_id = public.current_organization_id());

drop policy if exists icl_tmpl_update on public.inspection_checklist_templates;
create policy icl_tmpl_update on public.inspection_checklist_templates
for update using (organization_id = public.current_organization_id());

drop policy if exists icl_tmpl_delete on public.inspection_checklist_templates;
create policy icl_tmpl_delete on public.inspection_checklist_templates
for delete using (organization_id = public.current_organization_id());

-- Questions (template üzerinden dolaylı org kontrolü)
drop policy if exists icl_q_select on public.inspection_checklist_questions;
create policy icl_q_select on public.inspection_checklist_questions
for select using (
  exists (
    select 1 from public.inspection_checklist_templates t
    where t.id = inspection_checklist_questions.template_id
      and t.organization_id = public.current_organization_id()
  )
);

drop policy if exists icl_q_insert on public.inspection_checklist_questions;
create policy icl_q_insert on public.inspection_checklist_questions
for insert with check (
  exists (
    select 1 from public.inspection_checklist_templates t
    where t.id = inspection_checklist_questions.template_id
      and t.organization_id = public.current_organization_id()
  )
);

drop policy if exists icl_q_update on public.inspection_checklist_questions;
create policy icl_q_update on public.inspection_checklist_questions
for update using (
  exists (
    select 1 from public.inspection_checklist_templates t
    where t.id = inspection_checklist_questions.template_id
      and t.organization_id = public.current_organization_id()
  )
);

drop policy if exists icl_q_delete on public.inspection_checklist_questions;
create policy icl_q_delete on public.inspection_checklist_questions
for delete using (
  exists (
    select 1 from public.inspection_checklist_templates t
    where t.id = inspection_checklist_questions.template_id
      and t.organization_id = public.current_organization_id()
  )
);

-- Runs
drop policy if exists irun_select on public.inspection_runs;
create policy irun_select on public.inspection_runs
for select using (organization_id = public.current_organization_id());

drop policy if exists irun_insert on public.inspection_runs;
create policy irun_insert on public.inspection_runs
for insert with check (organization_id = public.current_organization_id());

drop policy if exists irun_update on public.inspection_runs;
create policy irun_update on public.inspection_runs
for update using (organization_id = public.current_organization_id());

drop policy if exists irun_delete on public.inspection_runs;
create policy irun_delete on public.inspection_runs
for delete using (organization_id = public.current_organization_id());

-- Answers
drop policy if exists ians_select on public.inspection_answers;
create policy ians_select on public.inspection_answers
for select using (organization_id = public.current_organization_id());

drop policy if exists ians_insert on public.inspection_answers;
create policy ians_insert on public.inspection_answers
for insert with check (organization_id = public.current_organization_id());

drop policy if exists ians_update on public.inspection_answers;
create policy ians_update on public.inspection_answers
for update using (organization_id = public.current_organization_id());

drop policy if exists ians_delete on public.inspection_answers;
create policy ians_delete on public.inspection_answers
for delete using (organization_id = public.current_organization_id());

-- Suggestion log
drop policy if exists isug_select on public.inspection_suggestion_log;
create policy isug_select on public.inspection_suggestion_log
for select using (organization_id = public.current_organization_id());

drop policy if exists isug_insert on public.inspection_suggestion_log;
create policy isug_insert on public.inspection_suggestion_log
for insert with check (organization_id = public.current_organization_id());

drop policy if exists isug_update on public.inspection_suggestion_log;
create policy isug_update on public.inspection_suggestion_log
for update using (organization_id = public.current_organization_id());

drop policy if exists isug_delete on public.inspection_suggestion_log;
create policy isug_delete on public.inspection_suggestion_log
for delete using (organization_id = public.current_organization_id());

commit;
