-- Replace broad SELECT/INSERT/DELETE policies on private buckets with
-- org-scoped path-prefix policies, matching the existing inspection-photos
-- and ohs-archives pattern: first folder segment must equal the caller's
-- organization_id (UUID as text).
--
-- Path conventions (verified against existing storage.objects rows):
--   risk-images : '<orgId>/<assessmentId>/<rowId>/<uuid>_<filename>'
--   bim-models  : '<orgId>/...' (currently empty; new pattern enforced)
--
-- Public reads via signed URLs continue to work (createSignedUrl/createSignedUrls
-- bypass RLS). Only direct .list()/path enumeration is restricted.

BEGIN;

-- ============================================================
-- risk-images
-- ============================================================
DROP POLICY IF EXISTS "Users can view risk images"   ON storage.objects;
DROP POLICY IF EXISTS "Users can upload risk images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete risk images" ON storage.objects;

CREATE POLICY risk_images_read_own_org
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'risk-images'
    AND (storage.foldername(name))[1] = (current_organization_id())::text
  );

CREATE POLICY risk_images_insert_own_org
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'risk-images'
    AND (storage.foldername(name))[1] = (current_organization_id())::text
  );

CREATE POLICY risk_images_update_own_org
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'risk-images'
    AND (storage.foldername(name))[1] = (current_organization_id())::text
  )
  WITH CHECK (
    bucket_id = 'risk-images'
    AND (storage.foldername(name))[1] = (current_organization_id())::text
  );

CREATE POLICY risk_images_delete_own_org
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'risk-images'
    AND (storage.foldername(name))[1] = (current_organization_id())::text
  );

-- ============================================================
-- bim-models
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read BIM models"   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload BIM models" ON storage.objects;

CREATE POLICY bim_models_read_own_org
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'bim-models'
    AND (storage.foldername(name))[1] = (current_organization_id())::text
  );

CREATE POLICY bim_models_insert_own_org
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'bim-models'
    AND (storage.foldername(name))[1] = (current_organization_id())::text
  );

CREATE POLICY bim_models_update_own_org
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'bim-models'
    AND (storage.foldername(name))[1] = (current_organization_id())::text
  )
  WITH CHECK (
    bucket_id = 'bim-models'
    AND (storage.foldername(name))[1] = (current_organization_id())::text
  );

CREATE POLICY bim_models_delete_own_org
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'bim-models'
    AND (storage.foldername(name))[1] = (current_organization_id())::text
  );

COMMIT;
