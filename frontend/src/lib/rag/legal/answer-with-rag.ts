import type { SupabaseClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicModel, getAnthropicKey } from "@/lib/ai/provider-keys";
import { composeLegalRagAnswer } from "./compose-legal-answer";
import {
  classifyLegalQueryIntent,
  isRetrievalStrongEnough,
  shouldInterpretWithoutExactPhrase,
} from "./relevance";
import { retrieveLegalEvidenceHybrid } from "./retrieve-hybrid";

export async function answerWithLegalRag(params: {
  service: SupabaseClient;
  query: string;
  language?: string | null;
  jurisdictionCode?: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  polish?: boolean;
}): Promise<{
  answer: string;
  confidence: number;
  sources: Array<Record<string, unknown>>;
  retrievalMode: string;
}> {
  const intent = classifyLegalQueryIntent(params.query);

  if (intent === "off_topic") {
    return composeLegalRagAnswer({
      query: params.query,
      hits: [],
      language: params.language,
      intent,
      interpretive: false,
      strongRetrieval: false,
    });
  }

  const retrieval = await retrieveLegalEvidenceHybrid(params.service, {
    query: params.query,
    jurisdictionCode: params.jurisdictionCode,
    workspaceId: params.workspaceId,
    organizationId: params.organizationId,
  });

  const strongRetrieval = isRetrievalStrongEnough({
    topLexicalRank: retrieval.topLexicalRank,
    topDenseSimilarity: retrieval.topDenseSimilarity,
    hitCount: retrieval.hits.length,
  });

  const interpretive = shouldInterpretWithoutExactPhrase(intent, strongRetrieval);

  let composed = composeLegalRagAnswer({
    query: params.query,
    hits: retrieval.hits,
    language: params.language,
    intent,
    interpretive,
    strongRetrieval,
  });

  if (params.polish && composed.sources.length > 0 && getAnthropicKey()) {
    const anthropic = new Anthropic({ apiKey: getAnthropicKey()! });
    const polished = await anthropic.messages.create({
      model: getAnthropicModel(),
      max_tokens: 1400,
      temperature: 0.15,
      system:
        "Metni okunakli duz Turkce paragraflar halinde yaz. Markdown, yildiz, kalin yazi veya madde isareti kullanma. Yeni kanun/madde uydurma. [CIT-n] atiflarini koru. Kaynaga dayali bulgu ile Nova yorumu bolumlerini ayir. Zayif eslesmede yorumun yorumlayici oldugunu belirt.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            question: params.query,
            draft: composed.answer,
            sources: composed.sources,
          }),
        },
      ],
    });
    const text = polished.content.find((b) => b.type === "text")?.text?.trim();
    if (text) composed = { ...composed, answer: text, retrievalMode: `${composed.retrievalMode}_polish` };
  }

  return composed;
}
