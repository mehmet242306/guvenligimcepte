# Legal RAG Smoke Test Checklist

Bu checklist, RiskNova'nin yeni mevzuat mimarisinin saglikli calistigini hizli ama guvenilir sekilde dogrulamak icin hazirlandi.

## Amac

- Resmi mevzuat korpusunun tenant-private belgelerden ayrildigini dogrulamak
- Workspace izolasyonunun calistigini gormek
- Jurisdiction filtrelemesinin beklendigi gibi davranip davranmadigini kontrol etmek
- `extractive` ve `polish` modlarinin ayni retrieval dayanaklariyla calistigini gormek

## On Hazirlik

1. En az iki workspace hazir olsun.
2. Ornek:
   - `TR / Default`
   - `DE / Germany Ops`
3. `TR` workspace'te resmi mevzuat kullanilsin.
4. `DE` workspace'e en az bir tenant-private belge yukleyin.

## Test 1: Official Only

Soru:

```text
6331 sayili Kanun madde 10 nedir?
```

Beklenti:

- `sources` icinde `corpus_scope = official`
- Kaynak kartlarinda sadece `Official`
- `trace` icinde `jurisdiction_code = TR`
- `Private` badge gorunmemeli

## Test 2: Tenant Private Only

Aktif workspace: `DE / Germany Ops`

Tenant-private belge yukleyin:

- Ornek: `Yuksekte Calisma Talimati - Germany Ops`

Soru:

```text
Bizim tesiste yuksekte calisma iznini kim onaylar?
```

Beklenti:

- `sources` icinde en az bir `tenant_private`
- Kaynak kartinda `Private` badge
- Cevapta private belge resmi mevzuat gibi sunulmamali

## Test 3: Official + Private Together

Soru:

```text
Yuksekte calisma icin hangi resmi yukumlulukler var ve bizim kurum icinde kim onay verir?
```

Beklenti:

- Cevapta hem resmi hem private kaynak kullanilabilir
- Resmi dayanak once gelmeli
- Tenant-private icerik kurumunuza ozel tamamlayici bilgi gibi sunulmali

## Test 4: Workspace Isolation

1. `DE / Germany Ops` workspace'te tenant-private belge bulunan soruyu sorun.
2. Sonra `TR / Default` workspace'e gecip ayni soruyu tekrar sorun.

Beklenti:

- `DE` workspace'te `Private` kaynak gorunur
- `TR` workspace'te ayni private belge kesinlikle gorunmez
- `trace` kayitlari workspace'e gore farkli olur

## Test 5: Wrong Jurisdiction

Aktif workspace: `DE / Germany Ops`

Soru:

```text
6331 sayili Kanun madde 10 nedir?
```

Beklenti:

- Sistem resmi TR dayanaklarini ancak jurisdiction mantigina uygun sekilde ele almali
- Eger ilgili jurisdiction'da resmi kaynak yoksa zorlamamali
- Gerekirse daha acik soru veya tarih istemeli

## Test 6: As Of Date

Ayni soruyu farkli tarihlerle tekrar sorun:

```text
6331 sayili Kanun madde 10 nedir?
```

Beklenti:

- `as_of_date` trace'te gorunmeli
- Sürüm farki varsa kaynaklar version filtreli degismeli
- Belirsiz durumda sistem temkinli davranmali

## Test 7: Trace Consistency

Her testten sonra:

1. `Trace goster` butonunu acin
2. Gerekirse `/api/legal/trace/:traceId` cevabini inceleyin

Beklenti:

- UI'de gorulen kaynaklar trace ile uyumlu olmali
- `exact`, `sparse`, `dense`, `reranked` alanlari mantikli gorunmeli
- `jurisdiction_code` ve `as_of_date` beklenen degerleri tasimali

## Test 8: Abstain Behavior

Soru:

```text
Bu konuda kesin yukumlulugumuz var mi?
```

Ama retrieval icin yeterli detay vermeyin.

Beklenti:

- Sistem uydurmamali
- Kanit yetersizse soruyu daraltmanizi istemeli
- Referanssiz kesin hukum kurmamali

## Basarili Sonuc Kriterleri

- Official ve tenant-private kaynaklar net ayriliyor
- Tenant-private belgeler workspace disina sizmiyor
- Jurisdiction filtresi gorunur ve tutarli
- `extractive` ve `polish` ayni retrieval tabani uzerinde calisiyor
- Trace incelemesi cevapla uyumlu
- Sistem dusuk kanitta abstain edebiliyor

## Regresyon Notu

Asagidaki degisikliklerden sonra bu checklist tekrar kosulmali:

- Retrieval SQL fonksiyonlari degistiginde
- `solution-chat` retrieval mantigi degistiginde
- `legal-library-upload` ingestion akisi degistiginde
- Workspace / RLS migration’i geldikten sonra
