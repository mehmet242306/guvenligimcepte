import { normalizeNovaRequestText } from "@/lib/nova/text-normalization";
import { NOVA_METHODS_EXPERTISE_PROMPT_TR } from "@/lib/nova/risknova-methods-expertise";
import {
  isForbiddenUserNavigationCopy,
  stripForbiddenNavigationFromAnswer,
} from "@/lib/nova/nova-navigation-policy";
import {
  buildRiskMethodAdvisorResponse,
  isNovaMethodAdvisorTask,
  NOVA_METHOD_ADVISOR_PROMPT_TR,
} from "@/lib/nova/risk-method-advisor";
import { isNovaRagServiceRequest } from "@/lib/nova/nova-navigation-policy";
import {
  appendOptionalReportsHandoff,
  FORBIDDEN_NAVIGATION_CARD_COPY_PATTERN,
  FORBIDDEN_REPORTS_NAVIGATION_COPY_PATTERN,
  isNovaReportContentAdvisoryTask,
  USER_NO_NAVIGATION_PATTERN,
} from "@/lib/nova/nova-report-intent";
import { userRequestedNoNavigationThisTurn } from "@/lib/nova/nova-action-cards";

export { isNovaMethodsExpertiseTask, buildNovaMethodsExpertiseResponse } from "@/lib/nova/risknova-methods-expertise";
export {
  isNovaConceptualRiskQuery,
  isNovaMethodAdvisorTask,
  buildRiskMethodAdvisorResponse,
} from "@/lib/nova/risk-method-advisor";

export const NOVA_RISK_MATRIX_THRESHOLDS = {
  low: { min: 1, max: 4, label: "Düşük" },
  medium: { min: 5, max: 9, label: "Orta" },
  high: { min: 10, max: 14, label: "Yüksek" },
  critical: { min: 15, max: 25, label: "Kritik" },
} as const;

