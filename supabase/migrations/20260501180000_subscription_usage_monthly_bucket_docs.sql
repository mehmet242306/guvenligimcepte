-- subscription_usage: aylik kova semantigi (ay degisiminde ayri satir = sifirlanmis sayac)

comment on table public.subscription_usage is
'Aylik kota sayaclari. Her (subscription_id, usage_month) icin tek satir; usage_month ay basinin tarihidir (DB zaman diliminde date_trunc(''month'', now())::date). Yeni ayda onceki satir korunur, ilk kullanimda yeni ay icin INSERT yapilir; cron ile sifirlama gerekmez.';

comment on column public.subscription_usage.usage_month is
'Kota ayinin baslangic tarihi (genelde ayin 1''i). consume_subscription_quota ve increment_usage bu anahtarla mevcut ay satirini okur/yazar; ay degisince onceki ay satiri kullanilmaz ve kullanilan kota 0''dan baslar.';
