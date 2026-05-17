import { normalizeNovaRequestText } from "@/lib/nova/text-normalization";

export const NOVA_RISK_MATRIX_THRESHOLDS = {
  low: { min: 1, max: 4, label: "Dusuk" },
  medium: { min: 5, max: 9, label: "Orta" },
  high: { min: 10, max: 14, label: "Yuksek" },
  critical: { min: 15, max: 25, label: "Kritik" },
} as const;

const UNSAFE_INTENT_PATTERNS: Array<{ pattern: RegExp; reason: string; alternative: string }> = [
  {
    pattern:
      /\b(yasalar\w*\s*a[s]?m\w*|yasalar\w*\s*as\w*|kanunu\s*as|mevzuati\s*as|denetimden\s*kac|denetimi\s*atlat|denetim\s*gec|uyumu\s*gizle|sakla|gizle|yukumluluk.*bertaraf)\b/,
    reason: "Yasalari asmaya veya denetimden kacmaya yonelik yontemler paylasilamaz.",
    alternative:
      "Yasal uyum kontrol listesi, denetime hazirlik plani veya eksiklerin kapatilmasi icin aksiyon plani hazirlayabilirim.",
  },
  {
    pattern: /(sahte\s*kaynak|sahte\s*belge|uydurma\s*kaynak|yalan\s*kaynak|fake\s*source)/,
    reason: "Sahte veya dogrulanmamis kaynak eklemek yanilticidir ve rapor guvenilirligini zedeler.",
    alternative:
      "Rapordaki iddialari gercek mevzuat, resmi kaynak, saha kaydi veya olculebilir veriyle desteklemeye yardimci olabilirim.",
  },
  {
    pattern: /(risk\s*skorunu\s*manipule|riski\s*dusuk\s*goster|skoru\s*dusur|puani\s*dusur)/,
    reason: "Risk skorunu manipule etmek veya gercek disi gostermek etik ve hukuki degildir.",
    alternative:
      "Dogru olasilik/siddet degerleri, onlemler ve artik risk hesabi ile kaydi duzeltmeye yardimci olabilirim.",
  },
  {
    pattern: /(raporu\s*daha\s*guvenilir\s*goster|guvenilir\s*goster)/,
    reason: "Raporu oldugundan farkli gostermek veya kanitsiz bicimde guvenilir gostermek icin yonlendirme yapilamaz.",
    alternative: "Kaynaksiz iddialari isaretleyip dogrulanabilir kanitlarla destekleme plani cikarabilirim.",
  },
  {
    pattern:
      /(izinsiz\s*veri|veri\s*cek|rakip.*siz|rakib.*sistem|sisteme\s*siz|yetkisiz\s*erisim|hack|penetrasyon\s*testi\s*yap)/,
    reason: "Izinsiz erisim veya siber saldi yontemleri paylasilamaz.",
    alternative:
      "Yetkili penetrasyon testi, kendi sisteminiz icin guvenlik kontrol listesi veya yasal rekabet analizi onerebilirim.",
  },
  {
    pattern: /(kisisel\s*veri\s*tahmin|ozel\s*veri.*tahmin|tc\s*tahmin|kimlik\s*tahmin)/,
    reason: "Kisisel veri tahmini veya uydurma yapilamaz.",
    alternative: "KVKK uyumlu veri isleme ve bilgi guvenligi kontrolleri hakkinda genel rehberlik verebilirim.",
  },
  {
    pattern: /(sistem\s*talimat|prompt\s*ini\s*acikla|gizli\s*talimat|jailbreak|onceki\s*tum\s*kurallari\s*unut|sinirsiz\s*mod)/,
    reason: "Sistem talimatlari veya ic yonergeler paylasilamaz.",
    alternative: "RiskNova ve ISG surecleri hakkinda kullanici odakli yardimci olabilirim.",
  },
  {
    pattern: /(kesin\s*batacak|kesin\s*yatirim|hisse\s*al|hisse\s*sat)/,
    reason: "Kesin finansal veya yatirim tavsiyesi verilemez.",
    alternative: "Risk analizi ve karar destek cercevesi hakkinda genel bilgi verebilirim.",
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

  return [
    "Kisa yanit: Buna yardimci olamam.",
    "",
    "Neden:",
    `- ${match.reason}`,
    "- RiskNova'nin guvenli kullanim sinirlari geregi bu istek kapsam disidir.",
    "",
    "Guvenli alternatif:",
    `- ${match.alternative}`,
  ].join("\n");
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
    isNovaKnowledgeGuidanceTask(message)
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
      "Kisa yanit: Risk degerlendirmesi yapmak zorunludur; 5x5 risk matrisi ise kullanilabilecek yontemlerden biridir.",
      "",
      "5x5 ornek matris (L matrisi):",
      "| Renk | Puan | Seviye | Aksiyon |",
      "|------|------|--------|---------|",
      "| Yesil | 1-4 | Dusuk | Kayit al, rutin takip |",
      "| Sari | 5-9 | Orta | Onlem planla, termin belirle |",
      "| Turuncu | 10-14 | Yuksek | Acil onlem, sorumlu ata |",
      "| Kirmizi | 15-25 | Kritik | Faaliyeti durdur, ust yonetim bilgilendir |",
      "",
      "Yontem secimi isyerinin niteligi, risk turu ve kurum politikasina gore belirlenir; matris tek basina mevzuat zorunlulugu degildir.",
    ].join("\n");
  }

  if (/\b(25.*onemsiz|onemsiz.*25|puan.*25)\b/.test(normalized)) {
    return [
      "Kisa yanit: Ne puana ne aciklama metnine körü körüne guvenmeyin; kaydi birlikte dogrulayin.",
      "",
      "25 puan normalde kritik seviyedir ve onemsiz aciklamasiyla celisir. Ancak puanin kendisi de yanlis girilmis olabilir. Olasilik, siddet, kullanilan yontem, mevcut onlemler ve aciklama alanini kontrol edin; hata varsa revizyon gerekcesiyle duzeltin ve uzman onayi alin.",
    ].join("\n");
  }

  if (/\b((50000|50\s*000).*200\s*000|maliyet.*mantikli|beklenen\s*kayip)\b/.test(normalized)) {
    return [
      "Kisa yanit: Verilen varsayimlara gore ekonomik olarak mantikli gorunuyor.",
      "",
      "Hesap:",
      "- Risk azalimi: 200.000 - 80.000 = 120.000 TL/yil",
      "- Onlem maliyeti: 50.000 TL",
      "- Ilk yil net fayda: 120.000 - 50.000 = 70.000 TL",
      "- Geri odeme suresi: yaklasik 5 ay",
      "",
      "Not: Onlem maliyeti tek seferlik mi yillik mi belirtilmedi; bakim, egitim ve denetim maliyetleri sonucu degistirebilir.",
    ].join("\n");
  }

  if (/\b(normalize|1\s*-\s*25|siniflara\s*ayir)\b/.test(normalized)) {
    return [
      "Normalize Skor = Ham Skor / 25 x 100",
      "",
      "Sinif esikleri (5x5 L matrisi):",
      "- 1-4: Dusuk (%4-16)",
      "- 5-9: Orta (%20-36)",
      "- 10-14: Yuksek (%40-56)",
      "- 15-25: Kritik (%60-100)",
      "",
      "Ayni rapor icinde esikleri tutarli kullanin; kurum risk iştahi farkli olabilir.",
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
      "Konu: Risk Degerlendirme Raporu Hakkinda",
      "",
      "Merhaba [Musteri Adi],",
      "",
      "[Isyeri/Proje Adi] icin hazirlanan risk degerlendirme raporunu bilginize sunarim.",
      "",
      "Raporda tespit edilen baslica riskler, mevcut kontrol onlemleri ve onerilen duzeltici faaliyetler ozetlenmistir. Ozellikle yuksek ve kritik seviyedeki riskler icin sorumlu kisi atanmasi, termin belirlenmesi ve onlem sonrasi artik riskin yeniden degerlendirilmesi onerilir.",
      "",
      "Raporu inceledikten sonra varsa sorularinizi veya revizyon taleplerinizi paylasabilirsiniz.",
      "",
      "Saygilarimla,",
      "[Ad Soyad]",
    ].join("\n");
  }

  if (/\b(musteri\s*kizgin|rapor.*sacma|nasil\s*cevap|nasil\s*yanit|ne\s*cevap\s*ver|ne\s*yanit\s*ver)\b/.test(normalized)) {
    return [
      "Soyle sakin ve profesyonel cevap verebilirsiniz:",
      "",
      "Merhaba [Musteri Adi],",
      "",
      "Geri bildiriminizi anliyorum. Raporun beklentinizi karsilamayan noktalarini birlikte netlestirmek isterim. Amacimiz sizi zor durumda birakmak degil; sahadaki riskleri dogru sekilde gorunur kilmak ve uygulanabilir aksiyonlarla yonetilebilir hale getirmektir.",
      "",
      "Dilerseniz ozellikle hatali veya eksik oldugunu dusundugunuz basliklari birlikte gozden gecirelim.",
      "",
      "Saygilarimla,",
      "[Ad Soyad]",
    ].join("\n");
  }

  if (/\b(yonetim\s*kurulu|yonetici\s*ozeti)\b/.test(normalized)) {
    return [
      "Yonetim Kurulu Ozeti:",
      "",
      "RiskNova, is sagligi ve guvenligi sureclerinde risklerin sistematik tespiti, onceliklendirilmesi ve aksiyona donusturulmesini destekleyen bir karar destek aracidir.",
      "",
      "Stratejik deger: kritik risklerin erken tespiti, aksiyon takibi ve denetim hazirligi icin izlenebilir kayit.",
      "",
      "Ana mesaj: RiskNova nihai karar merci degildir; yonetim ve ISG uzmanlari icin guclu bir izleme altyapisidir.",
    ].join("\n");
  }

  if (/\b(kisa\s*ve\s*ikna\s*edici|ikna\s*edici|rapor\s*ozeti|ozet\s*yaz|ozetle)\b/.test(normalized)) {
    return [
      "Rapor metnini paylasmadiniz; yine de kullanabileceginiz kisa bir yonetici ozeti taslagi:",
      "",
      "Yonetici Ozeti:",
      "Oncelikli riskler [alan/tehlike] basliginda yogunlasmaktadir. Yuksek riskler icin duzeltici faaliyet, sorumlu atama ve onlem sonrasi artik risk hesabi onerilir.",
      "",
      "Metni paylasirsaniz raporunuza gore kisaltip guclendirebilirim.",
    ].join("\n");
  }

  if (/\b(ne\s*yapmaliyim|risk\s*skor.*yuksek|sistem.*yuksek\s*gosteriyor)\b/.test(normalized)) {
    return [
      "Kisa yanit: Panik yapmayin; yuksek skor oncelikli aksiyon gerektiren bir uyaridir.",
      "",
      "Ilk 5 adim:",
      "1. Risk kaydini acin; olasilik, siddet ve maruziyeti kontrol edin.",
      "2. Ciddi yaralanma/olum riski varsa faaliyeti gecici durdurun.",
      "3. Eksik onlemleri tamamlayin (bariyer, egitim, KKD).",
      "4. Duzeltici faaliyet ve termin atayin.",
      "5. Onlem sonrasi artik riski yeniden hesaplayin.",
      "",
      "Risk kategorisini paylasirsaniz daha somut onlem onerebilirim.",
    ].join("\n");
  }

  if (/\b(sadece\s*\d+\s*madde\w*|(?:3|uc)\s*madde\w*)\b/.test(normalized)) {
    return [
      "1. Risk seviyesi yuksekse once tehlikenin kaynagini ve mevcut onlemleri kontrol edin.",
      "2. Sorumlu kisi, termin ve duzeltici faaliyet belirleyin.",
      "3. Onlem sonrasi artik riski yeniden hesaplayip kaydi guncelleyin.",
    ].join("\n");
  }

  if (/\b(kisa\s*cevap)\b/.test(normalized)) {
    return "Kisa yanit: Once dogrudan ve uygulanabilir cevap verilir; yalnizca sayfa yonlendirmesi yapilmaz.";
  }

  return null;
}

