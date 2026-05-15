BEGIN;

ALTER TABLE public.legal_documents
  ADD COLUMN IF NOT EXISTS catalog_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.legal_documents.catalog_metadata IS
  'Curated catalog metadata for official TR laws: category, priority, rag_reason, pdf_url, catalog_order, sync hints.';

INSERT INTO public.legal_documents (
  doc_type,
  doc_number,
  title,
  source_url,
  corpus_scope,
  jurisdiction_code,
  is_active,
  catalog_metadata
)
SELECT
  'law'::text,
  r.law_no::text,
  r.title::text,
  r.canonical_url::text,
  'official'::text,
  'TR'::text,
  true,
  jsonb_strip_nulls(jsonb_build_object(
    'catalog_order', r."order",
    'category', r.category,
    'priority', r.priority,
    'rag_reason', r.rag_reason,
    'pdf_url', nullif(r.pdf_url, ''),
    'authority', 'mevzuat.gov.tr',
    'admin_sync_only', true,
    'sync_interval_days', CASE WHEN r.priority IN ('critical', 'high') THEN 7 ELSE 30 END
  ))
FROM jsonb_to_recordset($catalog$[
  {"order":1,"law_no":"6331","title":"İş Sağlığı ve Güvenliği Kanunu","category":"core_isg","priority":"critical","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6331&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6331.pdf","rag_reason":"İSG sisteminin ana kanunu; risk değerlendirmesi, işveren yükümlülüğü, eğitim, sağlık gözetimi, kurul, uzman/hekim, denetim ve idari para cezaları."},
  {"order":2,"law_no":"4857","title":"İş Kanunu","category":"core_labour","priority":"critical","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4857&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4857.pdf","rag_reason":"Çalışma süreleri, gece çalışması, çocuk-genç işçi, kadın çalışanlar, alt işverenlik ve iş ilişkisi hükümleri."},
  {"order":3,"law_no":"5510","title":"Sosyal Sigortalar ve Genel Sağlık Sigortası Kanunu","category":"social_security","priority":"critical","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5510&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5510.pdf","rag_reason":"İş kazası, meslek hastalığı, SGK bildirimi, geçici/sürekli iş göremezlik, ölüm geliri ve rücu süreçleri."},
  {"order":4,"law_no":"5502","title":"Sosyal Güvenlik Kurumu Kanunu","category":"social_security","priority":"high","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5502&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5502.pdf","rag_reason":"SGK kurumsal yapısı, denetim ve sosyal güvenlik uygulama altyapısı."},
  {"order":5,"law_no":"6098","title":"Türk Borçlar Kanunu","category":"liability","priority":"critical","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6098&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6098.pdf","rag_reason":"İşverenin gözetme borcu, tazminat sorumluluğu, hizmet sözleşmesi ve kusur/sorumluluk değerlendirmeleri."},
  {"order":6,"law_no":"5237","title":"Türk Ceza Kanunu","category":"criminal_liability","priority":"critical","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5237&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5237.pdf","rag_reason":"İş kazalarında taksirle yaralama/ölüm, bilinçli taksir ve ceza sorumluluğu."},
  {"order":7,"law_no":"5271","title":"Ceza Muhakemesi Kanunu","category":"criminal_procedure","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5271&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5271.pdf","rag_reason":"İş kazası soruşturmaları, bilirkişi, delil, ifade, kovuşturma ve ceza yargılama süreçleri."},
  {"order":8,"law_no":"6100","title":"Hukuk Muhakemeleri Kanunu","category":"civil_procedure","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6100&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6100.pdf","rag_reason":"İş kazası ve meslek hastalığı tazminat davalarında usul, delil, bilirkişi ve dava süreçleri."},
  {"order":9,"law_no":"7036","title":"İş Mahkemeleri Kanunu","category":"labour_judiciary","priority":"high","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=7036&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.7036.pdf","rag_reason":"İş uyuşmazlıkları, iş mahkemesi yargılaması ve zorunlu arabuluculuk bağlantısı."},
  {"order":10,"law_no":"6325","title":"Hukuk Uyuşmazlıklarında Arabuluculuk Kanunu","category":"dispute_resolution","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6325&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6325.pdf","rag_reason":"İş uyuşmazlıklarında arabuluculuk altyapısı."},
  {"order":11,"law_no":"6102","title":"Türk Ticaret Kanunu","category":"corporate_governance","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6102&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6102.pdf","rag_reason":"Şirket yönetimi, yönetim kurulu/şirket yöneticisi sorumluluğu, iç kontrol ve kurumsal risk yönetimi."},
  {"order":12,"law_no":"6698","title":"Kişisel Verilerin Korunması Kanunu","category":"data_protection","priority":"high","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6698&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6698.pdf","rag_reason":"İşyeri hekimi kayıtları, sağlık raporları, çalışan sağlık verileri ve özel nitelikli kişisel veri süreçleri."},
  {"order":13,"law_no":"657","title":"Devlet Memurları Kanunu","category":"public_personnel","priority":"high","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=657&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.657.pdf","rag_reason":"Kamu çalışanları, disiplin, görev, sorumluluk ve kamu kurumlarında İSG organizasyonu."},
  {"order":14,"law_no":"4688","title":"Kamu Görevlileri Sendikaları ve Toplu Sözleşme Kanunu","category":"public_labour_relations","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4688&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4688.pdf","rag_reason":"Kamu çalışanlarının örgütlenme, temsil ve toplu sözleşme süreçleri."},
  {"order":15,"law_no":"6356","title":"Sendikalar ve Toplu İş Sözleşmesi Kanunu","category":"labour_relations","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6356&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6356.pdf","rag_reason":"Çalışan temsilciliği, sendikal haklar, toplu iş sözleşmesi ve işyeri düzeyinde katılım süreçleri."},
  {"order":16,"law_no":"3308","title":"Mesleki Eğitim Kanunu","category":"vocational_training","priority":"high","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=3308&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.3308.pdf","rag_reason":"Çırak, stajyer, mesleki eğitim görenler ve mesleki eğitim yükümlülükleri."},
  {"order":17,"law_no":"4447","title":"İşsizlik Sigortası Kanunu","category":"employment_social_security","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4447&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4447.pdf","rag_reason":"İstihdam, işsizlik sigortası ve çalışma hayatı destekleri."},
  {"order":18,"law_no":"854","title":"Deniz İş Kanunu","category":"sectoral_labour","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=854&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.854.pdf","rag_reason":"Denizcilik sektöründe çalışanlar, gemi personeli ve sektörel iş ilişkileri."},
  {"order":19,"law_no":"5953","title":"Basın Mesleğinde Çalışanlarla Çalıştıranlar Arasındaki Münasebetlerin Tanzimi Hakkında Kanun","category":"sectoral_labour","priority":"low","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5953&MevzuatTur=1&MevzuatTertip=3","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.3.5953.pdf","rag_reason":"Basın çalışanlarına özgü iş ilişkileri."},
  {"order":20,"law_no":"6735","title":"Uluslararası İşgücü Kanunu","category":"foreign_workers","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6735&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6735.pdf","rag_reason":"Yabancı çalışanlar, çalışma izinleri ve işveren yükümlülükleri."},
  {"order":21,"law_no":"4734","title":"Kamu İhale Kanunu","category":"public_procurement","priority":"high","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4734&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4734.pdf","rag_reason":"Kamu ihalelerinde İSG şartları, hizmet alımı, yapım işi ve teknik şartname süreçleri."},
  {"order":22,"law_no":"4735","title":"Kamu İhale Sözleşmeleri Kanunu","category":"public_procurement","priority":"high","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4735&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4735.pdf","rag_reason":"Kamu sözleşmelerinde yüklenici, alt yüklenici, sözleşme sorumluluğu ve yaptırımlar."},
  {"order":23,"law_no":"5018","title":"Kamu Mali Yönetimi ve Kontrol Kanunu","category":"public_finance","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5018&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5018.pdf","rag_reason":"Kamu kurumlarında İSG bütçesi, harcama, iç kontrol ve sorumluluk zinciri."},
  {"order":24,"law_no":"2886","title":"Devlet İhale Kanunu","category":"public_procurement","priority":"low","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2886&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.2886.pdf","rag_reason":"Bazı kamu taşınmaz, ihale ve sözleşme süreçlerinde dolaylı bağlantı."},
  {"order":25,"law_no":"5393","title":"Belediye Kanunu","category":"local_government","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5393&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5393.pdf","rag_reason":"Belediye hizmetleri, ruhsat, itfaiye, altyapı, temizlik ve yerel kamu işyerleri."},
  {"order":26,"law_no":"5216","title":"Büyükşehir Belediyesi Kanunu","category":"local_government","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5216&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5216.pdf","rag_reason":"Büyükşehir belediyesi altyapı, itfaiye, ulaşım ve yerel hizmet süreçleri."},
  {"order":27,"law_no":"3572","title":"İşyeri Açma ve Çalışma Ruhsatlarına Dair Kanun Hükmünde Kararnamenin Değiştirilerek Kabulüne Dair Kanun","category":"workplace_license","priority":"high","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=3572&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.3572.pdf","rag_reason":"İşyeri açma ve çalışma ruhsatı, işyerinin faaliyete geçme koşulları."},
  {"order":28,"law_no":"4562","title":"Organize Sanayi Bölgeleri Kanunu","category":"industrial_zones","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4562&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4562.pdf","rag_reason":"OSB altyapısı, sanayi tesisleri, çevre ve güvenlik organizasyonu."},
  {"order":29,"law_no":"5442","title":"İl İdaresi Kanunu","category":"local_administration","priority":"low","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5442&MevzuatTur=1&MevzuatTertip=3","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.3.5442.pdf","rag_reason":"Valilik/kaymakamlık koordinasyonu, afet, acil durum ve yerel idari tedbirler."},
  {"order":30,"law_no":"3194","title":"İmar Kanunu","category":"construction","priority":"high","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=3194&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.3194.pdf","rag_reason":"Yapı, ruhsat, şantiye, kullanım izni ve yapı güvenliği bağlantısı."},
  {"order":31,"law_no":"4708","title":"Yapı Denetimi Hakkında Kanun","category":"construction","priority":"high","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4708&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4708.pdf","rag_reason":"Yapı denetimi, şantiye ve yapı güvenliği sorumlulukları."},
  {"order":32,"law_no":"6306","title":"Afet Riski Altındaki Alanların Dönüştürülmesi Hakkında Kanun","category":"construction_disaster","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6306&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6306.pdf","rag_reason":"Yıkım, dönüşüm, yapı güvenliği ve riskli alan süreçleri."},
  {"order":33,"law_no":"5902","title":"Afet ve Acil Durum Yönetimi Başkanlığı ile İlgili Bazı Düzenlemeler Hakkında Kanun","category":"emergency_disaster","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5902&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5902.pdf","rag_reason":"Afet ve acil durum yönetimi, kurumsal koordinasyon."},
  {"order":34,"law_no":"7126","title":"Sivil Savunma Kanunu","category":"emergency_disaster","priority":"low","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=7126&MevzuatTur=1&MevzuatTertip=3","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.3.7126.pdf","rag_reason":"Sivil savunma, acil durum ve kurum hazırlıkları."},
  {"order":35,"law_no":"2872","title":"Çevre Kanunu","category":"environment","priority":"high","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2872&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.2872.pdf","rag_reason":"Kimyasal, atık, emisyon, çevresel risk, çevre-İSG kesişimi."},
  {"order":36,"law_no":"5312","title":"Deniz Çevresinin Petrol ve Diğer Zararlı Maddelerle Kirlenmesinde Acil Durumlarda Müdahale ve Zararların Tazmini Esaslarına Dair Kanun","category":"environment_emergency","priority":"low","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5312&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5312.pdf","rag_reason":"Petrol/zararlı madde acil müdahale süreçleri; liman, denizcilik ve kıyı tesisleri."},
  {"order":37,"law_no":"3213","title":"Maden Kanunu","category":"mining","priority":"high","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=3213&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.3213.pdf","rag_reason":"Maden işyerleri, ruhsat, işletme, teknik nezaret ve yüksek riskli faaliyetler."},
  {"order":38,"law_no":"7223","title":"Ürün Güvenliği ve Teknik Düzenlemeler Kanunu","category":"product_safety","priority":"high","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=7223&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.7223.pdf","rag_reason":"Makine, ekipman, KKD, CE ve teknik düzenlemelerle İSG bağlantısı."},
  {"order":39,"law_no":"6446","title":"Elektrik Piyasası Kanunu","category":"energy","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6446&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6446.pdf","rag_reason":"Elektrik üretim/dağıtım tesisleri, enerji güvenliği ve sektörel iş güvenliği."},
  {"order":40,"law_no":"4646","title":"Doğal Gaz Piyasası Kanunu","category":"energy","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4646&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4646.pdf","rag_reason":"Doğal gaz tesisleri, patlama/yangın riski ve enerji sektörü güvenliği."},
  {"order":41,"law_no":"5015","title":"Petrol Piyasası Kanunu","category":"energy","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5015&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5015.pdf","rag_reason":"Petrol, akaryakıt, depolama, dolum ve dağıtım tesislerinde iş güvenliği bağlantısı."},
  {"order":42,"law_no":"5307","title":"Sıvılaştırılmış Petrol Gazları LPG Piyasası Kanunu","category":"energy","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5307&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5307.pdf","rag_reason":"LPG dolum, depolama, taşıma, yangın/patlama ve tehlikeli madde riski."},
  {"order":43,"law_no":"4925","title":"Karayolu Taşıma Kanunu","category":"transport","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4925&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4925.pdf","rag_reason":"Taşımacılık, lojistik, sürücü, yük ve tehlikeli madde taşıma süreçleri."},
  {"order":44,"law_no":"2918","title":"Karayolları Trafik Kanunu","category":"transport","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2918&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.2918.pdf","rag_reason":"İş araçları, servis, trafik kazası, saha içi/saha dışı araç güvenliği bağlantısı."},
  {"order":45,"law_no":"7381","title":"Nükleer Düzenleme Kanunu","category":"radiation_nuclear","priority":"sectoral","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=7381&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.7381.pdf","rag_reason":"Radyasyon, nükleer tesisler ve özel riskli faaliyetler."},
  {"order":46,"law_no":"1593","title":"Umumi Hıfzıssıhha Kanunu","category":"public_health","priority":"high","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=1593&MevzuatTur=1&MevzuatTertip=3","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.3.1593.pdf","rag_reason":"Halk sağlığı, hijyen, bulaşıcı hastalıklar, sağlık tedbirleri ve işyeri hijyeni bağlantısı."},
  {"order":47,"law_no":"1219","title":"Tababet ve Şuabatı Sanatlarının Tarzı İcrasına Dair Kanun","category":"medical_practice","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=1219&MevzuatTur=1&MevzuatTertip=3","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.3.1219.pdf","rag_reason":"Hekimlik uygulamaları, işyeri hekimi ve sağlık mesleği icrası bağlantısı."},
  {"order":48,"law_no":"5996","title":"Veteriner Hizmetleri, Bitki Sağlığı, Gıda ve Yem Kanunu","category":"food_health","priority":"medium","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5996&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5996.pdf","rag_reason":"Gıda işletmeleri, hijyen, biyolojik risk, zoonoz ve gıda üretim işyerleri."},
  {"order":49,"law_no":"5326","title":"Kabahatler Kanunu","category":"administrative_sanctions","priority":"low","canonical_url":"https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5326&MevzuatTur=1&MevzuatTertip=5","pdf_url":"https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5326.pdf","rag_reason":"İdari yaptırım ve kabahat rejimiyle dolaylı bağlantı."}
]
$catalog$::jsonb) AS r(
  "order" int,
  law_no text,
  title text,
  category text,
  priority text,
  canonical_url text,
  pdf_url text,
  rag_reason text
)
ON CONFLICT (title, doc_number) WHERE doc_number IS NOT NULL DO UPDATE SET
  source_url = EXCLUDED.source_url,
  catalog_metadata = EXCLUDED.catalog_metadata,
  corpus_scope = EXCLUDED.corpus_scope,
  jurisdiction_code = EXCLUDED.jurisdiction_code,
  is_active = EXCLUDED.is_active,
  doc_type = EXCLUDED.doc_type,
  updated_at = now();

COMMIT;
