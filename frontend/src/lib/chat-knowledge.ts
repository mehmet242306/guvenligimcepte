/**
 * RiskNova Sohbet Botu - Site Haritası ve Rehberlik Bilgi Tabanı
 *
 * Tüm sayfa rotaları, açıklamaları ve kullanıcı rehberlik bilgilerini içerir.
 */

export type SiteRoute = {
  path: string;
  label: string;
  description: string;
  keywords: string[];
  category: string;
};

export const siteRoutes: SiteRoute[] = [
  // Dashboard
  {
    path: "/dashboard",
    label: "Dashboard",
    description: "Ana kontrol paneli. Firmaların genel durumu, risk skorları, açık aksiyonlar ve operasyonel metrikleri tek ekranda görüntüleyin.",
    keywords: ["dashboard", "panel", "ana sayfa", "genel durum", "özet", "metrik", "skor"],
    category: "Genel",
  },
  // Firmalar
  {
    path: "/companies",
    label: "Firmalar",
    description: "Firma listesi ve yönetimi. Yeni firma ekleyin, mevcut firmaları düzenleyin, personel ve lokasyon yönetimi yapın.",
    keywords: ["firma", "şirket", "kurum", "işyeri", "organizasyon", "ekle", "liste"],
    category: "Firma Yönetimi",
  },
  // Risk Analizi
  {
    path: "/risk-analysis",
    label: "Risk Analizi",
    description: "Risk değerlendirmesi oluşturun. R-SKOR, Fine-Kinney veya L-Matris metoduyla risk analizi yapın, AI destekli yorumlama alın.",
    keywords: ["risk", "analiz", "değerlendirme", "tehlike", "rskor", "fine kinney", "matris", "tehlike"],
    category: "Risk Yönetimi",
  },
  // Olaylar
  {
    path: "/incidents",
    label: "Olay Kayıtları",
    description: "İş kazası, ramak kala olay ve meslek hastalığı kayıtlarını yönetin. Yeni olay kaydı oluşturun, DÖF ve İshikawa analizi yapın.",
    keywords: ["olay", "kaza", "iş kazası", "ramak kala", "meslek hastalığı", "tutanak", "bildirim"],
    category: "Olay Yönetimi",
  },
  {
    path: "/incidents/new",
    label: "Yeni Olay Kaydı",
    description: "İş kazası, ramak kala olay veya meslek hastalığı kaydı oluşturun. Firma ve personel seçimi, olay detayları, yaralanma bilgileri ve DÖF/İshikawa gereksinimi belirleyin.",
    keywords: ["yeni olay", "kaza kaydı", "ramak kala kaydı", "olay oluştur", "bildirim formu", "sgk formu"],
    category: "Olay Yönetimi",
  },
  // Skor Geçmişi
  {
    path: "/score-history",
    label: "Skor Geçmişi",
    description: "Risk analizi sonuçlarının geçmişini ve trend grafiklerini görüntüleyin. R-SKOR değişimlerini takip edin.",
    keywords: ["skor", "geçmiş", "trend", "grafik", "puan", "değişim", "takip"],
    category: "Risk Yönetimi",
  },
  // Planlayıcı
  {
    path: "/planner",
    label: "Planlayıcı",
    description: "İSG görev ve aktivitelerini planlayın. Eğitim, denetim, tatbikat ve periyodik kontrol takvimini yönetin.",
    keywords: ["plan", "planlayıcı", "takvim", "görev", "eğitim", "denetim", "tatbikat", "periyodik"],
    category: "Planlama",
  },
  // Puantaj
  {
    path: "/timesheet",
    label: "Puantaj",
    description: "Personel puantaj ve bordro takibi. Günlük devam durumu, mesai, izin ve fazla çalışma kayıtlarını yönetin.",
    keywords: ["puantaj", "bordro", "mesai", "izin", "devam", "çalışma saati", "fazla mesai"],
    category: "İnsan Kaynakları",
  },
  // Raporlar
  {
    path: "/reports",
    label: "Raporlar",
    description: "İSG raporları oluşturun ve indirin. Risk analiz raporları, olay raporları, DÖF raporları ve istatistiksel analizler.",
    keywords: ["rapor", "döküman", "çıktı", "pdf", "excel", "istatistik", "analiz raporu"],
    category: "Raporlama",
  },
  // Ayarlar
  {
    path: "/settings",
    label: "Ayarlar",
    description: "Platform ayarları. Organizasyon bilgileri, kullanıcı yönetimi, bildirim tercihleri ve tema ayarları.",
    keywords: ["ayar", "tercih", "bildirim", "tema", "profil", "organizasyon", "kullanıcı"],
    category: "Ayarlar",
  },
  // Profil
  {
    path: "/profile",
    label: "Profil",
    description: "Hesap bilgilerinizi görüntüleyin ve düzenleyin. Şifre değiştirme, profil güncelleme.",
    keywords: ["profil", "hesap", "şifre", "bilgi", "güncelle"],
    category: "Ayarlar",
  },
];

