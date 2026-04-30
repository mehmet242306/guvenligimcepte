# RiskNova Proje Tamamlama Ana Checklist

Bu dosya RiskNova'yi fikir/asama gelistirmeden cikartip test edilebilir, yayina alinabilir ve kullaniciya satilabilir bir urun haline getirmek icin ana takip listesidir.

Durum etiketleri:

- `[x]` tamamlandi
- `[ ]` yapilacak
- `[!]` dikkat / karar gerekiyor

## 0. Proje Hedefi

- [ ] RiskNova'nin ana hedef kullanicisi netlestirildi.
- [ ] Bireysel ISG profesyoneli icin self-service kullanim akisi tamamlandi.
- [ ] OSGB icin iletisim / teklif akisi tamamlandi.
- [ ] Kurumsal musteriler icin iletisim / teklif akisi tamamlandi.
- [ ] Ucretsiz kullanicinin ne gorecegi ve ne kadar kullanacagi netlestirildi.
- [ ] Ucretli kullanicinin hangi degeri satin aldigi netlestirildi.
- [ ] Uygulama "demo" hissinden cikartilip gercek urun hissine getirildi.

## 0.1 Cok Dilli Icerik ve Yerellestirme

Detayli takip dosyasi:

`docs/localization-completion-checklist.md`

Desteklenen diller:

- `tr`
- `en`
- `ar`
- `ru`
- `de`
- `fr`
- `es`
- `zh`
- `ja`
- `ko`
- `hi`
- `az`
- `id`

Ana hedef:

- [ ] Tum public sayfalar desteklenen dillere cevrildi.
- [ ] Tum protected uygulama ekranlari desteklenen dillere cevrildi.
- [ ] Tum buton, placeholder, tablo basligi, empty state, loading state ve hata mesajlari cevrildi.
- [ ] Tum API/user-facing hata mesajlari locale'e gore donuyor.
- [ ] Tum e-posta sablonlari locale'e gore calisiyor.
- [ ] Hardcoded Turkce/Ingilizce metin kalmadi.
- [ ] Locale dosyalari arasinda eksik key kalmadi.
- [ ] Arapca icin RTL ihtiyaci karar altina alindi.
- [ ] Her dil icin smoke test yapildi.

Hemen oncelik:

- [ ] Public site cevirileri.
- [ ] Pricing ve billing cevirileri.
- [ ] Login/register cevirileri.
- [ ] Onboarding cevirileri.
- [ ] Nova/risk/dokuman ana akislari.

## 0.2 Moduler Yayin Onceligi

Bu bolum RiskNova'yi parca parca kontrol edilebilir hale getirmek icin ana siradir. Her modul tamamlanmadan sonraki module gecilmez; boylece login, odeme veya yetki gibi temel sorunlar ust modullere sizmaz.

### Faz 1 - Giris, Oturum ve Onboarding

Amac: Kullanici sorunsuz giris yapabilmeli, dogru hesap tipine ve dogru workspace akisine yonlenmeli.

- [x] Email/password giris production'da test edildi.
- [x] Google ile giris production'da test edildi.
- [x] Auth callback ve session recover akisi stabil.
- [x] Login sonrasi kullanici gereksiz donguye girmiyor.
- [x] Yeni kullanici onboarding'i tamamlayabiliyor.
- [x] Workspace olusturma/secme akisi hata vermiyor.
- [x] Logout ve tekrar login senaryosu test edildi.

### Faz 2 - Abonelik, Odeme ve Limit Guvenligi

Amac: Odeme alindiginda abonelik dogru islenmeli; ucretli ozellikler backend seviyesinde korunmali.

