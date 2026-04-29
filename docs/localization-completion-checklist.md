# RiskNova Cok Dilli Icerik Tamamlama Checklist

Bu dosya RiskNova'daki tum sayfa, panel, form, hata mesaji ve kullaniciya gorunen icerigin desteklenen dillere cevrilmesi icin takip listesidir.

Desteklenen diller:

- `tr` Turkce
- `en` Ingilizce
- `ar` Arapca
- `ru` Rusca
- `de` Almanca
- `fr` Fransizca
- `es` Ispanyolca
- `zh` Cince
- `ja` Japonca
- `ko` Korece
- `hi` Hintce
- `az` Azerice
- `id` Endonezce

## 0. Hedef

- [ ] Kullanici hangi dili secerse secsin public site tamamen o dilde gorunecek.
- [ ] Kullanici hangi dili secerse secsin protected uygulama tamamen o dilde gorunecek.
- [ ] Hata, basari, bos state, loading state ve form validasyon metinleri cevrilecek.
- [ ] AI/Nova sistem mesajlari ve kullaniciya donen standart hata metinleri cevrilecek.
- [ ] E-posta sablonlari desteklenen dillere gore cevrilecek.
- [ ] OSGB, bireysel ve kurumsal akislarda karisik dil kalmayacak.
- [ ] Dil degisimi sayfa yenilemeden veya yenileme sonrasi dogru kalici olacak.

## 1. Mevcut I18n Altyapisi

- [x] `next-intl` projede kurulu.
- [x] Mesaj dosyalari `frontend/messages/*.json` altinda var.
- [x] Desteklenen locale listesi `frontend/src/i18n/routing.ts` icinde tanimli.
- [x] Default locale `tr`.
- [x] Locale cookie: `risknova-locale`.
- [x] Legacy `useI18n()` shim mevcut.
- [ ] Tum yeni kodlarda `useTranslations()` veya mevcut shim tutarli kullaniliyor mu kontrol edilecek.
- [ ] Mesaj dosyalarindaki key yapisi standardize edilecek.
- [ ] Tum locale dosyalarinda key eksigi var mi otomatik kontrol edilecek.

## 2. Oncelik Sirasi

### 2.1 Birinci Dalga: Public ve Para Kazandiran Ekranlar

- [ ] Landing / ana sayfa.
- [ ] Public header.
- [ ] Login.
- [ ] Register.
- [ ] Pricing sayfasi.
- [ ] OSGB/Kurumsal iletisim CTA'lari.
- [ ] Contact / commercial lead formu.
- [ ] Checkout baslatma butonlari.
- [ ] Odeme hata/basari mesajlari.

### 2.2 Ikinci Dalga: Kullanici Ilk Deneyimi

- [ ] Onboarding.
- [ ] Workspace onboarding.
- [ ] Profil ve dil ayarlari.
- [ ] Dashboard ilk ekran.
- [ ] Bos state metinleri.
- [ ] Loading state metinleri.
- [ ] Yetkisiz erisim metinleri.

### 2.3 Ucuncu Dalga: Ana Uretim Modulleri

- [ ] Nova chat.
- [ ] Risk analizi.
- [ ] Saha denetimi.
- [ ] Dokumanlar.
- [ ] Dokuman editoru.
- [ ] Egitim ve sinav.
- [ ] Puantaj.
- [ ] Planner / ajanda.
- [ ] Firmalar.
- [ ] Personel yonetimi.

### 2.4 Dorduncu Dalga: OSGB ve Admin

- [ ] OSGB dashboard.
- [ ] OSGB personel davet.
- [ ] OSGB assignment/gorevlendirme.
- [ ] OSGB tasks.
- [ ] Platform admin lead ekrani.
- [ ] Demo builder.
- [ ] Admin AI ayarlari.
- [ ] Sistem/debug ekranlari.

## 3. Hardcoded Metin Temizligi

### 3.1 Tespit

- [ ] `frontend/src/app` altindaki hardcoded metinler listelendi.
- [ ] `frontend/src/components` altindaki hardcoded metinler listelendi.
- [ ] `frontend/src/lib` icindeki kullaniciya donen metinler listelendi.
- [ ] API route'larda donen hata/basari mesajlari listelendi.
- [ ] Supabase edge function icindeki kullanici mesajlari listelendi.
- [ ] E-posta sablonlari listelendi.

### 3.2 Donusturme Kurali

- [ ] Component icindeki gorunen metinler message key'e tasinacak.
- [ ] Button label'lari message key'e tasinacak.
- [ ] Placeholder metinleri message key'e tasinacak.
- [ ] Form validation metinleri message key'e tasinacak.
- [ ] Toast/alert/dialog metinleri message key'e tasinacak.
- [ ] Empty state metinleri message key'e tasinacak.
- [ ] Table header metinleri message key'e tasinacak.
- [ ] Navigation label'lari message key'e tasinacak.

## 4. Message Namespace Plani

Kullanilacak ana namespace yapisi:

```text
common
nav
landing
auth
pricing
billing
onboarding
dashboard
workspace
companies
personnel
risk
scoreHistory
documents
documentEditor
training
planner
timesheet
nova
osgb
platformAdmin
profile
settings
dataRights
consent
errors
email
```

Checklist:

- [ ] Namespace'ler `tr.json` icinde duzenlendi.
- [ ] Namespace'ler `en.json` icinde duzenlendi.
- [ ] Diger locale dosyalari ayni key yapisina sahip.
- [ ] Kullanilmayan eski key'ler ayiklandi.
- [ ] Ayni metin icin tekrar eden key'ler azaltildi.

## 5. Ceviri Kalite Kurallari

