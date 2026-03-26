select
  id,
  official_name,
  company_code,
  owner_organization_id,
  is_active,
  created_at
from public.company_identities
order by created_at desc
limit 10;