- [x] Paket bazli limitler kod ve DB `action_limits` tarafinda tanimli.
- [x] Backend entitlement enforcement sikilastirildi.
- [x] Direkt API ile limit bypass edilebilecek acik endpointler kapatildi.
- [x] Limit dolunca API tarafinda bloklama, 402 mekanizmasi aktif.
- [x] Free/Starter/Plus/Professional limitleri backend'de uygulaniyor.
- [x] Direkt API istegi ile limit bypass edilemiyor.
- [ ] Paddle sandbox/live env degerleri production Vercel env'lerinde dogru.
- [ ] Paddle sandbox/live product/price ID'leri Supabase ve Vercel ile uyumlu.
- [ ] Checkout baslatma tum paketlerde gercek verilerle calisiyor.
- [ ] Starter checkout baslatma dogrulandi.
- [ ] Plus checkout baslatma dogrulandi.
- [ ] Professional 99 checkout baslatma dogrulandi.
- [ ] Professional 149 checkout baslatma dogrulandi.
- [ ] Professional 199 checkout baslatma dogrulandi.
- [ ] Test/gercek odeme sonrasi webhook Supabase'e abonelik yaziyor.
- [ ] `paddle_webhook_events` kaydi dusuyor.
- [ ] `user_subscriptions` dogru plan/cycle/status ile guncelleniyor.
- [ ] Aktif abonelik pricing ekraninda "Mevcut plan" olarak gorunuyor.
- [ ] Uctan uca test 1: checkout -> payment success -> webhook write -> UI plan sync.
- [ ] Uctan uca test 2: checkout -> payment success -> webhook write -> UI plan sync.
- [ ] Uctan uca test 3: checkout -> payment success -> webhook write -> UI plan sync.
- [ ] Sandbox/live env son release gate kontrolu tamamlandi.
- [ ] Paddle live gecisinden once uc tur akisi sorunsuz test edildi.

### Faz 3 - Workspace ve Organizasyon Temeli

Amac: Bireysel, OSGB ve kurumsal kullanicilarin veri baglami ayrilmali.

- [x] Bireysel workspace akisi tamam.
- [x] OSGB self-service odeme disinda, teklif/iletisim akisi icinde.
- [x] Kurumsal self-service odeme disinda, teklif/iletisim akisi icinde.
- [x] Kullanici baska workspace verisini goremez.
- [x] Firma/isyeri/calisma alani secimi tum ana modullere dogru yansiyor.

Faz 3 dogrulama notlari (kod):

- Bireysel workspace: `user_profiles.active_workspace_id`, `nova_workspace_members`, `frontend/src/lib/supabase/workspace-api.ts`, onboarding `/(protected)/workspace/onboarding`.
- OSGB / kurumsal teklif: kayit sihirbazi + `CommercialLeadDialog`, `POST /api/contact/commercial-lead` → `enterprise_leads` (`requested_account_type` osgb|enterprise); pricing alt serit `/register?commercial=osgb|enterprise`.
- Veri baglami: org ve firma workspace icin RLS ve yardimci fonksiyonlar (`supabase/migrations/20260411180000_user_scope_isolation.sql`, `20260425010000_critical_rls_hardening.sql`); OSGB-bireysel cati baglantisi `20260430120000_organization_osgb_affiliations.sql` + `/api/account/osgb-affiliations`.
- Aktif calisma alani: `WorkspaceSwitcher` (`setActiveWorkspace` + `router.refresh()`), firma ozeti `ActiveCompanyBar` (`active-company-bar.tsx`).

### Faz 4 - Cekirdek ISG Urun Modulleri

Amac: Urunun asil degeri calisir hale gelir.

- [ ] Risk analizi olusturma ve listeleme calisiyor.
- [ ] Saha denetimi ve kontrol listeleri calisiyor.
- [ ] Dokuman olusturma, kaydetme ve export calisiyor.
- [ ] Nova AI temel sorulara cevap veriyor.
- [ ] Sinav ve anket modulu header'a geri eklendi.
- [ ] Sinav ve anket modulu temel akislari calisiyor.
- [ ] Her cekirdek islem ilgili plan limitinden dusuyor.
- [ ] Mobil kullanimda temel akislarda tasma veya kirilma yok.