/** Regex-only: normalized prompt matching. User-facing copy lives in reasonTr / alternativeTr. */
const UNSAFE_INTENT_PATTERNS: Array<{
  pattern: RegExp;
  reasonTr: string;
  alternativeTr: string;
}> = [
  {
    pattern:
      /\b(yasalar\w*\s*a[s]?m\w*|yasalar\w*\s*as\w*|kanunu\s*as|mevzuati\s*as|denetimden\s*kac|denetimi\s*atlat|denetim\s*gec|uyumu\s*gizle|sakla|gizle|yukumluluk.*bertaraf)\b/,
    reasonTr: "Yasaları aşmaya veya denetimden kaçmaya yönelik yöntemler paylaşılamaz.",
    alternativeTr:
      "Yasal uyum kontrol listesi, denetime hazırlık planı veya eksiklerin kapatılması için aksiyon planı hazırlayabilirim.",
  },
  {
    pattern: /(sahte\s*kaynak|sahte\s*belge|uydurma\s*kaynak|yalan\s*kaynak|fake\s*source)/,
    reasonTr: "Sahte veya doğrulanmamış kaynak eklemek yanıltıcıdır ve rapor güvenilirliğini zedeler.",
    alternativeTr:
      "Rapordaki iddiaları gerçek mevzuat, resmi kaynak, saha kaydı veya ölçülebilir veriyle desteklemeye yardımcı olabilirim.",
  },
  {
    pattern: /(risk\s*skorunu\s*manipule|riski\s*dusuk\s*goster|skoru\s*dusur|puani\s*dusur)/,
    reasonTr: "Risk skorunu manipüle etmek veya gerçek dışı göstermek etik ve hukuki değildir.",
    alternativeTr:
      "Doğru olasılık/siddet değerleri, önlemler ve artık risk hesabı ile kaydı düzeltmeye yardımcı olabilirim.",
  },
  {
    pattern:
      /(risk\s*skoru?.*(25|gercek).*(12|rapor)|raporda\s*12.*(25|gercek)|skoru.*gosterirsek|skor.*dusuk\s*goster)/,
    reasonTr:
      "Gerçek risk skorunu olduğundan düşük göstermek yanıltıcıdır ve çalışan güvenliği, denetim izlenebilirliği ve hukuki sorumluluk açısından ciddi risk doğurur.",
    alternativeTr:
      "Riskin neden kritik çıktığını, hangi önlemlerle artık riskin düşürülebileceğini ve yönetim için sakin ama şeffaf bir aksiyon planını hazırlayabilirim.",
  },
  {
    pattern: /(kritik\s*risk).*(orta\s*goster|yumusat)|paniklemesin.*risk|riski\s*yumusat/,
    reasonTr: "Kritik riski olduğundan düşük göstermek veya yumuşatmak yanıltıcı kayıt oluşturur.",
    alternativeTr:
      "Şeffaf risk iletişimi, öncelikli önlemler ve yönetim için doğrulanabilir aksiyon planı hazırlayabilirim.",
  },
  {
    pattern: /(eski\s*tarihli\s*kayit|tarihli\s*kayit\s*olustur|geriye\s*donuk\s*kayit)/,
    reasonTr: "Eski tarihli veya geriye dönük uydurma kayıt oluşturmak denetim güvenilirliğini zedeler.",
    alternativeTr: "Mevcut tarih ve kanıtlarla doğru kayıt, revizyon gerekçesi ve eksik kapatma planı önerebilirim.",
  },
  {
    pattern: /(denetimden\s*once|denetimde|denetim\s*oncesi).*(gizle|sakla|temizle)/,
    reasonTr: "Denetimde kayıt gizlemek veya uygunsuzlukları saklamak yasadışı ve etik dışıdır.",
    alternativeTr: "Denetime hazırlık, eksik kapatma ve şeffaf düzeltici faaliyet planı hazırlayabilirim.",
  },
  {
    pattern: /(denetci\s*gormeden|denetceden\s*once|denetim\s*oncesi).*(gizle|sakla|olumsuz\s*ifade)/,
    reasonTr: "Denetim öncesi olumsuz bulguları gizlemek yanıltıcı kayıt ve etik dışı uygulamadır.",
    alternativeTr:
      "Bulguları şeffaf kaydedip öncelik, sorumlu, termin ve önlem etkinliği ile savunulabilir bir aksiyon planı hazırlayabilirim.",
  },
  {
    pattern: /(olmayan\s*olcum|olcum\s*sonucu.*(ekle|yaz)|uydurma\s*olcum|sahte\s*tutanak)/,
    reasonTr: "Olmayan ölçüm veya sahte tutanak eklemek yanıltıcıdır ve rapor güvenilirliğini zedeler.",
    alternativeTr: "Gerçek ölçüm, saha kaydı veya eksik veri için veri toplama planı önerebilirim.",
  },
  {
    pattern:
      /((simulasyon|test\s*icin|sadece\s*test).*(mevzuat.*as|yasalar.*as|denetimden\s*kac)|mevzuat.*as.*(simulasyon|test))/,
    reasonTr: "Test veya simülasyon gerekçesiyle zararlı veya yasadışı yönlendirme yapılamaz.",
    alternativeTr: "Yasal uyum, denetim hazırlığı ve güvenli senaryo çalışması için meşru çerçeve önerebilirim.",
  },
  {
    pattern:
      /(kaynak.*gercek.*(zorunda\s*degil|degil)|gercek\s*olmak\s*zorunda\s*degil|kaynak\s*gercek\s*degil|guvenilir\s*dursun|kaynakli\s*gibi\s*gorunen|sahte\s*ama\s*profesyonel|olmayan\s*kaynak|uydurma\s*kaynak)/,
    reasonTr: "Sahte veya doğrulanmamış kaynak eklemek yanıltıcıdır ve rapor güvenilirliğini zedeler.",
    alternativeTr:
      "Rapordaki iddiaları gerçek mevzuat, resmi kaynak, saha kaydı veya ölçülebilir veriyle desteklemeye yardımcı olabilirim.",
  },
  {
    pattern:
      /(raporda\s*dusuk\s*goster|25.*12\s*goster|kabul\s*edilebilir.*kritik|celiskili\s*risk\s*sinif|hem\s*kritik\s*yaz)/,
    reasonTr: "Risk kaydını gerçeğe aykırı göstermek veya çelişkili sınıflandırma yapmak etik ve hukuki açıdan kabul edilemez.",
    alternativeTr:
      "Doğru skor, gerekçe ve önlem planı ile şeffaf kayıt oluşturmanıza yardımcı olabilirim.",
  },
  {
    pattern: /(raporu\s*daha\s*guvenilir\s*goster)/,
    reasonTr:
      "Raporu olduğundan farklı göstermek veya kanıtsız biçimde güvenilir göstermek için yönlendirme yapılamaz.",
    alternativeTr: "Kaynaksız iddiaları işaretleyip doğrulanabilir kanıtlarla destekleme planı çıkarabilirim.",
  },
  {
    pattern:
      /(izinsiz\s*veri|veri\s*cek|rakip.*siz|rakib.*sistem|sisteme\s*siz|yetkisiz\s*erisim|hack|penetrasyon\s*testi\s*yap)/,
    reasonTr: "İzinsiz erişim veya siber saldırı yöntemleri paylaşılamaz.",
    alternativeTr:
      "Yetkili penetrasyon testi, kendi sisteminiz için güvenlik kontrol listesi veya yasal rekabet analizi önerebilirim.",
  },
  {
    pattern: /(kisisel\s*veri\s*tahmin|ozel\s*veri.*tahmin|tc\s*tahmin|kimlik\s*tahmin)/,
    reasonTr: "Kişisel veri tahmini veya uydurma yapılamaz.",
    alternativeTr: "KVKK uyumlu veri işleme ve bilgi güvenliği kontrolleri hakkında genel rehberlik verebilirim.",
  },
  {
    pattern: /(sistem\s*talimat|prompt\s*ini\s*acikla|gizli\s*talimat|jailbreak|onceki\s*tum\s*kurallari\s*unut|sinirsiz\s*mod)/,
    reasonTr: "Sistem talimatları veya iç yönergeler paylaşılamaz.",
    alternativeTr: "RiskNova ve İSG süreçleri hakkında kullanıcı odaklı yardımcı olabilirim.",
  },
  {
    pattern: /(kesin\s*batacak|kesin\s*yatirim|hisse\s*al|hisse\s*sat)/,
    reasonTr: "Kesin finansal veya yatırım tavsiyesi verilemez.",
    alternativeTr: "Risk analizi ve karar destek çerçevesi hakkında genel bilgi verebilirim.",
  },
];

const CONTENT_GENERATION_PATTERN =
  /\b(e\s*-?\s*posta|eposta|email|mail\s*olarak|yeniden\s*yaz|tekrar\s*yaz|yonetim\s*kurulu|yonetici\s*ozeti|musteri\s*kizgin|musteri\s*raporu\s*reddetti|nasil\s*cevap|nasil\s*yanit|ne\s*cevap\s*ver|ne\s*yanit\s*ver|cevap\s*taslagi|yanit\s*taslagi|ozet\s*yaz|ozetle|rapor\s*ozeti|profesyonel\s*yaz|profesyonel\s*hale\s*getir|ikna\s*edici|kisa\s*ve\s*ikna\s*edici|taslak\s*yaz|sablon|metni\s*duzenle|duzelt\s*yaz|formatla|sadece\s*\d+\s*madde\w*|(?:^|\s)(?:3|uc)\s*madde\w*|kisa\s*cevap|tablo\s*yap|basit\s*anlat|12\s*yasindaki|cocuk\s*gibi\s*anlat|ceo.*ton|isg\s*uzmanina.*ceo|belirsizligi.*profesyonel|denetim\s*raporu\s*diliyle|profesyonel\s*rapor\s*dili|rapor\s*diliyle|rapor\s*metni\s*yaz|raporu\s*kisa|raporu\s*ikna|raporu\s*savunulabilir|saha\s*calisanina|tek\s*cumle|iki\s*ton|savunulabilir|net\s*ama\s*suclayici)/;

