import { normalizeNovaRequestText } from "@/lib/nova/text-normalization";

/** RiskNova ürün yöntemleri — mevzuat zorunluluğu olarak sunulmaz. */
export const R_SKOR_2D_PRODUCT_NAME = "R-Skor 2D";
export const R2D_RCA_PRODUCT_NAME = "R2D-RCA";

const R_SKOR_2D_PATTERN =
  /\b(r[\s-]?skor\s*2d|r2d(?!\s*rca)|gelismis\s*risk|gelismis\s*onceliklendirme|gelismis\s*yontem|fine[\s-]?kinney\s*disinda|l\s*matrisi\s*yetersiz|ayni\s*skor|cok\s*kriterli|karar\s*destek\s*yontem)\b/;

const R2D_RCA_PATTERN =
  /\b(r2d[\s-]?rca|kok\s*neden|root\s*cause|5\s*neden|bes\s*neden|ishikawa|balik\s*kilcigi|balik\s*kemigi|sebep\s*sonuc|rca\s*akisi|etkinlik\s*kontrolu)\b/;

const METHOD_SELECTION_PATTERN =
  /\b(hangi\s*yontem|hangi\s*metod|yontem\s*secm|metod\s*sec|yontem\s*kullan|metod\s*kullan|analiz\s*yontem)\b/;

const INCIDENT_RCA_CONTEXT_PATTERN =
  /\b(is\s*kazasi|ramak\s*kala|uygunsuzluk|tekrar\s*eden|dof|duzeltici\s*faaliyet|capa|olay\s*tekrar|kapanmayan\s*dof|etkisiz\s*dof)\b/;

const SIMPLE_MATRIX_ONLY_PATTERN =
  /\b(sadece\s*(5\s*x\s*5|5x5|l\s*matris)|basit\s*matris\s*hesap|fine[\s-]?kinney\s*istiyorum|l\s*matrisi\s*hesapla)\b/;

const UNPROVEN_ROOT_CAUSE_PATTERN =
  /\b(kanit\s*yok|kanitsiz).*(bakim|egitim|talimat).*(yaz|kaydet|isle)/;

function isShallowRootCauseRequest(message: string): boolean {
  const n = normalizeNovaRequestText(message);
  return (
    /\bkok\s*neden\b/.test(n) &&
    /(dikkat|dikkatsiz|calisan\s*hata|personel\s*hata)/.test(n) &&
    /(yazal|yaz|kaydet|ekle|isle|olarak)/.test(n)
  );
}

export function isNovaRSkor2DExpertiseQuery(message: string): boolean {
  const n = normalizeNovaRequestText(message);
  if (SIMPLE_MATRIX_ONLY_PATTERN.test(n) && !/\b(r[\s-]?skor|gelismis|ayni\s*skor|yasal.*maruziyet)\b/.test(n)) {
    return false;
  }
  return R_SKOR_2D_PATTERN.test(n) || /\b(r[\s-]?skor.*l\s*matris|l\s*matris.*r[\s-]?skor)\b/.test(n);
}

export function isNovaR2dRcaExpertiseQuery(message: string): boolean {
  const n = normalizeNovaRequestText(message);
  if (R2D_RCA_PATTERN.test(n)) return true;
  return INCIDENT_RCA_CONTEXT_PATTERN.test(n) && /\b(neden|tekrar|analiz|rca|kok|dof)\b/.test(n);
}

export function isNovaMethodSelectionQuery(message: string): boolean {
  return METHOD_SELECTION_PATTERN.test(normalizeNovaRequestText(message));
}

export function isNovaMethodsExpertiseTask(message: string): boolean {
  return (
    isNovaRSkor2DExpertiseQuery(message) ||
    isNovaR2dRcaExpertiseQuery(message) ||
    isNovaMethodSelectionQuery(message) ||
    isShallowRootCauseRequest(message) ||
    UNPROVEN_ROOT_CAUSE_PATTERN.test(normalizeNovaRequestText(message))
  );
}

function riskAnalysisModuleHint(): string {
  return "RiskNova’da Gelişmiş Risk Analizi (R-Skor 2D) modülünde değerlendirebilirsiniz; önce bağlamı netleştirmek için birkaç soru sorabilirim.";
}

function incidentsRcaModuleHint(): string {
  return "RiskNova’da Olaylar alanından ilgili kayıt için R2D-RCA kök neden analizi akışını başlatabilirsiniz.";
}

