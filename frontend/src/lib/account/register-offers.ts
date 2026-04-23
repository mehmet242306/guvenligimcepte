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
    summary: "Yeni baslayan veya cekirdek ekiple ilerleyen OSGB yapisi icin.",
    workspacesLabel: "5 aktif firma / workspace",
    seatsLabel: "2 aktif ekip koltugu",
    features: [
      "Personel modulu",
      "Gorev ve is takibi",
      "Duyuru ve temel operasyon akisi",
    ],
    ctaLabel: "OSGB Starter icin gorus",
  },
  {
    code: "osgb_team",
    name: "OSGB Team",
    priceLabel: "1.799 TL / ay",
    summary:
      "Daha fazla firma, saha ve ekip koordinasyonu gereken buyuyen OSGB icin.",
    workspacesLabel: "15 aktif firma / workspace",
    seatsLabel: "5 aktif ekip koltugu",
    features: [
      "Tum Starter yetenekleri",
      "Gelismis raporlama",
      "Daha genis ekip kapasitesi",
    ],
    ctaLabel: "OSGB Team icin gorus",
  },
];

export const companyOfferHighlights = [
  "Cok lokasyonlu firma ve kurum yapilari",
  "Operasyon hacmine gore ozel teklif",
  "Gerekiyorsa entegrasyon ve onboarding planlamasi",
];

export function getCommercialLeadCopy(type: CommercialInterestType) {
  if (type === "osgb") {
    return {
      badge: "OSGB iletisim talebi",
      title: "OSGB yapinizi taniyalim",
      description:
        "Hizmet verdiginiz firma sayisini, ekip yapinizi ve operasyon yogunlugunuzu anlayip size ozel paket ve gecis secenekleri sunalim.",
      primaryCta: "Talebi gonder",
      companyLabel: "OSGB / kurum adi",
      scaleLabel: "Hizmet verdiginiz aktif firma sayisi",
      employeeLabel: "Yonettiginiz toplam calisan sayisi",
      professionalLabel: "Uzman / hekim / DSP sayisi",
    };
  }

  return {
    badge: "Firma / kurumsal iletisim",
    title: "Kurum yapinizi taniyalim",
    description:
      "Sizi tanimak, lokasyon yapinizi ve operasyon ihtiyacinizi anlamak istiyoruz. Boylece size ozel paketler ve secenekler sunabiliriz.",
    primaryCta: "Talebi gonder",
    companyLabel: "Firma / kurum adi",
    scaleLabel: "Lokasyon / saha sayisi",
    employeeLabel: "Toplam calisan sayisi",
    professionalLabel: "Koordinasyona dahil ekip sayisi",
  };
}
