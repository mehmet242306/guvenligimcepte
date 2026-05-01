import type { NovaNavigationIntent } from "@/lib/nova/navigation-intents";
import { normalizeNovaNavigationText } from "@/lib/nova/navigation-intents";

/**
 * Nova “site ajanı” için RiskNova URL rehberi (kamuya açık + sık kullanılan uygulama rotaları).
 * Metinler API’de system/history içine gömülür; güncelleme: yeni sayfa eklenince burayı güncelle.
 */

export type NovaSiteAudience = "public" | "authenticated";

export type NovaSiteRoute = {
  path: string;
  label: string;
  audience: NovaSiteAudience;
  /** Kısa açıklama — prompt özeti için */
  summary: string;
  /** intent eşlemesi */
  match: (normalized: string) => boolean;
  priority: number;
};

function mkPublic(matchers: RegExp[]): (n: string) => boolean {
  return (normalized: string) => matchers.some((re) => re.test(normalized));
}

/** Kamuya açık sayfalar — giriş gerektirmez */
export const NOVA_PUBLIC_SITE_ROUTES: NovaSiteRoute[] = [
  {
    path: "/",
    label: "Ana sayfa",
    audience: "public",
    summary: "Ürün tanıtımı, özellikler ve nasıl çalışır bölümleri.",
    priority: 40,
    match: mkPublic([/(ana sayfa|tanitim|landing|ozellikler|nasil calisir)/]),
  },
  {
    path: "/pricing",
    label: "Paketler",
    audience: "public",
    summary: "Bireysel planlar, limit karşılaştırması ve ödeme.",
    priority: 120,
    match: mkPublic([/(paket|fiyat|ucret|abonelik|odeme|pricing|plan)/]),
  },
  {
    path: "/register",
    label: "Kayıt ol",
    audience: "public",
    summary: "Yeni hesap oluşturma.",
    priority: 115,
    match: mkPublic([/(kayit|hesap ac|uye ol|register|sign up)/]),
  },
  {
    path: "/login",
    label: "Giriş",
    audience: "public",
    summary: "Oturum açma.",
    priority: 114,
    match: mkPublic([/(giris|oturum ac|login|sign in)/]),
  },
  {
    path: "/forgot-password",
    label: "Şifre sıfırlama",
    audience: "public",
    summary: "E-posta ile şifre yenileme bağlantısı.",
    priority: 80,
    match: mkPublic([/(sifre sifirla|sifremi unuttum|forgot password|reset password)/]),
  },
  {
    path: "/cozumler/osgb",
    label: "OSGB çözümü",
    audience: "public",
    summary: "OSGB için teklif ve iletişim / kayıt akışı.",
    priority: 110,
    match: mkPublic([
      /(^osgb$|^osgb |osgb teklif|osgb cozum|osgb sayfa|osgb paket|osgb icin|osgb musteri)/,
    ]),
  },
  {
    path: "/cozumler/kurumsal",
    label: "Kurumsal çözüm",
    audience: "public",
    summary: "Çok lokasyonlu kurumlar için teklif ve iletişim.",
    priority: 110,
    match: mkPublic([
      /(kurumsal teklif|kurumsal cozum|kurumsal sayfa|enterprise|cok lokasyon|holding|kurumsal icin)/,
    ]),
  },
  {
    path: "/privacy",
    label: "Gizlilik politikası",
    audience: "public",
    summary: "Kişisel veri ve gizlilik metni.",
    priority: 35,
    match: mkPublic([/(gizlilik|privacy|kvkk|kisisel veri)/]),
  },
  {
    path: "/terms",
    label: "Kullanım şartları",
    audience: "public",
    summary: "Hizmet şartları.",
    priority: 34,
    match: mkPublic([/(kullanim sartlari|terms|sozlesme|hizmet sartlari)/]),
  },
  {
    path: "/refund-policy",
    label: "İade politikası",
    audience: "public",
    summary: "İade ve iptal kuralları.",
    priority: 33,
    match: mkPublic([/(iade|refund|iptal politik)/]),
  },
];