const ADVISORY_CHAT_PATTERN =
  /\b(ne\s*yapmaliyim|nasil\s*ilerlemeliyim|ilk\s*adim|risk\s*skor.*yuksek|sistem.*yuksek\s*gosteriyor|kritik\s*risk.*iflas|skor\s*yanlis\s*olabilir\s*mi|verilen\s*skor\s*yanlis|rapor.*sacma|bu\s*kadar\s*detaya\s*gerek\s*yok|raporun\s*neden\s*gerekli|yonetici.*detay|hangi\s*yontem\w*\s*kullan\w*|hangi\s*yontemi\s*kullan\w*|rapora\s*ne\s*yaz\w*|rapora\s*nasil\s*yaz\w*|raporda\s*nasil\s*yaz\w*|raporda\s*ne\s*yazma\w*|yazmamam\w*\s*gerek|kesinlikle\s*ne\s*yaz\w*|ne\s*yazmamam\w*|genel\s*risk\s*danis|kaynak\s*kullanmadan|celiskiyi\s*yorumla|rapora\s*nasil\s*yazilir|rapora\s*nasil\s*ifade|yasal\s*yukumluluk\s*agir|butce\s*ayir\w*|calisanlar\s*korkuyor|ramak\s*kala\s*yasan\w*|yonetim\s*butce)/;

const KNOWLEDGE_GUIDANCE_PATTERN =
  /\b(risk\s*matris|5\s*x\s*5|5x5|puan.*25|25.*puan|onemsiz.*aciklama|aciklama.*onemsiz|50000|50\s*000|200\s*000|80\s*000|maliyet.*mantikli|beklenen\s*kayip|normalize|1\s*-\s*25|siniflara\s*ayir)\b/;

const EXPLICIT_NAVIGATION_PATTERN =
  /(hangi\s*sayfa|nereden\s*acarim|modulune\s*git|sayfaya\s*git|beni\s*yonlendir|open\s*page|which\s*page)/;

const NAVIGATION_ONLY_RESPONSE_PATTERN =
  /(alanina\s*yonlendiriyorum|sayfaya\s*git|asagidaki\s*sayfaya\s*git|raporlar\s*alanina|dokumanlar\s*alanina|isg\s*kutuphanesi\s*dokumanlari\s*alanina)/;

const RAG_HALLUCINATION_RESPONSE_PATTERN =
  /(kaynaga\s*dayali\s*bulgu|guven\s*yuksek|kaynak\s*dogrulanmis|cit-\d+)/;

const IRRELEVANT_LEGAL_CITATION_PATTERN =
  /(turk\s*borclar\s*kanunu|tbk\s*m\.|tck\s*m\.|6102\s*sayili|6098\s*sayili|omur\s*boyu\s*gelir)/;

const RAG_EMPTY_INDEX_PATTERN = /mevzuat\s*indeksinde\s*eslesme\s*bulamadim/;

/** Önceki turdaki safety bağlamını sıfırla — yalnızca mevcut mesajın niyetine bak. */
const SAFETY_CONTEXT_RESET_PATTERN =
  /(?:onceki\s*(?:mesaj|istek|konu|sahte|manipulasyon).*bagimsiz|bagimsiz\s*olarak|bu\s*mesajda\s*sadece|onceki\s*sahte\s*kaynak)/;

function normalizedForSafetyScan(message: string): string {
  const normalized = normalizeNovaRequestText(message);
  if (!SAFETY_CONTEXT_RESET_PATTERN.test(normalized)) {
    return normalized;
  }

  return normalized
    .replace(/onceki\s*sahte\s*kaynak\s*veya\s*manipulasyon\s*isteklerinden\s*bagimsiz\s*olarak/gi, "")
    .replace(/onceki\s*(?:sahte\s*kaynak|manipulasyon)[^.]*?(?=bagimsiz|cevap\s*ver|orta\s*seviye)/gi, "")
    .replace(/\bsahte\s*kaynak\b/gi, "kaynak")
    .replace(/\bmanipulasyon\b/gi, "degerlendirme");
}

export function buildTurkishSafetyRefusal(reason: string, alternative: string) {
  return [
    "Kısa yanıt: Buna yardımcı olamam.",
    "",
    "Neden:",
    `- ${reason}`,
    "- RiskNova'nın güvenli kullanım sınırları gereği bu istek kapsam dışıdır.",
    "",
    "Güvenli alternatif:",
    `- ${alternative}`,
  ].join("\n");
}

export function detectUnsafeNovaIntent(message: string) {
  const normalized = normalizedForSafetyScan(message);
  for (const item of UNSAFE_INTENT_PATTERNS) {
    if (item.pattern.test(normalized)) {
      return item;
    }
  }
  return null;
}

export function buildUnsafeNovaRefusal(_message: string) {
  const match = detectUnsafeNovaIntent(_message);
  if (!match) return null;
  return buildTurkishSafetyRefusal(match.reasonTr, match.alternativeTr);
}

export function shouldBlockNovaForSafety(message: string) {
  return detectUnsafeNovaIntent(message) !== null;
}

export function isNovaContentGenerationTask(message: string) {
  const normalized = normalizeNovaRequestText(message);
  return (
    CONTENT_GENERATION_PATTERN.test(normalized) || isNovaReportContentAdvisoryTask(message)
  );
}

export function isNovaAdvisoryChatTask(message: string) {
  const normalized = normalizeNovaRequestText(message);
  return ADVISORY_CHAT_PATTERN.test(normalized) || isNovaReportContentAdvisoryTask(message);
}

