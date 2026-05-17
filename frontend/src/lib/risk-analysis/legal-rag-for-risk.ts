/**
 * Risk kategorisine özel mevzuat/RAG bağlamı.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { retrieveLegalEvidenceHybrid } from "@/lib/rag/legal/retrieve-hybrid";
import { isRetrievalStrongEnough } from "@/lib/rag/legal/relevance";

const GENERIC_LEGAL_BLOB =
  /6331.*madde\s*4|risk\s*degerlendirme.*madde\s*8|isveren.*yukuml/i;

export function buildLegalQueryForRiskCategory(category: string, title: string): string {
  const cat = category.toLocaleLowerCase("tr-TR");
  const t = title.slice(0, 160);
  if (/(elektrik|pano|kablo|tesisat|trafo)/.test(cat)) {
    return `iş sağlığı güvenliği elektrik tesisatı pano kablo yetkisiz erişim bakım ${t}`;
  }
  if (/(yangin|acil|cikis|tahliye|sonduruc)/.test(cat)) {
    return `yangın acil çıkış tahliye yangın söndürücü kaçış yolu işyeri ${t}`;
  }
  if (/(kimyasal|etiket|sds|gbf|depolama)/.test(cat)) {
    return `kimyasal madde depolama etiketleme SDS maruziyet iş güvenliği ${t}`;
  }
  if (/(makine|ekipman|koruyucu|pres)/.test(cat)) {
    return `makine emniyeti koruyucu hareketli parça bakım kilitleme ${t}`;
  }
  if (/(yuksekte|dusme|iskele|merdiven)/.test(cat)) {
    return `yüksekte çalışma düşme koruma iskele emniyet ${t}`;
  }
  if (/(forklift|trafik|yaya)/.test(cat)) {
    return `işyeri trafik yaya forklift ayrımı ${t}`;
  }
  if (/(ergonomi|kkd|kisnel)/.test(cat)) {
    return `kişisel koruyucu donanım KKD maruziyet ${t}`;
  }
  if (/(kayma|takil|zemin|gecis)/.test(cat)) {
    return `kayma düşme takılma geçiş yolu zemin düzeni ${t}`;
  }
  return `iş sağlığı güvenliği ${category} ${t}`;
}

function isGenericLegalRef(ref: { law?: string; article?: string; description?: string }): boolean {
  const blob = `${ref.law ?? ""} ${ref.article ?? ""} ${ref.description ?? ""}`;
  return GENERIC_LEGAL_BLOB.test(blob);
}

export async function enrichRisksWithLegalRag(
  service: SupabaseClient,
  risks: Record<string, any>[],
  organizationId: string,
): Promise<Record<string, any>[]> {
  if (risks.length === 0) return risks;

  return Promise.all(
    risks.map(async (risk) => {
      const category = String(risk.category ?? "Diğer");
      const title = String(risk.title ?? "");
      const query = buildLegalQueryForRiskCategory(category, title);

      try {
        const retrieval = await retrieveLegalEvidenceHybrid(service, {
          query,
          organizationId,
          jurisdictionCode: "TR",
          resultLimit: 4,
        });

        const strong = isRetrievalStrongEnough({
          topLexicalRank: retrieval.topLexicalRank,
          topDenseSimilarity: retrieval.topDenseSimilarity,
          hitCount: retrieval.hits.length,
        });

        if (!strong || retrieval.hits.length === 0) {
          const existing = Array.isArray(risk.legalReferences) ? risk.legalReferences : [];
          const filtered = existing.filter((r: { law?: string; article?: string; description?: string }) => !isGenericLegalRef(r));
          return {
            ...risk,
            legalReferences: filtered.length > 0 ? filtered : [],
            legalContextSummary: "Doğrudan doğrulanmış kaynak bulunamadı",
          };
        }

        const refs = retrieval.hits.slice(0, 2).map((hit) => ({
          law: hit.law,
          article: hit.article ? `Madde ${hit.article}` : "",
          description: hit.content.slice(0, 300).trim(),
        }));

        return {
          ...risk,
          legalReferences: refs,
          legalContextSummary: refs
            .map((r) => [r.law, r.article, r.description].filter(Boolean).join(" — "))
            .join("; "),
        };
      } catch (err) {
        console.warn("[legal-rag-for-risk] skip:", err instanceof Error ? err.message : String(err));
        return {
          ...risk,
          legalReferences: [],
          legalContextSummary: "Doğrudan doğrulanmış kaynak bulunamadı",
        };
      }
    }),
  );
}
