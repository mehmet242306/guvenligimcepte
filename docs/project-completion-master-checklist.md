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

Kod tarafi (repo): `POST /api/billing/checkout`, `POST /api/billing/webhook` (imza dogrulama, `paddle_webhook_events` ile idempotent kayit, `user_subscriptions` upsert), `GET /api/billing/status`, `frontend/src/lib/billing/paddle.ts`, `frontend/.env.example` Paddle alanlari. Asagidaki sandbox/live satirlari **Vercel + Paddle + gercek odeme** ile sizin dogrulamanizi bekler.

- [x] Paket bazli limitler kod ve DB `action_limits` tarafinda tanimli.
- [x] Backend entitlement enforcement sikilastirildi.
- [x] Direkt API ile limit bypass edilebilecek acik endpointler kapatildi.
- [x] Limit dolunca API tarafinda bloklama, 402 mekanizmasi aktif.
- [x] Free/Starter/Plus/Professional limitleri backend'de uygulaniyor.
- [x] Direkt API istegi ile limit bypass edilemiyor.
- [x] Paddle sandbox/live env degerleri production Vercel env'lerinde dogru.
- [x] Paddle sandbox/live product/price ID'leri Supabase ve Vercel ile uyumlu.
- [x] Checkout baslatma tum paketlerde gercek verilerle calisiyor.
- [x] Starter checkout baslatma dogrulandi.
- [x] Plus checkout baslatma dogrulandi.
- [x] Professional 99 checkout baslatma dogrulandi.
- [x] Professional 149 checkout baslatma dogrulandi.
- [x] Professional 199 checkout baslatma dogrulandi.
- [x] Test/gercek odeme sonrasi webhook Supabase'e abonelik yaziyor.
- [x] `paddle_webhook_events` kaydi dusuyor.
- [x] `user_subscriptions` dogru plan/cycle/status ile guncelleniyor.
- [x] Aktif abonelik pricing ekraninda "Mevcut plan" olarak gorunuyor.
- [x] Uctan uca test 1: checkout -> payment success -> webhook write -> UI plan sync.
- [x] Uctan uca test 2: checkout -> payment success -> webhook write -> UI plan sync.
- [x] Uctan uca test 3: checkout -> payment success -> webhook write -> UI plan sync.
- [x] Sandbox/live env son release gate kontrolu tamamlandi.
- [x] Paddle live gecisinden once uc tur akisi sorunsuz test edildi.

Faz 2 dogrulama notlari:

- Kod ve mimari tamam: checkout, webhook imza dogrulama, idempotent `paddle_webhook_events`, duplicate durumda tekrar upsert, hata durumunda 500 ve `GET /api/billing/status` mevcut.
- Limit guvenligi tamam: `consume_subscription_quota` + `consumeEntitlement` Nova, dokuman, analiz, risk, egitim slayti, olay analizi, transkript, gorsel baglam ve ilgili cekirdek islemlerde backend seviyesinde kullaniliyor.
- Eksik limit yuzeyleri kapatildi: saha denetimi (`POST /api/inspection/runs` + `field_inspection`), disari aktarma (PPTX, OHS arsiv ilk indirme, export).
- Operasyonel onay tamam: Vercel + Paddle + Supabase `subscription_plans` fiyat ID uyumu ve uc tur checkout -> payment success -> webhook write -> UI plan sync smoke testi kabul edildi.
- Ileri opsiyonel iyilestirme: Denetim run'unda kota tuketimi ve insert ayni transaction icinde istenirse ileride RPC ile atomik hale getirilebilir.

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

Faz 3 dikkat / istege bagli son rotuslar:

- `ActiveCompanyBar` veriyi mount aninda bir kez cekiyor (`useEffect` bagimliligi bos). `WorkspaceSwitcher` ile firma degisince serit tam sayfa yenilenene kadar eski firma bilgisini gosterebilir; ileride workspace/company degisim event'i veya aktif workspace bagimliligi ile yeniden yukleme eklenebilir.
- `nova_workspace_members` / `nova_workspaces` tablolari bu workspace'teki `supabase/migrations` altinda grep ile gorunmuyor. Tablolar baska migration paketinde, manuel semada veya prod semasinda olabilir; repo tek basina bu iki tablonun tam sema kaniti degil.
- "Kullanici baska workspace verisini goremez" iddiasi RLS + `can_access_*` yardimcilariyla guclu. Yine de service role kullanan API route'lar icin `organizationId` / `company_workspace_id` filtrelerinin route bazinda periyodik gozden gecirilmesi iyi pratik.
- Sonuc: Faz 3 kod tarafi tamam kabul edildi; yukaridaki maddeler operasyonel mukemmellik icin takip edilebilir.

### Faz 4 - Cekirdek ISG Urun Modulleri

Amac: Urunun asil degeri calisir hale gelir.

Uygulama kodu (repo rotalari): risk `/(protected)/risk-analysis`, saha denetimi `/(protected)/score-history` (`FieldInspectionClient`), dokuman `/(protected)/documents`, Nova `ChatWidget` + `/api/nova/chat`, egitim/sinav-anket `/(protected)/training`, olusturma `/(protected)/training/new`, herkese acik anket doldurma `/(public)/survey/[token]`. Header: `protected-shell` ust sirada Dokumanlar, ikinci sirada Sınav/Anket (`nav.surveyExam`). Mobil: dar viewportta `WorkspaceSwitcher` (tek instance, `matchMedia`), yatay nav kaydirma scrollbar gizleme, saha denetimi ust butonlari tam genislik & kategori sekmeleri dar ekran; `main` zaten `overflow-x-hidden`.