/** Oturum açık kullanıcılar için sık modüller (Nova yönlendirmesi ile uyumlu) */
export const NOVA_APP_SITE_ROUTES: NovaSiteRoute[] = [
  {
    path: "/dashboard",
    label: "Panel",
    audience: "authenticated",
    summary: "Özet ve modül girişleri.",
    priority: 50,
    match: mkPublic([/(^panel$|dashboard|ana panel)/]),
  },
  {
    path: "/risk-analysis",
    label: "Risk analizi",
    audience: "authenticated",
    summary: "Risk değerlendirme kayıtları ve analiz akışı.",
    priority: 55,
    match: mkPublic([/(risk analizi|risk assessment|risk degerlendirme)/]),
  },
  {
    path: "/documents",
    label: "Dokümanlar",
    audience: "authenticated",
    summary: "Belge ve şablonlar.",
    priority: 52,
    match: mkPublic([/(dokumanlarim|belgelerim|^dokuman|^belge)/]),
  },
  {
    path: "/isg-library",
    label: "İSG kütüphanesi",
    audience: "authenticated",
    summary: "Mevzuat ve hazır içerik.",
    priority: 52,
    match: mkPublic([/(isg kutuphan|mevzuat kutuphan|kutuphane)/]),
  },
  {
    path: "/corrective-actions",
    label: "DÖF",
    audience: "authenticated",
    summary: "Düzeltici önleyici faaliyetler.",
    priority: 51,
    match: mkPublic([/(dof|duzeltici|onleyici|capa)/]),
  },
  {
    path: "/incidents",
    label: "Olaylar / aksiyon",
    audience: "authenticated",
    summary: "Olay ve aksiyon takibi.",
    priority: 51,
    match: mkPublic([/(olay|ramak kala|incident|aksiyon)/]),
  },
  {
    path: "/training",
    label: "Eğitim",
    audience: "authenticated",
    summary: "Sınav, anket ve eğitim içerikleri.",
    priority: 54,
    match: mkPublic([/(egitim|sinav|anket|soru bankasi|training)/]),
  },
  {
    path: "/planner",
    label: "Ajanda",
    audience: "authenticated",
    summary: "Görev ve takvim.",
    priority: 50,
    match: mkPublic([/(ajanda|planner|takvim|gorev plan)/]),
  },
  {
    path: "/settings",
    label: "Ayarlar",
    audience: "authenticated",
    summary: "Hesap ve kullanıcı ayarları.",
    priority: 48,
    match: mkPublic([/(ayarlar|settings|yetki|profil ayar)/]),
  },
  {
    path: "/workspace/onboarding",
    label: "Çalışma alanı kurulumu",
    audience: "authenticated",
    summary: "Workspace onboarding.",
    priority: 45,
    match: mkPublic([/(workspace|onboarding|calisma alani|kurulum)/]),
  },
];

const ALL_GUIDE_ROUTES = [...NOVA_PUBLIC_SITE_ROUTES, ...NOVA_APP_SITE_ROUTES];

/** `/api/nova/chat` → Claude öncesi history’e eklenir */
export function buildNovaSiteMapSummaryForPrompt(): string {
  const lines = ALL_GUIDE_ROUTES.sort((a, b) => b.priority - a.priority).map(
    (r) => `- [${r.audience}] ${r.path} — ${r.label}: ${r.summary}`,
  );
  return [
    "RiskNova site haritasi (kisa): Bu listeye uygun yonlendirme yap; uydurma URL kullanma.",
    ...lines,
    "Not: 'public' rotalar herkes icin; 'authenticated' rotalar giris sonrasi.",
  ].join("\n");
}

const overviewPattern =
  /(site haritasi|sayfa listesi|hangi sayfa|hangi link|nerede bulurum|tum sayfalar|menuden|navigasyon|site rehberi|sayfalari say|moduller nerede)/;

/** Genel “site haritası” sorusu — metin cevap */
export function resolveNovaSiteMapOverviewIntent(message: string): string | null {
  const normalized = normalizeNovaNavigationText(message);
  if (!overviewPattern.test(normalized)) return null;

  const pub = NOVA_PUBLIC_SITE_ROUTES.map(
    (r) => `• ${r.label}: ${r.path} — ${r.summary}`,
  ).join("\n");
  const app = NOVA_APP_SITE_ROUTES.map(
    (r) => `• ${r.label}: ${r.path} — ${r.summary} (giriş gerekir)`,
  ).join("\n");

  return [
    "RiskNova’da başlıca adresler:",
    "",
    "Herkes için:",
    pub,
    "",
    "Giriş sonrası modüller:",
    app,
    "",
    "Tam Nova (mevzuat, firma verisi, araçlar) için hesabınızla giriş yapın.",
  ].join("\n");
}

