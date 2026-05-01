# RiskNova Paddle Abonelik Sistemi Checklist

Bu dosya Paddle odeme altyapisini sandbox testten canli kullanima kadar bitirmek icin takip edilecek ana listedir.

Durum etiketleri:

- `[x]` tamamlandi
- `[ ]` yapilacak
- `[!]` dikkat / karar gerekiyor

## 0. Mevcut Durum

### 0.A Repo (kod) — statik dogrulama

Asagidakiler kod incelemesi ile teyit edildi; canli webhook / Vercel erisimi gerektirmez:

- [x] `POST /api/billing/checkout` Paddle transaction olusturma ve env eksiginde anlasilir hata.
- [x] `POST /api/billing/webhook`: `paddle-signature` HMAC dogrulama (`verifyPaddleWebhookSignature`), zaman damgasi penceresi, imzasiz istek 401.
- [x] `paddle_webhook_events`: her `event_id` icin insert; duplicate `event_id` 500 yerine idempotent devam.
- [x] Abonelik yazimi: `transaction.completed`, `subscription.created`, `subscription.updated`, `subscription.activated`, `subscription.canceled`, `subscription.paused`, `subscription.resumed`, `subscription.past_due`, `subscription.trialing`.
- [x] Plan cozumu: `custom_data` + Paddle `price_id` + `subscription_plans.paddle_price_id_*` + env price ID eslemesi.
- [x] `GET /api/billing/status`: girisli kullanicinin aktif/trialing aboneligi icin `planKey` ve `billing_cycle`.
- [x] `/pricing`: `PricingPlansClient` aktif plan + periyot eslesince **Mevcut plan** ve checkout devre disi.

### 0.B Migration ve Paddle katalog (sizin ortaminiz)

- [x] Supabase migration `20260428040000_professional_pricing_tiers.sql` calistirildi.
- [x] Supabase migration `20260428043000_billing_entitlements_and_paddle.sql` calistirildi.
- [x] Paddle product olusturuldu: `RiskNova Pro`.
- [x] Paddle product ID Supabase planlarina baglandi: `pro_01kqc6a17etkase2yfw3b4x8m3`.
- [x] Starter, Plus, Professional 99, Professional 149, Professional 199 icin monthly price kayitlari olusturuldu.
- [x] Starter, Plus, Professional 99, Professional 149, Professional 199 icin yearly price kayitlari olusturuldu.
- [x] Paddle price ID'leri Supabase `subscription_plans` tablosuna islendi.
- [x] Paddle API key olusturuldu.
- [x] Paddle client-side token olusturuldu.
- [ ] Paddle webhook destination olusturulacak.
- [ ] Paddle webhook secret alinip Vercel env'e eklenecek.
- [ ] Vercel production env degiskenleri tamamlanacak.
- [ ] Yeni production deploy alinacak.
- [ ] Sandbox odeme testi yapilacak.
- [ ] Webhook ve abonelik aktivasyonu dogrulanacak.
- [ ] Canli Paddle mode'a gecis hazirligi yapilacak.

## 1. Paket Modeli

### 1.1 Self-Service Bireysel Paketler

- [x] Free plan checkout'a baglanmayacak.
- [x] Starter bireysel giris paketi olarak kalacak.
- [x] Plus Starter ile Professional arasinda gecis paketi olacak.
- [x] Professional 99 ana profesyonel giris paketi olacak.
- [x] Professional 149 onerilen / populer paket olacak.
- [x] Professional 199 yogun bireysel kullanim paketi olacak.
- [ ] Pricing ekraninda Free, Starter, Plus, Professional 99, Professional 149, Professional 199 dogru sirada gorunecek.
- [ ] Pricing ekraninda monthly / yearly secimi test edilecek.
- [ ] Yearly secimde fiyatlar 10 aylik bedel olarak gosterilecek:
  - Starter: `$290/year`
  - Plus: `$590/year`
  - Professional 99: `$990/year`
  - Professional 149: `$1490/year`
  - Professional 199: `$1990/year`

### 1.2 Contact-Only Paketler