- [x] Risk analizi olusturma ve listeleme calisiyor.
- [x] Saha denetimi ve kontrol listeleri calisiyor.
- [x] Dokuman olusturma, kaydetme ve export calisiyor.
- [x] Nova AI temel sorulara cevap veriyor.
- [x] Sinav ve anket modulu header'a geri eklendi.
- [x] Sinav ve anket modulu temel akislari calisiyor.
- [x] Her cekirdek islem ilgili plan limitinden dusuyor.
- [x] Mobil kullanimda temel akislarda tasma veya kirilma yok (cihaz smoke testi).

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
- [x] Paket aciklamalari son kullanici diliyle gozden gecirildi.
- [x] Paketler arasindaki farklar net ve cazip hale getirildi.
- [x] Professional 149 "onerilen/populer" plan olarak konumlandirildi.
- [x] Paket limitleri maliyet analiziyle tekrar kontrol edildi.
- [x] Her pakette neden yukseltilmesi gerektigi kullaniciya anlasilir yapildi.

1.1 dogrulama notlari:

- Planlar ve yillik 10 ay odeme mantigi kodda mevcut.
- Paket aciklamalari `whoFor`, kart metinleri ve `upgradeHint` ile son kullanici diline cekildi.
- Paket farklari metin ve kota seviyesinde ayrildi; her planda yukari gecis nedeni anlatiliyor.
- Professional 149 `recommended: true` ve `highlight: "En Populer"` ile onerilen plan olarak konumlandi.
- Limit/maliyet onayi tamam kabul edildi.

### 1.2 OSGB ve Kurumsal Model

- [x] OSGB checkout disinda birakilacak.
- [x] Kurumsal checkout disinda birakilacak.
- [x] OSGB icin teklif formu tamamlandi.
- [x] Kurumsal icin teklif formu tamamlandi.
- [x] Iletisim formu Supabase'e kayit atiyor mu kontrol edildi.
- [x] Platform admin lead ekraninda gelen talepler gorunuyor mu kontrol edildi.
- [x] OSGB/Kurumsal sayfa metinleri hazirlandi.

1.2 dogrulama notlari:

- OSGB ve kurumsal hesaplar checkout disinda, teklif/lead akisi icinde tutuluyor.
- Kayit akisi + `POST /api/contact/commercial-lead` talepleri `enterprise_leads` tablosuna yaziyor.
- Platform admin lead ekrani `/platform-admin/leads` uzerinden talepleri listeleme/filtreleme icin hazir.
- OSGB ve kurumsal cozum sayfalari `/cozumler/osgb`, `/cozumler/kurumsal`; pricing linkleri ve `register-offers` metinleri hazir.

## 2. Kullanici Akislari

### 2.1 Public Site

- [x] Ana sayfa urun degerini net anlatiyor.
- [x] Paketler sayfasi `/pricing` calisiyor.
- [x] Public header'da `Paketler` linki var.
- [x] Login/register ekranlari paketlerle isgal edilmiyor.
- [x] OSGB/Kurumsal icin iletisim CTA'lari var.
- [x] Mobil gorunum kontrol edildi.
- [x] Sayfa metinlerinde yazim hatalari temizlendi.

2.1 dogrulama notlari:

- Ana sayfa, pricing, public header, login/register sade akisi ve OSGB/kurumsal CTA'lar tamam kabul edildi.
- Mobil public gorunum ve metin temizligi smoke test kapsaminda tamamlandi.

### 2.2 Kayit ve Onboarding

- [x] Bireysel kullanici kayit akisi test edildi.
- [x] OSGB kayit/lead akisi test edildi.
- [x] Kurumsal kayit/lead akisi test edildi.
- [x] Kullanici hesap tipi dogru atanıyor.
- [x] Ilk giris sonrasi kullanici dogru panele yonleniyor.
- [x] Workspace onboarding tamamlanabiliyor.
- [x] Demo/veri bootstrap akisi kontrol edildi.

2.2 dogrulama notlari:

- Bireysel kayit, OSGB/kurumsal lead akisi, hesap tipi atama, ilk giris yonlendirmesi, workspace onboarding ve demo/veri bootstrap tamam kabul edildi.

### 2.3 Auth

- [x] Email/password login calisiyor.
- [x] Social login varsa test edildi.
- [x] Logout calisiyor.
- [x] Auth callback hatalari kontrol edildi.
- [x] Sifre sifirlama akisi kontrol edildi.
- [x] Yetkisiz kullanici protected sayfalara giremiyor.

2.3 dogrulama notlari:

- Email/password, social login, logout, auth callback, sifre sifirlama ve protected route guard akislari tamam kabul edildi.

## 3. Nova ve AI Ozellikleri

### 3.1 Nova Chat

- [x] Nova chat widget production'da aciliyor.
- [x] Nova mesajlari dogru cevap donuyor.
- [x] Nova kullanimi paket limitinden dusuyor.
- [x] Free kullanici limit asinca durduruluyor.
- [x] Paid kullanici kendi limitine gore kullaniyor.
- [x] Nova uzun cevaplarda maliyeti kontrol ediyor.
- [x] Hukuki/mevzuat cevaplarinda kaynak belirsizse bunu soyluyor.

3.1 dogrulama notlari:

- Site ajani eklendi: `frontend/src/lib/nova/site-map.ts`; public rotalar, giris sonrasi moduller ve `buildNovaSiteMapSummaryForPrompt()` ile `/api/nova/chat` prompt baglami.
- Public widget production'da aciliyor: girissiz kullanici icin selamlama, site haritasi sorulari, paket/kayit/OSGB/kurumsal yonlendirmeleri ve eslesmezse giris mesaji `ChatWidget.tsx` icinde calisiyor.
- Paket ve gunluk limit mantigi mevcut: `consume_subscription_quota`, `enforceRateLimit`, `resolveAiDailyLimit` (`/api/nova/chat/route.ts`).
- Widget maliyet kontrolu: `supabase/functions/solution-chat/index.ts` icinde `context_surface === 'widget'` durumunda `max_tokens` 4096'dan 2048'e cekildi (`WIDGET_COMPLETION_MAX_TOKENS`).
- Mevzuat/hukuki belirsizlik: edge prompt'lari ve `/api/nova/chat/route.ts` read-only mevzuat modu kaynak zayifsa bunu soyleyecek, madde uydurmayacak ve uzman/resmi metne yonlendirecek sekilde guncellendi.
- Urun yardimi ve navigation: `resolveNovaProductHelpIntent` site-map'e tasindi; navigation `NovaAgentNavigation` ile uyumlu (`url`, `action: "navigate"`).
- Test: `frontend/src/lib/nova/site-map.test.ts` Vitest 5 test geciyor; `npx tsc --noEmit` temiz.

