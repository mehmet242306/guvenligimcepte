-- Tek kullanıcı: OSGB şemsiye bağlantılarını kaldır, hesabı bireysel yap,
-- çalışma alanı / koltuk limitlerini kaldır (plans: max_* = NULL).
--
-- Kullanım: Supabase Dashboard → SQL Editor → postgres rolü ile çalıştır.
-- Üstteki v_email değerini doğrula, sonra tüm dosyayı çalıştır.
--
-- Not: Faturalama / subscription_plans (Nova mesaj limiti vb.) bu betiği
-- kapsamaz; gerekirse Billing veya ayrı tabloları elle kontrol edin.

begin;

do $$
declare
  v_email text := 'mehmetyildirim2923@gmail.com';
  v_auth_id uuid;
  v_org_id uuid;
  v_plan_id uuid;
begin
  select id into v_auth_id
  from auth.users
  where lower(email) = lower(v_email)
  limit 1;

  if v_auth_id is null then
    raise exception 'auth.users: % bulunamadi', v_email;
  end if;

  select organization_id into v_org_id
  from public.user_profiles
  where auth_user_id = v_auth_id
  limit 1;

  if v_org_id is null then
    raise exception 'user_profiles: auth_user_id=% icin organization_id yok', v_auth_id;
  end if;

  delete from public.organization_osgb_affiliations
  where osgb_organization_id = v_org_id
     or professional_organization_id = v_org_id;

  insert into public.plans (
    code,
    name,
    account_type,
    max_active_workspaces,
    max_active_staff_seats,
    has_personnel_module,
    has_task_tracking,
    has_announcements,
    has_advanced_reports,
    contact_required
  )
  values (
    'individual_internal_unlimited',
    'Bireysel (limitsiz – iç)',
    'individual',
    null,
    null,
    true,
    true,
    true,
    true,
    false
  )
  on conflict (code) do update set
    name = excluded.name,
    account_type = excluded.account_type,
    max_active_workspaces = excluded.max_active_workspaces,
    max_active_staff_seats = excluded.max_active_staff_seats,
    has_personnel_module = excluded.has_personnel_module,
    has_task_tracking = excluded.has_task_tracking,
    has_announcements = excluded.has_announcements,
    has_advanced_reports = excluded.has_advanced_reports,
    contact_required = excluded.contact_required,
    is_active = true;

  select id into v_plan_id
  from public.plans
  where code = 'individual_internal_unlimited'
  limit 1;

  update public.organizations
  set
    account_type = 'individual',
    organization_type = 'bireysel',
    current_plan_id = v_plan_id,
    updated_at = now()
  where id = v_org_id;

  update public.organization_subscriptions
  set
    status = 'cancelled',
    ends_at = coalesce(ends_at, now())
  where organization_id = v_org_id
    and status in ('active', 'trialing');

  insert into public.organization_subscriptions (organization_id, plan_id, status)
  values (v_org_id, v_plan_id, 'active');

  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('allowed_account_types', '["individual"]'::jsonb)
  where id = v_auth_id;

  raise notice 'OK: email=% auth_id=% org_id=% plan_id=%',
    v_email, v_auth_id, v_org_id, v_plan_id;
end $$;

commit;