### Faz 5 - Raporlama, Bildirim ve Admin

Amac: Operasyon takip edilebilir ve desteklenebilir hale gelir.

- [ ] PDF/Excel export senaryolari test edildi.
- [ ] E-posta bildirimleri production'da calisiyor.
- [ ] Kayit sonrasi hos geldin / dogrulama e-postalari calisiyor.
- [ ] Uzun sure giris yapmayan kullaniciya hatirlatma e-postasi plani var.
- [ ] Odeme basarili / abonelik aktif e-postasi calisiyor.
- [ ] Odeme basarisiz / abonelik sorunlu e-postasi calisiyor.
- [ ] Platform admin lead/abonelik/kullanici kontrolu yapabiliyor.
- [ ] Hata loglari Vercel/Supabase tarafinda takip edilebilir.
- [ ] Manuel abonelik duzeltme sureci belirlendi.

### Faz 6 - Dil, Icerik, Hukuki ve Canliya Gecis

Amac: Urun kullaniciya guven veren, satilabilir ve yayinlanabilir hale gelir.

- [ ] Public site ve pricing metinleri profesyonel Turkce ile temiz.
- [ ] Desteklenen diller icin ceviri plani tamamlandi.
- [ ] Kullanim sartlari, gizlilik ve iade politikasi yayinda.
- [ ] Paddle live onayi tamamlandiginda live env gecisi yapildi.
- [ ] Gercek odeme testi tamamlandi.
- [ ] Ilk 24 saat log ve webhook izleme plani hazir.

## 1. Paketler ve Ticari Model

### 1.1 Bireysel Paketler

- [x] Free plan belirlendi.
- [x] Starter plan belirlendi.
- [x] Professional 99 plan belirlendi.
- [x] Professional 149 plan belirlendi.
- [x] Professional 199 plan belirlendi.
- [x] Yearly fiyat mantigi belirlendi: 12 ay yerine 10 ay odeme.
- [ ] Paket aciklamalari son kullanici diliyle gozden gecirildi.
- [ ] Paketler arasindaki farklar net ve cazip hale getirildi.
- [ ] Professional 149 "onerilen/populer" plan olarak konumlandirildi.
- [ ] Paket limitleri maliyet analiziyle tekrar kontrol edildi.
- [ ] Her pakette neden yukseltilmesi gerektigi kullaniciya anlasilir yapildi.

### 1.2 OSGB ve Kurumsal Model

- [x] OSGB checkout disinda birakilacak.
- [x] Kurumsal checkout disinda birakilacak.
- [ ] OSGB icin teklif formu tamamlandi.
- [ ] Kurumsal icin teklif formu tamamlandi.
- [ ] Iletisim formu Supabase'e kayit atiyor mu kontrol edildi.
- [ ] Platform admin lead ekraninda gelen talepler gorunuyor mu kontrol edildi.
- [ ] OSGB/Kurumsal sayfa metinleri hazirlandi.

## 2. Kullanici Akislari

### 2.1 Public Site

- [ ] Ana sayfa urun degerini net anlatiyor.
- [ ] Paketler sayfasi `/pricing` calisiyor.
- [ ] Public header'da `Paketler` linki var.
- [ ] Login/register ekranlari paketlerle isgal edilmiyor.
- [ ] OSGB/Kurumsal icin iletisim CTA'lari var.
- [ ] Mobil gorunum kontrol edildi.
- [ ] Sayfa metinlerinde yazim hatalari temizlendi.

### 2.2 Kayit ve Onboarding

- [x] Bireysel kullanici kayit akisi test edildi.
- [ ] OSGB kayit/lead akisi test edildi.
- [ ] Kurumsal kayit/lead akisi test edildi.
- [x] Kullanici hesap tipi dogru atanıyor.
- [x] Ilk giris sonrasi kullanici dogru panele yonleniyor.
- [x] Workspace onboarding tamamlanabiliyor.
- [x] Demo/veri bootstrap akisi kontrol edildi.