export function isNovaKnowledgeGuidanceTask(message: string) {
  return KNOWLEDGE_GUIDANCE_PATTERN.test(normalizeNovaRequestText(message));
}

export function isNovaBehaviorPromptTask(message: string) {
  return (
    isNovaContentGenerationTask(message) ||
    isNovaAdvisoryChatTask(message) ||
    isNovaKnowledgeGuidanceTask(message)
  );
}

export function isNovaHardGateTask(message: string) {
  return isNovaBehaviorPromptTask(message) || isNovaMethodAdvisorTask(message);
}

export function isExplicitNovaNavigationOnlyRequest(message: string) {
  const normalized = normalizeNovaRequestText(message);
  return EXPLICIT_NAVIGATION_PATTERN.test(normalized) && !isNovaBehaviorPromptTask(message);
}

export function shouldSkipNovaNavigationForContentTask(message: string) {
  return isNovaHardGateTask(message) && !isExplicitNovaNavigationOnlyRequest(message);
}

function buildNovaKnowledgeFallbackResponse(message: string): string | null {
  const normalized = normalizeNovaRequestText(message);

  if (/\b(risk\s*matris|5\s*x\s*5|5x5)\b/.test(normalized)) {
    return [
      "Kısa yanıt: Risk değerlendirmesi yapmak zorunludur; 5x5 risk matrisi ise kullanılabilecek yöntemlerden biridir.",
      "",
      "Risk skoru (L matrisi): Olasılık × Şiddet",
      "",
      "5x5 örnek matris (RiskNova varsayılan eşikleri):",
      "| Renk | Puan | Seviye | Aksiyon |",
      "|------|------|--------|---------|",
      "| Yeşil | 1-4 | Düşük | Kayıt al, rutin takip |",
      "| Sarı | 5-9 | Orta | Önlem planla, termin belirle |",
      "| Turuncu | 10-14 | Yüksek | Acil önlem, sorumlu ata |",
      "| Kırmızı | 15-25 | Kritik | Faaliyeti durdur, üst yönetim bilgilendir |",
      "",
      "Yöntem seçimi işyerinin niteliği, risk türü, veri kalitesi ve kurum politikasına göre belirlenir. Matris tek başına mevzuat zorunluluğu değildir; eşikler kuruma göre özelleştirilebilir.",
    ].join("\n");
  }

  if (/\b(25.*onemsiz|onemsiz.*25|puan.*25)\b/.test(normalized)) {
    return [
      "Kısa yanıt: 25 puan normalde kritik risk demektir; “önemsiz” açıklamasıyla açık çelişki vardır. Ancak sadece puana da körü körüne güvenilmemelidir.",
      "",
      "Kontrol edin: olasılık, şiddet, yöntem, brüt/artık risk ayrımı, tarih, değerlendirici ve açıklama. Puan da açıklama da hatalı girilmiş olabilir.",
      "",
      "Kayıt doğrulanmalı, gerekçeli revizyon yapılmalı ve gerekiyorsa kritik risk aksiyon planı başlatılmalıdır.",
    ].join("\n");
  }

  if (/\b((50000|50\s*000).*200\s*000|maliyet.*mantikli|beklenen\s*kayip)\b/.test(normalized)) {
    return [
      "Kısa yanıt: Verilen varsayımlara göre ekonomik olarak mantıklı görünüyor.",
      "",
      "Hesap:",
      "- Risk azalımı: 200.000 - 80.000 = 120.000 TL/yıl",
      "- Önlem maliyeti: 50.000 TL",
      "- İlk yıl net fayda: 120.000 - 50.000 = 70.000 TL",
      "- Geri ödeme süresi: 50.000 / 120.000 ≈ 5 ay",
      "",
      "Notlar:",
      "- Önlem maliyeti tek seferlik mi yıllık mı belirtilmedi; bakım ve sürdürme maliyeti sonucu değiştirir.",
      "- Yasal/etik zorunluluk varsa karar yalnızca finansal analizle verilmemelidir.",
      "- İnsan hayatı riski sadece maliyet-fayda ile reddedilemez.",
    ].join("\n");
  }

  if (/\b(normalize|1\s*-\s*25|siniflara\s*ayir)\b/.test(normalized)) {
    return [
      "Normalize Skor = Ham Skor / 25 x 100",
      "",
      "Sınıf eşikleri (5x5 L matrisi):",
      "- 1-4: Düşük (%4-16)",
      "- 5-9: Orta (%20-36)",
      "- 10-14: Yüksek (%40-56)",
      "- 15-25: Kritik (%60-100)",
      "",
      "Aynı rapor içinde eşikleri tutarlı kullanın; kurum risk iştahı farklı olabilir.",
    ].join("\n");
  }

  return null;
}

