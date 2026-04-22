-- =============================================================================
-- Saha Denetimi — Risk Assessment Findings Source Link
-- =============================================================================
-- risk_assessment_findings tablosuna iki opsiyonel kolon ekler:
--   - source_type: tespitin nereden geldiğini işaretler (geriye uyumlu default)
--   - inspection_answer_id: eğer saha denetiminden gelmişse, hangi cevaptan
--
-- Böylece saha denetimi tespitleri + risk analizi tespitleri AYNI havuzda
-- yönetilebilir; Tespitler sekmesi tek kaynaktan çeker.
-- =============================================================================

begin;

alter table public.risk_assessment_findings
  add column if not exists source_type text not null default 'risk_assessment'
    check (source_type in ('risk_assessment','field_inspection','live_scan','incident'));

alter table public.risk_assessment_findings
  add column if not exists inspection_answer_id uuid
    references public.inspection_answers(id) on delete set null;

create index if not exists idx_findings_source
  on public.risk_assessment_findings (organization_id, source_type);

create index if not exists idx_findings_inspection_answer
  on public.risk_assessment_findings (inspection_answer_id)
  where inspection_answer_id is not null;

commit;