function buildRSkorVsLMatrixResponse(): string {
  return [
    "Kısa yanıt: 5x5 L Matrisi basit olasılık × şiddet önceliklendirmesi içindir; R-Skor 2D ise RiskNova’nın çok boyutlu gelişmiş risk önceliklendirme ve karar destek yöntemidir.",
    "",
    "L Matrisi ne zaman yeterli?",
    "- Tek tehlike, net olasılık ve şiddet",
    "- Karşılaştırma az sayıda ve benzer karakterde risk",
    "",
    `${R_SKOR_2D_PRODUCT_NAME} ne zaman daha uygun?`,
    "- Aynı puana sahip riskleri ayırmak gerektiğinde",
    "- Maruziyet, kontrol seviyesi, yasal etki, faaliyet kritikliği, tespit edilebilirlik gibi ek boyutlar önemliyse",
    "- Yönetim için daha net öncelik sırası gerekiyorsa",
    "",
    "Önemli: Risk değerlendirmesi yapmak zorunludur; yöntem seçimi işyeri bağlamına göre yapılır. R-Skor 2D mevzuatta zorunlu bir yöntem değildir; RiskNova’ya özel bir karar destek yaklaşımıdır.",
    "",
    riskAnalysisModuleHint(),
  ].join("\n");
}

function buildRSkorRecommendResponse(): string {
  return [
    "Kısa yanıt: Bu risk tek başına olasılık × şiddet ile değerlendirilebilecek kadar basitse 5x5 L Matrisi yeterli olabilir. Aynı skora sahip riskleri ayırmak, maruziyet, kontrol seviyesi, yasal zorunluluk veya faaliyet kritikliği gibi ek boyutları hesaba katmak istiyorsanız R-Skor 2D daha uygun olur.",
    "",
    "R-Skor 2D, riskleri yalnızca puanlamak için değil; yönetim önceliğine çevirmek için tasarlanmış çok kriterli bir karar destek yöntemidir (tehlike yoğunluğu, KKD, davranış, çevre, kimyasal/elektrik, erişim, makine/proses, araç trafiği, örgütsel yük gibi boyutlar).",
    "",
    "Skor uydurmuyorum: Hesap için sahadaki veriler ve modüldeki parametre girişleri gerekir. Eksik veri varsa önce olasılık, şiddet, maruziyet, mevcut önlemler ve yasal etkiyi netleştirelim.",
    "",
    "Risk değerlendirmesi yapmak zorunludur; R-Skor 2D ise mevzuatta zorunlu bir yöntem değildir.",
    "",
    riskAnalysisModuleHint(),
  ].join("\n");
}

function buildSameScorePriorityResponse(): string {
  return [
    "Kısa yanıt: Aynı skora sahip 5 riski sıralamak için salt L Matrisi puanına bakmak yanıltıcı olabilir; bu durumda R-Skor 2D ile çok boyutlu ayrıştırma öneririm.",
    "",
    "Önerilen adımlar:",
    "1. Her risk için maruziyet süresi, etkilenen kişi sayısı ve kontrol seviyesini yazın.",
    "2. Yasal yükümlülük veya faaliyet durdurma gerektiren riskleri işaretleyin.",
    "3. RiskNova’da R-Skor 2D ile yeniden önceliklendirin; en yüksek bilesik skor ve baskın parametreye göre müdahale sırası belirleyin.",
    "",
    "Bu yöntem mevzuatta zorunlu değildir; RiskNova’nın gelişmiş önceliklendirme aracıdır.",
    "",
    riskAnalysisModuleHint(),
  ].join("\n");
}

function buildLegalExposureHighScoreLowResponse(): string {
  return [
    "Kısa yanıt: Düşük matris puanına güvenmeyin; yasal etki ve yüksek maruziyet önceliği yükseltir.",
    "",
    "Ne yapmalı?",
    "- Olasılık/şiddet girişlerini ve kullanılan yöntemi doğrulayın.",
    "- Yasal zorunluluk, denetim bulgusu ve çalışan maruziyetini ayrı kaydedin.",
    "- Aynı puanda kalan riskler için R-Skor 2D ile çok boyutlu önceliklendirme yapın.",
    "",
    "Salt skor düşük diye ertelemek; yüksek maruziyet veya yasal yükümlülük varsa kabul edilemez olabilir.",
    "",
    riskAnalysisModuleHint(),
  ].join("\n");
}