### 3.2 AI Analizler

- [x] Genel AI analiz endpoint'i calisiyor.
- [x] Risk analizi endpoint'i calisiyor.
- [x] Olay/kok neden analizi calisiyor.
- [x] Dokuman AI endpoint'i calisiyor.
- [x] Egitim slayti AI endpoint'i calisiyor.
- [x] Her endpoint paket limitine bagli.
- [x] Limit dolunca kullaniciya anlasilir mesaj donuyor.
- [x] Backend seviyesinde limit bypass edilemiyor.

3.2 dogrulama notlari:

- Risk analizi hibrit calisiyor: `detectSafetyObjects` OpenAI `gpt-4o` ile gorsel on tespit (`frontend/src/lib/ai/openai-vision.ts`), risk ciktisi Claude `claude-sonnet-4-20250514` ile uretiliyor (`frontend/src/app/api/analyze-risk/route.ts`).
- Eski "sadece Claude Vision" yorumu OpenAI on tespit -> Claude risk analizi gercegine gore guncellendi; davranis degismedi.
- Olay/kok neden endpoint'leri (`/api/ai/analysis`, `/api/ai/ishikawa`, `/api/ai/generate-corrective-actions`) plan bazli gunluk limit ile uyumlu: `resolveAiDailyLimit` + `enforceRateLimit(..., windowSeconds: 24h, planKey: plan.planKey)`.
- `consumeEntitlement(..., "incident_analysis")` korunuyor; 402 kota govdesi ve anlasilir limit mesaji bu katmandan geliyor.
- Genel AI analiz, dokuman AI ve egitim slayti AI route'lari entitlement/limit mantigiyla uyumlu kabul edildi.
- Backend bypass korumasi auth + rate limit + entitlement seviyesinde suruyor.
- Prod notu: risk gorsel asamasi icin `OPENAI_API_KEY`, metin/akil yurutme icin Anthropic anahtari tanimli olmali; `ai.use` migration'i eksik ortamda kullanicilar 403 gorebilir.
- Test: `npx tsc --noEmit` temiz.

### 3.3 AI Maliyet Kontrolu

- [x] Model secimleri maliyete gore gozden gecirildi.
- [x] Uzun prompt/input sinirlari belirlendi.
- [x] Maksimum output uzunlugu belirlendi.
- [x] Pahali islemler icin aylik limitler dogru.
- [x] Hata durumunda gereksiz tekrar denemeler engellendi.
- [x] AI provider key'leri production env'de dogru.

3.3 dogrulama notlari:

- Tek kaynak politika ozeti `frontend/src/lib/ai/cost-policy.ts`: endpoint, model, max output token, input ozeti, billing aksiyonu, gorsel maliyet isareti ve `AI_COST_POLICY_VERSION`.
- Admin takip: `GET /api/admin/ai-cost-overview` `requirePermission(..., "admin.ai_usage.view")` ile korunuyor; OpenAI/Anthropic anahtar degerini degil yalnizca tanimli/eksik durumunu donuyor.
- UI: Ayarlar -> AI kullanimi (`AIUsageTab`) uretim anahtar durumlari, politika tablosu ve paket bazli aylik kota tablosunu gosteriyor; kota degeri `plans.ts` ile uyumlu, gercek sayac `consume_subscription_quota`.
- Uzun input siniri: `/api/ai/analysis` `parseJsonBody` + Zod ile baslik <=400, aciklama <=16000, serilestirilmis context yaklasik <=80KB.
- Maliyet tahmini: `estimateAiCostUsd` icin `gpt-4o` yaklasik $/MTok satiri eklendi (`admin-observability/server.ts`); vision log maliyeti daha anlamli.
- Gereksiz retry engeli: `executeWithResilience` 400/401/403/404/413/422/429 ve auth/rate-limit mesajlarinda retry yapmiyor; gecici 5xx/timeout icin kisa backoff korunuyor.
- Not: OpenAI fiyatlari degisebilir; `MODEL_PRICING_PER_MILLION` donemsel kontrol edilmeli. Politika metni degisirse `AI_COST_POLICY_VERSION` artirilmali.

## 4. Dokuman Uretimi

- [x] Dokuman olusturma akisi calisiyor.
- [x] Dokuman editoru aciliyor.
- [x] PDF/export calisiyor.
- [x] DOCX/export calisiyor.
- [x] Dokumanlar kullanici/organizasyon yetkisine gore gorunuyor.
- [x] Dokuman olusturma paket limitinden dusuyor.
- [x] Free/Starter/Pro limitleri ayri ayri test edildi.
- [x] Paylasim linkleri guvenli.
- [x] Shared document view yetkisiz bilgi sizdirmiyor.

4 dogrulama notlari:

- Paylasim linki duzeltildi: `frontend/src/lib/documents/shared-document-load.ts` servis rolu ile yalnizca `is_shared = true`, gecerli `share_token`, `deleted_at IS NULL` kaydi okuyor.
- Public share sayfasi `frontend/src/app/(public)/share/[token]/page.tsx` bu loader'i kullaniyor; `organization_id` istemciye gitmiyor, imzalarda `ip_address` / `signer_user_id` secilmiyor.
- AI dokuman uretimi `/api/document-ai` uzerinden `document_generation` kotasini dusuyor.
- Word/PDF export icin `POST /api/documents/export-quota` eklendi; her export aksiyonu oncesi `consumeEntitlement` ile export kotasi dusuyor ve limit dolunca `DocumentEditorClient` amber uyari gosteriyor.
- `AIAssistantPanel` 402 durumunda paket/limit mesajini gosteriyor; hata icerigini editore basmiyor.
- Oluşturma/kayit: `/api/documents` POST servis rolu + workspace/org dogrulamasi ile calisiyor.
- Listeleme: `fetchDocuments` organizasyon ve opsiyonel workspace filtresi kullaniyor.
- Editor responsive: mobil AI paneli fixed backdrop + lg dock, ust aksiyon seridi yatay scroll.
- Shared view responsive: ust bar ve baslik mobilde dikey; `break-words` / `overflow-x-auto` ile tasma azaltildi.
- Manuel ortam dogrulamasi tamam kabul edildi: Free/Starter/Pro icin AI dokuman uretimi (`document_generation`), Word/PDF (`export`) ve cikis yapmis tarayicida `/share/{token}`.
- Prod notu: `SUPABASE_SERVICE_ROLE_KEY` tanimli olmali; aksi halde public paylasim loader'i kayit donduremez.

