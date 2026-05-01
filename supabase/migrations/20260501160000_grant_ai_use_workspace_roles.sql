-- Nova sohbeti: firma/organizasyon rolleri (5'li adapter) icin ai.use
-- user_has_permission company_memberships / organization_memberships uzerinden
-- roles(code) -> role_permissions ile bakiyordu; owner/manager/editor/viewer ve dsp
-- icin ai.use tanimli degildi -> ERR_AUTH_006 / widget'ta "yetki yok" mesaji.

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = 'ai.use'
where r.code in ('owner', 'manager', 'editor', 'viewer', 'dsp')
on conflict (role_id, permission_id) do nothing;
