select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'company_member_module_permissions',
    'company_invitations',
    'company_invitation_permissions'
  )
order by table_name;