function buildRepeatedNearMissRcaResponse(): string {
  return [
    "Kısa yanıt: Üç kez aynı ramak kala yaşandıysa yeni bir DÖF tek başına yetmeyebilir; R2D-RCA kök neden analizi başlatmanızı öneririm.",
    "",
    "Neden?",
    "Tekrar eden ramak kala, alınan önlemin etkili olmadığını veya asıl nedenin bulunmadığını gösterir.",
    "",
    "Önerilen akış (R2D-RCA):",
    "A. Olayları aynı zaman çizelgesinde toplayın (ne, nerede, ne zaman, kim etkilendi, sonuç).",
    "B. Kanıt toplayın (fotoğraf, tutanak, tanık, bakım/eğitim kayıtları).",
    "C. Geçici kontrol uygulayın (izolasyon, uyarı, ekipman durdurma).",
    "D. 5 Neden ve Ishikawa ile insan, yöntem, ekipman, ortam, eğitim, bakım, denetim başlıklarını inceleyin.",
    "E. Kök nedeni kanıtla doğrulayın; semptoma değil tekrarın ana nedenine DÖF bağlayın.",
    "F. Etkinlik kontrol tarihi belirleyin.",
    "",
    incidentsRcaModuleHint(),
  ].join("\n");
}

function buildDofClosedIncidentRepeatResponse(): string {
  return [
    "Kısa yanıt: DÖF kapandı ama olay tekrar ettiyse kök neden çözülmemiş veya etkinlik kontrolü yetersiz kalmış olabilir; R2D-RCA ile yeniden analiz öneririm.",
    "",
    "Kontrol listesi:",
    "- Kapatma kanıtı gerçekten uygulandı mı?",
    "- Önlem semptoma mı yoksa sistemsel nedene mi yönelikti?",
    "- Sorumlu ve termin gerçekçi miydi?",
    "- Önlem sonrası risk ve davranış ölçüldü mü?",
    "",
    "Sonraki adım: Olayları birleştirip kök neden analizini yenileyin; yeni DÖF’ü doğrulanmış kök nedene ve etkinlik kontrol tarihine bağlayın.",
    "",
    incidentsRcaModuleHint(),
  ].join("\n");
}

function buildShallowRootCauseWarningResponse(): string {
  return [
    "Kısa yanıt: “Çalışan dikkatsizliği” tek başına kök neden olarak yeterli değildir; yüzeysel bir etiketle kayıt kapanmamalıdır.",
    "",
    "Sistemsel sorular:",
    "- Neden operatör bu koşulda hata yapabildi?",
    "- Talimat, eğitim, iş yükü, ergonomi, bakım, denetim veya tasarım eksikliği var mı?",
    "- Bariyer veya KKD neden işe yaramadı?",
    "",
    "R2D-RCA’da kök neden; kanıtla desteklenmiş ve tekrarın önlenebileceği sistem düzeyinde bir nedendir. Kişiyi suçlamak yerine bu başlıkları inceleyin.",
    "",
    incidentsRcaModuleHint(),
  ].join("\n");
}

function buildUnprovenCauseWarningResponse(): string {
  return [
    "Kısa yanıt: Kanıt yokken bakım eksikliğini kesin kök neden olarak yazmayın.",
    "",
    "Doğru yaklaşım:",
    "- Durumu “ön bulgu / varsayım” olarak işaretleyin.",
    "- Bakım kayıtları, iş emirleri, muayene raporları ve tanık ifadeleriyle doğrulayın.",
    "- Kanıt gelene kadar geçici kontrol ve veri toplama planı uygulayın.",
    "",
    "Sahte veya uydurma kayıt önerilmez; RiskNova kayıtları denetimde kanıt zinciri oluşturmalıdır.",
  ].join("\n");
}

function buildR2dRcaVsFiveWhyResponse(): string {
  return [
    "Kısa yanıt: 5 Neden bir tekniktir; R2D-RCA ise RiskNova’nın olay, ramak kala, uygunsuzluk ve tekrar eden riskler için uçtan uca kök neden analizi akışıdır.",
    "",
    "R2D-RCA akışı özetle:",
    "1. Olayı net tanımla",
    "2. Kanıt ve zaman çizelgesi",
    "3. Acil/geçici kontrol",
    "4. Kök neden analizi (5 Neden, Ishikawa, bariyer analizi vb.)",
    "5. Kök nedeni doğrula",
    "6. DÖF/CAPA ve etkinlik kontrolü",
    "",
    "5 Neden’i R2D-RCA içinde bir araç olarak kullanırsınız; tek başına tüm sürecin yerine geçmez.",
    "",
    incidentsRcaModuleHint(),
  ].join("\n");
}

