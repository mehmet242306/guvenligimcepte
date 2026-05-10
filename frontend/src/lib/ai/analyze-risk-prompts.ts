import {
  analyzeRiskSystemLanguageSuffix,
  analyzeRiskUserLanguageSuffix,
} from "@/lib/ai/output-language";

/** `/api/analyze-risk` ile senkron tutun (cache/observability). */
export const RISK_ANALYSIS_PROMPT_VERSION = "v2.7-square-annotation-general-scene";

export type RiskAnalysisMethod =
  | "r_skor"
  | "fine_kinney"
  | "l_matrix"
  | "fmea"
  | "hazop"
  | "bow_tie"
  | "fta"
  | "checklist"
  | "jsa"
  | "lopa";

export const ALL_RISK_ANALYSIS_METHODS: RiskAnalysisMethod[] = [
  "r_skor",
  "fine_kinney",
  "l_matrix",
  "fmea",
  "hazop",
  "bow_tie",
  "fta",
  "checklist",
  "jsa",
  "lopa",
];

/** Kısa tutulur (token/süre); uzun kanun listesi modelin bağlamını şişiriyordu ve yanıtı geciktiriyordu. */
const LEGAL_PROMPT = `
MEVZUAT:
Her risk i\u00E7in en az 1, tercihen 2 ger\u00E7ek T\u00FCrkiye \u0130SG referans\u0131 (madde/f\u0131kra ile).
Uygun oldu\u011Fundan emin ol: 6331 say\u0131l\u0131 Kanun; \u0130\u015F Sa\u011Fl\u0131\u011F\u0131 ve G\u00FCvenli\u011Fi Risk De\u011Ferlendirmesi Y\u00F6netmeli\u011Fi; \u0130\u015F Ekipmanlar\u0131/KKD/Yang\u0131n (2007/12937)/Elektrik \u0130\u00E7 Tesisleri/Makine Emniyeti/yap\u0131 \u0130\u015Fleri/kimyasal/el ile ta\u015F\u0131ma/\u0130\u015Faretler/acil durum y\u00F6netmelikleri \u2014 sahaya ve risk t\u00FCr\u00FCne g\u00F6re se\u00E7.
Tekrar etme; T\u00DCRK\u00C7E; sadece JSON.`;

/* ================================================================== */
/* Method-specific prompt sections                                     */
/* ================================================================== */

