-- Public buckets serve files via signed/public URLs directly through the
-- storage CDN — they do NOT need a broad SELECT policy on storage.objects.
-- The existing policies allow any authenticated user to LIST every file in
-- the bucket, exposing filenames across tenants (advisor lint
-- public_bucket_allows_listing).
--
-- Dropping the broad SELECT keeps URL-based reads working (CDN bypasses RLS
-- for public buckets) while blocking enumeration via storage.from(...).list().
--
-- Out of scope (tracked separately): the four PRIVATE buckets — bim-models,
-- inspection-photos, ohs-archives, risk-images — also have broad SELECTs
-- that need to be replaced with org-scoped path-prefix policies.

BEGIN;

DROP POLICY IF EXISTS "Authenticated users can read scan images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read voice notes" ON storage.objects;

COMMIT;
