# Backup Log

Bu dosya `backups/` klasöründeki tüm yedeklerin kaydıdır. Her yedek alındığında bu dosyaya yeni bir satır eklenir. Bu dosyanın kendisi **Git'e dahildir** (yedekler değil) — yedeklerin geçmişini commit edebilir, referans olarak paylaşılabilir.

## Yedek Kayıtları

### 1. pre_step05a_20260411_120000

| Alan | Değer |
|---|---|
| **Yedek ID** | `pre_step05a_20260411_120000` |
| **Alındığı tarih** | 2026-04-11 ~00:52 UTC |
| **Tipi** | Mantıksal yedek (kısmi, MCP üzerinden) |
| **Neden tam değil?** | Docker/pg_dump eksik — bkz. `docs/database-hardening-plan.md §17` |
| **Hedef migration** | `supabase/migrations/20260411120000_step05a_super_admin_infra.sql` |
| **Klasör** | `backups/pre_step05a_20260411_120000/` |
| **Dosya sayısı** | 9 (8 veri + 1 manifest) |
| **Toplam boyut** | 32896 bytes (~32 KB) |
| **Toplam satır** | 819 |

**Manifest dosyası:** `pre_step05a_20260411_120000/manifest.json`
**Manifest SHA256:** `4bf40c19afa7188b8ec0b38a20c3dec4355acafaf309dc3dbe496e34ebe3dc87`

**Dosyalar ve hash'ler:**

| # | Dosya | Boyut | SHA256 |
|---|---|---|---|
| 0 | `00_metadata.md` | 4320 B | `2a71d00c6b859acc421a16c38f1c474f2307b7e90d85fc76b256b77ab07e2d7e` |
| 1 | `01_function_definitions.sql` | 4718 B | `2e7b9f6ed65ca19370bb4685724d7a3092eb013ae93ba98d18750f3176a91a53` |
| 2 | `02_user_profiles_snapshot.sql` | 3214 B | `5c57b17827a80c5f5ffac20284bfd621ff6f437cc788f1aa54d8b20b19cdf6e5` |
| 3 | `03_user_roles_snapshot.sql` | 3301 B | `dcbe05a412f1b424c84798251bf6b3e0cfa766b4433b03cdea96822a9bdffdba` |
| 4 | `04_policy_definitions.sql` | 5905 B | `3573c75e9a9a36229e06334206bb9014e2a8b0ae233c9c8f71d0c0d3884062ee` |
| 5 | `05_baseline_counts.json` | 2890 B | `b837fbba2193f8be30179c76aeeda79d70594ebb5f46b14ce09063432352a4f4` |
| 6 | `06_auth_metadata.json` | 3255 B | `f40fa79739719f79247321083174c7cf7bd423f0ce3d56254a227c326575ea72` |
| 9 | `99_restore_instructions.md` | 5293 B | `450d0a0b53add82ae7a7ee2a42b710c047e59fe54d6372ceaa5a53957078e2de` |
| — | `manifest.json` | — | `4bf40c19afa7188b8ec0b38a20c3dec4355acafaf309dc3dbe496e34ebe3dc87` |

**Kapsamı:**
- ✅ `current_organization_id()` + 4 helper fonksiyonun DDL'i
- ✅ `user_profiles` tam içeriği (2 satır)
- ✅ `user_roles` tam içeriği (2 satır)
- ✅ `roles` referans (8 satır)
- ✅ 88 RLS policy'nin özet listesi (Parça A değiştirmiyor, referans)
- ✅ 7 tablo için baseline satır sayıları (Test 6)
- ✅ 3 auth user'ın raw_app_meta_data snapshot'ı

**Dışında kalan:**
- ❌ Trigger tanımları (Parça A dokunmuyor)
- ❌ Extension'lar, sequence'ler
- ❌ Diğer tabloların veri içerikleri
- ❌ Storage bucket'ları, Edge Function'lar

**Durum:** ⏸ Migration henüz uygulanmadı. Bu yedek Parça A öncesi baseline'dır.

---

## Yedekleme Altyapısı Durumu

**Mevcut durum:** Mantıksal yedek (MCP üzerinden). Tam `pg_dump` alınamıyor çünkü:
- Docker Desktop kurulu değil → `npx supabase db dump --linked` çalışmıyor
- `pg_dump` ve `psql` Windows'ta kurulu değil

**Adım 2 (pilot tablo) öncesi** tam yedek altyapısı kurulmalı. Seçenekler:
- **A:** Docker Desktop kurulumu (Windows'ta ~1-2 GB)
- **B:** PostgreSQL client tools (pg_dump dahil, ~100-200 MB, önerilen)

Detay: `docs/database-hardening-plan.md §17`

---

## Yedek Kayıt Şablonu (gelecek yedekler için)

```markdown
### N. yedek_id

| Alan | Değer |
|---|---|
| **Yedek ID** | `...` |
| **Alındığı tarih** | YYYY-MM-DD HH:MM UTC |
| **Tipi** | [Mantıksal | Fiziksel (pg_dump) | Karma] |
| **Hedef migration** | `supabase/migrations/...` |
| **Klasör** | `backups/...` |
| **Dosya sayısı** | N |
| **Toplam boyut** | N bytes |

**Manifest SHA256:** `...`

**Kapsamı:** [özet]
**Durum:** [⏸ Henüz uygulanmadı | ✅ Uygulandı, başarılı | ❌ Uygulandı, rollback edildi]
```