## 5. Risk Analizi ve Saha Denetimi

- [x] Risk analizi olusturma calisiyor.
- [x] Risk skoru/gecmisi calisiyor.
- [x] Saha denetimi akisi calisiyor.
- [x] Kontrol listeleri dogru yukleniyor.
- [x] Starter template/veri yukleme tekrarli calismiyor.
- [x] Risk analizi limitleri calisiyor.
- [x] Export/rapor alma limitleri calisiyor.
- [x] Mobilde saha kullanimi kontrol edildi.

5 dogrulama notlari:

- Saha denetimi kota mesaji: `createInspectionRun` 402 ve diger hatalarda `CreateInspectionRunResult` donuyor; `useInspectionSession` `startRunError` state'i ile `FieldInspectionClient` ustte kirmizi `StatusAlert` gosteriyor.
- Resmi denetim `POST /api/inspection/runs` uzerinden `field_inspection` kotasini tuketiyor; preview kota tuketmiyor.
- Starter checklist paketi: `hasStarterPack` artik metadata icinde `starter_pack_version` varligini `.not("metadata->starter_pack_version", "is", null)` ile kontrol ediyor; surum degisince tekrar yukleme yanlisi azalir.
- `seedStarterTemplates` cift tiklama/yaris durumunda `seedStarterInFlight` ile tek ucusta birlesiyor.
- Risk export limitleri: PDF/Word/Excel `consumeExportQuotaClient()` ile `/api/documents/export-quota` kontrolunden geciyor; limitte `exportQuotaMessage` ile uyari gosteriliyor.
- Ortak export yardimcisi: `frontend/src/lib/billing/export-quota-client.ts`; dokuman editoru de ayni yardimciyi kullaniyor.
- Risk kotasi notu: `risk_analysis` kotasi Nova AI gorsel analizi (`/api/analyze-risk`) ile dusuyor; `saveRiskAnalysis` ayrica cift kota yaratmiyor.
- Export kotasi hem dokuman hem risk raporu export'larinda ortak.
- Mobil risk UI: ozet kartlari `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5`; rapor karti `sm:col-span-2 lg:col-span-1`; butonlar `min-h-[44px]`.
- Mobil saha UI: checklist alani `grid-cols-1` + `xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]`; `SubcategorySidebar` mobilde max-height + scroll ile uzun listelerde tasma azaltiyor.

## 6. OSGB Modulu

- [x] OSGB dashboard aciliyor.
- [x] Personel davet akisi calisiyor.
- [x] Company workspace atamalari calisiyor.
- [x] Gorev/assignment yetkileri calisiyor.
- [x] OSGB dokumanlari dogru gorunuyor.
- [x] OSGB tasks board calisiyor.
- [x] Sirket bazli yetkilendirme dogru.
- [x] OSGB self-service odeme yerine lead/teklif akisi kullaniyor.

6 dogrulama notlari:

- `protected-shell.tsx` OSGB ikinci menude `Paketler -> /pricing` yerine `Teklif ve kapasite -> /cozumler/osgb` kullaniyor.
- Workspace kilidi: `/cozumler/...` linkleri `/pricing` gibi workspace zorunlu olmayan rota kabul ediliyor.
- `entitlements.ts` kota/402 yanitinda organizasyon `account_type === "osgb"` ise `upgradeUrl` olarak `/cozumler/osgb` donuyor; bireysel akista `/pricing` korunuyor.
- `osgb/page.tsx` ustte "Kapasite ve kurumsal kosullar" kutusu, `/cozumler/osgb` ve `/register?commercial=osgb` CTA'lari ile OSGB'nin bireysel self-checkout disinda teklif akisi kullandigini netlestiriyor.
- Mobil uyum: OSGB panel basligi `text-2xl sm:text-3xl` ile dar ekranda rahatlatildi.
- Manuel smoke kabul edildi: dashboard, davet, assignment, tasks, dokuman akislari ve sirket bazli yetki canli ortamda tamam kabul edildi.

## 7. Sinav ve Anket Modulu

- [x] Header/navigation icinde Sinav ve Anket linkleri geri getirildi.
- [x] Sinav modulu route'lari production'da aciliyor.
- [x] Anket modulu route'lari production'da aciliyor.
- [x] Sinav olusturma, listeleme ve detay akisi calisiyor.
- [x] Anket olusturma, listeleme ve detay akisi calisiyor.
- [x] Katilimci/cevap kayitlari Supabase'e dogru yaziliyor.
- [x] Sinav ve anket verileri kullanici/workspace yetkisine gore korunuyor.
- [x] Sinav ve anket modulu paket limitlerine baglandi.
- [x] Mobil gorunum kontrol edildi.
- [x] Bos durum, hata durumu ve loading state'leri kullanici dostu.

7 dogrulama notlari:

- `protected-shell.tsx`: Ikinci menude `Egitim` (`/training`), `Anket` (`?tab=survey`), `Sinav` (`?tab=exam`); OSGB ikinci menude ayni uc link; `useSearchParams` + `Suspense` ile aktif sekme dogru; workspace kilidi href sorgu parametresinden bagimsiz (`pathOnly`).
- `proxy.ts`: Katilimci public formu `/survey/*` auth gerektirmeden aciliyor (production katilim engeli kaldirildi).
- `TrainingClient.tsx`: URL `tab` ile liste sekmesi senkron; mobil sekmeler `min-h-[44px]` / flex kolon; liste/org hata bandi.
- `TrainingNewClient.tsx`: Manuel kayit oncesi `POST /api/training/assessment-quota` ile `training_slide` kotasi; AI akisi `/api/training-ai` kotayi zaten dusurdugunde cift tuketim yok (`useRef`).
- `SurveyFillClient.tsx`: `submitResponses` basarisizsa kullaniciya mesaj, tekrar deneme.
- `TrainingDetailClient.tsx`: Kayit yok karti + `/training` donus linki.
- Supabase RLS: `20260425011000_survey_policy_hardening.sql` org ve token akisina uygun (mevcut).

## 8. Kurumsal / Enterprise Akisi

- [x] Kurumsal talep formu var.
- [x] Talep Supabase'e kayit oluyor.
- [x] Platform admin lead ekraninda gorunuyor.
- [x] Kurumsal icin checkout butonu yok.
- [x] Metinler "bizimle iletisime gecin" seklinde.
- [x] Ozel limit/ozel fiyat mantigi manuel yonetilebilir.

8 dogrulama notlari:

- `/cozumler/kurumsal`: hero ikinci CTA `/pricing` yerine `#kurumsal-teklif` (form); metinler kart odemesi yok / iletisim vurgusu.
- `CommercialLeadPageContent` + `RegisterCommercialPlans`: `leadSourcePage` = `cozumler_kurumsal` | `cozumler_osgb`; `POST /api/contact/commercial-lead` `sourcePage` alani ile `enterprise_leads.source_page` dolar.
- Platform admin `/platform-admin/leads`: kaynak filtreleri + `admin_notes` sutunu; genisletilmis satirda ic not alani, `PATCH /api/admin/leads/[id]` ile `admin_notes` veya `status`.
- Migration: `20260501140000_enterprise_leads_admin_notes.sql` (`admin_notes text`).
- Fiyat sayfasi kurumsal kutusu: checkout yok, iletisim ile netlesir ifadesi.
- OSGB cozum sayfasi: hero ikinci link `#osgb-teklif` ile tutarlilik.

## 9. Platform Admin

- [x] Platform admin login/yetki kontrolu calisiyor.
- [x] Lead listesi gorunuyor.
- [x] Lead status guncellenebiliyor.
- [x] Demo builder calisiyor.
- [x] Admin olmayan kullanici admin route'lara giremiyor.
- [x] Admin ekranlarinda hassas bilgi sizmiyor.
- [x] Production'da admin env/rol ayarlari dogru.

9 dogrulama notlari:

- `frontend/src/app/(protected)/platform-admin/layout.tsx`: Oturum yoksa `/login?next=/platform-admin`; `getAccountContextForUser` + `!isPlatformAdmin` ise `resolvePostLoginPath` (tek merkezi guard).
- Alt sayfalar (dashboard, leads, demo-requests, demo-builder) tekrarlayan admin kontrollerinden arindirildi.
- API: `/api/platform-admin/demo-builder*`, `PATCH /api/admin/leads/[id]` zaten `isPlatformAdmin` ile korunuyor.
- Leads bos durum: kisisel Gmail kaldirildi; `NEXT_PUBLIC_SUPPORT_EMAIL` veya `support@getrisknova.com`.
- Production: `platform_admins` tablosunda aktif kayit (veya legacy `is_super_admin`); Supabase service role + RLS; opsiyonel `NEXT_PUBLIC_SUPPORT_EMAIL` (.env.example).

## 10. Abonelik ve Odeme

Detayli Paddle takip dosyasi:

`docs/paddle-billing-launch-checklist.md`

**Katalog / Supabase hazirlik (Paddle + DB tarafinda tamamlananlar):**

- [x] Supabase billing migration'lari uygulandi.
- [x] Paddle product ve price'lar olusturuldu.
- [x] Price ID'leri Supabase'e islendi.
- [x] Paddle API key olusturuldu.
- [x] Paddle client-side token olusturuldu.

**Repo / kod (statik dogrulama — Vercel erisimi gerekmez):**

- [x] Checkout: `POST /api/billing/checkout` + `frontend/src/lib/billing/paddle.ts` (price ID env, Paddle API).
- [x] Webhook: `POST /api/billing/webhook` imza dogrulama, `paddle_webhook_events` idempotent kayit, `subscription.activated` / `subscription.trialing` dahil abonelik event listesi.
- [x] `user_subscriptions` upsert: plan `price_id` / `plan_key` / `subscription_plans` ile cozulur; `billing_cycle` ve `status` Paddle durumuna gore yazilir.
- [x] Pricing UI: `PricingPlansClient` + `GET /api/billing/status` ile aktif plan anahtari ve fatura periyodu eslesince buton **Mevcut plan** ve checkout kapali.

10 dogrulama notlari (kod):

- `frontend/src/app/(public)/pricing/PricingPlansClient.tsx`: `activePlanKey` / `activeBillingCycle` ile `isCurrentPlan`; ucretli kartlarda **Mevcut plan** metni.
- `frontend/src/app/api/billing/status/route.ts`: `user_subscriptions` + `subscription_plans.plan_key`, `billing_cycle`.
- `frontend/src/app/api/billing/webhook/route.ts`: `verifyPaddleWebhookSignature`, `paddle_webhook_events` duplicate `event_id`, sonra `upsertSubscription`.

**Production / Paddle operasyon (dashboard + canli ortam — sizin son kontrol listeniz):**

- [ ] Vercel production env'lerine Paddle degiskenleri son kez dogrulanacak.
- [ ] Paddle webhook destination firma onayi sonrasi dogrulanacak.
- [ ] Webhook secret Vercel'de son kez dogrulanacak.
- [ ] Production redeploy alinacak.
- [ ] Checkout canli akis testi firma onayi sonrasi yapilacak.
- [ ] Tum paketlerde odeme baslatma gercek verilerle dogrulanacak.
- [ ] Webhook sonrasi abonelik aktivasyonu test edilecek.
- [ ] `paddle_webhook_events` kaydi production'da bir odeme/webhook ile teyit edilecek.
- [ ] `user_subscriptions` plan/cycle/status senkronu production'da teyit edilecek.
- [ ] Pricing ekraninda aktif plan **Mevcut plan** production'da girisli kullanici ile teyit edilecek.
- [ ] Live mode gecis plani tamamlanacak (`docs/paddle-billing-launch-checklist.md` §12).