### 2.3 Auth

- [x] Email/password login calisiyor.
- [x] Social login varsa test edildi.
- [x] Logout calisiyor.
- [x] Auth callback hatalari kontrol edildi.
- [ ] Sifre sifirlama akisi kontrol edildi.
- [x] Yetkisiz kullanici protected sayfalara giremiyor.

## 3. Nova ve AI Ozellikleri

### 3.1 Nova Chat

- [ ] Nova chat widget production'da aciliyor.
- [ ] Nova mesajlari dogru cevap donuyor.
- [ ] Nova kullanimi paket limitinden dusuyor.
- [ ] Free kullanici limit asinca durduruluyor.
- [ ] Paid kullanici kendi limitine gore kullaniyor.
- [ ] Nova uzun cevaplarda maliyeti kontrol ediyor.
- [ ] Hukuki/mevzuat cevaplarinda kaynak belirsizse bunu soyluyor.

### 3.2 AI Analizler

- [ ] Genel AI analiz endpoint'i calisiyor.
- [ ] Risk analizi endpoint'i calisiyor.
- [ ] Olay/kok neden analizi calisiyor.
- [ ] Dokuman AI endpoint'i calisiyor.
- [ ] Egitim slayti AI endpoint'i calisiyor.
- [ ] Her endpoint paket limitine bagli.
- [ ] Limit dolunca kullaniciya anlasilir mesaj donuyor.
- [ ] Backend seviyesinde limit bypass edilemiyor.

### 3.3 AI Maliyet Kontrolu

- [ ] Model secimleri maliyete gore gozden gecirildi.
- [ ] Uzun prompt/input sinirlari belirlendi.
- [ ] Maksimum output uzunlugu belirlendi.
- [ ] Pahali islemler icin aylik limitler dogru.
- [ ] Hata durumunda gereksiz tekrar denemeler engellendi.
- [ ] AI provider key'leri production env'de dogru.

## 4. Dokuman Uretimi

- [ ] Dokuman olusturma akisi calisiyor.
- [ ] Dokuman editoru aciliyor.
- [ ] PDF/export calisiyor.
- [ ] DOCX/export calisiyor.
- [ ] Dokumanlar kullanici/organizasyon yetkisine gore gorunuyor.
- [ ] Dokuman olusturma paket limitinden dusuyor.
- [ ] Free/Starter/Pro limitleri ayri ayri test edildi.
- [ ] Paylasim linkleri guvenli.
- [ ] Shared document view yetkisiz bilgi sizdirmiyor.

## 5. Risk Analizi ve Saha Denetimi

- [ ] Risk analizi olusturma calisiyor.
- [ ] Risk skoru/gecmisi calisiyor.
- [ ] Saha denetimi akisi calisiyor.
- [ ] Kontrol listeleri dogru yukleniyor.
- [ ] Starter template/veri yukleme tekrarli calismiyor.
- [ ] Risk analizi limitleri calisiyor.
- [ ] Export/rapor alma limitleri calisiyor.
- [ ] Mobilde saha kullanimi kontrol edildi.

## 6. OSGB Modulu

- [ ] OSGB dashboard aciliyor.
- [ ] Personel davet akisi calisiyor.
- [ ] Company workspace atamalari calisiyor.
- [ ] Gorev/assignment yetkileri calisiyor.
- [ ] OSGB dokumanlari dogru gorunuyor.
- [ ] OSGB tasks board calisiyor.
- [ ] Sirket bazli yetkilendirme dogru.
- [ ] OSGB self-service odeme yerine lead/teklif akisi kullaniyor.

## 7. Sinav ve Anket Modulu

