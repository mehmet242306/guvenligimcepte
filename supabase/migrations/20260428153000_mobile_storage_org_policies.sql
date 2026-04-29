-- =============================================================================
-- Mobile scan storage org-scoped policies
-- =============================================================================
-- Mobile writes scan screenshots and voice notes under org-prefixed paths:
--   scan-images : {organizationId}/scans/{sessionId}/frame_{n}.jpg
--   voice-notes : {organizationId}/{workspaceId}/{sessionId}/voice_{n}.m4a
--
-- Previous hardening removed broad read/list policies, but these buckets still
-- needed explicit org-prefixed INSERT/SELECT policies for authenticated mobile
-- upload and read-back flows.
-- =============================================================================

begin;

drop policy if exists scan_images_insert_own_org on storage.objects;
create policy scan_images_insert_own_org
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'scan-images'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
);

drop policy if exists scan_images_read_own_org on storage.objects;
create policy scan_images_read_own_org
on storage.objects
for select
to authenticated
using (
  bucket_id = 'scan-images'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
);

drop policy if exists scan_images_update_own_org on storage.objects;
create policy scan_images_update_own_org
on storage.objects
for update
to authenticated
using (
  bucket_id = 'scan-images'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
)
with check (
  bucket_id = 'scan-images'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
);

drop policy if exists scan_images_delete_own_org on storage.objects;
create policy scan_images_delete_own_org
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'scan-images'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
);

drop policy if exists voice_notes_insert_own_org on storage.objects;
create policy voice_notes_insert_own_org
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'voice-notes'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
);

drop policy if exists voice_notes_read_own_org on storage.objects;
create policy voice_notes_read_own_org
on storage.objects
for select
to authenticated
using (
  bucket_id = 'voice-notes'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
);

drop policy if exists voice_notes_update_own_org on storage.objects;
create policy voice_notes_update_own_org
on storage.objects
for update
to authenticated
using (
  bucket_id = 'voice-notes'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
)
with check (
  bucket_id = 'voice-notes'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
);

drop policy if exists voice_notes_delete_own_org on storage.objects;
create policy voice_notes_delete_own_org
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'voice-notes'
  and (storage.foldername(name))[1] = public.current_organization_id()::text
);

commit;