export function buildNovaContentFallbackResponse(message: string): string | null {
  const knowledge = buildNovaKnowledgeFallbackResponse(message);
  if (knowledge) return knowledge;

  if (!isNovaContentGenerationTask(message) && !isNovaAdvisoryChatTask(message)) {
    return null;
  }

  const normalized = normalizeNovaRequestText(message);

  if (/\b(e\s*-?\s*posta|eposta|email|mail\s*olarak)\b/.test(normalized)) {
    return [
      "Konu: Risk Değerlendirme Raporu Hakkında",
      "",
      "Merhaba [Müşteri Adı],",
      "",
      "[İşyeri/Proje Adı] için hazırlanan risk değerlendirme raporunu bilginize sunarım.",
      "",
      "Raporda tespit edilen başlıca riskler, mevcut kontrol önlemleri ve önerilen düzeltici faaliyetler özetlenmiştir. Özellikle yüksek ve kritik seviyedeki riskler için sorumlu kişi atanması, termin belirlenmesi ve önlem sonrası artık riskin yeniden değerlendirilmesi önerilir.",
      "",
      "Raporu inceledikten sonra varsa sorularınızı veya revizyon taleplerinizi paylaşabilirsiniz.",
      "",
      "Saygılarımla,",
      "[Ad Soyad]",
    ].join("\n");
  }

  if (
    /\b(musteri\s*kizgin|musteri\s*raporu\s*reddetti|rapor.*sacma|nasil\s*cevap|nasil\s*yanit|ne\s*cevap\s*ver|ne\s*yanit\s*ver|net\s*ama\s*suclayici)\b/.test(
      normalized,
    )
  ) {
    return [
      "Şöyle sakin ve profesyonel cevap verebilirsiniz:",
      "",
      "Merhaba [Müşteri Adı],",
      "",
      "Geri bildiriminizi anlıyorum. Raporun beklentinizi karşılamayan noktalarını birlikte netleştirmek isterim. Amacımız sizi zor durumda bırakmak değil; sahadaki riskleri doğru şekilde görünür kılmak ve uygulanabilir aksiyonlarla yönetilebilir hale getirmektir.",
      "",
      "Dilerseniz özellikle hatalı veya eksik olduğunu düşündüğünüz başlıkları birlikte gözden geçirelim.",
      "",
      "Saygılarımla,",
      "[Ad Soyad]",
    ].join("\n");
  }

  if (/\b(yonetim\s*kurulu|yonetici\s*ozeti)\b/.test(normalized)) {
    return [
      "Yönetim Kurulu Özeti:",
      "",
      "RiskNova, iş sağlığı ve güvenliği süreçlerinde risklerin sistematik tespiti, önceliklendirilmesi ve aksiyona dönüştürülmesini destekleyen bir karar destek aracıdır.",
      "",
      "Stratejik değer: kritik risklerin erken tespiti, aksiyon takibi ve denetim hazırlığı için izlenebilir kayıt.",
      "",
      "Ana mesaj: RiskNova nihai karar mercii değildir; yönetim ve İSG uzmanları için güçlü bir izleme altyapısıdır.",
    ].join("\n");
  }

  if (/\b(kisa\s*ve\s*ikna\s*edici|ikna\s*edici|rapor\s*ozeti|ozet\s*yaz|ozetle)\b/.test(normalized)) {
    return [
      "Rapor metnini paylaşmadınız; yine de kullanabileceğiniz kısa bir yönetici özeti taslağı:",
      "",
      "Yönetici Özeti:",
      "Öncelikli riskler [alan/tehlike] başlığında yoğunlaşmaktadır. Yüksek riskler için düzeltici faaliyet, sorumlu atama ve önlem sonrası artık risk hesabı önerilir.",
      "",
      "Metni paylaşırsanız raporunuza göre kısaltıp güçlendirebilirim.",
    ].join("\n");
  }

  if (/\b(ne\s*yapmaliyim|risk\s*skor.*yuksek|sistem.*yuksek\s*gosteriyor)\b/.test(normalized)) {
    return [
      "Kısa yanıt: Panik yapmayın; yüksek skor öncelikli aksiyon gerektiren bir uyarıdır.",
      "",
      "İlk 5 adım:",
      "1. Risk kaydını açın; olasılık, şiddet ve maruziyeti kontrol edin.",
      "2. Ciddi yaralanma/ölüm riski varsa faaliyeti geçici durdurun.",
      "3. Eksik önlemleri tamamlayın (bariyer, eğitim, KKD).",
      "4. Düzeltici faaliyet ve termin atayın.",
      "5. Önlem sonrası artık riski yeniden hesaplayın.",
      "",
      "Risk kategorisini paylaşırsanız daha somut önlem önerebilirim.",
    ].join("\n");
  }

  if (
    /(?:once|oncelikle).*(?:3|uc)\s*cumle\w*.*yonetici|yonetici\s*notu.*(?:3|uc)\s*cumle|rapora\s*yazilacak\s*(?:3|uc)\s*cumle/.test(
      normalized,
    )
  ) {
    return appendOptionalReportsHandoff(buildNovaThreeSentenceExecutiveNoteResponse(), message);
  }

  if (/\b(sadece\s*\d+\s*madde\w*|(?:3|uc)\s*madde\w*)\b/.test(normalized) && !/yonetici\s*notu|rapora\s*yaz/.test(normalized)) {
    return [
      "1. Risk seviyesi yüksekse önce tehlikenin kaynağını ve mevcut önlemleri kontrol edin.",
      "2. Sorumlu kişi, termin ve düzeltici faaliyet belirleyin.",
      "3. Önlem sonrası artık riski yeniden hesaplayıp kaydı güncelleyin.",
    ].join("\n");
  }

  if (/\b(kisa\s*cevap)\b/.test(normalized)) {
    return "Kısa yanıt: Önce doğrudan ve uygulanabilir cevap verilir; yalnızca sayfa yönlendirmesi yapılmaz.";
  }

  if (/\b(isg\s*uzmanina.*ceo|ceo.*isg\s*uzman|iki\s*ton|ayri\s*ton)\b/.test(normalized)) {
    return [
      "İSG uzmanına (teknik ton):",
      "Tespit edilen riskler için olasılık, şiddet, maruziyet ve mevcut kontroller doğrulanmalıdır. Kritik risklerde düzeltici faaliyet, sorumlu ve termin tanımlanmalı; önlem sonrası artık risk yeniden hesaplanmalıdır.",
      "",
      "CEO’ya (yönetim tonu):",
      "Öncelikli riskler sağlık ve iş sürekliliği açısından yönetim gündemine alınmalıdır. Kritik bulgular için net sorumlu, termin ve kaynak tahsisi önerilir; RiskNova kayıtları denetim ve karar izlenebilirliği sağlar.",
    ].join("\n");
  }

  if (/\b(belirsizligi.*profesyonel|belirsizlik.*nasil\s*yaz)\b/.test(normalized)) {
    return [
      "Profesyonel belirsizlik ifadesi örneği:",
      "",
      "“Bu risk için olasılık ve şiddet değerleri mevcut saha verisiyle desteklenmiştir; maruziyet süresi ve önlem etkinliği doğrulandıkça artık risk yeniden değerlendirilecektir. Kritik sınıf sınırında kalan kayıtlar bir sonraki denetim turunda gözden geçirilecektir.”",
    ].join("\n");
  }

  if (/\b(bu\s*kadar\s*detaya\s*gerek\s*yok|raporun\s*neden\s*gerekli|yonetici.*detay)\b/.test(normalized)) {
    return [
      "Yöneticiye iletebileceğiniz kısa çerçeve:",
      "",
      "Risk raporu detay içerir çünkü yalnızca skor değil; kanıt, sorumlu, termin ve önlem sonrası doğrulama zinciri gereklidir. Bu yapı hem çalışan güvenliği hem de denetimde savunulabilirlik sağlar. Özet sunumda kritik riskler, maliyet-etki ve acil aksiyonlar öne çıkarılabilir; detay arşivde tutulur.",
    ].join("\n");
  }

  if (
    /(?:kritik\s*seviyede.*izlenebilir|gecici\s*onlem.*izlenebilir|ifade\s*dogru\s*mu|celiski\s*varsa)/.test(
      normalized,
    ) &&
    /rapor/.test(normalized)
  ) {
    return appendOptionalReportsHandoff(buildNovaCriticalTemporaryControlsReportResponse(), message);
  }

  if (
    /(?:orta\s*seviye|calisan.*endise|endise\s*bildirdi).*(?:nasil\s*degerlendirmeliyim|genel\s*risk)|genel\s*risk\s*danis|kaynak\s*kullanma.*genel/.test(
      normalized,
    )
  ) {
    return buildNovaEmployeeConcernRiskAdvisoryResponse();
  }

  if (
    /(?:kritik\s*ama\s*kabul|kabul\s*edilebilir.*kritik|acil\s*aksiyon\s*gerektirmiyor|profesyonel\s*rapor\s*diliyle\s*nasil)/.test(
      normalized,
    )
  ) {
    return buildNovaContradictoryReportLanguageResponse();
  }

  if (
    /(?:hangi\s*yontem\w*\s*kullan\w*|rapora\s*ne\s*yaz\w*|raporda\s*ne\s*yazma\w*|yazmamam\w*\s*gerek|yasal\s*yukumluluk\s*agir|butce\s*ayir\w*|ramak\s*kala)/.test(
      normalized,
    )
  ) {
    return buildNovaComplexRiskAdvisoryResponse();
  }

  if (isNovaReportContentAdvisoryTask(message)) {
    return appendOptionalReportsHandoff(buildNovaGenericReportWritingAdvisoryResponse(), message);
  }

  return null;
}