- [ ] Header/navigation icinde Sinav ve Anket linkleri geri getirildi.
- [ ] Sinav modulu route'lari production'da aciliyor.
- [ ] Anket modulu route'lari production'da aciliyor.
- [ ] Sinav olusturma, listeleme ve detay akisi calisiyor.
- [ ] Anket olusturma, listeleme ve detay akisi calisiyor.
- [ ] Katilimci/cevap kayitlari Supabase'e dogru yaziliyor.
- [ ] Sinav ve anket verileri kullanici/workspace yetkisine gore korunuyor.
- [ ] Sinav ve anket modulu paket limitlerine baglandi.
- [ ] Mobil gorunum kontrol edildi.
- [ ] Bos durum, hata durumu ve loading state'leri kullanici dostu.

## 8. Kurumsal / Enterprise Akisi

- [ ] Kurumsal talep formu var.
- [ ] Talep Supabase'e kayit oluyor.
- [ ] Platform admin lead ekraninda gorunuyor.
- [ ] Kurumsal icin checkout butonu yok.
- [ ] Metinler "bizimle iletisime gecin" seklinde.
- [ ] Ozel limit/ozel fiyat mantigi manuel yonetilebilir.

## 9. Platform Admin

- [ ] Platform admin login/yetki kontrolu calisiyor.
- [ ] Lead listesi gorunuyor.
- [ ] Lead status guncellenebiliyor.
- [ ] Demo builder calisiyor.
- [ ] Admin olmayan kullanici admin route'lara giremiyor.
- [ ] Admin ekranlarinda hassas bilgi sizmiyor.
- [ ] Production'da admin env/rol ayarlari dogru.

## 10. Abonelik ve Odeme

Detayli Paddle takip dosyasi:

`docs/paddle-billing-launch-checklist.md`

Ozet:

- [x] Supabase billing migration'lari uygulandi.
- [x] Paddle product ve price'lar olusturuldu.
- [x] Price ID'leri Supabase'e islendi.
- [x] Paddle API key olusturuldu.
- [x] Paddle client-side token olusturuldu.
- [ ] Vercel production env'lerine Paddle degiskenleri son kez dogrulanacak.
- [ ] Paddle webhook destination firma onayi sonrasi dogrulanacak.
- [ ] Webhook secret Vercel'de son kez dogrulanacak.
- [ ] Production redeploy alinacak.
- [ ] Checkout canli akis testi firma onayi sonrasi yapilacak.
- [ ] Tum paketlerde odeme baslatma gercek verilerle dogrulanacak.
- [ ] Webhook sonrasi abonelik aktivasyonu test edilecek.
- [ ] `paddle_webhook_events` kaydi dogrulanacak.
- [ ] `user_subscriptions` plan/cycle/status senkronu dogrulanacak.
- [ ] Pricing ekraninda aktif plan "Mevcut plan" olarak dogrulanacak.
- [ ] Live mode gecis plani tamamlanacak.

## 11. Limit, Kota ve Yetki Sızıntısı

- [x] Tum ucretli ozellikler listelendi.
- [x] Her ucretli ozellik bir `BillingAction` ile eslesti.
- [x] Backend limit kontrolu olmayan endpoint kalmadi.
- [x] Frontend gizleme sadece UX icin, guvenlik backend'de.
- [x] Free kullanici paid ozellige direkt API ile erisemiyor.
- [x] Starter kullanici Pro ozelliklerini kullanamiyor.
- [x] OSGB/Kurumsal manuel planlar kontrollu.
- [ ] `subscription_usage` aylik kullanimlari dogru tutuyor.
- [x] Ayni ay icinde sayaçlar artiyor.
- [ ] Yeni ayda kullanim sifirlaniyor.

## 12. Supabase ve Veritabani

- [x] Son iki billing migration'i manuel uygulandi.
- [!] Supabase remote migration history local ile uyumsuz.
- [ ] Migration history uyumsuzlugu icin ayri plan yapilacak.
- [ ] Remote-only migration'lar incelenecek.
- [ ] Local-only migration'lar gercekten gerekli mi kontrol edilecek.
- [ ] Production DB yedek stratejisi belirlendi.
- [ ] RLS politikalarinin kritik tablolarda aktif oldugu kontrol edildi.
- [ ] Service role disinda hassas tablolar yazilamiyor.
- [ ] Storage bucket policy'leri kontrol edildi.
- [ ] Database indexes performans icin kontrol edildi.