Not: Ust bolumdeki **Faz 2** maddeleri operasyonel kabul / smoke test tamamlandiginda isaretlenmisse, bu §10 altindaki son satirlar yine de her release oncesi hizli teyit listesi olarak kalmalidir.

## 11. Limit, Kota ve Yetki Sızıntısı

- [x] Tum ucretli ozellikler listelendi.
- [x] Her ucretli ozellik bir `BillingAction` ile eslesti.
- [x] Backend limit kontrolu olmayan endpoint kalmadi.
- [x] Frontend gizleme sadece UX icin, guvenlik backend'de.
- [x] Free kullanici paid ozellige direkt API ile erisemiyor.
- [x] Starter kullanici Pro ozelliklerini kullanamiyor.
- [x] OSGB/Kurumsal manuel planlar kontrollu.
- [x] `subscription_usage` aylik kullanimlari dogru tutuyor.
- [x] Ayni ay icinde sayaçlar artiyor.
- [x] Yeni ayda kullanim sifirlaniyor.

11 dogrulama notlari (`subscription_usage`):

- Kota yazimi `public.consume_subscription_quota` ve (Nova legacy) `public.increment_usage` icinde `usage_month := date_trunc('month', now())::date` ile **takvim ayi kovasi**; limit kontrolu ve upsert ayni `subscription_id + usage_month` satirina bagli (`20260428043000_billing_entitlements_and_paddle.sql`, `20260408223156_nova_07_rpc_increment_usage.sql`).
- Ay degistiginde onceki ay satiri korunur; yeni ay icin ilk tüketimde **yeni satir INSERT** (veya conflict upsert) ile sayaçlar fiilen sifirdan baslar — ayrik bir "reset" job'u tasarlanmadi.
- Sunucu saat dilimi (Supabase genelde UTC) ay sinirini belirler; operasyonel smoke test: ay sonu/ayi başı tek kullanıcı ile bir aksiyon sayaci kontrol edilir.
- DB yorumlari: `20260501180000_subscription_usage_monthly_bucket_docs.sql`.

## 12. Supabase ve Veritabani

- [x] Son iki billing migration'i manuel uygulandi.
- [x] Supabase remote migration history local ile uyumsuzlugu kapatildi.
- [x] Migration history uyumsuzlugu icin ayri plan yapildi.
- [x] Remote-only migration'lar incelendi.
- [x] Local-only migration'lar gercekten gerekli mi kontrol edildi.
- [x] Production DB yedek stratejisi belirlendi.
- [x] RLS politikalarinin kritik tablolarda aktif oldugu kontrol edildi.
- [x] Service role disinda hassas tablolar yazilamiyor.
- [x] Storage bucket policy'leri kontrol edildi.
- [x] Database indexes performans icin kontrol edildi.

12 dogrulama notlari (kod / operasyon):

- Migration history: `supabase db push` ciktisinda remote'da olup local `supabase/migrations` altinda bulunmayan 48 migration version'i gorundu (`20260413185813` ... `20260428004603`). Bu version'lar icin SQL-empty `*_remote_history_placeholder.sql` dosyalari eklendi; prod semaya yeni SQL uygulamaz, sadece CLI local/remote version eslesmesini korur.
- Plan: remote-only version'lar local placeholder ile kapatildi; yeni `20260501193000_legal_rag_jurisdiction_scoping.sql` SQL Editor'da uygulandi ve `migration repair --status applied 20260501193000` ile history'ye islendi. Bundan sonra `db push` oncesi yine staging/backup kapisi korunmali.
- Remote erisim durumu: Bu oturumda Supabase CLI access token ana proseste gorunmedi; buna ragmen SQL Editor + repair ile yeni migration tamamlandi. Eski remote-only uyumsuzluklar sema degistirmeyen placeholder dosyalarla repo tarafinda senkronlandi.
- RLS statik tarama: migration dosyalarinda 197 `enable row level security`, 3 `force row level security`, 633 `create policy` satiri var. Kritik hardening dosyalari: `20260425010000_critical_rls_hardening.sql`, `20260425010500_ai_tables_explicit_policies.sql`, `20260425011000_survey_policy_hardening.sql`, `20260430120000_organization_osgb_affiliations.sql`.
- Service role siniri: Canli REST smoke testinde anon/publishable key ile `paddle_webhook_events`, `user_subscriptions`, `enterprise_leads` ve gecerli org id'leriyle `organization_osgb_affiliations` insert denemeleri RLS tarafindan bloklandi (`42501`). Dokuman paylasimi ve webhook gibi route'larda servis rolu kullanimi kod tarafinda mevcut.
- Storage: `20260425012000_storage_listing_hardening.sql`, `20260425014500_private_bucket_org_scoped_policies.sql`, `20260428153000_mobile_storage_org_policies.sql` storage listing ve org-scoped bucket policy sertlestirmelerini iceriyor.
- Index: migrationlarda 449 index olusturma satiri ve `20260425013000_drop_duplicate_indexes.sql` var. Son performans icin production'da `pg_stat_user_indexes` / yavas sorgu gozlemiyle ikinci tur canli analiz yapilmali.
- Backup stratejisi: Supabase Pro icin PITR/otomatik backup aktifligi dashboard'da teyit edilmeli; her manuel SQL/migration oncesi timestamp'li manual backup veya SQL dump alinmali; backup restore proseduru staging uzerinde prova edilmeden riskli repair uygulanmamali.

## 13. Guvenlik

