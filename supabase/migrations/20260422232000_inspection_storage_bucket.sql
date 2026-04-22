-- =============================================================================
-- Saha Denetimi — Storage Bucket (inspection-photos)
-- =============================================================================
-- Kritik/uygunsuz cevaplarda kanıt fotoğrafı yükleme.
-- Yol şeması: {organizationId}/{runId}/{answerId}/{uuid}_{filename}
-- Mevcut 'risk-images' bucket'ı ile aynı kalıpta.
-- =============================================================================

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inspection-photos',
  'inspection-photos',
  false,
  10485760,  -- 10 MB
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[]
)
on conflict (id) do nothing;

-- Storage RLS: aynı org'daki authenticated kullanıcılar yükleyebilir/okuyabilir
-- Yol şeması: "{orgId}/..." — policy path'in ilk segmentini org ID ile kontrol eder

drop policy if exists inspection_photos_read on storage.objects;
create policy inspection_photos_read on storage.objects
for select to authenticated
using (
  bucket_id = 'inspection-photos'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
);

drop policy if exists inspection_photos_insert on storage.objects;
create policy inspection_photos_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'inspection-photos'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
);

drop policy if exists inspection_photos_update on storage.objects;
create policy inspection_photos_update on storage.objects
for update to authenticated
using (
  bucket_id = 'inspection-photos'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
);

drop policy if exists inspection_photos_delete on storage.objects;
create policy inspection_photos_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'inspection-photos'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
);

commit;
