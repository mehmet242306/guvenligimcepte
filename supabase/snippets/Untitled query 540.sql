select
  id,
  company_identity_id,
  company_workspace_id,
  organization_id,
  user_id,
  membership_role,
  status,
  can_approve_join_requests,
  created_at
from public.company_memberships
order by created_at desc
limit 10;