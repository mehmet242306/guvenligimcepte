import { normalizeNovaRequestText } from "@/lib/nova/text-normalization";
import {
  buildNovaMethodsExpertiseResponse,
  isNovaMethodsExpertiseTask,
} from "@/lib/nova/risknova-methods-expertise";

/** Kavramsal risk / yöntem soruları — legal RAG veya navigation'a düşmez. */
const CONCEPTUAL_RISK_PATTERN =
  /\b(yontemin\s*mevzuatta|mevzuatta\s*acikca\s*yazm|gecersiz\s*oldugu\s*anlamina|risk\s*matrisi.*(objektif|gercek|karar\s*destek)|fine[\s-]?kinney.*(daha\s*dogru|her\s*zaman|karmasik)|l\s*matrisi.*fine[\s-]?kinney|farkli\s*sonuc.*(guven|hangisine)|ayni\s*skor.*(oncelik|once|ayni\s*mi)|matematiksel\s*skor.*(aksiyon|eksik|yeterli\s*degil)|sadece\s*skorla|salt\s*skor)\b/;

const OUT_OF_SCOPE_SOFT_PATTERN =
  /\b(esime\s*karsi|esimle\s*iliski|iliski\s*danismanligi|duyarlilik.*esim|evlilik)\b/;

export function isNovaConceptualRiskQuery(message: string): boolean {
  return CONCEPTUAL_RISK_PATTERN.test(normalizeNovaRequestText(message));
}

export function isNovaMethodAdvisorTask(message: string): boolean {
  return isNovaConceptualRiskQuery(message) || isNovaMethodsExpertiseTask(message);
}

function buildMethodValidityResponse(): string {
  return [
    "Kısa yanıt: Hayır. Bir yöntemin mevzuatta adı birebir geçmemesi, o yöntemin otomatik olarak geçersiz olduğu anlamına gelmez.",
    "",
    "Risk değerlendirmesi yapmak zorunludur; 5x5 L matrisi, Fine-Kinney veya RiskNova’daki R-Skor 2D gibi yöntemler bağlama göre seçilebilir.",
    "",
    "Seçilen yöntem sistematik, gerekçeli, uygulanabilir ve kayıt altına alınabilir olmalıdır. Kurum politikası ve veri kalitesi de seçimi etkiler.",
    "",
    "RiskNova araçları karar desteğidir; mevzuatta her yöntem adı zorunlu diye listelenmez.",
  ].join("\n");
}

function buildRiskMatrixDecisionSupportResponse(): string {
  return [
    "Kısa yanıt: Risk matrisi tek başına objektif gerçek değildir; karar destek aracıdır.",
    "",
    "Matris; olasılık, şiddet ve kurum eşikleriyle riskleri karşılaştırılabilir kılar. Nihai karar; saha gözlemi, önlemler, yasal yükümlülük, maruziyet ve uzman yorumu ile birlikte verilir.",
    "",
    "Risk değerlendirmesi zorunludur; 5x5 matris kullanımı ise yöntem seçeneklerinden biridir.",
  ].join("\n");
}

function buildFineKinneyNotAlwaysBetterResponse(): string {
  return [
    "Kısa yanıt: Hayır. Fine-Kinney daha karmaşık olduğu için her zaman daha doğru değildir.",
    "",
    "Fine-Kinney; frekans ve maruziyetin belirleyici olduğu süreçlerde güçlüdür. Basit tehlike önceliklendirmesinde 5x5 L matrisi yeterli olabilir. Çok kriterli önceliklendirme gerekiyorsa RiskNova’da R-Skor 2D değerlendirilebilir.",
    "",
    "Yöntem seçimi veri kalitesi, tehlike türü ve kurum politikasına bağlıdır.",
  ].join("\n");
}

function buildMatrixVsFineKinneyTrustResponse(): string {
  return [
    "Kısa yanıt: Farklı sonuç çıktığında önce her iki yöntemin girdilerini ve varsayımlarını doğrulayın; tek skora körü körüne güvenmeyin.",
    "",
    "Kontrol listesi:",
    "- Olasılık, şiddet, frekans ve maruziyet girişleri tutarlı mı?",
    "- Aynı risk için önlem/artık risk ayrımı yapıldı mı?",
    "- Yasal yükümlülük veya kritik maruziyet var mı?",
    "",
    "Basit önceliklendirme için L matrisi; frekans/maruziyet baskınsa Fine-Kinney; aynı skorda ayrıştırma gerekiyorsa R-Skor 2D düşünülebilir.",
  ].join("\n");
}