- [x] OSGB / Business plan self-service checkout disina alindi.
- [x] Kurumsal / Enterprise checkout disinda kalacak.
- [ ] OSGB icin CTA metni: `Bizimle iletisime gecin` veya `Teklif alin`.
- [ ] Kurumsal icin CTA metni: `Bizimle iletisime gecin` veya `Kurumsal teklif alin`.
- [ ] OSGB/Kurumsal butonlari Paddle checkout acmamali.
- [ ] OSGB/Kurumsal butonlari commercial lead / contact akisina gitmeli.

## 2. Paddle Catalog

### 2.1 Product

- [x] Product name: `RiskNova Pro`.
- [x] Product ID: `pro_01kqc6a17etkase2yfw3b4x8m3`.
- [x] Tax category: SaaS.
- [ ] Product bilgileri live mode'a gecmeden once tekrar kontrol edilecek.

### 2.2 Price ID Listesi

Supabase'e islenen sandbox price ID'leri:

| Plan | Cycle | Price | Paddle Price ID |
| --- | --- | ---: | --- |
| Starter | Monthly | `$29` | `pri_01kqc6e2nf2yy078vmfyeqtqdv` |
| Starter | Yearly | `$290` | `pri_01kqc6gsggq92y3m2sxgr7t6qg` |
| Plus | Monthly | `$59` | `pri_01kqc6x2n6asgyh9k6w8pp9hgz` |
| Plus | Yearly | `$590` | `pri_01kqc6yc68s829tkh09w82r2vs` |
| Professional 99 | Monthly | `$99` | `pri_01kqc7478jnyev8arj20n2dvw4` |
| Professional 99 | Yearly | `$990` | `pri_01kqc75z0j35mg0250jpqamjve` |
| Professional 149 | Monthly | `$149` | `pri_01kqc77f5jrdfha5n5p66h4107` |
| Professional 149 | Yearly | `$1490` | `pri_01kqc78xy8nrfr3zcdafyrg467` |
| Professional 199 | Monthly | `$199` | `pri_01kqc7ahbpdfbfg7c6rg5xr6t7` |
| Professional 199 | Yearly | `$1990` | `pri_01kqc7cfyvx2e3w0ydx2tbf58p` |

### 2.3 Paddle Price Ayarlari

Her price icin kontrol:

- [x] Billing period monthly/yearly dogru.
- [x] Base price dogru.
- [x] Currency `USD`.
- [x] Free trial `0 day`.
- [x] Minimum quantity `1`.
- [x] Maximum quantity `1`.
- [x] Sales tax account default / location based olarak birakildi.
- [ ] Custom data kontrol edilecek:
  - `plan_key`
  - `billing_cycle`

## 3. Vercel Environment Variables

### 3.1 Production Env'e Eklenecek Degiskenler

Vercel Dashboard yolu:

`getrisknova` project -> `Settings` -> `Environment Variables`

Production icin eklenecekler:

```env
PADDLE_ENV=sandbox
PADDLE_API_KEY=...
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=...
PADDLE_WEBHOOK_SECRET=...

PADDLE_PRICE_STARTER_MONTHLY=pri_01kqc6e2nf2yy078vmfyeqtqdv
PADDLE_PRICE_STARTER_YEARLY=pri_01kqc6gsggq92y3m2sxgr7t6qg
PADDLE_PRICE_PLUS_MONTHLY=pri_01kqc6x2n6asgyh9k6w8pp9hgz
PADDLE_PRICE_PLUS_YEARLY=pri_01kqc6yc68s829tkh09w82r2vs
PADDLE_PRICE_PROFESSIONAL_99_MONTHLY=pri_01kqc7478jnyev8arj20n2dvw4
PADDLE_PRICE_PROFESSIONAL_99_YEARLY=pri_01kqc75z0j35mg0250jpqamjve
PADDLE_PRICE_PROFESSIONAL_149_MONTHLY=pri_01kqc77f5jrdfha5n5p66h4107
PADDLE_PRICE_PROFESSIONAL_149_YEARLY=pri_01kqc78xy8nrfr3zcdafyrg467
PADDLE_PRICE_PROFESSIONAL_199_MONTHLY=pri_01kqc7ahbpdfbfg7c6rg5xr6t7
PADDLE_PRICE_PROFESSIONAL_199_YEARLY=pri_01kqc7cfyvx2e3w0ydx2tbf58p
```

