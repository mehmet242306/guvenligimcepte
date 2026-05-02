export type CommercialInterestType = "osgb" | "enterprise";

export const OSGB_COMMERCIAL_PACKAGE_CODES = ["osgb_starter", "osgb_team"] as const;

export type OsgbCommercialPackageCode = (typeof OSGB_COMMERCIAL_PACKAGE_CODES)[number];

export const osgbOfferDisplayPricing: Record<
  OsgbCommercialPackageCode,
  { priceAmount: string; priceCurrency: string }
> = {
  osgb_starter: { priceAmount: "$299", priceCurrency: "USD" },
  osgb_team: { priceAmount: "$799", priceCurrency: "USD" },
};

export const osgbPackageRecommended: Record<OsgbCommercialPackageCode, boolean> = {
  osgb_starter: false,
  osgb_team: true,
};