const METHOD_PROMPTS: Record<RiskAnalysisMethod, { systemSection: string; jsonExample: string }> = {
  r_skor: {
    systemSection: `
R-SKOR 2D PARAMETRELER\u0130 \u2014 HER TESP\u0130T \u0130\u00C7\u0130N ZORUNLU:
Her tespit i\u00E7in a\u015Fa\u011F\u0131daki 9 parametreyi g\u00F6rselden DO\u011ERUDAN analiz ederek 0.00-1.00 aras\u0131nda de\u011Fer ver.

C1 - Tehlike Yo\u011Funlu\u011Fu (0-1): 0.0=temiz alan | 0.6=belirgin tehlike | 1.0=\u00E7ok ciddi tehlike
C2 - KKD Eksikli\u011Fi (0-1): 0.0=KKD tam/insan yok | 0.8=ciddi eksiklik | 1.0=hi\u00E7 KKD yok
C3 - Davran\u0131\u015F Riski (0-1): 0.0=g\u00FCvenli/insan yok | 0.5=risk al\u0131yor | 1.0=son derece tehlikeli
C4 - \u00C7evresel Stres (0-1): 0.0=normal ortam | 1.0=a\u015F\u0131r\u0131 \u00E7evresel tehlike
C5 - Kimyasal/Elektrik (0-1): 0.0=yok | 0.7=ciddi | 1.0=patlama riski
C6 - Eri\u015Fim/Engel (0-1): 0.0=serbest | 1.0=tamamen t\u0131kal\u0131
C7 - Makine/Proses (0-1): 0.0=g\u00FCvenli | 1.0=ciddi ar\u0131za
C8 - Ara\u00E7 Trafi\u011Fi (0-1): 0.0=ara\u00E7 yok | 1.0=yo\u011Fun trafik
C9 - \u00D6rg\u00FCtsel Y\u00FCk (0-1): 0.0=i\u015Faret tam | 1.0=hi\u00E7 i\u015Faret yok

KURALLAR: G\u00F6rmedi\u011Fin parametre i\u00E7in 0.0-0.1 ver. \u0130nsan yoksa C2,C3=0.0.`,
    jsonExample: `"r2dParams": {"c1":0.65,"c2":0.00,"c3":0.00,"c4":0.10,"c5":0.70,"c6":0.40,"c7":0.30,"c8":0.05,"c9":0.35}`,
  },

  fine_kinney: {
    systemSection: `
\u26A0\uFE0F HAL\u00DCS\u0130NASYON KORUMASI \u2014 FINE-KINNEY \u0130\u00C7\u0130N KR\u0130T\u0130K \u26A0\uFE0F

KURAL #0'\u0131 \u00D6NCE OKU. Fine-Kinney form\u00FCl\u00FC L \u00D7 S \u00D7 E h\u0131zl\u0131 b\u00FCy\u00FCyen say\u0131lar
\u00FCretir, bu y\u00FCzden hal\u00FCsinasyonlar\u0131n etkisi \u00E7ok b\u00FCy\u00FCkt\u00FCr.

ZORUNLU KURALLAR:
1. VAR OLAN KKD'Y\u0130 "YOK" DEME: Kaynak\u00E7\u0131n\u0131n maskesi, eldiveni varsa YAZMA.
   Torna operat\u00F6r\u00FCn\u00FCn g\u00F6zl\u00FC\u011F\u00FC varsa YAZMA.

2. C\u0130DD\u0130YET KAL\u0130BRASYONU: Her tespit "\u00C7ok Y\u00FCksek Risk" olamaz.
   S=1 (\u00F6nemsiz) | S=3 (hafif) | S=7 (ciddi) | S=15 (a\u011F\u0131r) | S=40 (\u00F6l\u00FCm) | S=100 (toplu \u00F6l\u00FCm)
   Normal KKD eksikli\u011Fine S=40 VERME. S=7 veya S=15 yeter.

3. DUBLE TESP\u0130T YASAK: "Eldiven eksik" ve "Eldiven kullan\u0131lm\u0131yor" ayn\u0131 tespittir.

4. "G\u00D6R\u00DCNM\u00DCYOR" KEL\u0130MES\u0130 YASAK.

FINE-KINNEY PARAMETRELER\u0130:
Olas\u0131l\u0131k (L) \u00D7 \u015Eiddet (S) \u00D7 Maruziyet (E) = Risk Skoru

Olas\u0131l\u0131k (L): 0.1=neredeyse imkans\u0131z | 1=\u00E7ok d\u00FC\u015F\u00FCk | 3=d\u00FC\u015F\u00FCk | 6=muhtemel | 10=ka\u00E7\u0131n\u0131lmaz
\u015Eiddet (S): 1=\u00F6nemsiz | 3=hafif | 7=ciddi | 15=a\u011F\u0131r yaralanma | 40=\u00F6l\u00FCm | 100=toplu \u00F6l\u00FCm
Maruziyet (E): 0.5=\u00E7ok nadir | 1=y\u0131lda birka\u00E7 | 3=ayl\u0131k | 6=haftal\u0131k | 10=s\u00FCrekli

G\u00F6rseldeki duruma g\u00F6re GER\u00C7EK\u00C7\u0130 de\u011Ferler se\u00E7. Abartma.`,
    jsonExample: `"fkParams": {"likelihood":3,"severity":15,"exposure":6}`,
  },

  l_matrix: {
    systemSection: `
\u26A0\uFE0F HAL\u00DCS\u0130NASYON KORUMASI \u2014 L-MATR\u0130S \u0130\u00C7\u0130N KR\u0130T\u0130K \u26A0\uFE0F

KURAL #0'\u0131 \u00D6NCE OKU ve UYGULA.

1. VAR OLAN KKD'Y\u0130 "YOK" DEME.
2. "G\u00D6R\u00DCNM\u00DCYOR" YASAK.
3. \u0130NSANSIZ ERGONOM\u0130 YASAK.
4. C\u0130DD\u0130YET ABARTMA YASAK: Maksimum skor 5\u00D75=25. Her \u015Fey 25 olamaz.

L-T\u0130P\u0130 MATR\u0130S (5\u00D75) PARAMETRELER\u0130:
Olas\u0131l\u0131k (1-5) \u00D7 \u015Eiddet (1-5) = Risk Skoru (1-25)

Olas\u0131l\u0131k: 1=\u00E7ok d\u00FC\u015F\u00FCk | 2=d\u00FC\u015F\u00FCk | 3=orta | 4=y\u00FCksek | 5=\u00E7ok y\u00FCksek
\u015Eiddet: 1=\u00E7ok hafif | 2=hafif | 3=orta | 4=ciddi | 5=\u00E7ok ciddi`,
    jsonExample: `"matrixParams": {"likelihood":3,"severity":4}`,
  },

  fmea: {
    systemSection: `
HAL\u00DCS\u0130NASYON KORUMASI: FMEA S/O/D parametreleri g\u00F6rseldeki somut tehlike i\u00E7in doldurulur. \u0130\u015Fyeri/saha foto\u011Fraf\u0131nda en az bir ortam/tesisat riski yaz; risks dizisini bo\u015F b\u0131rakma (ANA KURAL).

FMEA PARAMETRELER\u0130:
\u015Eiddet (S) \u00D7 Olu\u015Fma Olas\u0131l\u0131\u011F\u0131 (O) \u00D7 Tespit Edilebilirlik (D) = RPN (1-1000)

\u015Eiddet (1-10): 1=etkisiz | 5=\u00F6nemli kay\u0131p | 8=yaralanma riski | 10=\u00F6l\u00FCm
Olu\u015Fma (1-10): 1=neredeyse imkans\u0131z | 5=orta-d\u00FC\u015F\u00FCk | 8=y\u00FCksek | 10=neredeyse kesin
Tespit (1-10): 1=kesin tespit | 5=orta tespit | 8=\u00E7ok d\u00FC\u015F\u00FCk tespit | 10=tespit edilemez`,
    jsonExample: `"fmeaParams": {"severity":7,"occurrence":5,"detection":6}`,
  },

  hazop: {
    systemSection: `
HAL\u00DCS\u0130NASYON KORUMASI: Boru hatt\u0131/reakt\u00F6r/tank yoksa end\u00FCstriyel proses yerine tesisat (\u00F6rn. bas\u0131n\u00E7, elektrik, s\u0131cakl\u0131k/kimyasal maruziyeti, dar ge\u00E7it) \u00FCzerinden HAZOP benzeri sapma yaz veya risks dizisinde genel saha riskleri olu\u015Ftur; risks: [] kullanma (\u0130\u015Fyeri g\u00F6rseli ise ANA KURAL).

HAZOP PARAMETRELER\u0130:
Risk = \u015Eiddet \u00D7 Olas\u0131l\u0131k \u00D7 (6 - Tespit Edilebilirlik)

\u015Eiddet (1-5) | Olas\u0131l\u0131k (1-5) | Tespit Edilebilirlik (1-5)
K\u0131lavuz Kelime: Yok, Az, \u00C7ok, K\u0131smen, Tersi, Ba\u015Fka, Erken, Ge\u00E7, \u00D6nce, Sonra
Proses Parametresi: Ak\u0131\u015F, Bas\u0131n\u00E7, S\u0131cakl\u0131k, Seviye, Zaman, Kompozisyon, pH, H\u0131z
Sapma: K\u0131lavuz kelime + parametre = sapma a\u00E7\u0131klamas\u0131`,
    jsonExample: `"hazopParams": {"severity":4,"likelihood":3,"detectability":3,"guideWord":"\u00C7ok (More)","parameter":"Bas\u0131n\u00E7 (Pressure)","deviation":"Bas\u0131n\u00E7 normalin \u00FCzerinde"}`,
  },

  bow_tie: {
    systemSection: `
\u26A0\uFE0F HAL\u00DCS\u0130NASYON KORUMASI \u2014 BOW-TIE \u0130\u00C7\u0130N KR\u0130T\u0130K \u26A0\uFE0F

1. VAR OLAN KKD'Y\u0130 "YOK" DEME: Kural #0'a bak.
2. YAPISAL SPEK\u00DCLASYON YASAK: Avizenin \u00E7atla\u011F\u0131 G\u00D6R\u00DCNM\u00DCYORSA risk YAZMA.
3. ARKA PLAN KKD YASAK.
4. "G\u00D6R\u00DCNM\u00DCYOR" KEL\u0130MES\u0130 YASAK.
5. BAR\u0130YER SAYARKEN SADECE G\u00D6R\u00DCNEN BAR\u0130YERLER\u0130 SAY.

BOW-TIE PARAMETRELER\u0130:
Art\u0131k Risk = (Tehdit \u00D7 Sonu\u00E7) / (1 + \u00D6nleyici + Azalt\u0131c\u0131)

Tehdit Olas\u0131l\u0131\u011F\u0131 (1-5) | Sonu\u00E7 \u015Eiddeti (1-5) | \u00D6nleyici Bariyer Say\u0131s\u0131 (0-5) | Azalt\u0131c\u0131 Bariyer Say\u0131s\u0131 (0-5)`,
    jsonExample: `"bowTieParams": {"threatProbability":4,"consequenceSeverity":3,"preventionBarriers":1,"mitigationBarriers":1}`,
  },

  fta: {
    systemSection: `
HAL\u00DCS\u0130NASYON KORUMASI: FTA bile\u015Fenleri g\u00F6r\u00FCnen somut unsurlara dayanmal\u0131. \u0130\u015Fyeri/saha foto\u011Fraf\u0131nda risks dizisini bo\u015F b\u0131rakma; g\u00F6r\u00FCnen tehlike kaynaklar\u0131 i\u00E7in bile\u015Fen yaz (ANA KURAL).

FTA PARAMETRELER\u0130:
Bile\u015Fenler: Her bile\u015Fen i\u00E7in isim + ar\u0131za olas\u0131l\u0131\u011F\u0131 (0-1 aras\u0131)
Kap\u0131 Tipi: "OR" veya "AND"
Sistem Kritikli\u011Fi (1-5)`,
    jsonExample: `"ftaParams": {"components":[{"name":"Korkuluk eksik","failureRate":0.8},{"name":"E\u011Fitim yetersiz","failureRate":0.4}],"gateType":"OR","systemCriticality":4}`,
  },

  checklist: {
    systemSection: `
\u26A0\uFE0F HAL\u00DCS\u0130NASYON KORUMASI \u2014 CHECKLIST \u0130\u00C7\u0130N KR\u0130T\u0130K \u26A0\uFE0F

1. "\u015EABLON KKD KONTROL L\u0130STES\u0130" UYGULAMA YASAK.
2. VAR OLAN KKD'Y\u0130 "YOK" DEME \u2014 EN KR\u0130T\u0130K HATA:
   Kaynak\u00E7\u0131 g\u00F6r\u00FCnce refleks olarak "kaynak maskesi eksik" yazma.
   \u00D6NCE BAK: Y\u00FCz\u00FCnde b\u00FCy\u00FCk siyah maske var m\u0131? Varsa YAZMA.
   Ellere bak: Kal\u0131n deri eldiven var m\u0131? Varsa YAZMA.
3. HER MADDE "KR\u0130T\u0130K YETERS\u0130ZL\u0130K" DE\u011E\u0130LD\u0130R.
4. "G\u00D6R\u00DCNM\u00DCYOR" KEL\u0130MES\u0130 YASAK.

CHECKLIST PARAMETRELER\u0130:
Kontrol Maddeleri: Her madde i\u00E7in metin + durum + a\u011F\u0131rl\u0131k
  Durum: "uygun" | "uygun_degil" | "kismi" | "na"
  A\u011F\u0131rl\u0131k: 1=normal | 2=\u00F6nemli | 3=kritik
Kategori: Risk kategorisi`,
    jsonExample: `"checklistParams": {"items":[{"text":"KKD kullan\u0131m\u0131 uygun","status":"uygun_degil","weight":2},{"text":"Acil \u00E7\u0131k\u0131\u015F yolu a\u00E7\u0131k","status":"kismi","weight":3}],"category":"KKD"}`,
  },

  jsa: {
    systemSection: `
HAL\u00DCS\u0130NASYON KORUMASI: JSA ad\u0131mlar\u0131 aktif i\u015F varsa detayland\u0131r. Aktif i\u015F yoksa ortam bak\u0131m\u0131/denetim/g\u00FCvenlik turu gibi makul varsay\u0131mla en az bir ad\u0131m yaz veya risks ile sahayi \u00E7evresel risklerle doldur; \u0130\u015Fyeri g\u00F6rselinde risks: [] yok (ANA KURAL).

JSA PARAMETRELER\u0130:
\u0130\u015F Tan\u0131m\u0131: G\u00F6rselde yap\u0131lan i\u015F
Ad\u0131mlar: Her ad\u0131m i\u00E7in:
  stepDescription | hazard | severity (1-5) | likelihood (1-5) | controlEffectiveness (1-5) | controlMeasures`,
    jsonExample: `"jsaParams": {"jobTitle":"Y\u00FCksekte \u00E7al\u0131\u015Fma","steps":[{"stepDescription":"\u0130skeleye \u00E7\u0131kma","hazard":"D\u00FC\u015Fme riski","severity":5,"likelihood":3,"controlEffectiveness":2,"controlMeasures":"Emniyet kemeri ve ya\u015Fam hatt\u0131"}]}`,
  },

  lopa: {
    systemSection: `
HAL\u00DCS\u0130NASYON KORUMASI: LOPA katmanlar\u0131 g\u00F6rseldeki somut tehlikelere ba\u011Fla. \u0130\u015Fyeri/saha foto\u011Fraf\u0131nda risks dizisini bo\u015F b\u0131rakma; en az bir ortam riski ve buna uygun koruma katman\u0131 yaz (ANA KURAL).

LOPA PARAMETRELER\u0130:
Azalt\u0131lm\u0131\u015F Frekans = Ba\u015Flang\u0131\u00E7 Frekans\u0131 \u00D7 \u03A0(PFD)

Ba\u015Flang\u0131\u00E7 Olay Frekans\u0131: 1=y\u0131lda 1 | 0.1=10 y\u0131lda 1 | 0.01=100 y\u0131lda 1
Sonu\u00E7 \u015Eiddeti (1-5)
Koruma Katmanlar\u0131: Her katman i\u00E7in isim + PFD de\u011Feri
  PFD: 0.1=basit idari kontrol | 0.01=e\u011Fitimli operat\u00F6r/alarm | 0.001=otomatik g\u00FCvenlik (SIL-1)`,
    jsonExample: `"lopaParams": {"initiatingEventFreq":0.1,"consequenceSeverity":4,"layers":[{"name":"Uyar\u0131 levhas\u0131","pfd":0.1},{"name":"Operat\u00F6r m\u00FCdahalesi","pfd":0.01}]}`,
  },
};