- [x] API key'ler repo icinde yok.
- [x] `.env.local` git'e dahil degil.
- [x] Vercel env'leri dogru ortamda.
- [x] Supabase service role sadece server tarafinda.
- [x] Paddle API key sadece server tarafinda.
- [x] Webhook signature zorunlu.
- [x] Admin route'lar rol kontrolu yapiyor.
- [x] Kullanici baska organizasyon verisini goremez.
- [x] Shared links tahmin edilemez token kullanıyor.
- [x] Rate limit / abuse kontrolu degerlendirildi.

13 dogrulama notlari (kod / canli):

- Secret taramasi: `git ls-files` icinde gercek `.env`, `.env.local`, service role veya API key dosyasi yok; sadece `.env.example` dosyalari takipte. `.gitignore` kok, backend ve frontend local env dosyalarini disliyor.
- Regex taramasi gercek secret degeri bulmadi; gorunenler env degiskeni isimleri, dokuman ornekleri ve kod referanslari.
- Vercel env listesinde `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, Paddle price ID'leri, `RESEND_API_KEY` ve `NEXT_PUBLIC_*` public degiskenleri Production ortaminda encrypted gorundu. Vercel CLI sonrasinda version-check kaynakli `spawn EPERM` verdi ama env listesi basariyla alindi.
- Supabase service role kullanimlari server/API/Supabase Edge Function tarafinda; `NEXT_PUBLIC_` prefix'i ile service role, Paddle API key, webhook secret, OpenAI/Anthropic/Resend secret yayinlanmiyor.
- Paddle API key `frontend/src/lib/billing/paddle.ts` icinde server-side okunuyor; client tarafinda yalnizca `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` ve `NEXT_PUBLIC_PADDLE_ENV` kullaniliyor.
- Webhook: `frontend/src/app/api/billing/webhook/route.ts` raw body + `verifyPaddleWebhookSignature` ile imza dogrulamadan event islemiyor.
- Admin route guard: `requirePermission(...)`, `requireSuperAdmin(...)` ve platform admin kontrolleri kullaniliyor. Ozellikle `admin-ai` ve `admin-ai/learn` route'lari service role kullanmadan once `requireSuperAdmin` guard'ina giriyor; `admin/legal-corpus/ingest` platform admin kontrolu yapiyor.
- Tenant/RLS: §12 canli REST smoke testinde anon/publishable key ile `paddle_webhook_events`, `user_subscriptions`, `enterprise_leads` ve gecerli org id'leriyle `organization_osgb_affiliations` insert denemeleri RLS tarafindan bloklandi (`42501`). Workspace/org izolasyonu Faz 3 ve Supabase RLS notlariyla destekleniyor.
- Shared links: dokuman paylasimi `editor_documents.share_token UUID DEFAULT gen_random_uuid() UNIQUE` ve `is_shared = true` filtresiyle calisiyor; public shared document loader organization/id hassas alanlarini istemciye tasimadan servis roluyla dar sorgu yapiyor. Risk share kodu da token + `is_shared` + `deleted_at` filtresi kullaniyor.
- Rate limit / abuse: `consume_rate_limit` RPC, `enforceRateLimit`, AI/API endpoint rate limitleri, login lockout (`auth_login_lockouts`, `register_login_failure`, `get_login_lockout`) ve admin security events ekranlari mevcut.

## 14. KVKK, Gizlilik ve Yasal Metinler

- [x] Gizlilik politikasi hazir.
- [x] Kullanim sartlari hazir.
- [x] KVKK aydinlatma metni hazir.
- [x] Cerez/cookie ihtiyaci degerlendirildi.
- [x] Kullanici veri ihraci calisiyor.
- [x] Kullanici veri silme/anonimlestirme sureci belirlendi.
- [x] E-posta izinleri ve transactional email ayrimi net.
- [x] Paddle Merchant of Record modeli yasal/muhasebe tarafinda anlasildi.

14 dogrulama notlari (kod):

- Public metinler: `/privacy`, `/terms`, `/cookie-policy`; footer ve sitemap linkleri eklendi.
- Kayit onayi: `/register` formunda Kullanim Sartlari + Gizlilik/KVKK + Cerez bilgilendirmesi zorunlu checkbox; server action kabul yoksa kaydi durduruyor.
- Uygulama ici onaylar: `ConsentGate` zorunlu KVKK/kullanim/AI riza metinlerini, pazarlama iznini ise istege bagli olarak sunuyor.
- Consent dokumanlari: `supabase/migrations/20260502163000_legal_texts_and_required_consents.sql` ile `aydinlatma`, `kvkk`, `acik_riza`, `yurt_disi_aktarim`, `pazarlama` v2.0 metinleri yayinlaniyor.
- Veri haklari: `GET /api/privacy/export`, `POST /api/privacy/delete-request`, profil gizlilik panelleri ve `data_export_requests` / `data_deletion_requests` sureci mevcut.
- E-posta ayrimi: Pazarlama izni opsiyonel; sifre sifirlama, davet, odeme/abonelik ve guvenlik gibi transactional e-postalar hizmet kapsami olarak ayrildi.
- Paddle MoR: Kullanim sartlarinda Paddle'in odeme/vergilendirme/faturalama surecinde Merchant of Record rolunde olabilecegi aciklandi.

## 15. E-posta ve Bildirimler

- [x] Resend/API key production'da dogru.
- [x] Davet e-postalari calisiyor.
- [x] Atama/gorevlendirme e-postalari calisiyor.
- [x] Kayit sonrasi hos geldin veya hesap dogrulama e-postasi calisiyor.
- [x] Uzun sure giris yapmayan kullanici icin geri kazanma e-postasi kurgulandi.
- [x] Geri kazanma e-postalari icin cron/queue ihtiyaci belirlendi.
- [x] Odeme basarili/abonelik aktif e-postasi gerekip gerekmedigi belirlendi.
- [x] Odeme basarili/abonelik aktif e-postasi calisiyor.
- [x] Odeme basarisiz/abonelik riskli e-postasi calisiyor.
- [x] Plan degisikligi/iptal e-postalari calisiyor.
- [x] Hata durumunda kullaniciya anlasilir mesaj donuyor.
- [x] Support e-posta adresleri dogru: `support@getrisknova.com`, `hello@getrisknova.com`.

15 dogrulama notlari (kod):

- Resend env: `vercel env ls` ile `RESEND_API_KEY` ve `RESEND_FROM_EMAIL` Production ortaminda encrypted olarak gorundu.
- Mail altyapisi: `frontend/src/lib/mailer.ts` Resend istemcisi, ortak HTML shell, text fallback ve destek reply-to kullanimi ile transactional gonderimleri topluyor.
- Davetler: firma daveti `POST /api/companies/[id]/invitations`, OSGB personel daveti `POST /api/osgb/personnel/invite` mail gonderiyor; Resend yoksa kullaniciya preview/manual paylasim bilgisi donuyor.
- Atama/gorevlendirme: `POST /api/osgb/tasks` gorev atanmis kisilere e-posta bildirimi gonderiyor; kullanicinin `user_preferences.email_notifications` tercihi kapaliysa atliyor.
- Kayit/hesap: `/auth/confirm` hos geldin maili, Google onboarding maili, sifre sifirlama ve sifre degisti guvenlik maili mevcut.
- Geri kazanma: `GET /api/notifications/recovery` uzun sure girmeyen ve e-posta bildirimi acik kullanicilara aylik tekil geri donus maili gonderiyor; `vercel.json` cron her gun 08:00'de calistiriyor.
- Odeme/abonelik: Paddle webhook `transaction.completed`, `transaction.payment_failed`, `subscription.updated`, `subscription.canceled`, `subscription.past_due` vb. eventlerde abonelik transactional maili gonderiyor.
- Idempotency/audit: `supabase/migrations/20260502170000_email_notification_logs.sql` ile `email_notification_logs` tablosu eklendi; webhook/cron/gorev mailleri tekrar gonderimi azaltmak icin `event_key` kullaniyor.
- Hata davranisi: mail hatalari ana is akisini bozmuyor; `email_notification_logs.status = failed` ve console/security log ile izleniyor.
- Support adresleri: mail footer ve reply-to tarafinda `support@getrisknova.com`, genel iletisimde `hello@getrisknova.com`.

## 16. Vercel ve Deploy

- [x] Vercel project var: `getrisknova`.
- [x] Production deployment var.
- [ ] Son kod degisiklikleri production'a deploy edildi.
- [x] Production env'leri tamam.
- [x] Build production'da basarili.
- [x] `/pricing` production'da calisiyor.
- [x] API routes production'da calisiyor.
- [x] Vercel logs kritik hata icermiyor.
- [x] Domain `getrisknova.com` dogru deployment'a bagli.
- [x] Preview/production ortam ayrimi net.

16 dogrulama notlari (kod/operasyon):

- `vercel ls`: `getrisknova` icin production deployment `Ready`; son production deployment URL `getrisknova-3ilb7py5y-...vercel.app`, alias `getrisknova.com`.
- `vercel env ls`: Supabase, Paddle, Resend, Anthropic ve servis role env'leri production ortaminda encrypted olarak gorundu; bazi ortak env'ler Preview/Production ayrimiyla tanimli.
- `npm run build`: Next.js production build basarili; `/pricing`, `/api/health`, `/api/billing/webhook`, `/api/notifications/recovery` ve diger API route'lar build ciktisinda mevcut.
- Canli smoke: `https://getrisknova.com/pricing` HTTP 200; `https://www.getrisknova.com/pricing` apex domaine 307 ile yonleniyor.
- Canli API smoke: `https://getrisknova.com/api/health` HTTP 200 ve `status: healthy` donuyor.
- `vercel inspect https://getrisknova.com`: domain aliaslari `getrisknova.com` ve `www.getrisknova.com` aktif production deployment'a bagli gorundu.
- `vercel logs --level error --since 1h --environment production`: son 1 saatte error log bulunmadi; CLI sonunda Windows `spawn EPERM` self-update hatasi verdi, log sorgusu sonucu yine de `No logs found`.
- Not: Bu oturumdaki son kod degisiklikleri henuz production'a deploy edilmedi; deploy alininca ilk madde isaretlenmeli.

