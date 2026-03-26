select
  id,
  company_identity_id,
  organization_id,
  display_name,
  is_primary_workspace,
  created_at
from public.company_workspaces
order by created_at desc
limit 10;