## 13. Guvenlik

- [ ] API key'ler repo icinde yok.
- [ ] `.env.local` git'e dahil degil.
- [ ] Vercel env'leri dogru ortamda.
- [ ] Supabase service role sadece server tarafinda.
- [ ] Paddle API key sadece server tarafinda.
- [ ] Webhook signature zorunlu.
- [ ] Admin route'lar rol kontrolu yapiyor.
- [ ] Kullanici baska organizasyon verisini goremez.
- [ ] Shared links tahmin edilemez token kullanıyor.
- [ ] Rate limit / abuse kontrolu degerlendirildi.

## 14. KVKK, Gizlilik ve Yasal Metinler

- [ ] Gizlilik politikasi hazir.
- [ ] Kullanim sartlari hazir.
- [ ] KVKK aydinlatma metni hazir.
- [ ] Cerez/cookie ihtiyaci degerlendirildi.
- [ ] Kullanici veri ihraci calisiyor.
- [ ] Kullanici veri silme/anonimlestirme sureci belirlendi.
- [ ] E-posta izinleri ve transactional email ayrimi net.
- [ ] Paddle Merchant of Record modeli yasal/muhasebe tarafinda anlasildi.

## 15. E-posta ve Bildirimler

- [ ] Resend/API key production'da dogru.
- [ ] Davet e-postalari calisiyor.
- [ ] Atama/gorevlendirme e-postalari calisiyor.
- [ ] Kayit sonrasi hos geldin veya hesap dogrulama e-postasi calisiyor.
- [ ] Uzun sure giris yapmayan kullanici icin geri kazanma e-postasi kurgulandi.
- [ ] Geri kazanma e-postalari icin cron/queue ihtiyaci belirlendi.
- [ ] Odeme basarili/abonelik aktif e-postasi gerekip gerekmedigi belirlendi.
- [ ] Odeme basarili/abonelik aktif e-postasi calisiyor.
- [ ] Odeme basarisiz/abonelik riskli e-postasi calisiyor.
- [ ] Plan degisikligi/iptal e-postalari calisiyor.
- [ ] Hata durumunda kullaniciya anlasilir mesaj donuyor.
- [ ] Support e-posta adresleri dogru: `support@getrisknova.com`, `hello@getrisknova.com`.

## 16. Vercel ve Deploy

- [x] Vercel project var: `getrisknova`.
- [x] Production deployment var.
- [ ] Son kod degisiklikleri production'a deploy edildi.
- [ ] Production env'leri tamam.
- [ ] Build production'da basarili.
- [ ] `/pricing` production'da calisiyor.
- [ ] API routes production'da calisiyor.
- [ ] Vercel logs kritik hata icermiyor.
- [ ] Domain `getrisknova.com` dogru deployment'a bagli.
- [ ] Preview/production ortam ayrimi net.

## 17. Test Plani

### 17.1 Teknik Testler

- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run test`
- [ ] Kritik API route'lar smoke test edildi.
- [ ] Production smoke test yapildi.

### 17.2 Kullanici Senaryolari

- [ ] Yeni bireysel kullanici kayit olur.
- [ ] Free kullanici ilk Nova mesajini atar.
- [ ] Free kullanici limit dolunca yukseltme gorur.
- [ ] Starter satin alma sandbox test edilir.
- [ ] Pro satin alma sandbox test edilir.
- [ ] Odeme sonrasi abonelik aktif olur.
- [ ] Kullanici paid limite gore ozellik kullanir.
- [ ] OSGB kullanicisi teklif akisini kullanir.
- [ ] Kurumsal kullanici teklif akisini kullanir.
- [ ] Kullanici sinav olusturur.
- [ ] Kullanici anket olusturur.

### 17.3 Negatif Testler

- [ ] Yetkisiz API istegi reddedilir.
- [x] Limit dolunca islem yapilmaz.
- [ ] Yanlis Paddle webhook signature reddedilir.
- [ ] Ayni webhook ikinci kez islenmez.
- [ ] Eksik env varsa anlasilir hata doner.
- [ ] Iptal/pause subscription durumunda paid limit kapanir.

## 18. Performans ve Kullanilabilirlik

- [ ] Ana sayfa hiz kontrolu yapildi.
- [ ] Pricing sayfasi hiz kontrolu yapildi.
- [ ] Protected dashboard hiz kontrolu yapildi.
- [ ] Mobil gorunumlarda tasma/overlap yok.
- [ ] Uzun metinler buton/kart disina tasmiyor.
- [ ] AI yanitlari loading state ile geliyor.
- [ ] Hata state'leri kullanici dostu.

## 19. Icerik ve Dil Temizligi

- [ ] Turkce karakter bozulmalari kontrol edildi.
- [ ] Paket metinleri profesyonel Turkce ile duzeltildi.
- [ ] CTA metinleri net.
- [ ] Teknik ifadeler son kullanici diline cevrildi.
- [ ] OSGB ve Kurumsal metinleri ayri.
- [ ] Ingilizce kalmis metinler temizlendi veya bilerek birakildi.

## 20. Canliya Gecis Oncesi Karar Noktalari

- [ ] Sandbox ile mi soft launch yapilacak, live mode'a mi gecilecek?
- [ ] Ilk musteriler kim olacak?
- [ ] Free limitleri yeterince dusuk mu?
- [ ] Starter fiyati ve limiti karli mi?
- [ ] Professional 149 gercekten ana paket mi?
- [ ] Para iadesi politikasi ne olacak?
- [ ] Support sureci nasil isleyecek?
- [ ] Manuel abonelik duzeltme sureci kimde olacak?

## 21. Canliya Gecis

- [ ] Paddle live mode kuruldu.
- [ ] Live product/price ID'leri hazir.
- [ ] Vercel env'leri live degerlerle guncellendi.
- [ ] Production redeploy yapildi.
- [ ] Gercek odeme testi yapildi.
- [ ] Odeme sonrasi abonelik aktiflesti.
- [ ] Webhook production'da calisti.
- [ ] Payout/banka ayarlari tamam.
- [ ] Ilk kullanici onboarding testi tamam.
- [ ] Canli sonrasi ilk 24 saat loglar izlendi.

## 22. Hemen Siradaki Adimlar

Bu bolum her calisma seansinda guncellenecek:

- [x] Faz 1 icin Google login, email login ve logout production smoke testini tamamla.
- [x] Onboarding'de workspace hazirlaniyor ekraninda takilma veya `Failed to fetch` hatasini yeniden test et.
- [ ] Faz 2 icin firma onayi sonrasi Paddle webhook'un Supabase'e abonelik yazdigini dogrula.
- [ ] Odeme sonrasi pricing ekraninda aktif planin pasif/mevcut gorundugunu dogrula.
- [ ] Vercel env'lerinde sandbox/live Paddle degerlerinin karismadigini son release gate olarak kontrol et.
- [ ] Supabase `user_subscriptions`, `subscription_plans`, `paddle_webhook_events` tablolarini odeme testiyle dogrula.
- [ ] Auth ve billing stabil olduktan sonra workspace/organizasyon modulu testlerine gec.
- [ ] Daha sonra cekirdek ISG modulleri: risk analizi, dokuman, saha denetimi, Nova, sinav ve anket.
- [ ] E-posta akislari icin kayit, uzun sure giris yapmama, odeme basarili ve odeme basarisiz senaryolarini planla.
- [ ] En son public site cevirileri ve tum desteklenen diller icin localization dalgasina gir.
- [ ] Her faz sonunda `npm run typecheck`, production deploy ve kisa smoke test yap.
