import { normalizeNovaRequestText } from "@/lib/nova/text-normalization";

/** Kullanıcı bu mesajda kart/yönlendirme istemiyor — yalnızca o tur için geçerli. */
export const USER_NO_NAVIGATION_PATTERN =
  /(?:yonlendirme\s*yapma|sayfaya\s*git\s*(?:gosterme|deme)|modul\s*kart\w*\s*cikarma|modul\s*istemiyorum|kart\s*gosterme|yonlendirme\s*istemiyorum|raporlar\s*sayfas.*yonlendirme\s*yapma|isg\s*kutuphanesi.*gosterme|ajanda.*gosterme|olay\s*kaydi.*gosterme)/;

/** Açık sayfa/modül yönlendirme fiilleri — tek başına “rapor” kelimesi yetmez. */
export const EXPLICIT_NAVIGATION_VERB_PATTERN =
  /(?:^|\s)(?:git|ac|yonlendir|nerede|nerde|neresi|nereden|hangi\s*sayfa|hangi\s*modul|hangi\s*alan|sayfaya|modulune|ekranina|nereye|indir|export|pdf\s*al|cikti\s*al|olusturma\s*ekrani|cikti\s*alma|open|navigate|go\s*to|beni\s*ilgili)(?:\s|$)/;

/** Rapor metni / rapor dili / rapora yazma — chat içi content/advisory; modül yönlendirmesi değil. */
export const REPORT_CONTENT_ADVISORY_PATTERN =
  /(?:raporda\s*nasil|rapora\s*ne\s*yaz|raporda\s*ne\s*yazma|rapor\s*diliyle|denetim\s*raporu\s*diliyle|profesyonel\s*rapor\s*dili|rapor\s*metni\s*yaz|rapor\s*ozeti\s*yaz|raporu\s*kisa|raporu\s*ikna|raporu\s*savunulabilir|musteri\s*raporu\s*reddetti|belirsizligi\s*nasil\s*yaz|ne\s*yazmamam\w*|kesinlikle\s*ne\s*yaz|hangi\s*yontem\w*\s*kullan|rapora\s*nasil\s*ifade|rapor\s*dili|rapor\s*metni|rapor\s*ozeti|denetim\s*raporu|risk\s*raporu|yonetici\s*ozeti|raporda\s*ifade|rapora\s*yaz\w*|raporda\s*yaz\w*|kritik\s*ama\s*kabul|kabul\s*edilebilir.*kritik|acil\s*aksiyon\s*gerektirmiyor|genel\s*risk\s*danis|kaynak\s*kullanmadan|kritik\s*seviyede.*izlenebilir|gecici\s*onlem.*izlenebilir|(?:3|uc)\s*cumle\w*.*yonetici|yonetici\s*notu|rapora\s*yazilacak\s*(?:3|uc)\s*cumle|once\s*rapora|raporu\s*hale\s*getir)/;

/** Raporlar modülüne yalnızca açık navigation isteği (içerik üretiminde “modüle ekle” metni değil). */
export const EXPLICIT_REPORTS_NAVIGATION_PATTERN =
  /(?:raporlar\s*sayfa|raporlar\s*modul\w*\s*(?:ac|git)|raporlar\s*alan\w*\s*(?:ac|git|yonlendir)|raporu\s*nereden|raporu\s*indir|rapor\s*ekran|pdf\s*rapor|sistemden\s*indir|cikti\s*alma\s*ekran|raporlama\s*ve\s*cikti)/;

export const FORBIDDEN_REPORTS_NAVIGATION_COPY_PATTERN =
  /(?:raporlar\s*alanina\s*yonlendiriyorum|raporlama\s*ve\s*cikti\s*alma\s*islemleri\s*raporlar|sayfaya\s*git)/i;

export const FORBIDDEN_NAVIGATION_CARD_COPY_PATTERN =
  /(?:raporlar\s*alanina\s*yonlendiriyorum|sayfaya\s*git|isg\s*kutuphanesi|ajanda|olay\s*kaydi|mevzuat\s*ve\s*rehberler|ayarlar\s*>\s*mevzuat)/i;

export function hasExplicitNavigationVerb(message: string): boolean {
  return EXPLICIT_NAVIGATION_VERB_PATTERN.test(normalizeNovaRequestText(message));
}

export function isNovaReportContentAdvisoryTask(message: string): boolean {
  return REPORT_CONTENT_ADVISORY_PATTERN.test(normalizeNovaRequestText(message));
}

export function isNovaExplicitReportsNavigationRequest(message: string): boolean {
  const normalized = normalizeNovaRequestText(message);

  if (USER_NO_NAVIGATION_PATTERN.test(normalized)) {
    return false;
  }

  if (isNovaReportContentAdvisoryTask(message) && !EXPLICIT_REPORTS_NAVIGATION_PATTERN.test(normalized)) {
    return false;
  }

  if (EXPLICIT_REPORTS_NAVIGATION_PATTERN.test(normalized)) {
    return true;
  }

  if (/\braporlar\b/.test(normalized) && hasExplicitNavigationVerb(message) && /(?:sayfa|modul|alan|ac|git)/.test(normalized)) {
    return true;
  }

  return false;
}

export function appendOptionalReportsHandoff(answer: string, userMessage: string): string {
  const normalized = normalizeNovaRequestText(userMessage);
  // "Sayfaya Git gösterme" kartı yasaklar; opsiyonel metin cümlesi serbest kalır.
  if (
    /(?:raporlar\s*sayfas.*yonlendirme\s*yapma|yonlendirme\s*yapma|modul\s*kart\w*\s*cikarma)/.test(
      normalized,
    )
  ) {
    return answer;
  }
  if (isNovaExplicitReportsNavigationRequest(userMessage)) return answer;
  if (!isNovaReportContentAdvisoryTask(userMessage)) return answer;
  if (/isterseniz.*raporlar\s*modul/.test(normalizeNovaRequestText(answer))) return answer;

  return `${answer}\n\nİsterseniz bu metni daha sonra RiskNova'da Raporlar modülüne ekleyebilirsiniz.`;
}