function buildCriticalRiskNoIncidentResponse(): string {
  return [
    "Kısa yanıt: Olay yaşanmadıysa tam R2D-RCA her zaman şart değildir; önleyici risk önceliklendirme öne çıkar.",
    "",
    "Ne zaman R-Skor 2D?",
    "- Kritik risk kaydı var, öncelik ve ek boyutlar netleştirilmeli",
    "- Aynı skorda çok risk var, yönetim sıralaması gerekiyor",
    "",
    "Ne zaman R2D-RCA?",
    "- Ramak kala veya uygunsuzluk tekrar ediyorsa",
    "- DÖF kapandı ama risk/olay tekrarlıyorsa",
    "- Nedeni belirsiz tekrarlayan problem varsa",
    "",
    "Önce mevcut önlemleri ve artık riski gözden geçirin; tekrar sinyali yoksa proaktif R-Skor 2D yeterli olabilir.",
  ].join("\n");
}

function buildMethodSelectionResponse(message: string): string {
  const n = normalizeNovaRequestText(message);

  if (SIMPLE_MATRIX_ONLY_PATTERN.test(n)) {
    return [
      "Kısa yanıt: Basit bir 5x5 L Matrisi hesabı istiyorsanız bu bağlamda L Matrisi yeterli olabilir.",
      "",
      "Risk değerlendirmesi zorunludur; matris tek zorunlu yöntem değildir. Karmaşık önceliklendirme veya tekrar eden olay ihtiyacı oluşursa R-Skor 2D veya R2D-RCA değerlendirilebilir.",
    ].join("\n");
  }

  if (INCIDENT_RCA_CONTEXT_PATTERN.test(n) && !isNovaRSkor2DExpertiseQuery(message)) {
    return buildRepeatedNearMissRcaResponse();
  }

  return [
    "Kısa yanıt: Yöntem seçimi tehlikenin niteliğine ve elinizdeki veriye bağlıdır.",
    "",
    "Pratik rehber:",
    "- Basit tehlike önceliklendirme → 5x5 L Matrisi",
    "- Frekans/maruziyet önemliyse → Fine-Kinney",
    "- Çok kriterli gelişmiş önceliklendirme → R-Skor 2D (RiskNova)",
    "- Olay, ramak kala, tekrar eden uygunsuzluk, etkisiz DÖF → R2D-RCA (RiskNova)",
    "- Arıza modu / süreç hatası derinlemesine → FMEA",
    "- Savunma katmanları → Bow-Tie / bariyer analizi",
    "- Sistemsel hata zinciri → FTA / hata ağacı",
    "",
    "Hiçbiri mevzuatta tek zorunlu yöntem olarak dayatılamaz; RiskNova araçları karar desteğidir.",
    "",
    "Durumunuzu kısaca yazarsanız (olay var mı, kaç risk, hangi veriler mevcut) daha net önerebilirim.",
  ].join("\n");
}

function buildGenericR2dRcaGuidanceResponse(): string {
  return [
    "Kısa yanıt: Bu durum kök neden ve etkinlik kontrolü gerektiriyor; R2D-RCA akışını öneririm.",
    "",
    "R2D-RCA, RiskNova’nın olay, ramak kala, uygunsuzluk ve tekrar eden riskler için kök neden analizi yöntemidir; mevzuatta zorunlu bir isim olarak geçmez.",
    "",
    "Önce olayı net tanımlayın, kanıt toplayın, geçici kontrol uygulayın; ardından 5 Neden / Ishikawa ile sistem faktörlerini inceleyin. Kök nedeni kanıtsız kesinleştirmeyin; DÖF’ü doğrulanmış nedene bağlayın.",
    "",
    incidentsRcaModuleHint(),
  ].join("\n");
}

function buildGenericRSkorGuidanceResponse(): string {
  return [
    "Kısa yanıt: Bu bağlamda R-Skor 2D ile gelişmiş önceliklendirme daha doğru olabilir.",
    "",
    "R-Skor 2D, RiskNova’nın çok boyutlu risk önceliklendirme ve karar destek yöntemidir; mevzuatta zorunlu bir formül adı değildir. Modülde hesaplama yapılır; burada skor uydurmuyorum.",
    "",
    riskAnalysisModuleHint(),
  ].join("\n");
}

/**
 * Deterministik R-Skor 2D / R2D-RCA uzmanlık yanıtları (hard gate + validator fallback).
 */
