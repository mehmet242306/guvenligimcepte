import { normalizeNovaRequestText } from "@/lib/nova/text-normalization";

/** Açık sayfa/modül yönlendirme fiilleri — tek başına “rapor” kelimesi yetmez. */
export const EXPLICIT_NAVIGATION_VERB_PATTERN =
  /(?:^|\s)(?:git|ac|yonlendir|nerede|nerde|neresi|nereden|hangi\s*sayfa|hangi\s*modul|hangi\s*alan|sayfaya|modulune|ekranina|nereye|indir|export|pdf\s*al|cikti\s*al|olusturma\s*ekrani|cikti\s*alma|open|navigate|go\s*to)(?:\s|$)/;

/** Rapor metni / rapor dili / rapora yazma — chat içi content/advisory; modül yönlendirmesi değil. */
export const REPORT_CONTENT_ADVISORY_PATTERN =
  /(?:raporda\s*nasil|rapora\s*ne\s*yaz|raporda\s*ne\s*yazma|rapor\s*diliyle|denetim\s*raporu\s*diliyle|profesyonel\s*rapor\s*dili|rapor\s*metni\s*yaz|rapor\s*ozeti\s*yaz|raporu\s*kisa|raporu\s*ikna|raporu\s*savunulabilir|musteri\s*raporu\s*reddetti|belirsizligi\s*nasil\s*yaz|ne\s*yazmamam\w*|kesinlikle\s*ne\s*yaz|hangi\s*yontem\w*\s*kullan|rapora\s*nasil\s*ifade|rapor\s*dili|rapor\s*metni|rapor\s*ozeti|denetim\s*raporu|risk\s*raporu|yonetici\s*ozeti|raporda\s*ifade|rapora\s*yaz\w*|raporda\s*yaz\w*|kritik\s*ama\s*kabul|kabul\s*edilebilir.*kritik|acil\s*aksiyon\s*gerektirmiyor|genel\s*risk\s*danis|kaynak\s*kullanmadan)/;

/** Raporlar modülüne yalnızca açık navigation isteği. */
export const EXPLICIT_REPORTS_NAVIGATION_PATTERN =
  /(?:raporlar\s*sayfa|raporlar\s*modul|raporlar\s*alan|raporu\s*nereden|raporu\s*indir|rapor\s*ekran|pdf\s*rapor|sistemden\s*indir|cikti\s*alma\s*ekran|raporlama\s*ve\s*cikti)/;

export const FORBIDDEN_REPORTS_NAVIGATION_COPY_PATTERN =
  /(?:raporlar\s*alanina\s*yonlendiriyorum|raporlama\s*ve\s*cikti\s*alma\s*islemleri\s*raporlar|sayfaya\s*git)/i;

export function hasExplicitNavigationVerb(message: string): boolean {
  return EXPLICIT_NAVIGATION_VERB_PATTERN.test(normalizeNovaRequestText(message));
}

export function isNovaReportContentAdvisoryTask(message: string): boolean {
  return REPORT_CONTENT_ADVISORY_PATTERN.test(normalizeNovaRequestText(message));
}

export function isNovaExplicitReportsNavigationRequest(message: string): boolean {
  if (isNovaReportContentAdvisoryTask(message)) {
    return false;
  }

  const normalized = normalizeNovaRequestText(message);

  if (EXPLICIT_REPORTS_NAVIGATION_PATTERN.test(normalized)) {
    return hasExplicitNavigationVerb(message) || /(?:sayfa|modul|alan|nereden|indir|ekran|pdf)/.test(normalized);
  }

  if (/\braporlar\b/.test(normalized) && hasExplicitNavigationVerb(message)) {
    return true;
  }

  return false;
}
