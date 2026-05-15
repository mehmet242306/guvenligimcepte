export const OFFICIAL_LEGAL_DOC_TYPES = [
  "law",
  "regulation",
  "communique",
  "guide",
  "announcement",
  "circular",
  "standard",
] as const;

export type OfficialLegalDocType = (typeof OFFICIAL_LEGAL_DOC_TYPES)[number];

export const DOC_TYPE_LABELS: Record<OfficialLegalDocType, string> = {
  law: "Kanun",
  regulation: "Yönetmelik",
  communique: "Tebliğ",
  guide: "Rehber / Kılavuz",
  announcement: "Tablo / Duyuru",
  circular: "Genelge",
  standard: "Standart",
};

export function docTypeLabel(docType: string): string {
  return DOC_TYPE_LABELS[docType as OfficialLegalDocType] ?? docType;
}