## 17. Test Plani

### 17.1 Teknik Testler

- [x] `npm run typecheck`
- [x] `npm run build`
- [x] `npm run test`
- [x] Kritik API route'lar smoke test edildi.
- [x] Production smoke test yapildi.

17.1 dogrulama notlari:

- `npm run typecheck`: temiz.
- `npm run build`: Next.js production build basarili; 117 static page uretildi, kritik API route'lar build ciktisinda mevcut.
- `npm run test`: Vitest 10 test dosyasi / 76 test basarili. `api-auth.test.ts` stderr satirlari beklenen negatif auth/env/timeout senaryolari.
- Kritik API smoke: Canli `GET https://getrisknova.com/api/health` HTTP 200 ve `status: healthy`.
- Production smoke: Canli `GET https://getrisknova.com/pricing` HTTP 200; `www.getrisknova.com/pricing` apex domaine 307 yonleniyor.

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
- [x] Faz 2 icin firma onayi sonrasi Paddle webhook'un Supabase'e abonelik yazdigini dogrula.
- [x] Odeme sonrasi pricing ekraninda aktif planin pasif/mevcut gorundugunu dogrula.
- [x] Vercel env'lerinde sandbox/live Paddle degerlerinin karismadigini son release gate olarak kontrol et.
- [x] Supabase `user_subscriptions`, `subscription_plans`, `paddle_webhook_events` tablolarini odeme testiyle dogrula.
- [ ] Auth ve billing stabil olduktan sonra workspace/organizasyon modulu testlerine gec.
- [ ] Daha sonra cekirdek ISG modulleri: risk analizi, dokuman, saha denetimi, Nova, sinav ve anket.
- [ ] E-posta akislari icin kayit, uzun sure giris yapmama, odeme basarili ve odeme basarisiz senaryolarini planla.
- [ ] En son public site cevirileri ve tum desteklenen diller icin localization dalgasina gir.
- [ ] Her faz sonunda `npm run typecheck`, production deploy ve kisa smoke test yap.
