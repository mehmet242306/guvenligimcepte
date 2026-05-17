import { normalizeNovaRequestText } from "@/lib/nova/text-normalization";
import {
  buildNovaMethodsExpertiseResponse,
  isNovaMethodsExpertiseTask,
  NOVA_METHODS_EXPERTISE_PROMPT_TR,
} from "@/lib/nova/risknova-methods-expertise";

export { isNovaMethodsExpertiseTask, buildNovaMethodsExpertiseResponse } from "@/lib/nova/risknova-methods-expertise";

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
    pattern: /(raporu\s*daha\s*guvenilir\s*goster|guvenilir\s*goster)/,
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
  /\b(e\s*-?\s*posta|eposta|email|mail\s*olarak|yeniden\s*yaz|tekrar\s*yaz|yonetim\s*kurulu|yonetici\s*ozeti|musteri\s*kizgin|nasil\s*cevap|nasil\s*yanit|ne\s*cevap\s*ver|ne\s*yanit\s*ver|cevap\s*taslagi|yanit\s*taslagi|ozet\s*yaz|ozetle|rapor\s*ozeti|profesyonel\s*yaz|profesyonel\s*hale\s*getir|ikna\s*edici|kisa\s*ve\s*ikna\s*edici|taslak\s*yaz|sablon|metni\s*duzenle|duzelt\s*yaz|formatla|sadece\s*\d+\s*madde\w*|(?:^|\s)(?:3|uc)\s*madde\w*|kisa\s*cevap|tablo\s*yap|basit\s*anlat|12\s*yasindaki|cocuk\s*gibi\s*anlat)\b/;

const ADVISORY_CHAT_PATTERN =
  /\b(ne\s*yapmaliyim|nasil\s*ilerlemeliyim|ilk\s*adim|risk\s*skor.*yuksek|sistem.*yuksek\s*gosteriyor|kritik\s*risk.*iflas|skor\s*yanlis\s*olabilir\s*mi|verilen\s*skor\s*yanlis|rapor.*sacma)\b/;

const KNOWLEDGE_GUIDANCE_PATTERN =
  /\b(risk\s*matris|5\s*x\s*5|5x5|puan.*25|25.*puan|onemsiz.*aciklama|aciklama.*onemsiz|50000|50\s*000|200\s*000|80\s*000|maliyet.*mantikli|beklenen\s*kayip|normalize|1\s*-\s*25|siniflara\s*ayir)\b/;

const EXPLICIT_NAVIGATION_PATTERN =
  /(hangi\s*sayfa|nereden\s*acarim|modulune\s*git|sayfaya\s*git|beni\s*yonlendir|open\s*page|which\s*page)/;

const NAVIGATION_ONLY_RESPONSE_PATTERN =
  /(alanina\s*yonlendiriyorum|sayfaya\s*git|asagidaki\s*sayfaya\s*git|raporlar\s*alanina|dokumanlar\s*alanina|isg\s*kutuphanesi\s*dokumanlari\s*alanina)/;

const RAG_HALLUCINATION_RESPONSE_PATTERN =
  /(kaynaga\s*dayali\s*bulgu|guven\s*yuksek|kaynak\s*dogrulanmis|cit-\d+)/;

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
  const normalized = normalizeNovaRequestText(message);
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
  return CONTENT_GENERATION_PATTERN.test(normalizeNovaRequestText(message));
}

export function isNovaAdvisoryChatTask(message: string) {
  return ADVISORY_CHAT_PATTERN.test(normalizeNovaRequestText(message));
}

export function isNovaKnowledgeGuidanceTask(message: string) {
  return KNOWLEDGE_GUIDANCE_PATTERN.test(normalizeNovaRequestText(message));
}

export function isNovaBehaviorPromptTask(message: string) {
  return (
    isNovaContentGenerationTask(message) ||
    isNovaAdvisoryChatTask(message) ||
    isNovaKnowledgeGuidanceTask(message) ||
    isNovaMethodsExpertiseTask(message)
  );
}

export function isExplicitNovaNavigationOnlyRequest(message: string) {
  const normalized = normalizeNovaRequestText(message);
  return EXPLICIT_NAVIGATION_PATTERN.test(normalized) && !isNovaBehaviorPromptTask(message);
}

export function shouldSkipNovaNavigationForContentTask(message: string) {
  return isNovaBehaviorPromptTask(message) && !isExplicitNovaNavigationOnlyRequest(message);
}

