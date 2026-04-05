// ============================================================
// ISG Document Groups — 20 groups, 101 documents
// ============================================================

export interface DocumentGroupItem {
  id: string;
  title: string;
  description?: string;
  isP1?: boolean; // priority 1 — has active template
  isP2?: boolean;
}

export interface DocumentGroup {
  key: string;
  title: string;
  icon: string; // lucide icon name
  color: string; // tailwind color class
  items: DocumentGroupItem[];
}

export const DOCUMENT_GROUPS: DocumentGroup[] = [
  {
    key: 'is-giris-oryantasyon',
    title: 'İş Giriş İSG ve Oryantasyon',
    icon: 'UserCheck',
    color: 'text-blue-600',
    items: [
      { id: 'oryantasyon-formu', title: 'İSG Oryantasyon Eğitim Formu', isP2: true },
      { id: 'ise-giris-eslestirme', title: 'İşe Giriş Eşleştirme Formu' },
      { id: 'ise-giris-saglik', title: 'İşe Giriş Sağlık Raporu Takip' },
      { id: 'ise-giris-taahhut', title: 'İSG Taahhütnamesi' },
      { id: 'kkd-zimmet', title: 'KKD Zimmet Formu', isP2: true },
      { id: 'isg-bilgilendirme', title: 'İSG Bilgilendirme Tutanağı' },
      { id: 'gorev-tanimlari', title: 'Görev Tanımları' },
      { id: 'oryantasyon-kontrol', title: 'Oryantasyon Kontrol Listesi' },
    ],
  },
  {
    key: 'kurul-kayitlari',
    title: 'İSG Kurul Kayıtları',
    icon: 'Users',
    color: 'text-purple-600',
    items: [
      { id: 'kurul-tutanagi', title: 'İSG Kurul Toplantı Tutanağı', isP1: true },
      { id: 'kurul-uye-listesi', title: 'Kurul Üye Listesi' },
      { id: 'kurul-karar-takip', title: 'Kurul Karar Takip Formu' },
      { id: 'kurul-gundem', title: 'Kurul Gündem Belgesi' },
      { id: 'kurul-yillik-plan', title: 'Kurul Yıllık Toplantı Planı' },
      { id: 'kurul-katilim', title: 'Kurul Katılım Çizelgesi' },
      { id: 'kurul-ozel-toplanti', title: 'Özel Toplantı Tutanağı' },
      { id: 'kurul-secim-tutanagi', title: 'Kurul Seçim Tutanağı' },
    ],
  },
  {
    key: 'egitim-dosyasi',
    title: 'Eğitim Dosyası',
    icon: 'GraduationCap',
    color: 'text-green-600',
    items: [
      { id: 'egitim-katilim-formu', title: 'Eğitim Katılım Formu', isP1: true },
      { id: 'egitim-sertifika', title: 'Eğitim Sertifikası', isP1: true },
      { id: 'egitim-yillik-plan', title: 'Yıllık Eğitim Planı' },
      { id: 'egitim-ihtiyac-analizi', title: 'Eğitim İhtiyaç Analizi' },
      { id: 'egitim-degerlendirme', title: 'Eğitim Değerlendirme Formu' },
      { id: 'egitim-icerik', title: 'Eğitim İçerik Dokümanı' },
      { id: 'egitim-etkinlik', title: 'Eğitim Etkinlik Ölçüm Formu' },
      { id: 'egitim-talep', title: 'Eğitim Talep Formu' },
      { id: 'egitim-ozet-raporu', title: 'Eğitim Özet Raporu' },
    ],
  },
  {
    key: 'risk-degerlendirme',
    title: 'Risk Değerlendirme ve Tespit Öneri',
    icon: 'ShieldAlert',
    color: 'text-red-600',
    items: [
      { id: 'risk-raporu', title: 'Risk Değerlendirme Raporu', isP1: true },
      { id: 'tespit-oneri-defteri', title: 'Tespit ve Öneri Defteri', isP1: true },
      { id: 'risk-envanter', title: 'Tehlike ve Risk Envanteri' },
      { id: 'risk-aksiyon-plani', title: 'Risk Aksiyon Planı' },
      { id: 'is-kazasi-risk', title: 'Kaza Sonrası Risk Güncelleme' },
      { id: 'risk-haritasi', title: 'Risk Haritası Dokümanı' },
      { id: 'risk-izleme-raporu', title: 'Risk İzleme Raporu' },
      { id: 'risk-iletisim-formu', title: 'Risk İletişim Formu' },
      { id: 'risk-metodoloji', title: 'Risk Metodoloji Belgesi' },
    ],
  },
  {
    key: 'acil-durum',
    title: 'Acil Durum Faaliyetleri',
    icon: 'Siren',
    color: 'text-orange-600',
    items: [
      { id: 'acil-durum-plani', title: 'Acil Durum Planı', isP1: true },
      { id: 'acil-durum-ekip', title: 'Acil Durum Ekip Listesi' },
      { id: 'tahliye-plani', title: 'Tahliye Planı' },
      { id: 'tatbikat-raporu', title: 'Tatbikat Raporu' },
      { id: 'acil-durum-tel', title: 'Acil Durum Telefon Listesi' },
      { id: 'acil-durum-talimat', title: 'Acil Durum Talimatı' },
      { id: 'toplanma-alani', title: 'Toplanma Alanı Krokisi' },
      { id: 'acil-durum-egitim', title: 'Acil Durum Eğitim Planı' },
      { id: 'acil-durum-envanter', title: 'Acil Durum Ekipman Envanteri' },
      { id: 'acil-durum-senaryo', title: 'Acil Durum Senaryoları' },
    ],
  },
  {
    key: 'kaza-olay',
    title: 'Kaza, Olay ve Ramak Kala',
    icon: 'AlertTriangle',
    color: 'text-amber-600',
    items: [
      { id: 'kaza-bildirim-formu', title: 'İş Kazası Bildirim Formu' },
      { id: 'kaza-arastirma-raporu', title: 'Kaza Araştırma Raporu' },
      { id: 'ramak-kala-formu', title: 'Ramak Kala Bildirim Formu' },
      { id: 'dof-formu', title: 'Düzeltici Önleyici Faaliyet (DÖF) Raporu', isP2: true },
      { id: 'kaza-istatistik', title: 'Kaza İstatistik Raporu' },
      { id: 'kok-neden-analizi', title: 'Kök Neden Analizi Raporu' },
      { id: 'olay-degerlendirme', title: 'Olay Değerlendirme Tutanağı' },
    ],
  },
  {
    key: 'iletisim-yazisma',
    title: 'İletişim ve Yazışma',
    icon: 'Mail',
    color: 'text-sky-600',
    items: [
      { id: 'resmi-yazi', title: 'Resmi Yazı Şablonu' },
      { id: 'uyari-yazisi', title: 'Uyarı Yazısı' },
      { id: 'bilgilendirme-yazisi', title: 'Bilgilendirme Yazısı' },
    ],
  },
  {
    key: 'talimatlar',
    title: 'Talimatlar',
    icon: 'ClipboardList',
    color: 'text-teal-600',
    items: [
      { id: 'genel-isg-talimati', title: 'Genel İSG Talimatı' },
      { id: 'makine-talimati', title: 'Makine/Ekipman Kullanım Talimatı' },
      { id: 'kimyasal-talimati', title: 'Kimyasal Madde Kullanım Talimatı' },
      { id: 'kkd-kullanim-talimati', title: 'KKD Kullanım Talimatı' },
    ],
  },
  {
    key: 'prosedurler',
    title: 'İSG Prosedürleri',
    icon: 'BookOpen',
    color: 'text-indigo-600',
    items: [
      { id: 'isg-politikasi', title: 'İSG Politikası', isP2: true },
      { id: 'risk-degerlendirme-prosedur', title: 'Risk Değerlendirme Prosedürü' },
      { id: 'egitim-proseduru', title: 'Eğitim Prosedürü' },
      { id: 'acil-durum-prosedur', title: 'Acil Durum Prosedürü' },
      { id: 'kaza-bildirimi-prosedur', title: 'Kaza Bildirimi Prosedürü' },
      { id: 'kkd-proseduru', title: 'KKD Yönetimi Prosedürü' },
      { id: 'saglik-gozetimi-prosedur', title: 'Sağlık Gözetimi Prosedürü' },
      { id: 'is-izni-proseduru', title: 'İş İzni Prosedürü' },
      { id: 'yuksekte-calisma', title: 'Yüksekte Çalışma Prosedürü' },
      { id: 'kapali-alan', title: 'Kapalı Alan Çalışma Prosedürü' },
      { id: 'elektrik-guvenlik', title: 'Elektrik Güvenliği Prosedürü' },
      { id: 'ergonomi-prosedur', title: 'Ergonomi Prosedürü' },
      { id: 'taseron-yonetimi', title: 'Taşeron Yönetimi Prosedürü' },
      { id: 'depolama-prosedur', title: 'Depolama Prosedürü' },
      { id: 'isaret-etiketleme', title: 'İşaret ve Etiketleme Prosedürü' },
      { id: 'gece-calisma', title: 'Gece Çalışma Prosedürü' },
      { id: 'sicak-calisma', title: 'Sıcak Çalışma Prosedürü' },
      { id: 'gurultu-prosedur', title: 'Gürültü Kontrolü Prosedürü' },
      { id: 'toz-prosedur', title: 'Toz Kontrolü Prosedürü' },
    ],
  },
  {
    key: 'denetim-kontrol',
    title: 'İşletme Kontrolü ve Denetim',
    icon: 'Search',
    color: 'text-cyan-600',
    items: [
      { id: 'is-yeri-denetim', title: 'İş Yeri Denetim Raporu' },
      { id: 'ic-denetim-raporu', title: 'İç Denetim Raporu' },
      { id: 'kontrol-listesi', title: 'Genel Kontrol Listesi' },
      { id: 'uygunsuzluk-raporu', title: 'Uygunsuzluk Raporu' },
    ],
  },
  {
    key: 'personel-ozluk',
    title: 'Personel Özlük ve Sözleşmeler',
    icon: 'UserCog',
    color: 'text-rose-600',
    items: [
      { id: 'is-sozlesmesi', title: 'İş Sözleşmesi' },
      { id: 'ek-sozlesme', title: 'Ek Sözleşme (İSG)' },
      { id: 'gizlilik-sozlesme', title: 'Gizlilik Sözleşmesi' },
      { id: 'gorev-tanım-belgesi', title: 'Görev Tanım Belgesi' },
      { id: 'ise-giris-evrak', title: 'İşe Giriş Evrak Listesi' },
      { id: 'isten-ayrilma', title: 'İşten Ayrılma Formu' },
      { id: 'izin-formu', title: 'İzin Talep Formu' },
      { id: 'mesai-formu', title: 'Fazla Mesai Talep Formu' },
      { id: 'disiplin-tutanagi', title: 'Disiplin Tutanağı' },
      { id: 'performans-degerlendirme', title: 'Performans Değerlendirme Formu' },
      { id: 'terfi-formu', title: 'Terfi Teklif Formu' },
      { id: 'personel-bilgi-formu', title: 'Personel Bilgi Formu' },
      { id: 'cv-formu', title: 'Özgeçmiş Formu' },
      { id: 'referans-formu', title: 'Referans Kontrol Formu' },
      { id: 'bordro-mutabakat', title: 'Bordro Mutabakat Formu' },
      { id: 'zimmet-teslim', title: 'Zimmet Teslim Tutanağı' },
      { id: 'yetkinlik-matrisi', title: 'Yetkinlik Matrisi' },
    ],
  },
  {
    key: 'yillik-degerlendirme',
    title: 'İSG Yıllık Değerlendirme',
    icon: 'CalendarCheck',
    color: 'text-emerald-600',
    items: [
      { id: 'yillik-faaliyet-raporu', title: 'Yıllık Faaliyet Raporu' },
      { id: 'yillik-calisma-plani', title: 'Yıllık Çalışma Planı' },
    ],
  },
  {
    key: 'calisan-temsilcisi',
    title: 'Çalışan Temsilcisi',
    icon: 'UserPlus',
    color: 'text-violet-600',
    items: [
      { id: 'temsilci-secim-tutanagi', title: 'Çalışan Temsilcisi Seçim Tutanağı' },
      { id: 'temsilci-gorev-tanimi', title: 'Temsilci Görev Tanımı' },
      { id: 'temsilci-raporu', title: 'Temsilci Faaliyet Raporu' },
      { id: 'temsilci-oneri-formu', title: 'Temsilci Öneri Formu' },
      { id: 'temsilci-egitim-kaydi', title: 'Temsilci Eğitim Kaydı' },
      { id: 'temsilci-atama-yazisi', title: 'Temsilci Atama Yazısı' },
    ],
  },
  {
    key: 'iyi-uygulama',
    title: 'İyi Uygulama',
    icon: 'Award',
    color: 'text-yellow-600',
    items: [
      { id: 'iyi-uygulama-raporu', title: 'İyi Uygulama Raporu' },
      { id: 'oneri-odul-sistemi', title: 'Öneri ve Ödül Sistemi Formu' },
      { id: 'benchmark-raporu', title: 'Kıyaslama (Benchmark) Raporu' },
    ],
  },
  {
    key: 'dis-gorevlendirme',
    title: 'İş Yeri Dışı Görevlendirme',
    icon: 'MapPin',
    color: 'text-lime-600',
    items: [
      { id: 'dis-gorev-yazisi', title: 'Dış Görevlendirme Yazısı' },
    ],
  },
  {
    key: 'arac-makine',
    title: 'Araç ve Makine Takip',
    icon: 'Wrench',
    color: 'text-stone-600',
    items: [
      { id: 'arac-kontrol-listesi', title: 'Araç Kontrol Listesi' },
      { id: 'makine-bakim-formu', title: 'Makine Bakım Formu' },
      { id: 'forklift-kontrol', title: 'Forklift Günlük Kontrol Formu' },
      { id: 'arac-zimmet', title: 'Araç Zimmet Tutanağı' },
      { id: 'makine-envanter', title: 'Makine Envanteri' },
    ],
  },
  {
    key: 'periyodik-kontrol',
    title: 'Periyodik Kontrol Belgeleri',
    icon: 'Clock',
    color: 'text-fuchsia-600',
    items: [
      { id: 'asansor-kontrol', title: 'Asansör Periyodik Kontrol' },
      { id: 'basincli-kap', title: 'Basınçlı Kap Kontrolü' },
      { id: 'elektrik-tesisati', title: 'Elektrik Tesisatı Kontrolü' },
      { id: 'topraklama-kontrol', title: 'Topraklama Ölçümü' },
      { id: 'paratoner-kontrol', title: 'Paratoner Kontrolü' },
      { id: 'yangin-tup-kontrol', title: 'Yangın Tüpü Kontrolü' },
      { id: 'yangin-dolap-kontrol', title: 'Yangın Dolabı Kontrolü' },
      { id: 'kompressor-kontrol', title: 'Kompresör Kontrolü' },
      { id: 'vinc-kontrol', title: 'Vinç/Kaldırma Ekipmanı Kontrolü' },
      { id: 'kazan-kontrol', title: 'Kazan Periyodik Kontrolü' },
      { id: 'havalandirma-kontrol', title: 'Havalandırma Sistemi Kontrolü' },
      { id: 'jenerator-kontrol', title: 'Jeneratör Kontrolü' },
      { id: 'lpg-kontrol', title: 'LPG Tesisat Kontrolü' },
      { id: 'merdiven-iskele', title: 'Merdiven/İskele Kontrolü' },
    ],
  },
  {
    key: 'diger-kayitlar',
    title: 'Diğer Kayıtlar',
    icon: 'FolderOpen',
    color: 'text-gray-600',
    items: [
      { id: 'msds-kayit', title: 'MSDS/GBF Kayıt Formu' },
      { id: 'is-izni-formu', title: 'İş İzni Formu' },
      { id: 'sicak-is-izni', title: 'Sıcak İş İzni Formu' },
      { id: 'yuksekte-is-izni', title: 'Yüksekte Çalışma İzni' },
      { id: 'kapali-alan-izni', title: 'Kapalı Alan Giriş İzni' },
      { id: 'kazi-is-izni', title: 'Kazı İş İzni' },
      { id: 'ortam-olcum', title: 'Ortam Ölçüm Raporu' },
      { id: 'gurultu-haritasi', title: 'Gürültü Haritası' },
      { id: 'aydinlatma-olcum', title: 'Aydınlatma Ölçüm Raporu' },
      { id: 'termal-konfor', title: 'Termal Konfor Ölçümü' },
      { id: 'toz-olcum', title: 'Toz Ölçüm Raporu' },
      { id: 'titresim-olcum', title: 'Titreşim Ölçüm Raporu' },
    ],
  },
  {
    key: 'yangin-kimyasal',
    title: 'Yangın ve Kimyasallar',
    icon: 'Flame',
    color: 'text-red-500',
    items: [
      { id: 'yangin-risk-analizi', title: 'Yangın Risk Analizi' },
      { id: 'yangin-sondurme-plani', title: 'Yangın Söndürme Planı' },
      { id: 'kimyasal-envanter', title: 'Kimyasal Madde Envanteri' },
      { id: 'kimyasal-risk', title: 'Kimyasal Risk Değerlendirmesi' },
      { id: 'kimyasal-depolama', title: 'Kimyasal Depolama Planı' },
      { id: 'yangin-tatbikat', title: 'Yangın Tatbikat Raporu' },
      { id: 'yangin-ekipman-kontrol', title: 'Yangın Ekipman Kontrol Çizelgesi' },
    ],
  },
  {
    key: 'ilkyardim',
    title: 'İlkyardım Eğitimleri',
    icon: 'Heart',
    color: 'text-pink-600',
    items: [
      { id: 'ilkyardim-egitim-plani', title: 'İlkyardım Eğitim Planı' },
      { id: 'ilkyardimci-listesi', title: 'İlkyardımcı Listesi' },
      { id: 'ilkyardim-malzeme', title: 'İlkyardım Malzeme Kontrol Formu' },
    ],
  },
];

// Helper: get group by key
export function getGroupByKey(key: string): DocumentGroup | undefined {
  return DOCUMENT_GROUPS.find((g) => g.key === key);
}

// Helper: get all P1 items
export function getP1Items(): { group: DocumentGroup; item: DocumentGroupItem }[] {
  const result: { group: DocumentGroup; item: DocumentGroupItem }[] = [];
  for (const group of DOCUMENT_GROUPS) {
    for (const item of group.items) {
      if (item.isP1) result.push({ group, item });
    }
  }
  return result;
}

// Helper: total document count
export function getTotalDocumentCount(): number {
  return DOCUMENT_GROUPS.reduce((sum, g) => sum + g.items.length, 0);
}
