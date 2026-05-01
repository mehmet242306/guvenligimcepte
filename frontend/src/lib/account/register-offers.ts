export type CommercialInterestType = "osgb" | "enterprise";

export type OsgbPackageOffer = {
  code: string;
  name: string;
  /** Büyük punto — örn. "$299" */
  priceAmount: string;
  /** Örn. "/ ay'dan itibaren" */
  pricePeriod: string;
  /** Örn. "USD" */
  priceCurrency: string;
  /** Kart altı — gösterge / teklif notu */
  priceFinePrint: string;
  summary: string;
  workspacesLabel: string;
  seatsLabel: string;
  features: string[];
  ctaLabel: string;
  /** Vurgulu / önerilen kart */
  recommended?: boolean;
};

export const osgbPackageOffers: OsgbPackageOffer[] = [
  {
    code: "osgb_starter",
    name: "OSGB Starter",
    priceAmount: "$299",
    pricePeriod: "/ ay'dan itibaren",
    priceCurrency: "USD",
    priceFinePrint:
      "Gösterge başlangıç segmenti. Kesin tutar, firma ve koltuk sayınıza göre teklif formu sonrası netleşir.",
    summary:
      "Çekirdek OSGB ekibi ve sınırlı portföy ile başlayanlar için; bireysel 29 $/ay Starter’dan farklı olarak çoklu işyeri ve ekip modeli kapsar.",
    workspacesLabel: "5 aktif firma / workspace",
    seatsLabel: "2 aktif ekip koltuğu",
    features: [
      "Personel modülü ve davet akışları",
      "Görev, iş takibi ve atama panosu",
      "Müşteri işyeri portföy görünümü",
      "Duyuru ve temel operasyon akışı",
    ],
    ctaLabel: "Starter için teklif iste",
  },
  {
    code: "osgb_team",
    name: "OSGB Team",
    priceAmount: "$799",
    pricePeriod: "/ ay'dan itibaren",
    priceCurrency: "USD",
    priceFinePrint:
      "Gösterge orta segment. Yoğun saha, raporlama ve koltuk ihtiyacına göre özelleştirilmiş teklif sunulur.",
    summary: "Büyüyen OSGB’ler: daha fazla firma, saha koordinasyonu ve ekip ölçeği için.",
    workspacesLabel: "15 aktif firma / workspace",
    seatsLabel: "5 aktif ekip koltuğu",
    features: [
      "Tüm Starter yetenekleri",
      "Gelişmiş raporlama ve dışa aktarma",
      "Saha denetimi ve kontrol listeleri (paket kapsamına göre)",
      "Öncelikli çözüm / onboarding kanalı",
    ],
    ctaLabel: "Team için teklif iste",
    recommended: true,
  },
];

export const companyOfferHighlights = [
  "Çok lokasyonlu firma ve kurum yapıları",
  "Operasyon hacmine göre özel teklif",
  "Gerekiyorsa entegrasyon ve onboarding planlaması",
];

export function getCommercialLeadCopy(type: CommercialInterestType) {
  if (type === "osgb") {
    return {
      badge: "OSGB iletişim talebi",
      title: "OSGB yapınızı tanıyalım",
      description:
        "Hizmet verdiğiniz firma sayısını, ekip yapınızı ve operasyon yoğunluğunuzu anlayıp size özel paket ve geçiş seçenekleri sunalım.",
      primaryCta: "Talebi gönder",
      companyLabel: "OSGB / kurum adı",
      scaleLabel: "Hizmet verdiğiniz aktif firma sayısı",
      employeeLabel: "Yönettiğiniz toplam çalışan sayısı",
      professionalLabel: "Uzman / işyeri hekimi / DSP sayısı",
    };
  }

  return {
    badge: "Firma / kurumsal iletişim",
    title: "Kurum yapınızı tanıyalım",
    description:
      "Bu akışta ödeme adımı yoktur. Formu gönderdiğinizde talebiniz ekibimize düşer; satış veya çözüm ekibimiz sizinle iletişime geçerek özel teklif ve limitleri netleştirir.",
    primaryCta: "Talebi gönder",
    companyLabel: "Firma / kurum adı",
    scaleLabel: "Lokasyon / saha sayısı",
    employeeLabel: "Toplam çalışan sayısı",
    professionalLabel: "Koordinasyona dahil ekip sayısı",
  };
}
