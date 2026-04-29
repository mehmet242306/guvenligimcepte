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

- [ ] Bireysel kullanici kayit akisi test edildi.
- [ ] OSGB kayit/lead akisi test edildi.
- [ ] Kurumsal kayit/lead akisi test edildi.
- [ ] Kullanici hesap tipi dogru atanıyor.
- [ ] Ilk giris sonrasi kullanici dogru panele yonleniyor.
- [ ] Workspace onboarding tamamlanabiliyor.
- [ ] Demo/veri bootstrap akisi kontrol edildi.

### 2.3 Auth

- [ ] Email/password login calisiyor.
- [ ] Social login varsa test edildi.
- [ ] Logout calisiyor.
- [ ] Auth callback hatalari kontrol edildi.
- [ ] Sifre sifirlama akisi kontrol edildi.
- [ ] Yetkisiz kullanici protected sayfalara giremiyor.

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

## 7. Kurumsal / Enterprise Akisi

- [ ] Kurumsal talep formu var.
- [ ] Talep Supabase'e kayit oluyor.
- [ ] Platform admin lead ekraninda gorunuyor.
- [ ] Kurumsal icin checkout butonu yok.
- [ ] Metinler "bizimle iletisime gecin" seklinde.
- [ ] Ozel limit/ozel fiyat mantigi manuel yonetilebilir.

## 8. Platform Admin

- [ ] Platform admin login/yetki kontrolu calisiyor.
- [ ] Lead listesi gorunuyor.
- [ ] Lead status guncellenebiliyor.
- [ ] Demo builder calisiyor.
- [ ] Admin olmayan kullanici admin route'lara giremiyor.
- [ ] Admin ekranlarinda hassas bilgi sizmiyor.
- [ ] Production'da admin env/rol ayarlari dogru.

## 9. Abonelik ve Odeme

Detayli Paddle takip dosyasi:

`docs/paddle-billing-launch-checklist.md`

Ozet:

- [x] Supabase billing migration'lari uygulandi.
- [x] Paddle product ve price'lar olusturuldu.
- [x] Price ID'leri Supabase'e islendi.
- [x] Paddle API key olusturuldu.
- [x] Paddle client-side token olusturuldu.
- [ ] Vercel production env'lerine Paddle degiskenleri eklenecek.
- [ ] Paddle webhook destination olusturulacak.
- [ ] Webhook secret Vercel'e eklenecek.
- [ ] Production redeploy alinacak.
- [ ] Sandbox odeme testi yapilacak.
- [ ] Webhook sonrasi abonelik aktivasyonu test edilecek.
- [ ] Live mode gecis plani tamamlanacak.

## 10. Limit, Kota ve Yetki Sızıntısı

- [ ] Tum ucretli ozellikler listelendi.
- [ ] Her ucretli ozellik bir `BillingAction` ile eslesti.
- [ ] Backend limit kontrolu olmayan endpoint kalmadi.
- [ ] Frontend gizleme sadece UX icin, guvenlik backend'de.
- [ ] Free kullanici paid ozellige direkt API ile erisemiyor.
- [ ] Starter kullanici Pro ozelliklerini kullanamiyor.
- [ ] OSGB/Kurumsal manuel planlar kontrollu.
- [ ] `subscription_usage` aylik kullanimlari dogru tutuyor.
- [ ] Ayni ay icinde sayaçlar artiyor.
- [ ] Yeni ayda kullanim sifirlaniyor.

## 11. Supabase ve Veritabani

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

## 12. Guvenlik

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

## 13. KVKK, Gizlilik ve Yasal Metinler

- [ ] Gizlilik politikasi hazir.
- [ ] Kullanim sartlari hazir.
- [ ] KVKK aydinlatma metni hazir.
- [ ] Cerez/cookie ihtiyaci degerlendirildi.
- [ ] Kullanici veri ihraci calisiyor.
- [ ] Kullanici veri silme/anonimlestirme sureci belirlendi.
- [ ] E-posta izinleri ve transactional email ayrimi net.
- [ ] Paddle Merchant of Record modeli yasal/muhasebe tarafinda anlasildi.

