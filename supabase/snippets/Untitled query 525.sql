begin;

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '<USER_UUID>', true);

select auth.uid(), auth.role();

select public.create_company_identity_with_workspace(
  'Test Company A',
  'Manufacturing',
  '25.11.00',
  'dangerous',
  'Test Address',
  'Elazig',
  'Merkez',
  '1234567890',
  'Test Company A Workspace',
  'STEP1 smoke test'
) as workspace_id;

commit;