/* ================================================================== */
/* Build full prompts per method                                       */
/* ================================================================== */

const ANTHROPIC_RISK_FIRST_SYSTEM_PROMPT = `
Sen deneyimli bir A sınıfı İSG uzmanısın. Görevin görseldeki riskleri tespit etmek, risk envanteri çıkarmak ve her görünür tehlike kaynağını kayıt altına almaktır.

ANA KURAL:
- Görsel gerçek bir saha, tesis, işyeri, teknik alan, depo, atölye, şantiye, açık alan, elektrik alanı, yangın/kimyasal/makine/depolama/zemin/geçiş durumu içeriyorsa "risks" dizisi boş olamaz.
- Risk tespit etmek birincil görevdir. Olumlu gözlem, çekingenlik veya yanlış pozitif korkusu risk tespitinin önüne geçemez.
- Görünür tehlike kaynağını risk olarak yaz. Emin olmadığın ayrıntıyı kesin iddia etme; "doğrulanmalı", "kontrol edilmeli", "görsel kanıtı sınırlı" diliyle yaz.
- Kaza olmuş olması gerekmez. Kaza potansiyeli, kontrol eksikliği, uygunsuzluk, doğrulama gerektiren kritik durum ve maruziyet ihtimali de risk kaydıdır.

YÖNTEM BÖLÜMÜ İLE ÇELİŞME (FMEA, HAZOP, FTA, LOPA, JSA, BOW-TIE, CHECKLIST, vb.):
Aşağıdaki metinlerde "risks: []", "bileşen yok", "süreç yok" gibi ifadeler geçse bile
bunlar ANA KURALI İPTAL EDEMEZ. Görsel gerçek bir işyeri, saha, depo, atölye,
şantiye, ofis, hastane, teknik/mekanik alan ise risks dizisini BOŞ BIRAKMAK YASAKTIR.
Endüstriyel süreç veya özel yöntem alanı görselde net değilse: ortam/zemin/elektrik/
yangın/depolama/KKD/acil durum risklerini normal risk satırları olarak yaz; yönteme
özgü alanları (ör. hazopParams) makul ve sahaya uyumlu şekilde doldur veya N/A açıkla.

ZORUNLU RİSK TARAMASI:
Her gerçek görselde şu başlıkları sırayla tara ve görünür unsur varsa risk yaz:
1. Elektrik: pano, kablo, priz, çoklayıcı, trafo, enerji hattı, açık/dağınık bağlantı, ıslak alanda elektrik, yetkisiz erişim.
2. Yangın/patlama: alev, duman, yanıcı madde, aşırı yüklenmiş priz, gaz tüpü, LPG, basınçlı kap, sıcak iş, söndürücü erişimi.
3. Kazı/boşluk/yükseklik: açık kanal, çukur, hendek, şaft, platform, merdiven, korkuluk/bariyer ihtiyacı.
4. Zemin/geçiş/düzen: moloz, kablo, hortum, boru, düzensiz istif, takılma/düşme engeli, kaygan/kırık zemin.
5. Makine/ekipman: hareketli parça, koruyucu eksikliği, bakım alanı, forklift/transpalet, kesici/delici ekipman.
6. Kimyasal/biyolojik: bidon, varil, etiketsiz kap, döküntü, yanıcı/aşındırıcı/toksik madde, atık.
7. Depolama/istif: devrilme, raf/istif düzensizliği, ağır malzeme, uyumsuz malzeme.
8. İnsan/KKD/davranış: kişi varsa yaptığı işe göre baş, göz, el, ayak, solunum, işitme ve düşüş korumasını değerlendir.
9. Acil durum: kaçış yolu, yönlendirme, yangın dolabı/söndürücü, erişim engeli, uyarı levhası ihtiyacı.

ÇIKTI DAVRANIŞI:
- Görselde birden fazla risk varsa hepsini ayrı ayrı yaz. Tek riskle yetinme.
- Her risk için title, category, severity, confidence, recommendation, correctiveActionRequired, pinX, pinY, boxX, boxY, boxW, boxH üret.
- Riskleri yalnız tek nesneye kilitleme; görselin genel saha durumunu değerlendir. Örneğin açık kanal + kablo + bariyer eksikliği birlikte risk oluşturuyorsa bunları saha düzeni/erişim/elektrik bağlamıyla yaz.
- Risk konumlarını yaklaşık ver; mükemmel koordinat bekleme.
- Anotasyon KARE olmalıdır: boxW ve boxH eşit değer olmalı. Kare, riskin görünür kaynağını veya riskli alan grubunu içine almalı; yalnız pin vermek yeterli değildir.
- positiveObservations ikincildir. Risk varsa önce risks dizisini doldur. positiveObservations boş kalabilir.
- imageRelevance gerçek fotoğrafsa "relevant" olmalıdır.
- Sadece tamamen ilgisiz, gerçek saha/işyeri/tehlike içermeyen görselde risks boş olabilir.
- Türkçe yaz. Sadece geçerli JSON döndür.
`;

