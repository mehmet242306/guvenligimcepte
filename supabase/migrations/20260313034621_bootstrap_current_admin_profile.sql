with target_profile as (
  select up.id
  from public.user_profiles up
  where up.id = '8b768009-af63-4d8f-9d41-3aee2add5f7c'::uuid
     or up.email = 'mehmet242306@gmail.com'
  order by case when up.id = '8b768009-af63-4d8f-9d41-3aee2add5f7c'::uuid then 0 else 1 end
  limit 1
)
update public.user_profiles up
set
  auth_user_id = 'f0c09ad3-c0b0-4c39-b2a1-aa1bcaf8b01d',
  email = 'mehmet242306@gmail.com',
  updated_at = now()
from target_profile tp
where up.id = tp.id
  and up.auth_user_id is null;

with target_profile as (
  select up.id
  from public.user_profiles up
  where up.id = '8b768009-af63-4d8f-9d41-3aee2add5f7c'::uuid
     or up.email = 'mehmet242306@gmail.com'
  order by case when up.id = '8b768009-af63-4d8f-9d41-3aee2add5f7c'::uuid then 0 else 1 end
  limit 1
)
insert into public.user_roles (id, user_profile_id, role_id, assigned_at, assigned_by)
select
  gen_random_uuid(),
  tp.id,
  r.id,
  now(),
  null
from target_profile tp
join public.roles r on r.name = 'Organization Admin'
where not exists (
  select 1
  from public.user_roles ur
  where ur.user_profile_id = tp.id
    and ur.role_id = r.id
);
