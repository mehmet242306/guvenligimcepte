import type { LegalQueryIntent } from "./relevance";
import type { LegalEvidenceHit } from "./retrieve-hybrid";

function summarizeSnippet(content: string, maxLength = 280): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const sentence = normalized.split(/(?<=[.!?;:])\s+/)[0]?.trim() || normalized;
  if (sentence.length <= maxLength) return sentence;
  return `${sentence.slice(0, maxLength - 1).trim()}…`;
}

export function composeLegalRagAnswer(params: {
  query: string;
  hits: LegalEvidenceHit[];
  language?: string | null;
  intent: LegalQueryIntent;
  interpretive: boolean;
  strongRetrieval: boolean;
}): {
  answer: string;
  confidence: number;
  sources: Array<Record<string, unknown>>;
  retrievalMode: string;
} {
  const isEnglish = String(params.language ?? "").toLowerCase().startsWith("en");
  const topHits = params.hits.slice(0, 4);

  if (params.intent === "off_topic") {
    return {
      answer: isEnglish
        ? "This question does not appear to be about occupational health and safety legislation. Please ask an OHS or legal-compliance question so I can cite the legislation index."
        : "Bu soru, iş sağlığı ve güvenliği mevzuatı ile doğrudan ilgili görünmüyor. Mevzuat veya İSG kapsamında yeniden sorabilirsiniz.",
      confidence: 0.12,
      sources: [],
      retrievalMode: "off_topic",
    };
  }

  if (!topHits.length) {
    if (params.intent === "legal_isg") {
      return {
        answer: (isEnglish
          ? [
              "## Result",
              "I could not find a close match in the current legislation index.",
              "The question may still be OHS-related; try rephrasing with a law number, article, or duty keyword (e.g. risk assessment, training, PPE).",
            ]
          : [
              "## Sonuç",
              "Mevzuat indeksinde bu soruya yakın bir eşleşme bulamadım.",
              "Soru yine de İSG ile ilgili olabilir; kanun numarası, madde veya yükümlülük anahtar kelimesi (risk değerlendirmesi, eğitim, KKD) ile yeniden sorun.",
            ]
        ).join("\n"),
        confidence: 0.22,
        sources: [],
        retrievalMode: "no_match_legal",
      };
    }

    return {
      answer: isEnglish
        ? "This does not look like a legislation-index question. I can help with OHS practice topics; for binding legal wording, ask with a law or regulation reference."
        : "Bu soru mevzuat indeksi sorusu gibi görünmüyor. Genel İSG uygulamasında yardımcı olabilirim; bağlayıcı hukuki ifade için kanun/yönetmelik referansı ekleyerek sorun.",
      confidence: 0.2,
      sources: [],
      retrievalMode: "no_match_general",
    };
  }

  const evidenceLines = topHits.map((hit) => {
    const snippet = summarizeSnippet(hit.content);
    const citation = hit.article ? `${hit.law} — ${hit.article}` : hit.law;
    return `- ${snippet} [${hit.citation_id}; ${citation}]`;
  });

  const hasExact = topHits.some((h) => h.match_type === "exact");
  const hasDense = topHits.some((h) => h.match_type === "dense");
  const confidence = hasExact ? 0.9 : params.strongRetrieval ? 0.78 : 0.62;

  const interpretationTr = params.interpretive
    ? params.strongRetrieval
      ? "Sorunuzdaki kavram, indeksteki metinlerle birebir aynı ifadeyle geçmese de aşağıdaki mevzuat parçalarıyla ilişkilendirilebilir. Bu bölüm yorumlayıcı bir bağlantıdır; bağlayıcı ifade için madde metnine bakın."
      : "İndeks eşleşmesi zayıf; aşağıdaki parçalar konuya en yakın resmi kaynaklardır. Doğrudan madde atfı yerine dikkatli yorum içerir."
    : "Bu cevap, indeksteki madde metinlerine dayanır.";

  const interpretationEn = params.interpretive
    ? params.strongRetrieval
      ? "Your question may not use the exact statutory wording, but it can be linked to the passages below. This section is interpretive; rely on the article text for binding wording."
      : "Index matches are weak; the passages below are the closest official sources. Treat this as cautious interpretation, not a direct quote."
    : "This answer is grounded in indexed article text.";

  const sources = topHits.map((hit) => ({
    doc_title: hit.law,
    doc_type: hit.doc_type,
    doc_number: hit.doc_number ?? "",
    article_number: hit.article ?? "",
    article_title: hit.title ?? "",
    match_type: hit.match_type,
    citation_id: hit.citation_id ?? null,
    corpus_scope: "official",
  }));

  if (isEnglish) {
    return {
      answer: [
        "## Source-backed finding",
        ...evidenceLines,
        "",
        "## Nova interpretation",
        interpretationEn,
        "",
        "## Recommended next step",
        "Open the cited article text and verify scope, exceptions, and effective date for your workplace.",
      ].join("\n"),
      confidence,
      sources,
      retrievalMode: hasExact ? "rag_exact" : hasDense ? "rag_hybrid" : "rag_lexical",
    };
  }

  return {
    answer: [
      "## Kaynağa dayalı bulgu",
      ...evidenceLines,
      "",
      "## Nova yorumu",
      interpretationTr,
      "",
      "## Önerilen sonraki adım",
      "Alıntılanan madde metnini açın; işyeriniz için kapsam, istisna ve yürürlük tarihini doğrulayın.",
    ].join("\n"),
    confidence,
    sources,
    retrievalMode: hasExact ? "rag_exact" : hasDense ? "rag_hybrid" : "rag_lexical",
  };
}