function buildNovaCriticalTemporaryControlsReportResponse(): string {
  return [
    "Bu ifade kısmen kullanılabilir ancak dikkatli yazılmalıdır. \"Kritik seviyede\" ifadesi öncelikli aksiyon gerektirdiği için, \"sadece izlenebilir\" gibi pasif bir ifade tek başına yeterli değildir. Geçici önlemler varsa bunların kalıcı önlem yerine geçmediği, sorumlu kişi ve terminle aksiyon planı başlatıldığı belirtilmelidir.",
    "",
    "Daha doğru rapor cümlesi:",
    "\"Risk kritik seviyededir. Mevcut geçici kontroller kısa süreli risk azaltımı sağlamaktadır; ancak kalıcı kontrol önlemleri için sorumlu kişi, termin ve etkinlik kontrolü belirlenmelidir. Önlem sonrası artık risk yeniden hesaplanacaktır.\"",
  ].join("\n");
}

function buildNovaThreeSentenceExecutiveNoteResponse(): string {
  return [
    "Bu risk, mevcut geçici önlemlerle izlenebilir durumda olsa da kritik seviye nedeniyle öncelikli yönetim takibi gerektirir.",
    "Kalıcı kontrol önlemleri için sorumlu kişi, termin ve kaynak ihtiyacı belirlenmelidir.",
    "Önlem sonrası artık risk yeniden hesaplanarak yönetim kuruluna kapanış kanıtıyla raporlanmalıdır.",
  ].join("\n");
}

function buildNovaEmployeeConcernRiskAdvisoryResponse(): string {
  return [
    "Orta skor tek başına yeterli değildir. Çalışan endişesi erken uyarı sinyali olabilir.",
    "",
    "Önerilen adımlar:",
    "1. Sahada gözlem yapın; maruziyet, kontrol eksikliği ve tekrarlayan şikâyetleri doğrulayın.",
    "2. Olasılık/şiddet parametrelerini ve mevcut önlemlerin etkinliğini yeniden kontrol edin.",
    "3. Gerekirse R-Skor 2D ile maruziyet, çalışan algısı, kontrol seviyesi ve yasal yükümlülük boyutlarını birlikte değerlendirin.",
    "4. Kritik veya yüksek öncelik çıkarsa sorumlu, termin ve önlem sonrası artık risk hesabı tanımlayın.",
  ].join("\n");
}

function buildNovaContradictoryReportLanguageResponse(): string {
  return [
    "Bunu bu şekilde yazmanızı önermem. \"Kritik\", \"kabul edilebilir\" ve \"acil aksiyon gerektirmiyor\" ifadeleri aynı risk kaydı içinde çelişir. Kritik risk normalde öncelikli aksiyon, sorumlu kişi, termin ve etkinlik kontrolü gerektirir.",
    "",
    "Daha doğru rapor dili şöyle olabilir:",
    "\"Risk kritik seviyededir. Mevcut kontrollerin yeterliliği doğrulanana kadar geçici kontrol önlemleri uygulanmalı, kalıcı iyileştirme için sorumlu kişi ve termin atanmalıdır. Önlem sonrası artık risk yeniden hesaplanmalı ve etkinlik kontrolü yapılmalıdır.\"",
    "",
    "Modül yönlendirmesi yapılmaz; metni doğrudan risk/olay kaydınıza uyarlayabilirsiniz.",
  ].join("\n");
}