Checklist:

- [ ] `PADDLE_ENV` production env'e eklendi.
- [ ] `PADDLE_API_KEY` production env'e eklendi.
- [ ] `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` production env'e eklendi.
- [ ] `PADDLE_WEBHOOK_SECRET` production env'e eklendi.
- [ ] Tum `PADDLE_PRICE_*` degiskenleri production env'e eklendi.
- [ ] Gerekirse preview env'e de ayni sandbox degerleri eklendi.
- [ ] Env ekleme sonrasi production redeploy yapildi.

## 4. Paddle Webhook

### 4.1 Destination Olusturma

Paddle yolu:

`Developer Tools` -> `Notifications` -> `New destination`

Alanlar:

```text
Description:
RiskNova Sandbox Webhook

Notification type:
Webhook / URL

URL:
https://getrisknova.com/api/billing/webhook

API version:
Default / latest

Usage type:
Platform / All
```

Secilecek eventler:

- [ ] `transaction.completed`
- [ ] `subscription.created`
- [ ] `subscription.updated`
- [ ] `subscription.canceled`
- [ ] `subscription.paused`
- [ ] `subscription.resumed`
- [ ] `subscription.activated`
- [ ] `subscription.past_due`
- [ ] `subscription.trialing`

Secilmeyecek event gruplari:

- [ ] Product eventleri secilmedi.
- [ ] Price eventleri secilmedi.
- [ ] API key eventleri secilmedi.
- [ ] Client token eventleri secilmedi.
- [ ] Report / payout / discount eventleri secilmedi.

### 4.2 Webhook Secret

- [ ] Destination kaydedildi.
- [ ] Signing secret / webhook secret kopyalandi.
- [ ] `PADDLE_WEBHOOK_SECRET` olarak Vercel production env'e eklendi.
- [ ] Webhook secret lokal `frontend/.env.local` dosyasina da eklendi.

## 5. Supabase Dogrulama

### 5.1 Plan Kayitlari

Supabase SQL Editor'da kontrol sorgusu:

```sql
select
  plan_key,
  display_name,
  price_usd,
  is_visible,
  is_custom_pricing,
  paddle_product_id,
  paddle_price_id_monthly,
  paddle_price_id_yearly,
  action_limits
from public.subscription_plans
order by sort_order;
```

Beklenen:

- [ ] `free` gorunur, price `0`.
- [ ] `starter` gorunur, price `29`, Paddle monthly/yearly dolu.
- [ ] `professional` gorunur, price `99`, Paddle monthly/yearly dolu.
- [ ] `professional_149` gorunur, price `149`, Paddle monthly/yearly dolu.
- [ ] `professional_199` gorunur, price `199`, Paddle monthly/yearly dolu.
- [ ] `business` checkout disi / custom pricing.
- [ ] `enterprise` checkout disi / contact-only.

### 5.2 Webhook Event Tablosu

- [ ] `public.paddle_webhook_events` tablosu var.
- [ ] RLS aktif.
- [ ] Service role policy var.
- [ ] Test webhook sonrasi event kaydi dusuyor.

### 5.3 Subscription Kaydi

Odeme sonrasi beklenen:

- [ ] `public.user_subscriptions` tablosunda ilgili kullanici icin kayit olusuyor.
- [ ] `provider = paddle`.
- [ ] `paddle_customer_id` dolu.
- [ ] `paddle_subscription_id` doluysa subscription eventleri takip edilebilir.
- [ ] `paddle_price_id` dogru price ID.
- [ ] `status` aktif plana uygun.
- [ ] `billing_cycle` monthly/yearly olarak dogru.

## 6. Kod ve Build Kontrolleri

### 6.1 Lokal Kontroller