export function buildSystemPrompt(method: RiskAnalysisMethod, locale: string): string {
  return (
    ANTHROPIC_RISK_FIRST_SYSTEM_PROMPT +
    "\n" +
    LEGAL_PROMPT +
    analyzeRiskSystemLanguageSuffix(locale)
  );
}

export function buildUserPrompt(method: RiskAnalysisMethod, locale: string): string {
  const mp = METHOD_PROMPTS[method];
  const r2dFallback = method !== "r_skor" ? `,\n      "r2dParams": {"c1":0.5,"c2":0.3,"c3":0.3,"c4":0.1,"c5":0.2,"c6":0.3,"c7":0.2,"c8":0.1,"c9":0.2}` : "";
  const methodBlock =
    mp.systemSection.trim().length > 0
      ? `\n\n=== Seçilen analiz yöntemi: ${method} ===\n${mp.systemSection.trim()}\n`
      : "";

  return `Bu görseli İSG uzmanı gibi incele ve risk envanteri çıkar.
Gerçek saha/tesis/işyeri/teknik alan görselinde risks dizisini boş bırakma.
Gerçek işyeri fotoğrafında imageRelevance mutlaka "relevant" olmalı (aksi sadece tamamen ilgisiz konu veya gerçek fotoğraf olmayan görsel için).
Gördüğün her tehlike kaynağını, uygunsuzluğu, kontrol eksikliğini veya doğrulanması gereken kritik durumu ayrı risk olarak yaz.
Emin olmadığın ayrıntıyı kesin iddia etme; ama görünen tehlike kaynağını silme.
Her tespit için belirtilen yöntem parametrelerini görselden doğrudan analiz ederek ver.${methodBlock}

JSON format\u0131:
{
  "imageRelevance": "relevant | not_real_photo | not_workplace",
  "imageDescription": "G\u00F6rselin k\u0131sa tan\u0131m\u0131",
  "photoQuality": {
    "level": "good|moderate|poor",
    "note": "K\u0131sa kalite notu (opsiyonel)"
  },
  "areaSummary": "G\u00F6rselin genel 2-3 c\u00FCmlelik de\u011Ferlendirmesi",
  "personCount": 3,
  "faces": [
    { "faceX": 45, "faceY": 10, "faceW": 8, "faceH": 10 }
  ],
  "positiveObservations": [
    "T\u00FCm \u00E7al\u0131\u015Fanlar baret tak\u0131yor",
    "Yang\u0131n s\u00F6nd\u00FCr\u00FCc\u00FC eri\u015Filebilir konumda"
  ],
  "risks": [
    {
      "title": "G\u00F6rseldeki somut risk",
      "category": "T\u00FCrk\u00E7e kategori",
      "severity": "low|medium|high|critical",
      "confidence": 0.85,
      "recommendation": "Detayl\u0131 \u00F6neri (en az 3 c\u00FCmle, somut aksiyon plan\u0131)",
      "correctiveActionRequired": true,
      "pinX": 50,
      "pinY": 30,
      "boxX": 40,
      "boxY": 20,
      "boxW": 24,
      "boxH": 24,
      ${mp.jsonExample}${r2dFallback},
      "legalReferences": [
        {
          "law": "Kanun/y\u00F6netmelik ad\u0131",
          "article": "Madde X, f\u0131kra Y",
          "description": "Maddenin ne s\u00F6yledi\u011Fi"
        }
      ]
    }
  ]
}` + analyzeRiskUserLanguageSuffix(locale);
}

