import type { NovaAgentNavigation } from "@/lib/nova/agent";

export type NovaNavigationIntent = {
  answer: string;
  navigation: NovaAgentNavigation;
};

type NovaNavigationTarget = {
  destination: string;
  url: string;
  label: string;
  reason: string;
  priority: number;
  matches: (normalized: string) => boolean;
};

export function normalizeNovaNavigationText(message: string) {
  return message
    .toLowerCase()
    .replace(/ı/g, "i")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "");
}

const navigationVerbPattern =
  /(ac|git|gotur|yonlendir|nerede|hangi alan|hangi sayfa|alana|sayfaya|open|navigate|go to|show)/;

const navigationTargets: NovaNavigationTarget[] = [
  {
    destination: "isg_library_documents",
    url: "/isg-library?section=documentation",
    label: "ISG Kutuphanesi Dokumanlari",
    reason: "Hazir ISG dokumanlari, sablonlar, prosedurler ve formlar ISG Kutuphanesi icindeki Dokumantasyon bolumunde bulunur.",
    priority: 100,
    matches: (text) =>
      /(isg kutuphan|kutuphan)/.test(text) ||
      (/(dokuman|belge|form|prosedur|talimat|sablon|template)/.test(text) &&
        /(hazir|ornek|kutuphane|katalog|dokumantasyon)/.test(text)),
  },
  {
    destination: "document_editor",
    url: "/documents/new",
    label: "Dokuman Editoru",
    reason: "Sifirdan yeni dokuman veya taslak hazirlamak icin Dokuman Editoru kullanilir.",
    priority: 80,
    matches: (text) =>
      /(dokuman|belge|form|prosedur|talimat)/.test(text) &&
      /(editor|sifirdan|bos|yeni dokuman|olustur|taslak)/.test(text),
  },
  {
    destination: "documents",
    url: "/documents",
    label: "Dokumanlar",
    reason: "Kayitli dokumanlarinizi goruntulemek ve editor belgelerine ulasmak icin Dokumanlar alani kullanilir.",
    priority: 70,
    matches: (text) =>
      /(dokumanlarim|belgelerim|kayitli dokuman|dokuman arsiv|belge arsiv|dokumanlar)/.test(text),
  },
  {
    destination: "solution_documents",
    url: "/solution-center/documents",
    label: "Nova Dokumanlari",
    reason: "Nova tarafindan hazirlanan belge taslaklari ve sohbetten uretilen dokuman akislarini burada takip edebilirsiniz.",
    priority: 60,
    matches: (text) => /(nova dokuman|solution center.*dokuman|sohbet.*dokuman)/.test(text),
  },
  {
    destination: "planner",
    url: "/planner",
    label: "Ajanda",
    reason: "Gorev, egitim, yillik calisma plani ve takip isleri Ajanda alaninda yonetilir.",
    priority: 50,
    matches: (text) => /(ajanda|planlayici|planner|takvim|gorev|egitim plani|yillik calisma)/.test(text),
  },
  {
    destination: "risk_analysis",
    url: "/risk-analysis",
    label: "Risk Analizi",
    reason: "Risk analizi kayitlari ve yeni analiz akislari Risk Analizi alaninda baslatilir.",
    priority: 50,
    matches: (text) => /(risk analizi|analiz|risk degerlendirme|risk assessment)/.test(text),
  },
  {
    destination: "corrective_actions",
    url: "/corrective-actions",
    label: "DOF",
    reason: "Duzeltici onleyici faaliyet takipleri DOF alaninda yonetilir.",
    priority: 50,
    matches: (text) => /(dof|duzeltici|onleyici|corrective|preventive)/.test(text),
  },
  {
    destination: "incidents",
    url: "/incidents",
    label: "Aksiyon",
    reason: "Is kazasi, ramak kala ve olay takipleri Aksiyon alaninda yonetilir.",
    priority: 50,
    matches: (text) => /(olay|ramak kala|is kazasi|kaza|incident|near miss|aksiyon)/.test(text),
  },
  {
    destination: "isg_library",
    url: "/isg-library",
    label: "ISG Kutuphanesi",
    reason: "Mevzuat, rehber ve kutuphane icerikleri ISG Kutuphanesi alaninda bulunur.",
    priority: 50,
    matches: (text) => /(isg kutuphanesi|kutuphane|mevzuat|kanun|yonetmelik|library|legal)/.test(text),
  },
  {
    destination: "reports",
    url: "/reports",
    label: "Raporlar",
    reason: "Raporlama ve cikti alma islemleri Raporlar alaninda toplanir.",
    priority: 50,
    matches: (text) => /(rapor|raporlar|report|reports|cikti|ozet)/.test(text),
  },
  {
    destination: "settings",
    url: "/settings",
    label: "Ayarlar",
    reason: "Hesap, kullanici, yetki ve sistem ayarlari Ayarlar alaninda yonetilir.",
    priority: 50,
    matches: (text) => /(ayar|ayarlar|yetki|kullanici|settings|permission|role)/.test(text),
  },
  {
    destination: "profile",
    url: "/profile",
    label: "Profil",
    reason: "Kisisel profil ve hesap bilgileri Profil alaninda goruntulenir.",
    priority: 50,
    matches: (text) => /(profil|profile|hesabim|hesap bilgilerim)/.test(text),
  },
  {
    destination: "workspace",
    url: "/solution-center",
    label: "Nova Calisma Alani",
    reason: "Nova sohbeti, yonlendirme ve operasyon yardimi Nova Calisma Alani uzerinden ilerler.",
    priority: 50,
    matches: (text) => /(calisma alani|workspace|nova calisma|nova alani)/.test(text),
  },
];

export function resolveNovaGreetingIntent(message: string): string | null {
  const normalized = normalizeNovaNavigationText(message).trim();
  const compact = normalized.replace(/[.!?,;:\s]+/g, " ");

  if (!/^(merhaba|selam|selamlar|hello|hi|hey|gunaydin|iyi aksamlar|iyi gunler)$/.test(compact)) {
    return null;
  }

  return "Merhaba, ben Nova. RiskNova icinde ISG sorularinizi yanitlayabilir, mevzuat ve dokuman kutuphanesine yonlendirebilir, risk analizi, ajanda, DOF, aksiyon ve rapor ekranlarinda size rehberlik edebilirim.";
}

export function resolveNovaNavigationIntent(message: string): NovaNavigationIntent | null {
  const normalized = normalizeNovaNavigationText(message);
  const asksForNavigation = navigationVerbPattern.test(normalized);

  if (!asksForNavigation) {
    return null;
  }

  const target = navigationTargets
    .filter((item) => item.matches(normalized))
    .sort((a, b) => b.priority - a.priority)[0];

  if (!target) {
    return null;
  }

  return {
    answer: `${target.label} alanina yonlendirebilirim. ${target.reason}`,
    navigation: {
      action: "navigate",
      url: target.url,
      label: target.label,
      reason: target.reason,
      destination: target.destination,
      auto_navigate: false,
    },
  };
}
