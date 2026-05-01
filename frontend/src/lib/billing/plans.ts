export type BillingCycle = "monthly" | "yearly";

export type BillingPlanKey =
  | "free"
  | "starter"
  | "plus"
  | "professional"
  | "professional_149"
  | "professional_199";

export type BillingAction =
  | "nova_message"
  | "ai_analysis"
  | "document_generation"
  | "risk_analysis"
  | "field_inspection"
  | "incident_analysis"
  | "training_slide"
  | "export";

export type PublicBillingPlan = {
  key: BillingPlanKey;
  name: string;
  priceUsd: number;
  description: string;
  audience: string;
  highlight?: string;
  recommended?: boolean;
  limits: Record<BillingAction, number>;
  features: string[];
};

export const BILLING_ACTION_LABELS: Record<BillingAction, string> = {
  nova_message: "Nova mesajı",
  ai_analysis: "AI analiz",
  document_generation: "doküman oluşturma",
  risk_analysis: "risk analizi",
  field_inspection: "saha denetimi",
  incident_analysis: "olay/kök neden analizi",
  training_slide: "eğitim slaytı",
  export: "export/çıktı",
};

export const INDIVIDUAL_BILLING_PLANS: PublicBillingPlan[] = [
  {
    key: "free",
    name: "Free",
    priceUsd: 0,
    audience: "Ürünü tanımak isteyen bireysel kullanıcı",
    description: "RiskNova'yı gerçek akışlarla dene, ilk işini çıkar.",
    limits: {
      nova_message: 10,
      ai_analysis: 3,
      document_generation: 1,
      risk_analysis: 1,
      field_inspection: 1,
      incident_analysis: 0,
      training_slide: 0,
      export: 1,
    },
    features: [
      "1 çalışma alanı",
      "Temel mevzuat ve Nova denemesi",
      "İlk risk analizi ve saha denetimi",
      "Sınırlı çıktı alma",
    ],
  },
  {
    key: "starter",
    name: "Starter",
    priceUsd: 29,
    audience: "Yeni başlayan bireysel İSG profesyoneli",
    description: "Düzenli kayıt, analiz ve çıktı ihtiyacını karşılar.",
    limits: {
      nova_message: 100,
      ai_analysis: 50,
      document_generation: 10,
      risk_analysis: 10,
      field_inspection: 10,
      incident_analysis: 3,
      training_slide: 0,
      export: 10,
    },
    features: [
      "3 işyeri/çalışma alanı",
      "Konuşma ve analiz geçmişi",
      "Temel DÖF ve aksiyon takibi",
      "PDF/export akışları",
    ],
  },
  {
    key: "plus",
    name: "Plus",
    priceUsd: 59,
    audience: "Düzenli kullanan bireysel İSG profesyoneli",
    description: "Starter'dan daha fazla üretim alanı isteyen, Pro'ya geçişte olan kullanıcılar için.",
    limits: {
      nova_message: 250,
      ai_analysis: 100,
      document_generation: 20,
      risk_analysis: 25,
      field_inspection: 25,
      incident_analysis: 8,
      training_slide: 2,
      export: 25,
    },
    features: [
      "6 işyeri/çalışma alanı",
      "Daha rahat Nova ve analiz kapasitesi",
      "Doküman ve saha çıktıları için orta seviye kota",
      "Professional'a geçmeden önce dengeli kullanım",
    ],
  },
  {
    key: "professional",
    name: "Professional 99",
    priceUsd: 99,
    audience: "Aktif bireysel İSG uzmanı",
    description: "AI destekli profesyonel çalışma alanını ana iş akışına ekler.",
    limits: {
      nova_message: 500,
      ai_analysis: 200,
      document_generation: 30,
      risk_analysis: 50,
      field_inspection: 50,
      incident_analysis: 15,
      training_slide: 5,
      export: 50,
    },
    features: [
      "10 işyeri/çalışma alanı",
      "Gelişmiş personel ve eğitim sorguları",
      "Olay/kaza kayıtları ve kök neden analizi",
      "Proaktif Nova önerileri",
    ],
  },
  {
    key: "professional_149",
    name: "Professional 149",
    priceUsd: 149,
    audience: "Yoğun çalışan bireysel uzman",
    description: "Birden fazla müşteri ve yüksek üretim temposu için rahat alan.",
    highlight: "En Popüler",
    recommended: true,
    limits: {
      nova_message: 1000,
      ai_analysis: 500,
      document_generation: 75,
      risk_analysis: 150,
      field_inspection: 150,
      incident_analysis: 50,
      training_slide: 20,
      export: 150,
    },
    features: [
      "20 işyeri/çalışma alanı",
      "Risk bulguları ve periyodik kontrol sorguları",
      "Eğitim slaytı ve gelişmiş doküman üretimi",
      "İSG dosyası/arşiv akışları",
    ],
  },
  {
    key: "professional_199",
    name: "Professional 199",
    priceUsd: 199,
    audience: "Çok aktif bireysel profesyonel",
    description: "RiskNova'yı ana çalışma sistemi yapan uzmanlar için üst kademe.",
    highlight: "Premium",
    limits: {
      nova_message: 2000,
      ai_analysis: 1000,
      document_generation: 150,
      risk_analysis: 300,
      field_inspection: 300,
      incident_analysis: 100,
      training_slide: 50,
      export: 300,
    },
    features: [
      "35 işyeri/çalışma alanı",
      "Sağlık muayene ve firma bağlamı sorguları",
      "Tüm gelişmiş analiz yöntemleri",
      "Yüksek hacimli rapor/export kapasitesi",
    ],
  },
];

export function getBillingPlan(planKey: string | null | undefined) {
  return INDIVIDUAL_BILLING_PLANS.find((plan) => plan.key === planKey) ?? null;
}

export function formatLimit(value: number) {
  if (value >= 999999) return "Sınırsız";
  return new Intl.NumberFormat("tr-TR").format(value);
}
