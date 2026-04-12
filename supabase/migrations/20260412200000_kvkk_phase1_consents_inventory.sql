create table if not exists public.consent_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  consent_type text not null check (consent_type in ('aydinlatma', 'acik_riza', 'kvkk', 'yurt_disi_aktarim', 'pazarlama')),
  title text not null,
  description text,
  scope_context text not null default 'platform' check (scope_context in ('platform', 'photo_upload', 'live_scan', 'international_transfer', 'marketing')),
  is_required boolean not null default true,
  is_active boolean not null default true,
  display_order integer not null default 100,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consent_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.consent_documents(id) on delete cascade,
  version text not null,
  summary text,
  content_markdown text not null,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consent_document_versions_unique unique (document_id, version)
);

create unique index if not exists idx_consent_document_versions_single_published
  on public.consent_document_versions(document_id)
  where is_published = true;

create unique index if not exists idx_consent_documents_seed_guard
  on public.consent_documents (
    coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
    consent_type,
    scope_context,
    title
  );

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  company_workspace_id uuid references public.company_workspaces(id) on delete set null,
  consent_type text not null check (consent_type in ('aydinlatma', 'acik_riza', 'kvkk', 'yurt_disi_aktarim', 'pazarlama')),
  document_id uuid not null references public.consent_documents(id) on delete cascade,
  version_id uuid not null references public.consent_document_versions(id) on delete cascade,
  version text not null,
  source_context text not null default 'platform' check (source_context in ('platform', 'photo_upload', 'live_scan', 'international_transfer', 'marketing')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_consents_user on public.user_consents(user_id, granted_at desc);
create index if not exists idx_user_consents_document on public.user_consents(document_id, version_id);
create index if not exists idx_user_consents_workspace on public.user_consents(company_workspace_id, granted_at desc);

create table if not exists public.data_processing_inventory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  title text not null,
  data_category text not null,
  processing_purpose text not null,
  legal_basis text not null,
  data_subject_categories text[] not null default '{}'::text[],
  retention_summary text not null,
  access_roles text[] not null default '{}'::text[],
  international_transfer boolean not null default false,
  transfer_regions text[] not null default '{}'::text[],
  notes text,
  is_active boolean not null default true,
  display_order integer not null default 100,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_data_processing_inventory_org on public.data_processing_inventory(organization_id, display_order, created_at desc);
create unique index if not exists idx_data_processing_inventory_seed_guard
  on public.data_processing_inventory (
    coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
    title
  );

drop trigger if exists trg_consent_documents_updated_at on public.consent_documents;
create trigger trg_consent_documents_updated_at
before update on public.consent_documents
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_consent_document_versions_updated_at on public.consent_document_versions;
create trigger trg_consent_document_versions_updated_at
before update on public.consent_document_versions
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_user_consents_updated_at on public.user_consents;
create trigger trg_user_consents_updated_at
before update on public.user_consents
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_data_processing_inventory_updated_at on public.data_processing_inventory;
create trigger trg_data_processing_inventory_updated_at
before update on public.data_processing_inventory
for each row
execute function public.set_current_timestamp_updated_at();

insert into public.permissions (code, name, description, module_key)
values
  ('compliance.kvkk.manage', 'KVKK merkezini yonet', 'Onay metinleri, versiyonlar ve veri isleme envanterini yonet', 'compliance')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  module_key = excluded.module_key;

with permission_map as (
  select code, id as permission_id
  from public.permissions
  where code = 'compliance.kvkk.manage'
),
role_map as (
  select code, id as role_id
  from public.roles
  where code in ('super_admin', 'admin', 'platform_admin', 'organization_admin', 'osgb_manager')
)
insert into public.role_permissions (role_id, permission_id)
select role_map.role_id, permission_map.permission_id
from role_map
cross join permission_map
on conflict (role_id, permission_id) do nothing;

alter table public.consent_documents enable row level security;
alter table public.consent_document_versions enable row level security;
alter table public.user_consents enable row level security;
alter table public.data_processing_inventory enable row level security;

drop policy if exists consent_documents_select on public.consent_documents;
create policy consent_documents_select
on public.consent_documents
for select
using (
  public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
  or (
    is_active = true
    and (organization_id is null or organization_id = public.current_user_organization_id())
  )
);

drop policy if exists consent_documents_manage on public.consent_documents;
create policy consent_documents_manage
on public.consent_documents
for all
using (
  public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
)
with check (
  public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
);

drop policy if exists consent_document_versions_select on public.consent_document_versions;
create policy consent_document_versions_select
on public.consent_document_versions
for select
using (
  public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
  or (
    is_published = true
    and exists (
      select 1
      from public.consent_documents d
      where d.id = consent_document_versions.document_id
        and d.is_active = true
        and (d.organization_id is null or d.organization_id = public.current_user_organization_id())
    )
  )
);

drop policy if exists consent_document_versions_manage on public.consent_document_versions;
create policy consent_document_versions_manage
on public.consent_document_versions
for all
using (
  public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
)
with check (
  public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
);

drop policy if exists user_consents_select on public.user_consents;
create policy user_consents_select
on public.user_consents
for select
using (
  user_id = auth.uid()
  or public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
);

drop policy if exists user_consents_insert on public.user_consents;
create policy user_consents_insert
on public.user_consents
for insert
with check (
  user_id = auth.uid()
  or public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
);

drop policy if exists user_consents_update on public.user_consents;
create policy user_consents_update
on public.user_consents
for update
using (
  user_id = auth.uid()
  or public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
)
with check (
  user_id = auth.uid()
  or public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
);

drop policy if exists data_processing_inventory_select on public.data_processing_inventory;
create policy data_processing_inventory_select
on public.data_processing_inventory
for select
using (
  public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
);

drop policy if exists data_processing_inventory_manage on public.data_processing_inventory;
create policy data_processing_inventory_manage
on public.data_processing_inventory
for all
using (
  public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
)
with check (
  public.user_has_permission('settings.manage')
  or public.user_has_permission('compliance.kvkk.manage')
);

create or replace function public.publish_consent_document_version(
  p_version_id uuid
)
returns public.consent_document_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version public.consent_document_versions;
begin
  if not (
    public.user_has_permission('settings.manage')
    or public.user_has_permission('compliance.kvkk.manage')
  ) then
    raise exception 'Bu islem icin yetkiniz yok.';
  end if;

  select *
  into v_version
  from public.consent_document_versions
  where id = p_version_id
  limit 1;

  if v_version.id is null then
    raise exception 'Consent versiyonu bulunamadi.';
  end if;

  update public.consent_document_versions
  set is_published = false,
      updated_by = auth.uid()
  where document_id = v_version.document_id
    and is_published = true;

  update public.consent_document_versions
  set is_published = true,
      published_at = now(),
      updated_by = auth.uid()
  where id = p_version_id
  returning *
  into v_version;

  return v_version;
end;
$$;

create or replace function public.list_active_consent_requirements(
  p_scope_context text default 'platform',
  p_company_workspace_id uuid default null
)
returns table (
  document_id uuid,
  consent_type text,
  title text,
  description text,
  scope_context text,
  is_required boolean,
  version_id uuid,
  version text,
  version_summary text,
  content_markdown text,
  granted_at timestamptz,
  revoked_at timestamptz,
  is_granted boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with active_versions as (
    select
      d.id as document_id,
      d.consent_type,
      d.title,
      d.description,
      d.scope_context,
      d.is_required,
      d.display_order,
      v.id as version_id,
      v.version,
      v.summary as version_summary,
      v.content_markdown
    from public.consent_documents d
    join public.consent_document_versions v on v.document_id = d.id and v.is_published = true
    where d.is_active = true
      and d.scope_context = p_scope_context
      and (d.organization_id is null or d.organization_id = public.current_user_organization_id())
  ),
  latest_consents as (
    select distinct on (uc.version_id, coalesce(uc.company_workspace_id, '00000000-0000-0000-0000-000000000000'::uuid))
      uc.version_id,
      uc.company_workspace_id,
      uc.granted_at,
      uc.revoked_at
    from public.user_consents uc
    where uc.user_id = auth.uid()
      and uc.source_context = p_scope_context
      and uc.company_workspace_id is not distinct from p_company_workspace_id
    order by uc.version_id, coalesce(uc.company_workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), uc.granted_at desc
  )
  select
    av.document_id,
    av.consent_type,
    av.title,
    av.description,
    av.scope_context,
    av.is_required,
    av.version_id,
    av.version,
    av.version_summary,
    av.content_markdown,
    lc.granted_at,
    lc.revoked_at,
    (lc.granted_at is not null and lc.revoked_at is null) as is_granted
  from active_versions av
  left join latest_consents lc on lc.version_id = av.version_id
  order by av.display_order, av.title;
$$;

create or replace function public.record_user_consent(
  p_version_id uuid,
  p_company_workspace_id uuid default null,
  p_ip_address text default null,
  p_user_agent text default null,
  p_source_context text default 'platform'
)
returns public.user_consents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document public.consent_documents;
  v_version public.consent_document_versions;
  v_consent public.user_consents;
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadi.';
  end if;

  select *
  into v_version
  from public.consent_document_versions
  where id = p_version_id
    and is_published = true
  limit 1;

  if v_version.id is null then
    raise exception 'Aktif consent versiyonu bulunamadi.';
  end if;

  select *
  into v_document
  from public.consent_documents
  where id = v_version.document_id
    and is_active = true
  limit 1;

  if v_document.id is null then
    raise exception 'Consent dokumani bulunamadi.';
  end if;

  update public.user_consents
  set revoked_at = now(),
      updated_at = now()
  where user_id = auth.uid()
    and document_id = v_document.id
    and source_context = p_source_context
    and company_workspace_id is not distinct from p_company_workspace_id
    and revoked_at is null;

  insert into public.user_consents (
    user_id,
    organization_id,
    company_workspace_id,
    consent_type,
    document_id,
    version_id,
    version,
    source_context,
    granted_at,
    ip_address,
    user_agent
  )
  values (
    auth.uid(),
    coalesce(v_document.organization_id, public.current_user_organization_id()),
    p_company_workspace_id,
    v_document.consent_type,
    v_document.id,
    v_version.id,
    v_version.version,
    p_source_context,
    now(),
    p_ip_address,
    p_user_agent
  )
  returning *
  into v_consent;

  perform public.log_security_event(
    'consent.granted',
    'info',
    '/kvkk/consent',
    auth.uid(),
    v_consent.organization_id,
    p_company_workspace_id,
    p_ip_address,
    p_user_agent,
    jsonb_build_object(
      'consent_type', v_document.consent_type,
      'version', v_version.version,
      'scope_context', p_source_context
    )
  );

  return v_consent;
end;
$$;

revoke all on function public.publish_consent_document_version(uuid) from public;
grant execute on function public.publish_consent_document_version(uuid) to authenticated, service_role;

revoke all on function public.list_active_consent_requirements(text, uuid) from public;
grant execute on function public.list_active_consent_requirements(text, uuid) to authenticated, service_role;

revoke all on function public.record_user_consent(uuid, uuid, text, text, text) from public;
grant execute on function public.record_user_consent(uuid, uuid, text, text, text) to authenticated, service_role;

with seeded_documents as (
  insert into public.consent_documents (
    organization_id,
    consent_type,
    title,
    description,
    scope_context,
    is_required,
    is_active,
    display_order
  )
  values
    (null, 'aydinlatma', 'Aydinlatma Metni', 'Platform genelinde zorunlu aydinlatma metni onayi.', 'platform', true, true, 10),
    (null, 'kvkk', 'KVKK Temel Onayi', 'Kisisel veri isleme faaliyetleri icin temel uyum metni.', 'platform', true, true, 20),
    (null, 'acik_riza', 'Acik Riza Metni', 'Acik riza gerektiren ek veri isleme adimlari icin metin.', 'platform', true, true, 30),
    (null, 'yurt_disi_aktarim', 'Yurt Disi Aktarim Bilgilendirmesi', 'Claude Vision ve benzeri servislerde sinir otesi veri aktarim bilgilendirmesi.', 'international_transfer', false, true, 40),
    (null, 'pazarlama', 'Pazarlama Iletisimi Izni', 'Pazarlama ve urun bilgilendirme iletileri icin istege bagli izin.', 'marketing', false, true, 50)
  on conflict do nothing
  returning id, consent_type
)
insert into public.consent_document_versions (
  document_id,
  version,
  summary,
  content_markdown,
  is_published,
  published_at
)
select
  sd.id,
  'v1.0',
  case sd.consent_type
    when 'aydinlatma' then 'Kullanicinin hangi verisinin, hangi amacla islendigi ozetlenir.'
    when 'kvkk' then 'KVKK kapsamindaki temel platform uyum metni.'
    when 'acik_riza' then 'Acik riza gerektiren isleme adimlari icin ilk surum.'
    when 'yurt_disi_aktarim' then 'Yurt disi servis kullanimina iliskin bilgilendirme.'
    else 'Iletisim ve pazarlama izin metni.'
  end,
  case sd.consent_type
    when 'aydinlatma' then E'# Aydinlatma Metni\n\nBu platform, kullanici hesabi, ISG operasyon verileri ve yuklenen belgeleri hizmetin sunulmasi amaciyla isler.'
    when 'kvkk' then E'# KVKK Temel Onayi\n\nPlatformu kullanmaya devam ederek, KVKK kapsamindaki temel veri isleme faaliyetlerini okudugunuzu ve bilgilendirildiginizi kabul edersiniz.'
    when 'acik_riza' then E'# Acik Riza Metni\n\nAI destekli ozetleme, belge onerileri ve benzeri ek hizmetlerde gerekirse acik riza islenir.'
    when 'yurt_disi_aktarim' then E'# Yurt Disi Aktarim Bilgilendirmesi\n\nAI servisleri ve sinir otesi altyapilar kullanildiginda aktarim kaydi tutulur.'
    else E'# Pazarlama Iletisimi Izni\n\nKampanya, urun guncellemesi ve egitim duyurulari icin iletisim kurulabilir.'
  end,
  true,
  now()
from public.consent_documents sd
where not exists (
  select 1
  from public.consent_document_versions v
  where v.document_id = sd.id
);

insert into public.data_processing_inventory (
  organization_id,
  title,
  data_category,
  processing_purpose,
  legal_basis,
  data_subject_categories,
  retention_summary,
  access_roles,
  international_transfer,
  transfer_regions,
  notes,
  is_active,
  display_order
)
values
  (
    null,
    'Kullanici ve Hesap Verileri',
    'Kimlik ve iletisim verileri',
    'Hesap olusturma, yetkilendirme ve guvenli oturum yonetimi',
    'Sozlesmenin ifasi / veri sorumlusu mesru menfaati',
    array['kullanici', 'organizasyon yoneticisi'],
    'Hesap aktifligi boyunca ve mevzuattan dogan saklama sureleri kadar',
    array['super_admin', 'admin', 'platform_admin'],
    false,
    array[]::text[],
    'MFA, oturum kayitlari ve guvenlik olaylari bu kapsamdadir.',
    true,
    10
  ),
  (
    null,
    'ISG Operasyon Kayitlari',
    'Dokumanlar, egitim kayitlari, olay ve risk verileri',
    'ISG operasyonlarinin yerine getirilmesi ve yasal yukumluluklerin belgelenmesi',
    'Kanuni yukumluluk / mesru menfaat',
    array['calisan', 'isyeri hekimi', 'isg uzmani'],
    'Mevzuattaki saklama sureleri boyunca',
    array['super_admin', 'admin', 'inspector', 'viewer'],
    false,
    array[]::text[],
    'Dokumantasyon, sertifikalar ve planlar bu kayitta takip edilir.',
    true,
    20
  ),
  (
    null,
    'AI ve Yurt Disi Servis Akislari',
    'Analiz, ozetleme ve mevzuat destek verileri',
    'AI destekli risk analizi, mevzuat cevabi ve belge yardimcisi hizmetleri',
    'Acik riza / mesru menfaat',
    array['kullanici', 'yonetici'],
    'Kaynak verinin tipine gore saklama politikasi uygulanir',
    array['super_admin', 'admin', 'platform_admin'],
    true,
    array['AB', 'ABD'],
    'Yurt disi aktarim kayitlari ayri tablo ile izlenecektir.',
    true,
    30
  )
on conflict do nothing;