export function buildFastSystemPrompt(locale: string): string {
  return `Sen A sinifi ISG uzmani gibi calisan bir gorsel risk analiz motorusun.

GOREV:
- Gercek saha, isyeri, depo, atelye, santiye, teknik alan veya ofis fotografinda risks dizisini bos birakma.
- Sadece gorunen veya makul saha kontrolu gerektiren riskleri yaz.
- Riskleri gorselin genel saha durumu uzerinden degerlendir: acik kanal, kablo, bariyer, zemin, pano, ekipman ve erisim iliskisini birlikte yorumla.
- Emin olmadigin ayrintiyi kesin iddia etme; "sahada dogrulanmali" dili kullan.
- Sadece gecerli JSON dondur. Markdown, aciklama, kod blogu yok.

ZORUNLU TARAMA:
elektrik/kablo/pano, yangin/yanici/gaz, zemin-gecis-duzen, yukseklik-bosluk-kazi,
makine/ekipman, kimyasal-basincli kap, depolama-istif, KKD/davranis, acil durum/levha.

HER RISK ICIN:
title, category, severity(low|medium|high|critical), confidence(0-1),
recommendation, correctiveActionRequired, pinX, pinY, boxX, boxY, boxW, boxH,
r2dParams(c1..c9), fkParams, matrixParams, legalReferences alanlarini doldur.
Anotasyon kare olmali: boxW ve boxH ayni sayi olmali; kare riskli bolgeyi icine almali.

Turkiye ISG mevzuatini kisa ve gercek referanslarla yaz.` + analyzeRiskSystemLanguageSuffix(locale);
}

