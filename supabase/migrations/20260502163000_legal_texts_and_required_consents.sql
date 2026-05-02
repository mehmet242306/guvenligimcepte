-- Refresh platform legal consent texts for launch readiness.
-- Keeps consent history: old published versions are unpublished and v2.0 is published.

begin;

create temporary table tmp_legal_consent_texts (
  consent_type text not null,
  title text not null,
  description text not null,
  scope_context text not null,
  is_required boolean not null,
  display_order integer not null,
  summary text not null,
  content_markdown text not null
) on commit drop;

insert into tmp_legal_consent_texts (
  consent_type,
  title,
  description,
  scope_context,
  is_required,
  display_order,
  summary,
  content_markdown
)
values
  (
    'aydinlatma',
    'RiskNova KVKK Aydinlatma Metni',
    'Platform genelinde kisisel verilerin hangi amaclarla islendigi ve kullanici haklari.',
    'platform',
    true,
    10,
    'Hesap, ISG operasyon, guvenlik, odeme, destek ve AI ozellikleri kapsaminda veri isleme aydinlatmasi.',
    E'# RiskNova KVKK Aydinlatma Metni\n\nRiskNova; hesap olusturma, oturum acma, organizasyon ve calisma alani yonetimi, ISG operasyon kayitlari, risk analizi, saha denetimi, dokuman uretimi, egitim, sinav, anket, destek, abonelik, guvenlik ve AI destekli ozelliklerin sunulmasi icin kisisel verileri isler.\n\n## Islenen veri gruplari\n\nAd, soyad, e-posta, telefon, hesap kimligi, rol/yetki bilgileri, organizasyon ve firma/calisma alani bilgileri, IP, cihaz, oturum ve guvenlik kayitlari, kullanim limitleri, destek talepleri, odeme/abonelik durumu ve kullanicinin platforma yukledigi ISG icerikleri islenebilir.\n\n## Isleme amaclari\n\nVeriler; sozlesmenin kurulmasi ve ifasi, kullanici yetkilendirme, guvenli oturum, ISG sureclerinin yurutulmesi, dokuman ve rapor uretimi, mevzuat destekli arama, AI destekli karar destegi, faturalama, destek, kotu kullanim onleme, audit ve yasal yukumlulukler icin islenir.\n\n## Hukuki sebepler\n\nSozlesmenin ifasi, kanuni yukumluluk, veri sorumlusunun mesru menfaati ve gerekli hallerde acik riza hukuki sebeplerine dayanilir.\n\n## Aktarimlar\n\nBarindirma, kimlik dogrulama, e-posta, odeme, AI, loglama ve destek hizmetleri icin Supabase, Vercel, Resend, Paddle, OpenAI, Anthropic ve benzeri hizmet saglayicilarla sinirli aktarim yapilabilir.\n\n## Haklar\n\nKVKK madde 11 kapsamindaki bilgi alma, erisim, duzeltme, silme, itiraz ve ilgili taleplerinizi profilinizdeki Gizlilik / Veri Haklari ekranindan veya support@getrisknova.com adresinden iletebilirsiniz.'
  ),
  (
    'kvkk',
    'RiskNova Kullanim Sartlari ve KVKK Temel Onayi',
    'Platformu kullanmak icin zorunlu sozlesme ve temel KVKK kabul metni.',
    'platform',
    true,
    20,
    'Kullanim sartlari, gizlilik politikasi, cerez politikasi ve temel platform veri isleme esaslari.',
    E'# RiskNova Kullanim Sartlari ve KVKK Temel Onayi\n\nRiskNova hesabini kullanarak Kullanim Sartlari, Gizlilik Politikasi, Cerez Politikasi ve bu KVKK temel metninin guncel surumlerini okudugunuzu kabul edersiniz.\n\n## Platform sorumlulugu\n\nRiskNova karar destek ve operasyon yonetimi aracidir. AI ciktilari, risk raporlari, dokuman taslaklari ve mevzuat cevaplari kullanici tarafindan mesleki ve hukuki kontrol yapilmadan nihai karar yerine gecmez.\n\n## Musteri verisi\n\nOrganizasyonunuzun yukledigi dokumanlar, personel kayitlari, risk analizleri, saha denetimleri, sinav/anket cevaplari ve benzeri icerikler musteri verisidir. Bu verilerin hukuka uygun toplanmasi ve yetkili kisilerce kullanilmasi musteri/organizasyon sorumlulugundadir.\n\n## Guvenlik ve yetki\n\nKullanici hesaplarini, rolleri ve calisma alani yetkilerini dogru kullanmayi; yetkisiz erisim suphelerini bildirmeyi kabul edersiniz.\n\n## Zorunlu kabul\n\nBu metin platformun temel kullanimi icin zorunludur. Kabul edilmezse korumali uygulama alanina devam edilemez.'
  ),
  (
    'acik_riza',
    'AI, Gorsel ve Ozel Nitelikli Veri Acik Riza Metni',
    'AI destekli analizlerde gorsel, ses, olay, saglik/ISG baglami veya ozel nitelikli veri icerebilen icerikler icin riza.',
    'platform',
    true,
    30,
    'AI ve gorsel/ses destekli ozelliklerde gerekebilecek ek veri isleme ve yurt disi hizmet saglayici kullanimi.',
    E'# AI, Gorsel ve Ozel Nitelikli Veri Acik Riza Metni\n\nRiskNova; kullanicinin tercih ederek kullandigi AI destekli risk analizi, gorsel yorumlama, ses transkripti, dokuman taslagi, olay/kok neden analizi ve mevzuat destekli yanit ozelliklerinde yuklenen icerigi isleyebilir.\n\n## Kapsam\n\nYuklenen gorsellerde kisiler, isyeri alanlari, ekipman, kaza/olay bilgileri, saglik ve guvenlik baglami veya baska hassas veriler bulunabilir. Bu veriler sadece ilgili ozelligin sunulmasi, guvenlik, audit ve kalite kontrol amaciyla islenir.\n\n## AI hizmet saglayicilari\n\nAI ozelliklerinde OpenAI, Anthropic veya benzeri altyapi saglayicilari kullanilabilir. Bu hizmetler teknik olarak yurt disi altyapilarda calisabilir.\n\n## Riza ve geri alma\n\nBu metni onaylayarak ilgili AI ozelliklerinde gerekli veri isleme sureclerine acik riza verdiginizi kabul edersiniz. Rizanizi geri alma talepleriniz destek veya profil gizlilik ekranlari uzerinden degerlendirilir; geri alma ileriye etkili olur ve yasal saklama zorunluluklarini ortadan kaldirmayabilir.'
  ),
  (
    'yurt_disi_aktarim',
    'Yurt Disi Aktarim Bilgilendirmesi',
    'Bulut, odeme, e-posta ve AI hizmetlerinde yurt disi altyapi kullanimi hakkinda bilgilendirme.',
    'international_transfer',
    false,
    40,
    'Yurt disi altyapi ve hizmet saglayici aktarimlari icin bilgilendirme.',
    E'# Yurt Disi Aktarim Bilgilendirmesi\n\nRiskNova; barindirma, kimlik dogrulama, e-posta, odeme, AI ve destek hizmetleri icin yurt disinda yerlesik altyapi veya hizmet saglayicilardan yararlanabilir. Bu aktarimlar hizmetin sunulmasi icin gerekli teknik kapsamla sinirlidir.\n\nBu metin bilgilendirme amaclidir; belirli bir akista ek acik riza gerektiginde platform ayrica onay ister.'
  ),
  (
    'pazarlama',
    'Pazarlama Iletisimi Izni',
    'Urun duyurulari, egitim icerikleri ve kampanya iletileri icin istege bagli izin.',
    'marketing',
    false,
    50,
    'Transactional e-postalardan ayri, istege bagli pazarlama iletisim izni.',
    E'# Pazarlama Iletisimi Izni\n\nRiskNova size urun duyurulari, egitim icerikleri, kampanya ve bulten iletileri gonderebilir.\n\nBu izin zorunlu degildir. Hesap guvenligi, sifre sifirlama, davet, odeme, abonelik, yasal bildirim ve hizmetin calismasi icin gereken transactional e-postalar bu pazarlama izninden ayridir ve hizmet kapsaminda gonderilebilir.\n\nPazarlama izninizi istediginiz zaman geri alabilirsiniz.'
  );

