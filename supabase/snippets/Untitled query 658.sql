select routine_schema, routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'archive_company_identity',
    'request_company_delete'
  )
order by routine_name;