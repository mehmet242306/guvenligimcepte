import type { NovaAgentNavigation } from "@/lib/nova/agent";
import {
  isNovaHardGateTask,
  shouldSkipNovaNavigationForContentTask,
} from "@/lib/nova/behavior-prompt";
import {
  hasExplicitNavigationVerb,
  isNovaExplicitReportsNavigationRequest,
  isNovaReportContentAdvisoryTask,
} from "@/lib/nova/nova-report-intent";
import {
  isForbiddenUserNavigationCopy,
  isNovaRagServiceRequest,
  sanitizeNovaNavigationForUser,
  stripForbiddenNavigationFromAnswer,
} from "@/lib/nova/nova-navigation-policy";

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
  matches: (normalized: string, message?: string) => boolean;
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

/** “rapor” tek başına navigation değildir — ayrı explicit reports akışı. */
const documentIntentPattern =
  /(dokuman\s*lar|dokuman|belge\s*ler|belge|form|prosedur|talimat|sablon|template|sunum|dokumantasyon)/;
const documentWorkPattern =
  /(hazirla|olustur|uret|yaz|taslak|gerek|gerekiyor|lazim|ihtiyac|hazirlayabilecegim|hazirlayacagim)/;
const personalDocumentPattern =
  /(dokumanlarim|belgelerim|kayitli dokuman|kayitli belge|dokuman arsiv|belge arsiv|kendi dokuman)/;
const shortDocumentLookupPattern =
  /^(dokuman\s*lar|dokuman|belge\s*ler|belge|prosedur|prosedurler|form|formlar|talimat|talimatlar|sablon|sablonlar|dokumantasyon)$/;

function isDocumentLookup(normalized: string, message: string) {
  if (shouldSkipNovaNavigationForContentTask(message)) return false;
  if (isNovaReportContentAdvisoryTask(message)) return false;
  return (
    documentIntentPattern.test(normalized) &&
    (documentWorkPattern.test(normalized) ||
      navigationVerbPattern.test(normalized) ||
      shortDocumentLookupPattern.test(normalized))
  );
}

/** DÖF/olay/risk gibi modül adı + oluştur/nasıl/nerede birlikte — "döf oluşturmam gerekiyor" gibi */
function isOperationalModuleLookup(normalized: string) {
  const mentionsModule =
    /(dof|duzeltici|onleyici|corrective|preventive|ramak kala|olay|incident|risk analizi|risk assessment|egitim|training|sinav|anket|ajanda|planner|takvim|gorev)/.test(
      normalized,
    );
  const mentionsAction =
    /(olustur|planla|yeni|ekle|basla|ac|git|nerede|nerde|nasil|gerek|lazim|istiyorum|kaydet|hazirla)/.test(
      normalized,
    );
  return mentionsModule && mentionsAction;
}

function shouldResolveNavigation(message: string, normalized: string) {
  if (shouldSkipNovaNavigationForContentTask(message) || isNovaReportContentAdvisoryTask(message)) {
    return false;
  }

  if (isNovaExplicitReportsNavigationRequest(message)) {
    return true;
  }

  if (isDocumentLookup(normalized, message) || isOperationalModuleLookup(normalized)) {
    return true;
  }

  return hasExplicitNavigationVerb(message) || navigationVerbPattern.test(normalized);
}

const navigationTargets: NovaNavigationTarget[] = [
  {
    destination: "documents",
    url: "/documents",
    label: "Dokümanlar",
    reason: "Kayıtlı veya size ait editör belgelerini görüntülemek için Dokümanlar alanı kullanılır.",
    priority: 120,
    matches: (text) => personalDocumentPattern.test(text),
  },
  {
    destination: "isg_library_documents",
    url: "/isg-library?section=documentation",
    label: "İSG Kütüphanesi Dokümanları",
    reason: "Hazır İSG dokümanları, şablonlar, prosedürler ve formlar İSG Kütüphanesi içindeki Dokümantasyon bölümünde bulunur.",
    priority: 110,
    matches: (text) =>
      /(isg kutuphan|kutuphan|dokumantasyon)/.test(text) ||
      (documentIntentPattern.test(text) && !personalDocumentPattern.test(text)),
  },
  {
    destination: "document_editor",
    url: "/documents/new",
    label: "Doküman Editörü",
    reason: "Sıfırdan yeni doküman veya taslak hazırlamak için Doküman Editörü kullanılır.",
    priority: 130,
    matches: (text) =>
      /(dokuman|belge|form|prosedur|talimat)/.test(text) &&
      /(editor|sifirdan|bos|yeni dokuman|ozel dokuman|kendi dokumanim)/.test(text),
  },
  {
    destination: "planner",
    url: "/planner",
    label: "Ajanda",
    reason: "Görev, eğitim, yıllık çalışma planı ve takip işleri Ajanda alanında yönetilir.",
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
    reason: "Sablonlar, taslaklar ve operasyon paketleri ISG Kutuphanesi alaninda bulunur.",
    priority: 50,
    matches: (text) => /(isg kutuphanesi|kutuphane|sablon|library|template|operasyon paketi)/.test(text),
  },
  {
    destination: "reports",
    url: "/reports",
    label: "Raporlar",
    reason: "Raporlama ve cikti alma islemleri Raporlar alaninda toplanir.",
    priority: 115,
    matches: (text, message) => isNovaExplicitReportsNavigationRequest(message ?? text),
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

  return "Merhaba, ben Nova. RiskNova içinde İSG sorularınızı yanıtlayabilir, mevzuat kontrolünü sohbet içinde yapabilir, risk analizi, ajanda, DÖF, aksiyon ve rapor ekranlarında size rehberlik edebilirim.";
}

export function resolveNovaNavigationIntent(message: string): NovaNavigationIntent | null {
  const normalized = normalizeNovaNavigationText(message);

  if (isNovaRagServiceRequest(message) || isNovaHardGateTask(message)) {
    return null;
  }

  if (!shouldResolveNavigation(message, normalized)) {
    return null;
  }

  const target = navigationTargets
    .filter((item) => item.matches(normalized, message))
    .filter((item) => !/(mevzuat|kanun|yonetmelik|teblig|legal|regulation)\b/.test(item.destination))
    .sort((a, b) => b.priority - a.priority)[0];

  if (!target) {
    return null;
  }

  const navigation: NovaAgentNavigation = {
    action: "navigate",
    url: target.url,
    label: target.label,
    reason: target.reason,
    destination: target.destination,
    auto_navigate: false,
  };

  const safeNavigation = sanitizeNovaNavigationForUser(navigation);
  if (!safeNavigation) {
    return null;
  }

  const answer = stripForbiddenNavigationFromAnswer(
    `${target.label} alanına yönlendiriyorum. ${target.reason} Aşağıdaki "Sayfaya Git" butonuyla doğrudan açabilirsiniz.`,
  );

  if (isForbiddenUserNavigationCopy(answer)) {
    return null;
  }

  return {
    answer,
    navigation: safeNavigation,
  };
}