## 14. E-posta ve Bildirimler

- [ ] Resend/API key production'da dogru.
- [ ] Davet e-postalari calisiyor.
- [ ] Atama/gorevlendirme e-postalari calisiyor.
- [ ] Odeme basarili/abonelik aktif e-postasi gerekip gerekmedigi belirlendi.
- [ ] Hata durumunda kullaniciya anlasilir mesaj donuyor.
- [ ] Support e-posta adresleri dogru: `support@getrisknova.com`, `hello@getrisknova.com`.

## 15. Vercel ve Deploy

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

## 16. Test Plani

### 16.1 Teknik Testler

- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run test`
- [ ] Kritik API route'lar smoke test edildi.
- [ ] Production smoke test yapildi.

### 16.2 Kullanici Senaryolari

- [ ] Yeni bireysel kullanici kayit olur.
- [ ] Free kullanici ilk Nova mesajini atar.
- [ ] Free kullanici limit dolunca yukseltme gorur.
- [ ] Starter satin alma sandbox test edilir.
- [ ] Pro satin alma sandbox test edilir.
- [ ] Odeme sonrasi abonelik aktif olur.
- [ ] Kullanici paid limite gore ozellik kullanir.
- [ ] OSGB kullanicisi teklif akisini kullanir.
- [ ] Kurumsal kullanici teklif akisini kullanir.

### 16.3 Negatif Testler

- [ ] Yetkisiz API istegi reddedilir.
- [ ] Limit dolunca islem yapilmaz.
- [ ] Yanlis Paddle webhook signature reddedilir.
- [ ] Ayni webhook ikinci kez islenmez.
- [ ] Eksik env varsa anlasilir hata doner.
- [ ] Iptal/pause subscription durumunda paid limit kapanir.

## 17. Performans ve Kullanilabilirlik

- [ ] Ana sayfa hiz kontrolu yapildi.
- [ ] Pricing sayfasi hiz kontrolu yapildi.
- [ ] Protected dashboard hiz kontrolu yapildi.
- [ ] Mobil gorunumlarda tasma/overlap yok.
- [ ] Uzun metinler buton/kart disina tasmiyor.
- [ ] AI yanitlari loading state ile geliyor.
- [ ] Hata state'leri kullanici dostu.

## 18. Icerik ve Dil Temizligi

- [ ] Turkce karakter bozulmalari kontrol edildi.
- [ ] Paket metinleri profesyonel Turkce ile duzeltildi.
- [ ] CTA metinleri net.
- [ ] Teknik ifadeler son kullanici diline cevrildi.
- [ ] OSGB ve Kurumsal metinleri ayri.
- [ ] Ingilizce kalmis metinler temizlendi veya bilerek birakildi.

## 19. Canliya Gecis Oncesi Karar Noktalari

- [ ] Sandbox ile mi soft launch yapilacak, live mode'a mi gecilecek?
- [ ] Ilk musteriler kim olacak?
- [ ] Free limitleri yeterince dusuk mu?
- [ ] Starter fiyati ve limiti karli mi?
- [ ] Professional 149 gercekten ana paket mi?
- [ ] Para iadesi politikasi ne olacak?
- [ ] Support sureci nasil isleyecek?
- [ ] Manuel abonelik duzeltme sureci kimde olacak?

## 20. Canliya Gecis

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

## 21. Hemen Siradaki Adimlar

Bu bolum her calisma seansinda guncellenecek:

- [ ] Mevcut hardcoded metin envanterini cikar.
- [ ] Public site ve pricing cevirilerini ilk dalga olarak tamamla.
- [ ] `pricing` ve `billing` namespace'lerini mesaj dosyalarina ekle.
- [ ] Yeni billing/pricing component'lerini `useTranslations()` ile bagla.
- [ ] Public header'daki yeni `Paketler` linkini tum dillere cevir.
- [ ] Login/register public metinlerini kontrol et.
- [ ] Locale dosyalari arasinda eksik key kontrol scripti ekle.
- [ ] `npm run typecheck` calistir.
