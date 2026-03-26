select
  ci.id as company_identity_id,
  ci.official_name,
  cw.id as company_workspace_id,
  cw.organization_id,
  cm.id as membership_id,
  cm.user_id,
  cm.membership_role,
  cm.status
from public.company_identities ci
left join public.company_workspaces cw
  on cw.company_identity_id = ci.id
left join public.company_memberships cm
  on cm.company_identity_id = ci.id
order by ci.created_at desc, cw.created_at desc, cm.created_at desc
limit 20;