function buildNovaKnowledgeFallbackResponse(message: string): string | null {
  const normalized = normalizeNovaRequestText(message);

  if (/\b(risk\s*matris|5\s*x\s*5|5x5)\b/.test(normalized)) {
    return [
      "Kısa yanıt: Risk değerlendirmesi yapmak zorunludur; 5x5 risk matrisi ise kullanılabilecek yöntemlerden biridir.",
      "",
      "5x5 örnek matris (L matrisi):",
      "| Renk | Puan | Seviye | Aksiyon |",
      "|------|------|--------|---------|",
      "| Yeşil | 1-4 | Düşük | Kayıt al, rutin takip |",
      "| Sarı | 5-9 | Orta | Önlem planla, termin belirle |",
      "| Turuncu | 10-14 | Yüksek | Acil önlem, sorumlu ata |",
      "| Kırmızı | 15-25 | Kritik | Faaliyeti durdur, üst yönetim bilgilendir |",
      "",
      "Yöntem seçimi işyerinin niteliği, risk türü ve kurum politikasına göre belirlenir; matris tek başına mevzuat zorunluluğu değildir.",
    ].join("\n");
  }

  if (/\b(25.*onemsiz|onemsiz.*25|puan.*25)\b/.test(normalized)) {
    return [
      "Kısa yanıt: Ne puana ne açıklama metnine körü körüne güvenmeyin; kaydı birlikte doğrulayın.",
      "",
      "25 puan normalde kritik seviyedir ve önemsiz açıklamasıyla çelişir. Ancak puanın kendisi de yanlış girilmiş olabilir. Olasılık, şiddet, kullanılan yöntem, mevcut önlemler ve açıklama alanını kontrol edin; hata varsa revizyon gerekçesiyle düzeltin ve uzman onayı alın.",
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
      "- Geri ödeme süresi: yaklaşık 5 ay",
      "",
      "Not: Önlem maliyeti tek seferlik mi yıllık mı belirtilmedi; bakım, eğitim ve denetim maliyetleri sonucu değiştirebilir.",
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

  if (/\b(musteri\s*kizgin|rapor.*sacma|nasil\s*cevap|nasil\s*yanit|ne\s*cevap\s*ver|ne\s*yanit\s*ver)\b/.test(normalized)) {
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

  if (/\b(sadece\s*\d+\s*madde\w*|(?:3|uc)\s*madde\w*)\b/.test(normalized)) {
    return [
      "1. Risk seviyesi yüksekse önce tehlikenin kaynağını ve mevcut önlemleri kontrol edin.",
      "2. Sorumlu kişi, termin ve düzeltici faaliyet belirleyin.",
      "3. Önlem sonrası artık riski yeniden hesaplayıp kaydı güncelleyin.",
    ].join("\n");
  }

  if (/\b(kisa\s*cevap)\b/.test(normalized)) {
    return "Kısa yanıt: Önce doğrudan ve uygulanabilir cevap verilir; yalnızca sayfa yönlendirmesi yapılmaz.";
  }

  return null;
}

export function buildNovaHardGateResponse(message: string): string | null {
  return (
    buildUnsafeNovaRefusal(message) ??
    buildNovaMethodsExpertiseResponse(message) ??
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

  if (isNovaBehaviorPromptTask(prompt)) {
    const looksLikeNavigationOnly =
      NAVIGATION_ONLY_RESPONSE_PATTERN.test(normalizedResponse) && normalizedResponse.length < 900;
    const looksLikeIrrelevantRag = RAG_HALLUCINATION_RESPONSE_PATTERN.test(normalizedResponse);

    if (looksLikeNavigationOnly || looksLikeIrrelevantRag) {
      return {
        valid: false,
        reason: "Behavior/content request incorrectly routed to navigation or legal RAG.",
        replacement:
          buildNovaMethodsExpertiseResponse(prompt) ??
          buildNovaContentFallbackResponse(prompt) ??
          undefined,
      };
    }
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

export const NOVA_BEHAVIOR_GATEWAY_PROMPT_TR = `Nova davranış düzeltme katmanı (v2) — zorunlu:

Öncelik: (1) Güvenlik (2) Format talimatı (3) Niyet (4) Kaynak (5) Chat cevabı (6) Modül yönlendirmesi.

Route sırası: normalize → safety → content-generation/advisory → vision → legal RAG → navigation → general chat.

Korunan: Risk Skoru = Olasılık x Şiddet. 5x5 eşik: 1-4, 5-9, 10-14, 15-25. Matris tek zorunlu yöntem değildir.

Güvenlik: zararlı istekte RAG/navigation yok; kaynak rozeti yok.

Üretim: e-posta, özet, yeniden yazım → önce metin; Sayfaya Git ana cevap olmasın.

Kaynak: Güven yüksek yalnızca doğrudan ilgili legal RAG kaynakta.

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