export type QuickAction = {
  label: string;
  path: string;
  icon: string;
};

export const quickActions: QuickAction[] = [
  { label: "Yeni Olay Kaydı", path: "/incidents/new", icon: "🚨" },
  { label: "Risk Analizi Başlat", path: "/risk-analysis", icon: "📊" },
  { label: "Firma Ekle", path: "/companies", icon: "🏢" },
  { label: "Planlayıcıya Git", path: "/planner", icon: "📅" },
  { label: "Raporları Gör", path: "/reports", icon: "📋" },
  { label: "Dashboard", path: "/dashboard", icon: "🏠" },
];

export type FAQ = {
  question: string;
  answer: string;
  keywords: string[];
  route?: string;
};

export const faqs: FAQ[] = [
  {
    question: "İş kazası nasıl kaydedilir?",
    answer: "Olaylar > Yeni Olay Kaydı sayfasından 'İş Kazası' tipini seçerek başlayabilirsiniz. Firma, personel, olay detayları ve yaralanma bilgilerini adım adım girersiniz.",
    keywords: ["iş kazası", "kaza kaydı", "nasıl", "kaydet"],
    route: "/incidents/new",
  },
  {
    question: "DÖF nedir ve nasıl oluşturulur?",
    answer: "DÖF (Düzeltici ve Önleyici Faaliyet), bir olay sonrası kök neden analizi yaparak tekrarını önlemeye yönelik aksiyon planıdır. Olay kaydı oluşturduktan sonra DÖF sayfasına yönlendirilirsiniz. AI destekli İshikawa analizi ile kök nedenler otomatik belirlenir.",
    keywords: ["döf", "düzeltici", "önleyici", "faaliyet", "kök neden"],
    route: "/incidents",
  },
  {
    question: "İshikawa (Balıkkılçığı) analizi nedir?",
    answer: "İshikawa diyagramı, 6M metoduyla (İnsan, Makine, Metot, Malzeme, Çevre, Ölçüm) bir sorunun kök nedenlerini görsel olarak analiz eden araçtır. DÖF sayfası içinde entegre çalışır ve AI destekli öneriler sunar.",
    keywords: ["ishikawa", "balıkkılçığı", "6m", "kök neden", "analiz"],
    route: "/incidents",
  },
  {
    question: "Ramak kala olay nedir?",
    answer: "Ramak kala olay, yaralanma veya hastalık meydana gelmeden gerçekleşen tehlikeli durumdur. Kaydetmek proaktif güvenlik kültürü için kritiktir. Olaylar > Yeni Olay Kaydı'ndan 'Ramak Kala Olay' tipini seçerek kaydedebilirsiniz.",
    keywords: ["ramak kala", "near miss", "tehlikeli durum"],
    route: "/incidents/new",
  },
  {
    question: "Risk analizi nasıl yapılır?",
    answer: "Risk Analizi sayfasından yeni bir değerlendirme başlatın. R-SKOR, Fine-Kinney veya L-Matris metodundan birini seçin, risk kalemlerini girin. AI destekli yorumlama otomatik oluşturulur.",
    keywords: ["risk analizi", "değerlendirme", "rskor", "fine kinney"],
    route: "/risk-analysis",
  },
  {
    question: "Personel nasıl eklenir?",
    answer: "Firmalar sayfasından ilgili firmayı seçin, 'Personel' sekmesine gidin. CSV/Excel import ile toplu yükleme yapabilir veya tek tek ekleyebilirsiniz.",
    keywords: ["personel", "çalışan", "ekle", "import", "csv"],
    route: "/companies",
  },
  {
    question: "SGK bildirim formu otomatik dolduruluyor mu?",
    answer: "Evet, olay kaydı oluştururken firma ve personel seçimi yaptığınızda SGK İş Kazası Bildirim Formu'ndaki alanlar otomatik doldurulur. Firma sayfasından SGK İşyeri Sicil No, Vergi No gibi bilgileri önceden girmeniz gerekir.",
    keywords: ["sgk", "bildirim", "form", "otomatik"],
    route: "/incidents/new",
  },
  {
    question: "Puantaj sistemi nasıl çalışır?",
    answer: "Puantaj sayfasından personelin günlük devam durumu, mesai, izin ve fazla çalışma kayıtlarını girebilirsiniz. Excel ve PDF export desteklidir.",
    keywords: ["puantaj", "bordro", "mesai", "devam"],
    route: "/timesheet",
  },
  {
    question: "Tema nasıl değiştirilir?",
    answer: "Sağ üstteki güneş/ay ikonuna tıklayarak açık ve koyu tema arasında geçiş yapabilirsiniz.",
    keywords: ["tema", "dark mode", "koyu", "açık", "karanlık"],
  },
];