export function buildNovaMethodsExpertiseResponse(message: string): string | null {
  const n = normalizeNovaRequestText(message);

  if (isShallowRootCauseRequest(message)) {
    return buildShallowRootCauseWarningResponse();
  }

  if (UNPROVEN_ROOT_CAUSE_PATTERN.test(n)) {
    return buildUnprovenCauseWarningResponse();
  }

  if (/\b(uc\s*kez|3\s*kez|ucuncu\s*kez).*(ramak\s*kala|olay)\b/.test(n)) {
    return buildRepeatedNearMissRcaResponse();
  }

  if (/\b(dof|duzeltici).*(kapand|kapan).*(tekrar|yine|olay)\b/.test(n)) {
    return buildDofClosedIncidentRepeatResponse();
  }

  if (/\b(l\s*matrisi|5\s*x\s*5|5x5).*(yeterli|gelismis|gelismis\s*yontem)\b/.test(n) || /\b(hangi\s*yontem.*analiz|bu\s*riski\s*hangi\s*yontem)\b/.test(n)) {
    return buildRSkorRecommendResponse();
  }

  if (/\b(ayni\s*skor|5\s*risk).*(once|mudahale|oncelik)\b/.test(n)) {
    return buildSameScorePriorityResponse();
  }

  if (/\b(skor.*dusuk|dusuk.*skor).*(yasal|maruziyet)\b/.test(n) || /\b(yasal.*etki|maruziyet).*(yuksek|dusuk\s*skor)\b/.test(n)) {
    return buildLegalExposureHighScoreLowResponse();
  }

  if (/\b(r[\s-]?skor.*l\s*matris|l\s*matris.*r[\s-]?skor|arasi.*fark|farki\s*nedir)\b/.test(n)) {
    return buildRSkorVsLMatrixResponse();
  }

  if (/\b(r2d[\s-]?rca.*5\s*neden|5\s*neden.*r2d|ayni\s*sey\s*mi)\b/.test(n)) {
    return buildR2dRcaVsFiveWhyResponse();
  }

  if (/\b(kritik\s*risk|yuksek\s*risk).*(olay\s*yok|yasanmadi|rca\s*gerek)\b/.test(n) || /\b(rca\s*gerek\s*mi).*(kritik|olay\s*yok)\b/.test(n)) {
    return buildCriticalRiskNoIncidentResponse();
  }

  if (/\b(r[\s-]?skor\s*2d).*(skor|puan|kac\s*cikar|hesapla)\b/.test(n)) {
    return [
      "Kısa yanıt: Burada sayısal R-Skor 2D skoru hesaplayamam; RiskNova modülünde parametreler girildiğinde sistem hesaplar.",
      "",
      "Skor uydurmuyorum. Değerlendirme için tehlike bağlamı, C1–C9 parametre tahminleri veya saha verisi gerekir; eksik alanları paylaşırsanız hangi verileri toplamanız gerektiğini söyleyebilirim.",
      "",
      riskAnalysisModuleHint(),
    ].join("\n");
  }

  if (isNovaMethodSelectionQuery(message) && !isNovaRSkor2DExpertiseQuery(message) && !isNovaR2dRcaExpertiseQuery(message)) {
    return buildMethodSelectionResponse(message);
  }

  if (isNovaR2dRcaExpertiseQuery(message)) {
    return buildGenericR2dRcaGuidanceResponse();
  }

  if (isNovaRSkor2DExpertiseQuery(message)) {
    return buildGenericRSkorGuidanceResponse();
  }

  return null;
}

export const NOVA_METHODS_EXPERTISE_PROMPT_TR = `R-Skor 2D ve R2D-RCA (RiskNova özel yöntemler):
- Mevzuatta zorunlu yöntem gibi sunma; risk değerlendirmesi zorunlu, yöntem seçimi bağlama göre.
- R-Skor 2D: gelişmiş çok boyutlu önceliklendirme / karar destek; basit riskte L Matrisi yeterli olabilir.
- R2D-RCA: olay, ramak kala, tekrar eden uygunsuzluk, etkisiz DÖF için kök neden akışı.
- Önce açıklama ve tavsiye; Sayfaya Git tek başına ana cevap olmasın.
- Formül veya skor uydurma; eksik veri iste veya modülde hesaplat.
- Kök neden: kişiyi suçlama; kanıtsız kesin neden yazma; dikkatsizlik tek başına kök neden değil.`;