- [ ] Turkce kaynak metin profesyonel ve sade.
- [ ] Ingilizce dogal SaaS diliyle yazildi.
- [ ] Arapca RTL ihtiyaci kontrol edildi.
- [ ] Cince/Japonca/Korece metinlerde buton tasmasi kontrol edildi.
- [ ] Almanca uzun kelimeler butonlari tasmiyor.
- [ ] Hintce, Rusca, Endonezce, Azerice icin temel UI metinleri dogru.
- [ ] Teknik ISG terimleri her dilde tutarli.
- [ ] Marka adi `RiskNova` cevrilmeden kaldi.
- [ ] `Nova` asistan adi cevrilmeden kaldi.
- [ ] Para birimi ve fiyat formatlari locale'e uygun.
- [ ] Tarih/saat formatlari locale'e uygun.

## 6. Public Site Kontrol Listesi

- [ ] `/` landing tum dillerde cevrildi.
- [ ] `/pricing` tum dillerde cevrildi.
- [ ] `/login` tum dillerde cevrildi.
- [ ] `/register` tum dillerde cevrildi.
- [ ] Public header tum dillerde cevrildi.
- [ ] Public footer varsa tum dillerde cevrildi.
- [ ] CTA'lar tum dillerde dogru.
- [ ] OSGB/Kurumsal iletisim metinleri tum dillerde dogru.
- [ ] Dil degistirici public tarafta calisiyor.

## 7. Protected App Kontrol Listesi

- [ ] Ana dashboard tum dillerde cevrildi.
- [ ] Sol/ust navigasyon tum dillerde cevrildi.
- [ ] Workspace switcher tum dillerde cevrildi.
- [ ] Profil sayfasi tum dillerde cevrildi.
- [ ] Ayarlar sayfasi tum dillerde cevrildi.
- [ ] Firmalar sayfasi tum dillerde cevrildi.
- [ ] Risk analizi sayfasi tum dillerde cevrildi.
- [ ] Saha denetimi sayfasi tum dillerde cevrildi.
- [ ] Dokumanlar sayfasi tum dillerde cevrildi.
- [ ] Egitim sayfasi tum dillerde cevrildi.
- [ ] Planner sayfasi tum dillerde cevrildi.
- [ ] Puantaj sayfasi tum dillerde cevrildi.
- [ ] OSGB sayfalari tum dillerde cevrildi.
- [ ] Admin sayfalari en az `tr` ve `en`, sonra tum dillerde cevrildi.

## 8. API ve Hata Mesajlari

- [ ] API hata mesajlari kullaniciya gore locale alabiliyor.
- [ ] Billing/checkout hata mesajlari cevrildi.
- [ ] Limit asimi mesajlari cevrildi.
- [ ] Auth hata mesajlari cevrildi.
- [ ] Validation hata mesajlari cevrildi.
- [ ] AI servis hatalari cevrildi.
- [ ] Supabase edge function mesajlari `tr/en` disina genisletilecek mi karar verildi.

## 9. E-posta ve Bildirimler

- [ ] Davet e-postalari locale'e gore cevrildi.
- [ ] Demo erisim e-postalari locale'e gore cevrildi.
- [ ] Gorevlendirme e-postalari locale'e gore cevrildi.
- [ ] Odeme/abonelik e-postasi eklenecekse cevrildi.
- [ ] Plain text ve HTML versiyonlari ayni dilde.
- [ ] E-posta tarih/saat formatlari locale'e uygun.

## 10. RTL ve Layout

- [ ] Arapca icin `dir="rtl"` gereksinimi degerlendirildi.
- [ ] RTL acilacaksa layout testleri yapildi.
- [ ] Sidebar RTL'de bozulmuyor.
- [ ] Form alanlari RTL'de okunabilir.
- [ ] Icon/text siralamalari RTL'de mantikli.
- [ ] Arapca destek ertelenecekse urun icinde fallback karari verildi.

## 11. Otomatik Kontroller

- [ ] Tum locale dosyalarinin key setleri esit mi kontrol eden script eklendi.
- [ ] Bos string kontrolu eklendi.
- [ ] Placeholder kalan `TODO`, `TRANSLATE`, `test_...` metinleri kontrol edildi.
- [ ] Hardcoded Turkce metin tarama komutu belirlendi.
- [ ] Hardcoded Ingilizce metin tarama komutu belirlendi.
- [ ] Build sirasinda eksik translation yakalanacak mi karar verildi.

## 12. Test Matrisi

Her dil icin smoke test:

- [ ] `tr`
- [ ] `en`
- [ ] `ar`
- [ ] `ru`
- [ ] `de`
- [ ] `fr`
- [ ] `es`
- [ ] `zh`
- [ ] `ja`
- [ ] `ko`
- [ ] `hi`
- [ ] `az`
- [ ] `id`

Her dilde kontrol edilecek akislari:

- [ ] Landing aciliyor.
- [ ] Pricing aciliyor.
- [ ] Login aciliyor.
- [ ] Register aciliyor.
- [ ] Dashboard aciliyor.
- [ ] Nova aciliyor.
- [ ] Risk analizi aciliyor.
- [ ] Dokumanlar aciliyor.
- [ ] Hata/loading/empty state metinleri karisik dil gostermiyor.

## 13. Hemen Siradaki Adimlar

- [ ] Mevcut hardcoded metin envanteri cikar.
- [ ] Public site ve pricing ceviri isini ilk dalga olarak tamamla.
- [ ] `pricing` ve `billing` namespace'lerini mesaj dosyalarina ekle.
- [ ] Yeni billing/pricing component'lerini `useTranslations()` ile bagla.
- [ ] Public header'daki yeni `Paketler` linkini tum dillere cevir.
- [ ] Login/register public metinlerini kontrol et.
- [ ] `npm run typecheck` calistir.
- [ ] Tum dillerde public smoke test yap.