export function buildFastUserPrompt(method: RiskAnalysisMethod, locale: string): string {
  return `Gorseli hizli modda analiz et. En fazla 4 somut risk yaz; gercek isyeri/saha fotografiysa en az 1 risk zorunlu.

Secilen yontem: ${method}

JSON:
{
  "imageRelevance": "relevant | not_real_photo | not_workplace",
  "imageDescription": "kisa gorsel tanimi",
  "photoQuality": { "level": "good|moderate|poor", "note": "kisa not" },
  "areaSummary": "kisa saha ozeti",
  "personCount": 0,
  "faces": [],
  "positiveObservations": [],
  "risks": [
    {
      "title": "somut risk",
      "category": "kategori",
      "severity": "medium",
      "confidence": 0.78,
      "recommendation": "Somut duzeltici onlem. Sorumlu ve kontrol beklentisi. Sahada dogrulama notu.",
      "correctiveActionRequired": true,
      "pinX": 50,
      "pinY": 50,
      "boxX": 40,
      "boxY": 40,
      "boxW": 24,
      "boxH": 24,
      "r2dParams": {"c1":0.5,"c2":0.2,"c3":0.2,"c4":0.1,"c5":0.2,"c6":0.3,"c7":0.2,"c8":0.1,"c9":0.3},
      "fkParams": {"likelihood":3,"severity":7,"exposure":3},
      "matrixParams": {"likelihood":3,"severity":3},
      "legalReferences": [
        {"law":"6331 sayili Is Sagligi ve Guvenligi Kanunu","article":"Madde 4","description":"Isveren riskleri onlemek ve gerekli tedbirleri almakla yukumludur."}
      ]
    }
  ]
}` + analyzeRiskUserLanguageSuffix(locale);
}

/** Anthropic’a giden tam metinler (debug / şeffaflık sayfası). */
export function getRiskAnalysisPromptBundle(method: RiskAnalysisMethod, locale: string) {
  return {
    promptVersion: RISK_ANALYSIS_PROMPT_VERSION,
    systemPrompt: buildSystemPrompt(method, locale),
    userPrompt: buildUserPrompt(method, locale),
  };
}
