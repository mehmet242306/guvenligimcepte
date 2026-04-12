# KVKK Phase 3 Mobile Contract

Bu repo, KVKK cihaz ustu maskeleme gereksiniminin denetim ve kayit katmanini tasir.
Gercek kamera kare isleme mantigi mobil uygulama reposunda tamamlanmalidir.

## Bu repoda hazirlanan parcalar

- `public.masking_events`
  Cihaz ustu blur uygulamasinin denetim kaydi.
- `public.international_transfers`
  Claude Vision veya benzeri harici AI aktarimlarinin kaydi.
- `public.log_masking_event(...)`
  Maskeleme sonucunu kaydetmek icin RPC.
- `public.log_international_transfer(...)`
  Yurt disi aktarimi kaydetmek icin RPC.
- `frontend/src/lib/security/server.ts`
  `logMaskingEvent` ve `logInternationalTransfer` helper fonksiyonlari.
- `KvkkTransferAndBreachPanel`
  Admin tarafinda masking ve transfer loglarini goruntuleyen ekran.

## Mobil repo sorumluluklari

- `react-native-vision-camera` frame processor kullanimi
- MediaPipe veya esdeger dedektor ile:
  - yuz
  - plaka
  - kimlik karti
  tespiti
- Kare buluta cikmadan once Gaussian blur uygulanmasi
- Orijinal karenin kalici olarak saklanmamasi
- Sadece maskelenmis kare veya maskelenmis turev dosyanin upload edilmesi
- Her islem sonunda bu repodaki log RPC'lerine olay yazilmasi

## Beklenen minimum payload

Maskeleme logu:

- `sourceContext`
- `mediaType`
- `maskingStatus`
- `detectedFaces`
- `detectedPlates`
- `detectedIdentityCards`
- `organizationId`
- `companyWorkspaceId`
- `originalPersisted = false`

Yurt disi aktarim logu:

- `provider`
- `destinationRegion`
- `transferContext = claude_vision`
- `reason`
- `dataCategory = camera_frame`
- `payloadReference`
- `frameCount`
- `organizationId`
- `companyWorkspaceId`

## Kabul kriteri

KVKK 3.3 tamamlandi sayilabilmesi icin:

1. Mobil repo cihaz ustu blur uygulamali
2. Orijinal kare upload edilmemeli
3. Her maskeleme `masking_events` tablosuna dusmeli
4. Harici AI'ya giden her kare `international_transfers` tablosuna dusmeli