- [x] `npm run typecheck` daha once basarili calisti.
- [x] `npm run build` daha once basarili calisti.
- [ ] Env degiskenleri eklendikten sonra tekrar `npm run typecheck`.
- [ ] Env degiskenleri eklendikten sonra tekrar `npm run build`.
- [ ] Paddle checkout route env eksiginde anlasilir hata veriyor.
- [ ] Paddle webhook route signature dogruluyor.

### 6.2 Etkilenen API'ler

Limit korumasi beklenen endpointler:

- [ ] `frontend/src/app/api/document-ai/route.ts`
- [ ] `frontend/src/app/api/analyze-risk/route.ts`
- [ ] `frontend/src/app/api/ai/analysis/route.ts`
- [ ] `frontend/src/app/api/training-slides-ai/route.ts`
- [ ] `supabase/functions/solution-chat/index.ts`

Kontrol:

- [ ] Backend limit kontrolu var.
- [ ] Sadece frontend gizleme ile yetinilmiyor.
- [ ] Limit asildiginda islem duruyor.
- [ ] Limit asildiginda kullaniciya paket yukseltme mesaji donuyor.

## 7. Pricing Sayfasi Testi

URL:

```text
https://getrisknova.com/pricing
```

Kontroller:

- [ ] Sayfa aciliyor.
- [ ] Login ekranini isgal etmiyor.
- [ ] Public header'da `Paketler` linki gorunuyor.
- [ ] Free plan gorunuyor.
- [ ] Starter plan gorunuyor.
- [ ] Professional 99 gorunuyor.
- [ ] Professional 149 onerilen/populer olarak gorunuyor.
- [ ] Professional 199 gorunuyor.
- [ ] OSGB/Kurumsal contact-only olarak gorunuyor veya ayri CTA ile yonleniyor.
- [ ] Monthly/yearly toggle calisiyor.
- [ ] Yearly fiyatlar dogru.
- [ ] Free plan checkout acmiyor.
- [ ] Paid planlar Paddle checkout akisina giriyor.

## 8. Sandbox Odeme Testleri

Her testte:

1. Test kullanicisi ile login ol.
2. `/pricing` sayfasina git.
3. Paket sec.
4. Paddle checkout aciliyor mu kontrol et.
5. Sandbox test karti ile odemeyi tamamla.
6. Basari sayfasina donusu kontrol et.
7. Supabase kayitlarini kontrol et.

Test matrisi:

- [ ] Starter Monthly checkout testi.
- [ ] Starter Yearly checkout testi.
- [ ] Professional 99 Monthly checkout testi.
- [ ] Professional 99 Yearly checkout testi.
- [ ] Professional 149 Monthly checkout testi.
- [ ] Professional 149 Yearly checkout testi.
- [ ] Professional 199 Monthly checkout testi.
- [ ] Professional 199 Yearly checkout testi.

Her test icin beklenen:

- [ ] Paddle transaction completed.
- [ ] Webhook geldi.
- [ ] `paddle_webhook_events` kaydi olustu.
- [ ] `user_subscriptions` dogru plana guncellendi.
- [ ] Kullanici yeni limitlerle islem yapabiliyor.

## 9. Limit / Kota Testleri

### 9.1 Free

- [ ] Free kullanici otomatik free subscription aliyor.
- [ ] Nova mesaj limiti calisiyor.
- [ ] Dokuman olusturma limiti calisiyor.
- [ ] Risk analizi limiti calisiyor.
- [ ] Olay analizi ve egitim slayti kapali/limit 0 olarak davraniyor.

### 9.2 Starter

- [ ] Starter kullanici daha yuksek kota aliyor.
- [ ] Training slide limiti 0 ise UI/Backend bunu dogru engelliyor.
- [ ] Export limiti calisiyor.

### 9.3 Professional Paketler

- [ ] Professional 99 limitleri dogru.
- [ ] Professional 149 limitleri dogru.
- [ ] Professional 199 limitleri dogru.
- [ ] Paket yukseltme sonrasi yeni limitler uygulanmaya basliyor.
- [ ] Aylik kullanim `subscription_usage` tablosunda dogru artiyor.
- [ ] Ayni ay tekrar kullanim mevcut sayacin uzerine ekleniyor.

