**Workspace Bootstrap**
Onboarding ekranında aşağıdaki uyarıları görüyorsan:

- `Sertifika sozlugu bu veritabaninda henuz kurulu degil`
- `Workspace tabloları bu veritabaninda henuz kurulu degil`

şu adımları uygula:

1. Supabase Dashboard > SQL Editor aç.
2. [workspace_bootstrap_bundle.sql](../supabase/manual/workspace_bootstrap_bundle.sql) dosyasının tamamını yapıştır.
3. `Run` çalıştır.
4. Başarılıysa uygulamada yeniden giriş yap.
5. `/workspace/onboarding` ekranını yenile.

Beklenen sonuç:

- `Ulke` ve `Rol` seçilebilir gelir
- Türkiye için rol etiketleri Türkçe görünür
- Sertifika sözlüğü dolu gelir
- `Workspace'i hazirla` sonrası 500 hatası kalkar

Eğer hata devam ederse kontrol et:

1. `public.workspaces` tablosu oluşmuş mu
2. `public.workspace_members` tablosu oluşmuş mu
3. `public.certifications` tablosunda seed kayıtları var mı
4. `public.user_profiles.active_workspace_id` kolonu oluşmuş mu