/** Kamuya açık sayfa yönlendirmesi — ChatWidget’ta girişsiz kullanım */
export function resolveNovaPublicSiteNavigationIntent(message: string): NovaNavigationIntent | null {
  const normalized = normalizeNovaNavigationText(message);
  const verb =
    /(ac|git|gotur|goster|yonlendir|nerede|nerde|neresi|bul|link|sayfa)/.test(normalized);
  const matched = NOVA_PUBLIC_SITE_ROUTES.filter((r) => r.match(normalized))
    .sort((a, b) => b.priority - a.priority);

  if (matched.length > 0) {
    const top = matched[0];
    const allowHome =
      top.path !== "/" || verb || /(ana sayfa|landing)/.test(normalized);
    if (allowHome) {
      return {
        answer: `${top.label} sayfasına gidebilirsiniz: ${top.summary}`,
        navigation: {
          action: "navigate",
          url: top.path,
          label: top.label,
          reason: top.summary,
          destination: `public_${top.path.replace(/\//g, "_")}`,
          auto_navigate: false,
        },
      };
    }
  }

  const appHits = NOVA_APP_SITE_ROUTES.filter((r) => r.match(normalized)).sort(
    (a, b) => b.priority - a.priority,
  );
  const appTop = appHits[0];
  if (!appTop || !verb) return null;

  return {
    answer: `${appTop.label} modülü giriş yaptıktan sonra ${appTop.path} adresindedir: ${appTop.summary}`,
    navigation: {
      action: "navigate",
      url: appTop.path,
      label: appTop.label,
      reason: `${appTop.summary} (oturum açmanız gerekir)`,
      destination: `app_${appTop.path.replace(/\//g, "_")}`,
      auto_navigate: false,
    },
  };
}

export type NovaProductHelpIntent = {
  answer: string;
  navigation?: {
    action: "navigate";
    url: string;
    label: string;
    reason: string;
    destination: string;
    auto_navigate: boolean;
  };
};

/** Sunucu `/api/nova/chat` ile aynı mantık — navigation NovaAgentNavigation ile uyumlu */
export function resolveNovaProductHelpIntent(message: string): NovaProductHelpIntent | null {
  const normalized = normalizeNovaNavigationText(message);

  if (/(nasil kayit|register|uye ol|uye olmak|kayit olmak|hesap ac)/.test(normalized)) {
    return {
      answer:
        "Hızlı başlangıç için Kayıt ol ekranından bireysel hesap açabilirsiniz. Paket karşılaştırması Paketler sayfasında.",
      navigation: {
        action: "navigate",
        url: "/register",
        label: "Kayıt ol",
        reason: "Yeni hesap oluşturma",
        destination: "product_register",
        auto_navigate: false,
      },
    };
  }

  if (/(fiyat|fiyatlandirma|paket|ucret|odeme|abonelik)/.test(normalized)) {
    return {
      answer:
        "Paket detayları ve limit karşılaştırması Paketler sayfasında; plan seçip ödeme akışına geçebilirsiniz.",
      navigation: {
        action: "navigate",
        url: "/pricing",
        label: "Paketler",
        reason: "Planlar ve ödeme",
        destination: "product_pricing",
        auto_navigate: false,
      },
    };
  }

  if (/(sinav|anket|egitim|training|question bank|soru bankasi)/.test(normalized)) {
    return {
      answer:
        "Sınav, anket ve eğitim içerikleri giriş sonrası Eğitim modülünde yönetilir.",
      navigation: {
        action: "navigate",
        url: "/training",
        label: "Eğitim",
        reason: "Eğitim ve sınav modülü (oturum gerekir)",
        destination: "product_training",
        auto_navigate: false,
      },
    };
  }

  if (/(ne yapiyorsun|ne ise yarar|hangi ozellik|neler var|moduller neler|risknova nedir)/.test(normalized)) {
    return {
      answer:
        "RiskNova; risk analizi, saha denetimi, doküman, eğitim/sınav ve abonelik süreçlerini tek panelde toplar. İsterseniz ilgili sayfaya yönlendirebilirim — örneğin Paketler veya Kayıt.",
    };
  }

  return null;
}
