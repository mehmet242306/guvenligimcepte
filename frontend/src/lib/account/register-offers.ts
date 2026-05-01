export type CommercialInterestType = "osgb" | "enterprise";

export type OsgbPackageOffer = {
  code: string;
  name: string;
  priceLabel: string;
  summary: string;
  workspacesLabel: string;
  seatsLabel: string;
  features: string[];
  ctaLabel: string;
};

export const osgbPackageOffers: OsgbPackageOffer[] = [
  {
    code: "osgb_starter",
    name: "OSGB Starter",
    priceLabel: "699 TL / ay",
    summary: "Yeni başlayan veya çekirdek ekiple ilerleyen OSGB yapıları için başlangıç paketi.",
    workspacesLabel: "5 aktif firma / workspace",
    seatsLabel: "2 aktif ekip koltuğu",
    features: [
      "Personel modülü",
      "Görev ve iş takibi",
      "Duyuru ve temel operasyon akışı",
    ],
    ctaLabel: "Starter için teklif iste",
  },
  {
    code: "osgb_team",
    name: "OSGB Team",
    priceLabel: "1.799 TL / ay",
    summary: "Daha fazla firma, saha ve ekip koordinasyonu gereken büyüyen OSGB’ler için.",
    workspacesLabel: "15 aktif firma / workspace",
    seatsLabel: "5 aktif ekip koltuğu",
    features: [
      "Tüm Starter yetenekleri",
      "Gelişmiş raporlama",
      "Daha geniş ekip kapasitesi",
    ],
    ctaLabel: "Team için teklif iste",
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
