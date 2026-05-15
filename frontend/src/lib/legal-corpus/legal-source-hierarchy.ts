/**
 * Official corpus hierarchy for RAG retrieval and answer composition.
 * Binding sources override guidance when they conflict.
 */
export const legalSourcePriority = [
  "law",
  "regulation",
  "communique",
  "circular",
  "official_table",
  "official_guide",
  "official_template",
  "standard",
] as const;

export type LegalSourcePriorityRank = (typeof legalSourcePriority)[number];

/** doc_type / catalog source_type → retrieval rank (lower = higher priority). */
export const legalSourceRankByKey: Record<string, number> = Object.fromEntries(
  legalSourcePriority.map((key, index) => [key, index]),
);

export const bindingDocTypes = new Set(["law", "regulation", "communique", "circular"]);

export const guidanceDocTypes = new Set(["guide", "announcement"]);

export const LEGAL_CORPUS_HIERARCHY = {
  binding: "Kanun / Yönetmelik / Tebliğ = bağlayıcı kaynak",
  guidance: "Resmî rehber / kılavuz = uygulama ve yorum desteği",
  standard: "Standart = teknik referans",
  conflictRule:
    "Rehber ile kanun/yönetmelik arasında çelişki varsa kanun/yönetmelik esas alınır.",
  guideRole:
    "Rehberler uygulama örneği, kontrol listesi, form, yöntem ve iyi uygulama kaynağıdır.",
} as const;

export const ragSourceRanking = [
  "turkish_law",
  "turkish_regulation",
  "turkish_communique",
  "turkish_circular",
  "official_penalty_table",
  "turkish_official_guide",
  "turkish_official_template",
  "ts_tse_standard",
  "iso_en_iec_standard",
  "turkish_accreditation_document",
  "ilo_convention",
  "eu_directive",
  "foreign_official_guide",
  "private_commentary",
] as const;

export const standardSyncRules = {
  notLaw:
    "ISO / TS / EN / IEC standartları tek başına bağlayıcı mevzuat değildir; mevzuat, sözleşme veya şartnamede atıf ile bağlayıcı olur.",
  licenseMode:
    "Lisans yoksa yalnızca metadata (numara, başlık, katalog linki, kategori, kullanım amacı) indekslenir.",
  licensedFulltext:
    "Kurumsal lisans veya admin PDF yüklemesi sonrası tam metin licensed_standard_fulltext olarak işaretlenir.",
  neverOverridesBinding:
    "Standartlar kanun/yönetmelik/tebliğin önüne geçmez.",
} as const;

export const ragAnswerCompositionSteps = [
  "Önce kanun/yönetmelik/tebliğ kaynaklarından zorunluluğu belirle.",
  "Sonra resmî rehber/kılavuzlardan nasıl uygulanacağını açıkla.",
  "Rehberdeki form, kontrol listesi veya örnek varsa ayrıca öner.",
  "Rehber ile bağlayıcı mevzuat arasında çelişki varsa bağlayıcı mevzuatı esas al.",
  "Teknik uygulama için TS/ISO/EN/IEC standartlarını referans göster; atıf yoksa iyi uygulama/teknik referans de.",
  "Cevapta kaynak türünü belirt: Kanun, Yönetmelik, Tebliğ, Resmî Rehber, Standart, Uluslararası Referans.",
] as const;

export const standardObligationAnswerRules = [
  '"Zorunlu mu?" sorusunda önce mevzuat kontrol edilir; standart yalnızca atıf varsa zorunlu sayılır.',
  '"Nasıl yapılmalı?" sorusunda önce bağlayıcı mevzuat, sonra rehber, sonra teknik standart sırası izlenir.',
] as const;
