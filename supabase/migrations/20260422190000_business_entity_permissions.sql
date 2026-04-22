-- =============================================================================
-- İş 3 — İş varlıkları için 24 permission + role_permissions default eşlemesi
-- =============================================================================
-- 4 çekirdek iş varlığı (risk_assessments, incidents, personnel, companies)
-- × 6 aksiyon (read/write/delete/archive/invite/report) = 24 yeni permission.
--
-- Role-permission varsayılan eşlemesi (5'li modele göre):
--   owner/admin  → hepsi
--   manager      → read, write, archive, report
--   editor       → read, write
--   viewer       → read
--
-- Bu eşleme role_permissions tablosunda durur ve yetki belgelemesinin
-- kaynağıdır; frontend'de `company-role-adapter.ts` aynı matrisi JS tarafında
-- tutar (buton gizle/göster için). user_has_permission RPC'si hâlâ user_roles
-- üzerinden çalışır — 5'li rol adapter'ının backend'e gömülmesi sonraki tur.
-- =============================================================================

-- Ensure owner/manager/editor roles exist (admin/viewer zaten vardı).
insert into public.roles (code, name, description) values
  ('owner',   'Sahip',   'Hesap sahibi — tum yetkiler, devredilebilir.'),
  ('manager', 'Mudur',   'Modul yonetimi, arsivleme ve rapor olusturma.'),
  ('editor',  'Editor',  'Icerik olusturma ve duzenleme.')
on conflict (code) do nothing;

-- 24 business-entity permissions.
insert into public.permissions (code, name, description, module_key) values
  ('risk_assessments.read',    'Risk analizlerini goruntule',  'Risk analizi kayitlarini goruntuleme',               'risk_assessments'),
  ('risk_assessments.write',   'Risk analizi duzenle',         'Yeni risk analizi ekleme ve mevcutlari guncelleme',  'risk_assessments'),
  ('risk_assessments.delete',  'Risk analizi sil',             'Risk analizi kaydini silme',                          'risk_assessments'),
  ('risk_assessments.archive', 'Risk analizi arsivle',         'Risk analizi kaydini arsivleme',                      'risk_assessments'),
  ('risk_assessments.invite',  'Risk analizi paylas',          'Risk analizini baska kullanicilarla paylasma',        'risk_assessments'),
  ('risk_assessments.report',  'Risk analizi raporu',          'Risk analizinden rapor uretme',                       'risk_assessments'),

  ('incidents.read',           'Olaylari goruntule',           'Olay kayitlarini goruntuleme',                        'incidents'),
  ('incidents.write',          'Olay duzenle',                 'Olay ekleme ve guncelleme',                           'incidents'),
  ('incidents.delete',         'Olay sil',                     'Olay kaydini silme',                                  'incidents'),
  ('incidents.archive',        'Olay arsivle',                 'Olay kaydini arsivleme',                              'incidents'),
  ('incidents.invite',         'Olay paylas',                  'Olayi baska kullanicilarla paylasma',                 'incidents'),
  ('incidents.report',         'Olay raporu',                  'Olay kayitlarindan rapor uretme',                     'incidents'),

  ('personnel.read',           'Personeli goruntule',          'Personel kayitlarini goruntuleme',                    'personnel'),
  ('personnel.write',          'Personel duzenle',             'Personel ekleme ve guncelleme',                       'personnel'),
  ('personnel.delete',         'Personel sil',                 'Personel kaydini silme',                              'personnel'),
  ('personnel.archive',        'Personel arsivle',             'Personel kaydini arsivleme',                          'personnel'),
  ('personnel.invite',         'Personel davet et',            'Personeli calisma alanina davet etme',                'personnel'),
  ('personnel.report',         'Personel raporu',              'Personel verilerinden rapor uretme',                  'personnel'),

  ('companies.read',           'Firmalari goruntule',          'Firma kayitlarini goruntuleme',                       'companies'),
  ('companies.write',          'Firma duzenle',                'Firma ekleme ve guncelleme',                          'companies'),
  ('companies.delete',         'Firma sil',                    'Firma kaydini silme',                                 'companies'),
  ('companies.archive',        'Firma arsivle',                'Firma kaydini arsivleme',                             'companies'),
  ('companies.invite',         'Firmaya davet et',             'Firmaya kullanici davet etme',                        'companies'),
  ('companies.report',         'Firma raporu',                 'Firma verilerinden rapor uretme',                     'companies')
on conflict (code) do nothing;

-- Default role-permission eşlemesi.
with
  role_lookup as (
    select code, id from public.roles
    where code in ('owner', 'admin', 'manager', 'editor', 'viewer')
  ),
  business_perms as (
    select id, code,
           split_part(code, '.', 1) as entity,
           split_part(code, '.', 2) as action
    from public.permissions
    where split_part(code, '.', 1) in ('risk_assessments', 'incidents', 'personnel', 'companies')
  ),
  mapping as (
    select r.id as role_id, p.id as permission_id
    from role_lookup r
    cross join business_perms p
    where
      (r.code in ('owner', 'admin'))
      or (r.code = 'manager' and p.action in ('read', 'write', 'archive', 'report'))
      or (r.code = 'editor'  and p.action in ('read', 'write'))
      or (r.code = 'viewer'  and p.action = 'read')
  )
insert into public.role_permissions (role_id, permission_id)
select role_id, permission_id from mapping
on conflict (role_id, permission_id) do nothing;
