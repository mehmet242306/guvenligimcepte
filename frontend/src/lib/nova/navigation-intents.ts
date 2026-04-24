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
  patterns: RegExp[];
};

export function normalizeNovaNavigationText(message: string) {
  return message
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "");
}

const navigationVerbPattern =
  /(ac|git|gotur|yonlendir|nerede|hangi alan|hangi sayfa|alana|sayfaya|open|navigate|go to|show)/;

const navigationTargets: NovaNavigationTarget[] = [
  {
    destination: "solution_documents",
    url: "/solution-center/documents",
    label: "Nova Dokumanlari",
    reason: "Dokuman hazirlama, belge taslagi ve kayitli dokuman akislari bu alanda yonetilir.",
    patterns: [/(dokuman|belge|evrak|form|prosedur|talimat|document|documents)/],
  },
  {
    destination: "planner",
    url: "/planner",
    label: "Ajanda",
    reason: "Gorev, egitim, yillik calisma plani ve takip isleri Ajanda alaninda yonetilir.",
    patterns: [/(ajanda|planlayici|planner|takvim|gorev|egitim plani|yillik calisma)/],
  },
  {
    destination: "risk_analysis",
    url: "/risk-analysis",
    label: "Risk Analizi",
    reason: "Risk analizi kayitlari ve yeni analiz akislari Risk Analizi alaninda baslatilir.",
    patterns: [/(risk analizi|analiz|risk degerlendirme|risk assessment)/],
  },
  {
    destination: "corrective_actions",
    url: "/corrective-actions",
    label: "DOF",
    reason: "Duzeltici onleyici faaliyet takipleri DOF alaninda yonetilir.",
    patterns: [/(dof|duzeltici|onleyici|corrective|preventive)/],
  },
  {
    destination: "incidents",
    url: "/incidents",
    label: "Aksiyon",
    reason: "Is kazasi, ramak kala ve olay takipleri Aksiyon alaninda yonetilir.",
    patterns: [/(olay|ramak kala|is kazasi|kaza|incident|near miss|aksiyon)/],
  },
  {
    destination: "isg_library",
    url: "/isg-library",
    label: "ISG Kutuphanesi",
    reason: "Mevzuat, rehber ve kutuphane icerikleri ISG Kutuphanesi alaninda bulunur.",
    patterns: [/(isg kutuphanesi|kutuphane|mevzuat|kanun|yonetmelik|library|legal)/],
  },
  {
    destination: "reports",
    url: "/reports",
    label: "Raporlar",
    reason: "Raporlama ve cikti alma islemleri Raporlar alaninda toplanir.",
    patterns: [/(rapor|raporlar|report|reports|cikti|ozet)/],
  },
  {
    destination: "settings",
    url: "/settings",
    label: "Ayarlar",
    reason: "Hesap, kullanici, yetki ve sistem ayarlari Ayarlar alaninda yonetilir.",
    patterns: [/(ayar|ayarlar|yetki|kullanici|settings|permission|role)/],
  },
  {
    destination: "profile",
    url: "/profile",
    label: "Profil",
    reason: "Kisisel profil ve hesap bilgileri Profil alaninda goruntulenir.",
    patterns: [/(profil|profile|hesabim|hesap bilgilerim)/],
  },
  {
    destination: "workspace",
    url: "/solution-center",
    label: "Nova Calisma Alani",
    reason: "Nova sohbeti, yonlendirme ve operasyon yardimi Nova Calisma Alani uzerinden ilerler.",
    patterns: [/(calisma alani|workspace|nova calisma|nova alani)/],
  },
];

export function resolveNovaNavigationIntent(message: string): NovaNavigationIntent | null {
  const normalized = normalizeNovaNavigationText(message);
  const asksForNavigation = navigationVerbPattern.test(normalized);

  if (!asksForNavigation) {
    return null;
  }

  const target = navigationTargets.find((item) =>
    item.patterns.some((pattern) => pattern.test(normalized)),
  );

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