insert into public.consent_documents (
  organization_id,
  consent_type,
  title,
  description,
  scope_context,
  is_required,
  is_active,
  display_order
)
select
  null,
  consent_type,
  title,
  description,
  scope_context,
  is_required,
  true,
  display_order
from tmp_legal_consent_texts
on conflict do nothing;

update public.consent_documents d
set
  title = t.title,
  description = t.description,
  is_required = t.is_required,
  is_active = true,
  display_order = t.display_order,
  updated_at = now()
from tmp_legal_consent_texts t
where d.organization_id is null
  and d.consent_type = t.consent_type
  and d.scope_context = t.scope_context;

update public.consent_document_versions v
set is_published = false,
    updated_at = now()
from public.consent_documents d
where v.document_id = d.id
  and d.organization_id is null
  and d.consent_type in ('aydinlatma', 'kvkk', 'acik_riza', 'yurt_disi_aktarim', 'pazarlama')
  and v.version <> 'v2.0';

insert into public.consent_document_versions (
  document_id,
  version,
  summary,
  content_markdown,
  is_published,
  published_at
)
select
  d.id,
  'v2.0',
  t.summary,
  t.content_markdown,
  true,
  now()
from public.consent_documents d
join tmp_legal_consent_texts t
  on t.consent_type = d.consent_type
 and t.scope_context = d.scope_context
where d.organization_id is null
on conflict (document_id, version) do update
set
  summary = excluded.summary,
  content_markdown = excluded.content_markdown,
  is_published = true,
  published_at = coalesce(public.consent_document_versions.published_at, now()),
  updated_at = now();

commit;