/**
 * Kullanıcı mesajını analiz edip en uygun yanıtı bul
 */
export function findBestResponse(message: string): {
  text: string;
  route?: string;
  suggestions?: QuickAction[];
} {
  const q = message.toLowerCase().trim();

  // Selamlama
  if (/^(merhaba|selam|hey|hi|hello|günaydın|iyi günler|iyi akşamlar)/.test(q)) {
    return {
      text: "Merhaba! Ben RiskNova asistanınız. Size nasıl yardımcı olabilirim? İSG süreçleriniz hakkında sorularınızı yanıtlayabilir veya platforma yönlendirebilirim.",
      suggestions: quickActions.slice(0, 4),
    };
  }

  // Yardım
  if (/^(yardım|help|ne yapabilirim|nasıl kullanılır)/.test(q)) {
    return {
      text: "RiskNova ile yapabilecekleriniz:\n\n• İş kazası, ramak kala ve meslek hastalığı kayıtları\n• Risk analizi (R-SKOR, Fine-Kinney, L-Matris)\n• DÖF ve İshikawa kök neden analizi\n• Firma ve personel yönetimi\n• Puantaj ve bordro takibi\n• Raporlama ve döküman oluşturma\n\nHangi konuda yardım istersiniz?",
      suggestions: quickActions,
    };
  }

  // FAQ eşleştirme
  let bestFaq: FAQ | null = null;
  let bestScore = 0;
  for (const faq of faqs) {
    let score = 0;
    for (const kw of faq.keywords) {
      if (q.includes(kw.toLowerCase())) score += kw.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestFaq = faq;
    }
  }

  if (bestFaq && bestScore >= 3) {
    return {
      text: bestFaq.answer,
      route: bestFaq.route,
    };
  }

  // Rota eşleştirme
  let bestRoute: SiteRoute | null = null;
  let bestRouteScore = 0;
  for (const route of siteRoutes) {
    let score = 0;
    for (const kw of route.keywords) {
      if (q.includes(kw.toLowerCase())) score += kw.length;
    }
    if (score > bestRouteScore) {
      bestRouteScore = score;
      bestRoute = route;
    }
  }

  if (bestRoute && bestRouteScore >= 3) {
    return {
      text: `**${bestRoute.label}**: ${bestRoute.description}`,
      route: bestRoute.path,
    };
  }

  // Fallback
  return {
    text: "Bu konuda size yardımcı olmak isterim. Daha spesifik sorabilir misiniz? Örneğin:\n\n• \"İş kazası nasıl kaydedilir?\"\n• \"Risk analizi yapmak istiyorum\"\n• \"DÖF nedir?\"\n• \"Personel nasıl eklenir?\"",
    suggestions: quickActions.slice(0, 4),
  };
}
