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
    .replace(/\u0131/g, "i")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9?&=\/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const navigationVerbPattern =
  /(ac|git|gotur|goster|listele|yonlendir|nerede|nerde|neresi|nerededir|hangi alan|hangi sayfa|alana|sayfaya|nereye|bul|ulas|erisim|open|navigate|go to|show)/;

const documentIntentPattern =
  /(dokuman\s*lar|dokuman|belge\s*ler|belge|form|prosedur|talimat|sablon|template|rapor|sunum|dokumantasyon)/;
const documentWorkPattern =
  /(hazirla|olustur|uret|yaz|taslak|gerek|gerekiyor|lazim|ihtiyac|hazirlayabilecegim|hazirlayacagim)/;
const personalDocumentPattern =
  /(dokumanlarim|belgelerim|kayitli dokuman|kayitli belge|dokuman arsiv|belge arsiv|kendi dokuman)/;
const shortDocumentLookupPattern =
  /^(dokuman\s*lar|dokuman|belge\s*ler|belge|prosedur|prosedurler|form|formlar|talimat|talimatlar|sablon|sablonlar|dokumantasyon)$/;

function isDocumentLookup(normalized: string) {
  return (
    documentIntentPattern.test(normalized) &&
    (documentWorkPattern.test(normalized) ||
      navigationVerbPattern.test(normalized) ||
      shortDocumentLookupPattern.test(normalized))
  );
}

function shouldResolveNavigation(normalized: string) {
  return navigationVerbPattern.test(normalized) || isDocumentLookup(normalized);
}

const navigationTargets: NovaNavigationTarget[] = [
  {
    destination: "documents",
    url: "/documents",
    label: "Dokumanlar",
    reason: "Kayitli veya size ait editor belgelerini goruntulemek icin Dokumanlar alani kullanilir.",
    priority: 120,
    matches: (text) => personalDocumentPattern.test(text),
  },
  {
    destination: "isg_library_documents",
    url: "/isg-library?section=documentation",
    label: "ISG Kutuphanesi Dokumanlari",
    reason: "Hazir ISG dokumanlari, sablonlar, prosedurler ve formlar ISG Kutuphanesi icindeki Dokumantasyon bolumunde bulunur.",
    priority: 110,
    matches: (text) =>
      /(isg kutuphan|kutuphan|dokumantasyon)/.test(text) ||
      (documentIntentPattern.test(text) && !personalDocumentPattern.test(text)),
  },
  {
    destination: "document_editor",
    url: "/documents/new",
    label: "Dokuman Editoru",
    reason: "Sifirdan yeni dokuman veya taslak hazirlamak icin Dokuman Editoru kullanilir.",
    priority: 130,
    matches: (text) =>
      /(dokuman|belge|form|prosedur|talimat)/.test(text) &&
      /(editor|sifirdan|bos|yeni dokuman|ozel dokuman|kendi dokumanim)/.test(text),
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
    priority: 115,
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
    destination: "dashboard",
    url: "/dashboard",
    label: "Panel",
    reason: "Nova artik sag alttaki sohbet ajanidir; ana modullere Panel uzerinden de ulasabilirsiniz.",
    priority: 50,
    matches: (text) => /(nova merkezi|nova calisma|nova alani|panel|ana panel)/.test(text),
  },
];

export function resolveNovaGreetingIntent(message: string): string | null {
  const compact = normalizeNovaNavigationText(message).replace(/[.!?,;:\s]+/g, " ");

  if (!/^(merhaba|selam|selamlar|hello|hi|hey|gunaydin|iyi aksamlar|iyi gunler)$/.test(compact)) {
    return null;
  }

  return "Merhaba, ben Nova. RiskNova icinde ISG sorularinizi yanitlayabilir, mevzuat ve dokuman kutuphanesine yonlendirebilir, risk analizi, ajanda, DOF, aksiyon ve rapor ekranlarinda size rehberlik edebilirim.";
}

export function resolveNovaNavigationIntent(message: string): NovaNavigationIntent | null {
  const normalized = normalizeNovaNavigationText(message);

  if (!shouldResolveNavigation(normalized)) {
    return null;
  }

  const target = navigationTargets
    .filter((item) => item.matches(normalized))
    .sort((a, b) => b.priority - a.priority)[0];

  if (!target) {
    return null;
  }

  return {
    answer: `${target.label} alanina yonlendiriyorum. ${target.reason} Asagidaki "Sayfaya Git" butonuyla dogrudan acabilirsiniz.`,
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