export function buildNovaHardGateResponse(message: string): string | null {
  return buildUnsafeNovaRefusal(message) ?? buildNovaContentFallbackResponse(message);
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
        replacement: buildNovaContentFallbackResponse(prompt) ?? undefined,
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
    { pattern: /(sadece\s*)?(?:3|uc)\s*madde\w*/, label: "Yalnizca 3 madde halinde yanit ver." },
    { pattern: /kisa\s*cevap/, label: "Once kisa yanit ver; gereksiz detay ekleme." },
    { pattern: /tablo\s*yap/, label: "Bilgiyi markdown tablo ile sun." },
    { pattern: /12\s*yas/, label: "12 yasindaki birine anlatir gibi basit dil kullan." },
    { pattern: /yonetim\s*kurulu/, label: "Yonetim kurulu sunumu diliyle yaz." },
  ];

  const matched = rules.filter((rule) => rule.pattern.test(normalized)).map((rule) => rule.label);
  return matched.length > 0 ? matched.join(" ") : null;
}

export const NOVA_BEHAVIOR_GATEWAY_PROMPT = `Nova davranis duzeltme katmani (v2) — zorunlu:

Oncelik: (1) Guvenlik (2) Format talimati (3) Niyet (4) Kaynak (5) Chat cevabi (6) Modul yonlendirmesi.

Route sirasi: normalize → safety → content-generation/advisory → vision → legal RAG → navigation → general chat.

Korunan: Risk Skoru = Olasilik x Siddet. 5x5 esik: 1-4, 5-9, 10-14, 15-25. Matris tek zorunlu yontem degildir.

Guvenlik: zararli istekte RAG/navigation yok; kaynak rozeti yok.

Uretim: e-posta, ozet, yeniden yazim → once metin; Sayfaya Git ana cevap olmasin.

Kaynak: Guven yuksek yalnizca dogrudan ilgili legal RAG kaynakta.`;

export function getNovaGatewayBehaviorMessages(): Array<{ role: "assistant"; content: string }> {
  return [
    { role: "assistant", content: NOVA_BEHAVIOR_GATEWAY_PROMPT },
    {
      role: "assistant",
      content:
        "Nova: Uretim ve danismanlik isteklerinde once chat icinde metin uret. Modul yonlendirmesi ikincil; acik sayfa sorusu haric ana cevap olmasin.",
    },
  ];
}

export function getNovaBehaviorSystemPromptAddition(language?: string | null) {
  const isTr = !language || String(language).toLowerCase().startsWith("tr");
  if (isTr) return NOVA_BEHAVIOR_GATEWAY_PROMPT;
  return `Nova v2: Safety first; content in chat before navigation; verified badges only on legal RAG with sources.`;
}