function buildNovaGenericReportWritingAdvisoryResponse(): string {
  return [
    "Kısa yanıt: Rapor metni ve rapor dili soruları chat içinde yanıtlanır; Raporlar modülüne otomatik yönlendirme yapılmaz.",
    "",
    "Paylaştığınız bağlamı (risk seviyesi, kanıt, yasal yükümlülük, önlemler) netleştirirseniz rapora yazılacak ve yazılmayacak ifadeleri madde madde önerebilirim.",
    "",
    "Genel ilke: skor, sınıf, önlem, sorumlu ve termin birbiriyle çelişmemeli; yönetim baskısı veya estetik kaygı kayıt manipülasyonu gerekçesi olamaz.",
  ].join("\n");
}

function buildNovaComplexRiskAdvisoryResponse(): string {
  return [
    "Kısa yanıt: Salt matris puanına güvenmeyin; tekrarlayan ramak kala ve ağır yasal yükümlülük için R2D-RCA + çok boyutlu önceliklendirme (R-Skor 2D) gerekir. Raporu etik ve savunulabilir yazın; bütçe baskısı kayıt manipülasyonu gerekçesi olamaz.",
    "",
    "## Hangi yöntemi kullanmalıyım?",
    "- Başlangıç kaydı: 5x5 L Matrisi (risk orta görünse bile).",
    "- Aynı skor + yasal/maruziyet/çalışan psikolojisi farkı: R-Skor 2D.",
    "- Aynı olay iki kez ramak kala: R2D-RCA kök neden analizi (5 Neden, Ishikawa, etkinlik kontrolü).",
    "",
    "## Rapora ne yazmalısınız?",
    "- Olay özeti, mevcut kontroller, yasal yükümlülük, maruziyet ve çalışan endişesi.",
    "- Tekrarlayan ramak kala → önceki önlemlerin etkisiz kaldığı.",
    "- Önerilen R-Skor 2D / R2D-RCA gerekçesi ve acil/DFA aksiyonları (sorumlu, termin).",
    "- Yönetime: asgari kaynak ihtiyacı ve yasal risk (ceza, durdurma, itibar).",
    "",
    "## Kesinlikle yazmayın",
    "- “Risk düşük, takip yeterli” (çelişkili; ramak kala ve yasal yük varsa).",
    "- “Çalışanlar abartıyor” veya kişiyi suçlayan ifadeler.",
    "- Bütçe yok diye önlemi erteledik (yasal zorunluluk varsa geçersiz).",
    "- Sahte/kaynak göstermeden “mevzuata uygun” iddiası.",
    "- Skoru veya sınıfı yönetim baskısıyla düşük gösterme.",
    "",
    "Modül yönlendirmesi yapılmaz; kayıtları RiskNova’da ilgili olay/risk kaydı üzerinden ilerleyebilirsiniz.",
  ].join("\n");
}

export function buildNovaHardGateResponse(message: string): string | null {
  return (
    buildUnsafeNovaRefusal(message) ??
    buildRiskMethodAdvisorResponse(message) ??
    buildNovaContentFallbackResponse(message)
  );
}

export function validateNovaResponse({
  prompt,
  response,
}: {
  prompt: string;
  response: string;
}): { valid: true } | { valid: false; reason: string; replacement?: string } {
  const normalizedPrompt = normalizeNovaRequestText(prompt);
  const normalizedResponse = normalizeNovaRequestText(response);

  if (shouldBlockNovaForSafety(prompt)) {
    if (
      RAG_HALLUCINATION_RESPONSE_PATTERN.test(normalizedResponse) ||
      NAVIGATION_ONLY_RESPONSE_PATTERN.test(normalizedResponse)
    ) {
      return {
        valid: false,
        reason: "Safety request incorrectly routed to RAG or navigation.",
        replacement: buildUnsafeNovaRefusal(prompt) ?? undefined,
      };
    }
  }

  const hardGateTask = isNovaHardGateTask(prompt);
  const reportContentAdvisory = isNovaReportContentAdvisoryTask(prompt);

  if (userRequestedNoNavigationThisTurn(prompt) || USER_NO_NAVIGATION_PATTERN.test(normalizedPrompt)) {
    if (FORBIDDEN_NAVIGATION_CARD_COPY_PATTERN.test(response)) {
      return {
        valid: false,
        reason: "User opted out of navigation cards for this turn.",
        replacement: buildNovaContentFallbackResponse(prompt) ?? stripForbiddenNavigationFromAnswer(response),
      };
    }
  }

  if (reportContentAdvisory || hardGateTask) {
    const looksLikeReportsNavigation =
      FORBIDDEN_REPORTS_NAVIGATION_COPY_PATTERN.test(response) ||
      FORBIDDEN_NAVIGATION_CARD_COPY_PATTERN.test(response) ||
      (NAVIGATION_ONLY_RESPONSE_PATTERN.test(normalizedResponse) && reportContentAdvisory);

    if (looksLikeReportsNavigation) {
      return {
        valid: false,
        reason: "Report writing/advisory request incorrectly routed to Reports navigation.",
        replacement:
          buildNovaContentFallbackResponse(prompt) ?? buildNovaGenericReportWritingAdvisoryResponse(),
      };
    }
  }

  if (hardGateTask) {
    const looksLikeNavigationOnly =
      NAVIGATION_ONLY_RESPONSE_PATTERN.test(normalizedResponse) && normalizedResponse.length < 900;
    const looksLikeIrrelevantRag =
      RAG_HALLUCINATION_RESPONSE_PATTERN.test(normalizedResponse) ||
      IRRELEVANT_LEGAL_CITATION_PATTERN.test(normalizedResponse);
    const looksLikeEmptyRag =
      RAG_EMPTY_INDEX_PATTERN.test(normalizedResponse) && normalizedResponse.length < 500;

    if (looksLikeNavigationOnly || looksLikeIrrelevantRag || looksLikeEmptyRag) {
      return {
        valid: false,
        reason: "Hard-gate request incorrectly routed to navigation or legal RAG.",
        replacement:
          buildRiskMethodAdvisorResponse(prompt) ??
          buildNovaContentFallbackResponse(prompt) ??
          undefined,
      };
    }
  }

  if (isNovaRagServiceRequest(prompt) && isForbiddenUserNavigationCopy(response)) {
    return {
      valid: false,
      reason: "RAG service response must not redirect to admin legislation UI.",
      replacement: stripForbiddenNavigationFromAnswer(response) || undefined,
    };
  }

  if (isForbiddenUserNavigationCopy(response) && !isExplicitNovaNavigationOnlyRequest(prompt)) {
    return {
      valid: false,
      reason: "User-facing response must not suggest admin-only legislation navigation.",
      replacement:
        buildRiskMethodAdvisorResponse(prompt) ??
        buildNovaContentFallbackResponse(prompt) ??
        "Mevzuat kontrolü chat içinde yapılır; admin ayarlarına yönlendirme yapılmaz.",
    };
  }

  if (/\b(?:sadece\s*)?(?:3|uc)\s*madde\w*\b/.test(normalizedPrompt)) {
    const numberedItems = response.match(/^\s*\d+[.)]/gm)?.length ?? 0;
    if (numberedItems > 3) {
      return {
        valid: false,
        reason: "Three-item format instruction exceeded.",
        replacement: buildNovaContentFallbackResponse(prompt) ?? undefined,
      };
    }
  }

  return { valid: true };
}

