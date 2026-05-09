-- Faz 2: Risk/Saha Analizi merkezi havuzu
--
-- Amaç:
--   1. risk_assessments tablosuna analysis_type ve source_method kolonları
--      eklemek. Faz 1'de bu bilgi metadata.source üzerinden türetiliyordu;
--      şimdi first-class kolonlar haline geliyor (filtreleme + raporlama
--      için indekslenebilir).
--   2. Mevcut kayıtları metadata.source'a bakarak backfill et.
--   3. auto_create_risk_assessment_from_scan trigger'ı yeni kolonları da
--      dolduracak şekilde güncelle.
--   4. Findings (risk_assessment_findings) tarafında media_url + ai_confidence
--      alanları için confidence zaten var, ek bir media_url alanını ekleyerek
--      mobil saha taramalarında çekilen kareyi finding üzerinde de tutabilelim.

begin;

/* ───────────────────────── 1) ENUM yerine CHECK constraint ───────────────────────── */

alter table public.risk_assessments
  add column if not exists analysis_type text
    check (analysis_type in ('RISK_ANALYSIS', 'FIELD_ANALYSIS', 'INSPECTION')),
  add column if not exists source_method text
    check (source_method in (
      'image_upload',
      'file_upload',
      'mobile_camera',
      'manual_entry',
      'ai_detection'
    ));

create index if not exists idx_risk_assessments_analysis_type
  on public.risk_assessments (analysis_type);

create index if not exists idx_risk_assessments_source_method
  on public.risk_assessments (source_method);

/* ───────────────────────── 2) Findings: media_url ───────────────────────── */

alter table public.risk_assessment_findings
  add column if not exists media_url text;

/* ───────────────────────── 3) Backfill ─────────────────────────
   Mevcut kayıtların metadata.source bilgisine göre yeni kolonları doldur.
   - 'auto_from_scan' / 'live_scan' / 'field' → FIELD_ANALYSIS + mobile_camera
   - 'inspection*' → INSPECTION + manual_entry
   - diğer hepsi → RISK_ANALYSIS + image_upload (klasik görsel yükleme akışı) */

update public.risk_assessments
   set analysis_type = 'FIELD_ANALYSIS',
       source_method = 'mobile_camera'
 where analysis_type is null
   and metadata->>'source' in ('auto_from_scan', 'live_scan', 'field');

update public.risk_assessments
   set analysis_type = 'INSPECTION',
       source_method = 'manual_entry'
 where analysis_type is null
   and metadata->>'source' like 'inspection%';

update public.risk_assessments
   set analysis_type = 'RISK_ANALYSIS',
       source_method = 'image_upload'
 where analysis_type is null;

/* ───────────────────────── 4) auto_create_risk_assessment_from_scan trigger ─────────────────────────
   Saha taramasından otomatik üretilen risk_assessment kayıtlarına yeni
   analysis_type / source_method kolonlarını da yaz. Mevcut metadata
   alanı geriye dönük uyumluluk için korunuyor. */

create or replace function public.auto_create_risk_assessment_from_scan()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_assessment_id uuid;
  v_row_id uuid;
  v_detection record;
  v_org_id uuid;
  v_overall_level text;
  v_critical_count int;
  v_high_count int;
  v_medium_count int;
begin
  if new.status != 'completed' or (old.status = 'completed') or new.total_risks_found = 0 then
    return new;
  end if;

  if exists (select 1 from public.risk_assessments where metadata->>'source_session_id' = new.id::text) then
    return new;
  end if;

  select organization_id into v_org_id
  from public.user_profiles
  where auth_user_id = new.user_id
  limit 1;

  select
    count(*) filter (where risk_level = 'critical'),
    count(*) filter (where risk_level = 'high'),
    count(*) filter (where risk_level = 'medium')
  into v_critical_count, v_high_count, v_medium_count
  from public.scan_detections
  where session_id = new.id;

  if v_critical_count > 0 then v_overall_level := 'critical';
  elsif v_high_count > 0 then v_overall_level := 'high';
  elsif v_medium_count > 0 then v_overall_level := 'medium';
  else v_overall_level := 'low';
  end if;

  insert into public.risk_assessments (
    title,
    status,
    method,
    assessment_date,
    workplace_name,
    location_text,
    analysis_note,
    company_workspace_id,
    item_count,
    overall_risk_level,
    created_by,
    metadata,
    analysis_type,
    source_method
  ) values (
    'Otomatik: ' || coalesce(new.location_name, 'Saha Taraması'),
    'completed',
    coalesce(new.risk_method, 'l_matrix'),
    new.created_at::date,
    new.location_name,
    new.location_name,
    'Canlı saha taramasından otomatik üretildi. Süre: ' || coalesce(new.duration_seconds, 0) || 'sn, Nokta: ' || coalesce(new.total_frames_analyzed, 0),
    new.company_id,
    new.total_risks_found,
    v_overall_level,
    new.user_id,
    jsonb_build_object(
      'source', 'auto_from_scan',
      'source_session_id', new.id,
      'auto_created_at', now()
    ),
    'FIELD_ANALYSIS',
    'mobile_camera'
  ) returning id into v_assessment_id;

  insert into public.risk_assessment_rows (
    assessment_id,
    title,
    description,
    sort_order
  ) values (
    v_assessment_id,
    'Canlı Tarama Bulguları',
    'Saha taraması sırasında AI tarafından tespit edilen riskler',
    1
  ) returning id into v_row_id;

  for v_detection in
    select * from public.scan_detections where session_id = new.id order by created_at
  loop
    insert into public.risk_assessment_findings (
      row_id,
      title,
      category,
      severity,
      confidence,
      is_manual,
      corrective_action_required,
      recommendation,
      action_text
    ) values (
      v_row_id,
      v_detection.risk_name,
      coalesce(v_detection.risk_category, 'diger'),
      v_detection.risk_level,
      v_detection.confidence,
      false,
      (v_detection.risk_level in ('critical', 'high')),
      v_detection.recommended_action,
      v_detection.recommended_action
    );

    update public.scan_detections
       set transferred_to_assessment = v_assessment_id
     where id = v_detection.id;
  end loop;

  return new;
end;
$$;

/* Trigger zaten attach edilmiş, sadece function'ı CREATE OR REPLACE ettik. */

commit;