function buildSameScoreDifferentPriorityResponse(): string {
  return [
    "Kısa yanıt: Hayır. Aynı skor çıkan iki riskin önceliği otomatik olarak aynı değildir.",
    "",
    "Maruziyet süresi, etkilenen kişi sayısı, kontrol seviyesi, yasal etki ve faaliyet kritikliği önceliği değiştirir. Aynı puanda çok risk varsa RiskNova’da R-Skor 2D ile çok boyutlu ayrıştırma önerilir.",
  ].join("\n");
}

function buildMathScoreOnlyInsufficientResponse(): string {
  return [
    "Kısa yanıt: Sadece matematiksel skorla aksiyon planı çıkarmak eksik kalır.",
    "",
    "Skor; karar desteğidir. Önlemler, maruziyet, yasal yükümlülük, saha kanıtı ve tekrar eden olay sinyalleri birlikte değerlendirilmelidir. Kritik maruziyet veya yasal riskte skor düşük görünse bile erteleme yapılmamalıdır.",
  ].join("\n");
}

function buildOutOfScopeSoftResponse(): string {
  return [
    "Ben RiskNova içinde İSG ve risk yönetimi asistanıyım; ilişki danışmanlığı uzmanlığım yok.",
    "",
    "Genel ve güvenli bir öneri olarak daha iyi dinlemek, duyguları doğrulamak, açık iletişim kurmak ve gerekiyorsa bir uzmandan destek almak yardımcı olabilir.",
    "",
    "İşyeri iletişimi, çalışan duyarlılığı veya güvenlik kültürü bağlamında isterseniz daha somut yardımcı olabilirim.",
  ].join("\n");
}

function buildConceptualRiskFallbackResponse(message: string): string | null {
  const n = normalizeNovaRequestText(message);

  if (/\b(yontemin\s*mevzuatta|mevzuatta\s*acikca\s*yazmama|gecersiz\s*oldugu\s*anlamina)\b/.test(n)) {
    return buildMethodValidityResponse();
  }

  if (/\b(risk\s*matrisi).*(objektif|gercek|karar\s*destek)\b/.test(n)) {
    return buildRiskMatrixDecisionSupportResponse();
  }

  if (/\b(fine[\s-]?kinney).*(daha\s*dogru|her\s*zaman|karmasik)\b/.test(n)) {
    return buildFineKinneyNotAlwaysBetterResponse();
  }

  if (/\b(l\s*matrisi).*(fine[\s-]?kinney).*(fark|guven|sonuc)\b/.test(n)) {
    return buildMatrixVsFineKinneyTrustResponse();
  }

  if (/\b(ayni\s*skor).*(oncelik|once|ayni\s*mi)\b/.test(n)) {
    return buildSameScoreDifferentPriorityResponse();
  }

  if (/\b(matematiksel\s*skor|sadece\s*skorla|salt\s*skor).*(aksiyon|eksik|plan)\b/.test(n)) {
    return buildMathScoreOnlyInsufficientResponse();
  }

  return null;
}

/** RiskNova method advisor — R-Skor 2D / R2D-RCA + kavramsal risk yöntem rehberi. */
export function buildRiskMethodAdvisorResponse(message: string): string | null {
  if (OUT_OF_SCOPE_SOFT_PATTERN.test(normalizeNovaRequestText(message))) {
    return buildOutOfScopeSoftResponse();
  }

  const conceptual = buildConceptualRiskFallbackResponse(message);
  if (conceptual) return conceptual;

  return buildNovaMethodsExpertiseResponse(message);
}

export const NOVA_METHOD_ADVISOR_PROMPT_TR = `RiskNova method advisor (v3):
- Kavramsal yöntem sorularında legal RAG kullanma; önce açıklama ver.
- R-Skor 2D / R2D-RCA RiskNova özel yöntemlerdir; mevzuat zorunluluğu gibi sunma.
- Skor/formül uydurma; kanıtsız kök neden yazma.`;