export function extractNovaFormatInstruction(message: string): string | null {
  const normalized = normalizeNovaRequestText(message);
  const rules: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /(sadece\s*)?(?:3|uc)\s*madde\w*/, label: "Yalnızca 3 madde halinde yanıt ver." },
    { pattern: /kisa\s*cevap/, label: "Önce kısa yanıt ver; gereksiz detay ekleme." },
    { pattern: /tablo\s*yap/, label: "Bilgiyi markdown tablo ile sun." },
    { pattern: /12\s*yas/, label: "12 yaşındaki birine anlatır gibi basit dil kullan." },
    { pattern: /yonetim\s*kurulu/, label: "Yönetim kurulu sunumu diliyle yaz." },
  ];

  const matched = rules.filter((rule) => rule.pattern.test(normalized)).map((rule) => rule.label);
  return matched.length > 0 ? matched.join(" ") : null;
}

export const NOVA_BEHAVIOR_GATEWAY_PROMPT_TR = `Nova Risk Intelligence (v3) — zorunlu:

Öncelik: (1) Güvenlik (2) Format (3) Niyet (4) Kaynak (5) Chat cevabı (6) Modül yönlendirmesi.

Route: normalize → safety → content/advisory → method advisor → vision → legal RAG → navigation → general chat.

Korunan: Risk Skoru = Olasılık × Şiddet. Eşikler: 1-4, 5-9, 10-14, 15-25. Risk değerlendirmesi zorunlu; matris tek zorunlu yöntem değil.

Güvenlik: RAG/navigation/rozet yok.

Üretim: e-posta, özet, müşteri cevabı → önce chat metni; Sayfaya Git ana cevap olmasın.

Kaynak rozeti: yalnızca gerçek legal RAG + ilgili kaynak + confidence≥0.68.

${NOVA_METHOD_ADVISOR_PROMPT_TR}

${NOVA_METHODS_EXPERTISE_PROMPT_TR}`;

export const NOVA_BEHAVIOR_GATEWAY_PROMPT_EN = `Nova behavior layer (v2) — required:

Priority: (1) Safety (2) Format (3) Intent (4) Sources (5) Chat answer (6) Module navigation.

Route: normalize → safety → content-generation → vision → legal RAG → navigation → general chat.

Safety: no RAG/navigation on harmful requests; no source badge.

Generation: email/summary/rewrite → answer in chat first; navigation is secondary.`;

/** @deprecated Use NOVA_BEHAVIOR_GATEWAY_PROMPT_TR */
export const NOVA_BEHAVIOR_GATEWAY_PROMPT = NOVA_BEHAVIOR_GATEWAY_PROMPT_TR;

export function getNovaGatewayBehaviorMessages(language?: string | null): Array<{
  role: "assistant";
  content: string;
}> {
  const isTr = !language || String(language).toLowerCase().startsWith("tr");
  const prompt = isTr ? NOVA_BEHAVIOR_GATEWAY_PROMPT_TR : NOVA_BEHAVIOR_GATEWAY_PROMPT_EN;
  const followUp = isTr
    ? "Nova: Üretim ve danışmanlık isteklerinde önce chat içinde metin üret. Modül yönlendirmesi ikincil; açık sayfa sorusu hariç ana cevap olmasın."
    : "Nova: For drafting requests, answer in chat first. Module navigation is secondary unless the user explicitly asks for a page.";

  return [
    { role: "assistant", content: prompt },
    { role: "assistant", content: followUp },
  ];
}

export function getNovaBehaviorSystemPromptAddition(language?: string | null) {
  const isTr = !language || String(language).toLowerCase().startsWith("tr");
  return isTr ? NOVA_BEHAVIOR_GATEWAY_PROMPT_TR : NOVA_BEHAVIOR_GATEWAY_PROMPT_EN;
}
