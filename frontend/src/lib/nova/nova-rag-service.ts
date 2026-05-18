import { normalizeNovaRequestText } from "@/lib/nova/text-normalization";
import {
  isNovaIncidentRagAnalysisRequest,
  stripForbiddenNavigationFromAnswer,
} from "@/lib/nova/nova-navigation-policy";

const RAG_CONFIDENCE_BADGE_MIN = 0.68;

export type NovaLegalRagPayload = {
  answer: string;
  confidence: number;
  sources: Array<Record<string, unknown>>;
  retrievalMode: string;
};

export function formatNovaLegalRagPayload(
  message: string,
  rag: NovaLegalRagPayload,
): NovaLegalRagPayload {
  let { answer, confidence, sources } = rag;
  const { retrievalMode } = rag;

  if (confidence < RAG_CONFIDENCE_BADGE_MIN || sources.length === 0) {
    sources = [];
    confidence = Math.min(confidence, RAG_CONFIDENCE_BADGE_MIN - 0.01);
  }

  if (isNovaIncidentRagAnalysisRequest(message)) {
    answer = enrichLegalRagAnswerForIncident(message, answer, sources);
  }

  answer = stripForbiddenNavigationFromAnswer(answer);

  return { answer, confidence, sources, retrievalMode };
}

function enrichLegalRagAnswerForIncident(
  message: string,
  legalAnswer: string,
  sources: Array<Record<string, unknown>>,
): string {
  const n = normalizeNovaRequestText(message);
  const ragBlock =
    sources.length > 0
      ? `Doğrudan ilgili kaynak bulundu; özet:\n${legalAnswer}`
      : "Doğrudan ilgili doğrulanmış mevzuat kaynağı bulunamadı. Aşağıdaki değerlendirme genel İSG risk yönetimi tavsiyesidir; madde numarası veya yaptırım uydurulmaz.";

  const roof = /\b(cati|yuksekte|kenar|korkuluk)\b/.test(n);
  const chemical = /\b(boya|solvent|goz|bas agrisi)\b/.test(n);

  return [
    "## Olay özeti",
    roof
      ? "Seyrek erişimle çatıda bakım ve korkuluksuz kenar; düşme ve ölümcül sonuç riski."
      : chemical
        ? "Boya hazırlama alanında tekrarlayan şikâyetler; maruziyet ve havalandırma/KKD kontrolü gerekir."
        : "Olay bağlamı netleştirilmeli (ne, nerede, ne zaman, kim etkilendi, sonuç).",
    "",
    "## Risk yorumu",
    "Düşük frekans tek başına düşük risk değildir. Ölümcül sonuç potansiyeli varsa öncelik yükselir.",
    "",
    "## Yöntem",
    "Önceliklendirme için L Matrisi; gerekirse R-Skor 2D. Tekrarlayan olayda R2D-RCA.",
    "",
    "## RAG / mevzuat kontrolü",
    ragBlock,
    "",
    "## Acil aksiyonlar",
    roof
      ? "Toplu koruma, güvenli erişim, çalışma izni, geçici kısıtlama."
      : "Maruziyet sınırı, ölçüm, havalandırma/KKD.",
    "",
    "## Düzeltici / önleyici faaliyetler",
    "Sorumlu, termin, kanıt, önlem sonrası artık risk ve etkinlik kontrolü.",
    "",
    legalAnswer && sources.length === 0 ? `## Mevzuat özeti (genel)\n${legalAnswer}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildNovaIncidentRagAnalysisFallback(message: string): string | null {
  if (!isNovaIncidentRagAnalysisRequest(message)) return null;

  const n = normalizeNovaRequestText(message);
  const roofContext = /\b(cati|yuksekte|kenar|korkuluk)\b/.test(n);
  const chemicalContext = /\b(boya|solvent|goz|bas agrisi|maruziyet)\b/.test(n);

  const lines = [
    "Kısa yanıt: Olay analizi chat içinde verilir; mevzuat/RAG bir arka plan kontrol katmanıdır, admin sayfasına yönlendirme yapılmaz.",
    "",
    "## Olay özeti",
    roofContext
      ? "Bakım ekibinin seyrek erişimle çatıda çalışması ve korkuluksuz kenar, düşme ve ölümcül sonuç riski taşır."
      : chemicalContext
        ? "Boya hazırlama alanında tekrarlayan sağlık şikâyetleri, maruziyet ve havalandırma/koruma kontrolleri gerektirir."
        : "Verdiğiniz olay bağlamına göre tehlike, maruziyet ve sonuç netleştirilmelidir.",
    "",
    "## Risk yorumu",
    "Düşük frekans tek başına düşük risk anlamına gelmez. Ölümcül sonuç potansiyeli veya kümülatif maruziyet varsa öncelik yükselir.",
    "",
    "## Yöntem önerisi",
    "- Önceliklendirme: L Matrisi başlangıç; aynı skorda ayrıştırma veya yasal/maruziyet boyutu için R-Skor 2D.",
    "- Tekrarlayan olay/etkisiz önlem: R2D-RCA kök neden analizi.",
    "",
    "## RAG / mevzuat kontrolü",
    "Doğrudan ilgili kaynak bulunursa chat içinde kaynaklı özet verilir. Doğrudan doğrulanmış kaynak bulunamazsa madde numarası veya yaptırım uydurulmaz; aşağıdaki öneriler genel İSG risk yönetimi tavsiyesidir.",
    "",
    "## Acil aksiyonlar",
    roofContext
      ? "Çatı kenarında geçici toplu koruma, güvenli erişim, çalışma izni ve faaliyet kısıtlama."
      : "Maruziyet kaynağını sınırlama, havalandırma/KKD ve saha ölçüm planı.",
    "",
    "## Düzeltici / önleyici faaliyetler",
    "Sorumlu, termin, kanıt ve önlem sonrası artık risk kontrolü tanımlanmalıdır.",
    "",
    "## Yönetim yorumu",
    "Kritik risklerde şeffaf kayıt, kaynak gösterimi ve etkinlik kontrolü önerilir.",
  ];

  return lines.join("\n");
}