## 10. Guvenlik ve Sızıntı Kontrolü

- [ ] API key repo icinde commitlenmedi.
- [ ] API key frontend'e expose edilmiyor.
- [ ] Sadece `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` public.
- [ ] Webhook signature olmadan gelen istek reddediliyor.
- [ ] Ayni `event_id` ikinci kez islenmiyor.
- [ ] Plan key sadece trusted backend/webhook tarafinda set ediliyor.
- [ ] Kullanici client tarafindan farkli plan gonderse bile backend price ID ile dogruluyor.
- [ ] Direkt API istegiyle limit bypass edilemiyor.
- [ ] OSGB/Kurumsal checkout'a zorlanamiyor.

## 11. Vercel Deploy ve Dogrulama

- [ ] Vercel env degiskenleri eklendi.
- [ ] Production redeploy baslatildi.
- [ ] Deployment status `Ready`.
- [ ] `/pricing` production'da aciliyor.
- [ ] `/api/billing/checkout` production'da env hatasi vermiyor.
- [ ] Paddle checkout production domaininden aciliyor.
- [ ] Webhook URL Paddle tarafinda dogrulanabiliyor.
- [ ] Deploy sonrasi Vercel function loglarinda kritik hata yok.

## 12. Live Mode'a Gecis

Sandbox tamamen basarili olduktan sonra:

- [ ] Paddle live mode business verification tamamlandi.
- [ ] Live product olusturuldu.
- [ ] Live monthly price'lar olusturuldu.
- [ ] Live yearly price'lar olusturuldu.
- [ ] Live API key olusturuldu.
- [ ] Live client-side token olusturuldu.
- [ ] Live webhook destination olusturuldu.
- [ ] Live webhook secret alindi.
- [ ] Supabase planlarina live price ID'leri islenecek mi karar verildi.
- [ ] Vercel env'leri live degerlerle guncellendi.
- [ ] `PADDLE_ENV=production` yapildi.
- [ ] Production redeploy yapildi.
- [ ] Kucuk gercek odeme testi yapildi.
- [ ] Gercek odeme sonrasi abonelik aktivasyonu dogrulandi.

## 13. Payout ve Muhasebe

- [ ] Paddle business account bilgileri tamamlandi.
- [ ] Vergi / sirket bilgileri tamamlandi.
- [ ] Banka hesabi eklendi.
- [ ] IBAN / SWIFT bilgileri kontrol edildi.
- [ ] Payout currency secildi.
- [ ] Minimum payout esigi not edildi.
- [ ] Muhasebeciye Paddle Merchant of Record modeli anlatildi.
- [ ] Paddle invoice / reverse invoice dokumanlari nereden indirilecek belirlendi.

## 14. Operasyon Notlari

- [ ] Sandbox API key son kullanma tarihi not edildi: `27 Temmuz 2026`.
- [ ] Live API key icin rotasyon takvimi belirlendi.
- [ ] Webhook failure durumunda kontrol edilecek tablo: `paddle_webhook_events`.
- [ ] Kullanici odedi ama paket aktif olmadi senaryosu icin manuel kontrol adimlari yazilacak.
- [ ] Iade / iptal / pause / resume senaryolari test edilecek.

## 15. Siradaki Hemen Yapilacaklar

Bu noktadan sonra adim adim ilerleme sirasi:

- [ ] Vercel production env'lerine Paddle degiskenlerini ekle.
- [ ] Paddle webhook destination olustur.
- [ ] Webhook secret'i Vercel'e ekle.
- [ ] Production redeploy yap.
- [ ] `/pricing` sayfasini production'da ac.
- [ ] Starter Monthly sandbox checkout testi yap.
- [ ] Webhook eventinin Supabase'e dustugunu kontrol et.
- [ ] Kullanici aboneliginin aktif oldugunu kontrol et.
- [ ] Limit/kota testlerini yap.
- [ ] Tum paketler icin checkout testlerini tamamla.
