import { normalizeTurkishAscii } from "./query-expand";

export type LegalQueryIntent = "off_topic" | "legal_isg" | "general_isg_practice";

const REGULATION_MARKERS =
  /(mevzuat|yonetmelik|kanun|madde|yukumluluk|sorumluluk|zorunlu|6331|4857|5510|isg|is guvenligi|isyeri hekimi|risk degerlendirme|idari para|tehlike sinif)/i;

const OFF_TOPIC_MARKERS =
  /(hava durumu|yemek tarifi|futbol mac|dizi oner|film oner|oyun oner|kripto|bitcoin|borsa|flort|iliski tavsiye|sarki soz|siir yaz|matematik odev|fizik odev|ingilizce ceviri|tatil rotasi)/i;

const GENERAL_ISG_MARKERS =
  /(is kazasi|ramak kala|kkd|kkd kullanim|guvenlik kulturu|ergonomi|toz|gurultu|kimyasal|yangin|acil durum|is guvenligi|saglik gozetimi)/i;

export function isRegulationRelatedQuery(query: string): boolean {
  return REGULATION_MARKERS.test(normalizeTurkishAscii(query));
}

export function classifyLegalQueryIntent(query: string): LegalQueryIntent {
  const normalized = normalizeTurkishAscii(query);

  if (OFF_TOPIC_MARKERS.test(normalized)) {
    return "off_topic";
  }

  if (REGULATION_MARKERS.test(normalized)) {
    return "legal_isg";
  }

  if (GENERAL_ISG_MARKERS.test(normalized)) {
    return "general_isg_practice";
  }

  if (normalized.length < 12) {
    return "off_topic";
  }

  return "general_isg_practice";
}

export function isRetrievalStrongEnough(params: {
  topLexicalRank: number;
  topDenseSimilarity: number;
  hitCount: number;
}): boolean {
  if (params.hitCount === 0) return false;
  if (params.topLexicalRank >= 0.08) return true;
  if (params.topDenseSimilarity >= 0.58) return true;
  return params.hitCount >= 2 && (params.topLexicalRank >= 0.03 || params.topDenseSimilarity >= 0.52);
}

export function shouldInterpretWithoutExactPhrase(intent: LegalQueryIntent, strongEnough: boolean): boolean {
  return intent === "legal_isg" || intent === "general_isg_practice" || !strongEnough;
}
