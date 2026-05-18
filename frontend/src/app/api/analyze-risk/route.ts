import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { logAiUsage, logErrorEvent } from "@/lib/admin-observability/server";
import { requireAuth } from "@/lib/supabase/api-auth";
import { createServiceClient, enforceRateLimit, logSecurityEvent, resolveAiDailyLimit } from "@/lib/security/server";
import {
  getAnthropicKey,
  getAnthropicModel,
  getRiskAnalysisFastVisionModel,
  getRiskAnalysisVisionModel,
} from "@/lib/ai/provider-keys";
import { consumeEntitlement } from "@/lib/billing/entitlements";
import {
  buildFastSystemPrompt,
  buildFastUserPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  RISK_ANALYSIS_PROMPT_VERSION,
} from "@/lib/ai/analyze-risk-prompts";
import { buildAnalyzeRiskDiagnostics } from "@/lib/ai/analyze-risk-diagnostics";
import { enrichRisksWithLegalRag } from "@/lib/risk-analysis/legal-rag-for-risk";
import { validateVisionResponse } from "@/lib/risk-analysis/vision-response-schema";

let anthropicClient: Anthropic | null = null;
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

// Next.js 16: literal gerekir. Gerçek üst sınır Vercel plan + Projedeki Function Max Duration.
export const maxDuration = 300;

function getAnthropicClient(): Anthropic | null {
  const apiKey = getAnthropicKey();
  if (!apiKey) return null;
  anthropicClient ??= new Anthropic({
    apiKey,
    // SDK tek sınır: route maxDuration’a yakın (iç wrap/retry yok).
    timeout: Math.min(600_000, maxDuration * 1000 - 5_000),
    maxRetries: 0,
  });
  return anthropicClient;
}

// Daha agresif tespit için threshold'lar gevşetildi (kullanıcı geri bildirimi:
// AI gerçek tehlikeleri "düşük confidence" diye susturmuştu).
// Halüsinasyon değil, eksik tespit asıl sorundur.
const ACCEPTABLE_RISK_CONFIDENCE_MAX = 0.40; // 0.59 → 0.40: daha az risk "kabul edilebilir"e düşer
const ACTIONABLE_RISK_CONFIDENCE_MIN = 0.55; // 0.70 → 0.55: daha geniş "aksiyon gerekli" aralığı

function clampPercent(value: unknown, fallback: number, min = 0, max = 100): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeSquareAnnotation(risk: Record<string, any>, index: number): Record<string, any> {
  const pinX = clampPercent(risk.pinX, 50);
  const pinY = clampPercent(risk.pinY, 50);
  const rawBoxX = clampPercent(risk.boxX, pinX - 12);
  const rawBoxY = clampPercent(risk.boxY, pinY - 12);
  const rawBoxW = clampPercent(risk.boxW, 24, 8, 60);
  const rawBoxH = clampPercent(risk.boxH, rawBoxW, 8, 60);
  const side = Math.min(60, Math.max(10, rawBoxW, rawBoxH));
  const centerX = clampPercent(rawBoxX + rawBoxW / 2, pinX);
  const centerY = clampPercent(rawBoxY + rawBoxH / 2, pinY);
  const boxX = clampPercent(centerX - side / 2, Math.max(0, pinX - side / 2), 0, 100 - side);
  const boxY = clampPercent(centerY - side / 2, Math.max(0, pinY - side / 2), 0, 100 - side);

  return {
    ...risk,
    pinX: clampPercent(risk.pinX, boxX + side / 2),
    pinY: clampPercent(risk.pinY, boxY + side / 2),
    boxX,
    boxY,
    boxW: side,
    boxH: side,
    annotationShape: "square",
    annotationLabel: risk.annotationLabel ?? `R${index + 1}`,
  };
}

async function generateMemoryEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || !text.trim()) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.slice(0, 8000),
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      console.warn("[analyze-risk] memory embedding failed:", response.status, await response.text().catch(() => ""));
      return null;
    }

    const payload = await response.json();
    const embedding = payload?.data?.[0]?.embedding;
    return Array.isArray(embedding) ? embedding : null;
  } catch (error) {
    console.warn("[analyze-risk] memory embedding error:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

function buildRiskMemoryQueryText(input: {
  method: string;
  outputLocale: string;
  companyContext?: {
    name?: string;
    sector?: string;
    kind?: string;
    hazardClass?: string;
    address?: string;
  };
  rowContext?: {
    title?: string;
    description?: string;
  };
}) {
  const company = input.companyContext;
  const row = input.rowContext;
  return [
    `method:${input.method}`,
    `language:${input.outputLocale}`,
    company?.sector ? `sector:${company.sector}` : "",
    company?.kind ? `activity:${company.kind}` : "",
    company?.hazardClass ? `hazard_class:${company.hazardClass}` : "",
    row?.title ? `risk_title:${row.title}` : "",
    row?.description ? `risk_description:${row.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function buildRiskMemoryContext(params: {
  organizationId: string;
  method: string;
  outputLocale: string;
  companyContext?: {
    name?: string;
    sector?: string;
    kind?: string;
    hazardClass?: string;
    address?: string;
  };
  rowContext?: {
    title?: string;
    description?: string;
  };
}) {
  const embedding = await generateMemoryEmbedding(buildRiskMemoryQueryText(params));
  if (!embedding) return { context: "", memoryIds: [] as string[] };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("search_nova_risk_memory", {
      query_embedding: embedding,
      org_id: params.organizationId,
      workspace_id: null,
      method_filter: params.method,
      similarity_threshold: 0.78,
      max_results: 4,
    });

    if (error || !Array.isArray(data) || data.length === 0) {
      if (error) console.warn("[analyze-risk] risk memory search failed:", error.message);
      return { context: "", memoryIds: [] as string[] };
    }

    const memoryIds = data.map((item: any) => item.id).filter(Boolean);
    try {
      await supabase.rpc("touch_nova_risk_memory", { p_memory_ids: memoryIds });
    } catch {
      // Non-critical analytics update.
    }

    const context = [
      "## RİSKNOVA KURUMSAL RİSK HAFIZASI (onaylı/yüksek güvenli benzer örnekler)",
      "Bu kayıtlar sadece tutarlılık ipucudur. Görselde olmayan riski ekleme; ancak aynı örüntü görünüyorsa adlandırma, ciddiyet ve aksiyon dilini tutarlı kullan.",
      ...data.map((item: any, index: number) => [
        `### Benzer örnek ${index + 1} (${Math.round(Number(item.similarity ?? 0) * 100)}% benzerlik, ${item.memory_status})`,
        `Saha özeti: ${String(item.scene_summary ?? "").slice(0, 500)}`,
        `Risk imzası: ${String(item.risk_signature ?? "").slice(0, 700)}`,
        `Örnek riskler: ${JSON.stringify(item.risks ?? []).slice(0, 1800)}`,
      ].join("\n")),
    ].join("\n\n");

    return { context, memoryIds };
  } catch (error) {
    console.warn("[analyze-risk] risk memory context error:", error instanceof Error ? error.message : String(error));
    return { context: "", memoryIds: [] as string[] };
  }
}

async function buildRiskMemoryContextFromText(params: {
  organizationId: string;
  method: string;
  text: string;
  similarityThreshold?: number;
}) {
  const embedding = await generateMemoryEmbedding(params.text);
  if (!embedding) return { context: "", memoryIds: [] as string[] };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("search_nova_risk_memory", {
      query_embedding: embedding,
      org_id: params.organizationId,
      workspace_id: null,
      method_filter: params.method,
      similarity_threshold: params.similarityThreshold ?? 0.78,
      max_results: 4,
    });

    if (error || !Array.isArray(data) || data.length === 0) {
      if (error) console.warn("[analyze-risk] risk memory text search failed:", error.message);
      return { context: "", memoryIds: [] as string[] };
    }

    const memoryIds = data.map((item: any) => item.id).filter(Boolean);
    try {
      await supabase.rpc("touch_nova_risk_memory", { p_memory_ids: memoryIds });
    } catch {
      // Non-critical analytics update.
    }

    return {
      memoryIds,
      context: [
        "## BENZER ONAYLI RİSK HAFIZASI",
        "Bu örnekleri risk adlandırması, ciddiyet tutarlılığı, aksiyon dili ve mevzuat referansı için kullan. Görsel tespit listesini genişletme veya silme.",
        ...data.map((item: any, index: number) => [
          `### Örnek ${index + 1} (${Math.round(Number(item.similarity ?? 0) * 100)}% benzerlik, ${item.memory_status})`,
          `Saha özeti: ${String(item.scene_summary ?? "").slice(0, 500)}`,
          `Risk imzası: ${String(item.risk_signature ?? "").slice(0, 700)}`,
          `Riskler: ${JSON.stringify(item.risks ?? []).slice(0, 1600)}`,
        ].join("\n")),
      ].join("\n\n"),
    };
  } catch (error) {
    console.warn("[analyze-risk] risk memory text context error:", error instanceof Error ? error.message : String(error));
    return { context: "", memoryIds: [] as string[] };
  }
}

function buildRiskMemorySignature(risks: Record<string, any>[]) {
  return risks
    .map((risk) => [
      risk.title,
      risk.category,
      risk.severity,
      typeof risk.recommendation === "string" ? risk.recommendation.slice(0, 240) : "",
    ].filter(Boolean).join(" | "))
    .join("\n");
}

async function storeRiskMemory(params: {
  userId: string;
  organizationId: string;
  method: string;
  outputLocale: string;
  sourceModel: string;
  interpretationModel: string;
  parsed: Record<string, any>;
}) {
  const risks = Array.isArray(params.parsed.risks) ? params.parsed.risks : [];
  if (risks.length === 0) return;

  const avgConfidence =
    risks.reduce((sum, risk) => sum + Math.max(0, Math.min(1, Number(risk.confidence ?? 0))), 0) / risks.length;
  if (avgConfidence < 0.68) return;

  const sceneSummary = String(params.parsed.areaSummary || params.parsed.imageDescription || "").slice(0, 2000);
  const riskSignature = buildRiskMemorySignature(risks).slice(0, 4000);
  const embeddingText = [
    `method:${params.method}`,
    `language:${params.outputLocale}`,
    sceneSummary,
    riskSignature,
  ].join("\n");
  const embedding = await generateMemoryEmbedding(embeddingText);
  if (!embedding) return;

  try {
    const supabase = createServiceClient();
    const legalReferences = risks.flatMap((risk) => Array.isArray(risk.legalReferences) ? risk.legalReferences : []);
    await supabase.from("nova_risk_memory").insert({
      user_id: params.userId,
      organization_id: params.organizationId,
      source_endpoint: "/api/analyze-risk",
      source_model: params.sourceModel,
      interpretation_model: params.interpretationModel,
      method: params.method,
      language: params.outputLocale,
      memory_status: avgConfidence >= 0.82 ? "auto_captured" : "auto_captured",
      confidence_score: Number(avgConfidence.toFixed(3)),
      scene_summary: sceneSummary || "Gorsel risk analizi",
      risk_signature: riskSignature,
      risks: risks.map((risk) => ({
        title: risk.title,
        category: risk.category,
        severity: risk.severity,
        confidence: risk.confidence,
        recommendation: risk.recommendation,
        legalReferences: risk.legalReferences ?? [],
      })),
      legal_references: legalReferences,
      metadata: {
        imageRelevance: params.parsed.imageRelevance ?? null,
        personCount: params.parsed.personCount ?? null,
        promptVersion: RISK_ANALYSIS_PROMPT_VERSION,
      },
      embedding,
    });
  } catch (error) {
    console.warn("[analyze-risk] risk memory store failed:", error instanceof Error ? error.message : String(error));
  }
}

function parseLooseJsonObject(text: string): Record<string, any> {
  const cleaned = text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      const parsed = JSON.parse(match[0]);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
}

async function enrichRiskInterpretationWithSonnet({
  client,
  model,
  risks,
  method,
  outputLocale,
  areaSummary,
  imageDescription,
  memoryContext,
}: {
  client: Anthropic;
  model: string;
  risks: Record<string, any>[];
  method: string;
  outputLocale: string;
  areaSummary?: string;
  imageDescription?: string;
  memoryContext?: string;
}): Promise<{
  risks: Record<string, any>[];
  areaSummary?: string;
  usage?: Anthropic.Messages.Usage;
}> {
  if (risks.length === 0) return { risks };

  const compactRisks = risks.map((risk, index) => ({
    index,
    title: risk.title,
    category: risk.category,
    severity: risk.severity,
    confidence: risk.confidence,
    correctiveActionRequired: risk.correctiveActionRequired,
    r2dParams: risk.r2dParams,
    fkParams: risk.fkParams,
    matrixParams: risk.matrixParams,
    fmeaParams: risk.fmeaParams,
    hazopParams: risk.hazopParams,
    bowTieParams: risk.bowTieParams,
    ftaParams: risk.ftaParams,
    checklistParams: risk.checklistParams,
    jsaParams: risk.jsaParams,
    lopaParams: risk.lopaParams,
  }));

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    temperature: 0.2,
    system:
      "Sen RiskNova'nin ISG yorumlama katmanisin. Opus tarafindan tespit edilen gorsel riskleri DEGISTIRMEDEN, her risk icin uygulanabilir aksiyon, mevzuat referansi ve rapor dili uret. Yeni risk ekleme, risk silme, koordinat/annotation bilgisi uretme. Sadece gecerli JSON dondur.",
    messages: [
      {
        role: "user",
        content: [
          "Gorsel tespit modeli riskleri buldu. Sen sadece yorumla.",
          `Dil/locale: ${outputLocale}`,
          `Analiz yontemi: ${method}`,
          areaSummary ? `Opus saha ozeti: ${areaSummary}` : "",
          imageDescription ? `Opus gorsel tanimi: ${imageDescription}` : "",
          memoryContext ?? "",
          "",
          "Riskler:",
          JSON.stringify(compactRisks),
          "",
          "Beklenen JSON:",
          `{
  "areaSummary": "2-3 cumlelik profesyonel saha yorumu",
  "risks": [
    {
      "index": 0,
      "recommendation": "En az 3 cumle: acil onlem, kalici kontrol, sorumlu/termin/dogrulama.",
      "legalReferences": [
        {"law":"gercek mevzuat adi","article":"madde/fikra","description":"kisa uygunluk aciklamasi"}
      ]
    }
  ]
}`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
  });

  const text = response.content.find((block) => block.type === "text")?.text ?? "{}";
  const parsed = parseLooseJsonObject(text);
  const interpretations = Array.isArray(parsed.risks) ? parsed.risks : [];
  const byIndex = new Map<number, Record<string, any>>();
  for (const item of interpretations) {
    const index = Number(item?.index);
    if (Number.isInteger(index)) byIndex.set(index, item);
  }

  return {
    areaSummary: typeof parsed.areaSummary === "string" && parsed.areaSummary.trim()
      ? parsed.areaSummary.trim()
      : undefined,
    risks: risks.map((risk, index) => {
      const enriched = byIndex.get(index);
      if (!enriched) return risk;
      return {
        ...risk,
        recommendation:
          typeof enriched.recommendation === "string" && enriched.recommendation.trim()
            ? enriched.recommendation.trim()
            : risk.recommendation,
        legalReferences: Array.isArray(enriched.legalReferences) && enriched.legalReferences.length > 0
          ? enriched.legalReferences
          : risk.legalReferences,
      };
    }),
    usage: response.usage,
  };
}

const analyzeRiskSchema = z.object({
  imageBase64: z.string().min(100).max(45_000_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/gif", "image/webp"]),
  method: z
    .enum(["r_skor", "fine_kinney", "l_matrix", "fmea", "hazop", "bow_tie", "fta", "checklist", "jsa", "lopa"])
    .optional()
    .default("r_skor"),
  mode: z.enum(["standard", "fast"]).optional().default("standard"),
  /** UI locale (e.g. next-intl) — steers output language for narrative fields */
  language: z.string().min(2).max(12).optional().default("tr"),
  /**
   * Firma bağlamı — AI'nın sektörel bakış açısı için. Hepsi opsiyonel:
   * görselden çıkarılamayan ipucu sağlar. Verilmezse model yalnızca
   * görsele dayanır.
   */
  companyContext: z
    .object({
      name: z.string().max(250).optional(),
      sector: z.string().max(250).optional(),
      kind: z.string().max(120).optional(),
      hazardClass: z.string().max(60).optional(),
      address: z.string().max(500).optional(),
    })
    .optional(),
  /** Risk satırı — kullanıcı başlık/açıklama (sihirbaz); AI değerlendirmesinde bağlam olarak kullanılır */
  rowContext: z
    .object({
      title: z.string().min(1).max(400),
      description: z.string().min(1).max(4000),
    })
    .optional(),
});


function buildFallbackRisksForEmptyFieldReview(parsed: Record<string, any>): Record<string, any>[] {
  const text = [parsed.imageDescription, parsed.areaSummary, parsed.photoQuality?.note]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase("tr-TR");

  const legalReferences = [
    {
      law: "İş Sağlığı ve Güvenliği Risk Değerlendirmesi Yönetmeliği",
      article: "Madde 8",
      description: "Çalışma ortamındaki tehlikeler belirlenir, riskler analiz edilir ve kontrol tedbirleri planlanır.",
    },
  ];

  const createRisk = (
    title: string,
    category: string,
    severity: "low" | "medium" | "high" | "critical",
    pinX: number,
    pinY: number,
    recommendation: string,
  ) => ({
    title,
    category,
    severity,
    confidence: 0.72,
    recommendation,
    correctiveActionRequired: true,
    pinX,
    pinY,
    boxX: Math.max(0, pinX - 15),
    boxY: Math.max(0, pinY - 12),
    boxW: 30,
    boxH: 24,
    r2dParams: { c1: 0.7, c2: 0.1, c3: 0.2, c4: 0.4, c5: 0.5, c6: 0.6, c7: 0.4, c8: 0.1, c9: 0.5 },
    legalReferences,
  });

  const risks: Record<string, any>[] = [];

  if (/(trafo|elektrik|pano|kablo|enerji|şalt|salt|direk|hat|akım|gerilim|substation)/i.test(text)) {
    risks.push(createRisk(
      "Elektrik tesis alanında temas ve yetkisiz erişim riski",
      "Elektrik",
      "high",
      35,
      35,
      "Elektrik tesis alanı yetkisiz erişime, temas riskine ve çalışma sırasında enerjiye yaklaşma tehlikesine karşı yeniden değerlendirilmelidir. Çevreleme, uyarı levhaları, kilitleme/etiketleme ve güvenli yaklaşma mesafeleri İSG uzmanı ile elektrik yetkilisi tarafından sahada doğrulanmalıdır. Eksik veya yetersiz bariyerler tamamlanmadan alanda çalışma yapılmamalıdır.",
    ));
  }

  if (/(kazı|çukur|kanal|hendek|boşluk|temel|inşaat|şantiye|hafriyat|trench|excavation)/i.test(text)) {
    risks.push(createRisk(
      "Açık kazı/kanal nedeniyle düşme ve göçük riski",
      "Yüksekte Çalışma",
      "high",
      48,
      68,
      "Açık kazı veya kanal alanı düşme, tökezleme ve kenar stabilitesi açısından kontrol altına alınmalıdır. Kazı çevresine sağlam bariyer, uyarı işaretleri ve güvenli geçiş düzeni kurulmalı; kenar boşlukları ve göçük riski yetkin kişi tarafından kontrol edilmelidir. Alan kapatılmadan çalışan ve ziyaretçi erişimi engellenmelidir.",
    ));
  }

  if (/(dağınık|moloz|malzeme|boru|hortum|kablo|geçiş|zemin|düzensiz|engel)/i.test(text)) {
    risks.push(createRisk(
      "Düzensiz saha zemini ve geçiş engelleri nedeniyle takılma/düşme riski",
      "Düzen/Temizlik",
      "medium",
      55,
      75,
      "Saha zemini, geçiş yolları ve çalışma çevresi düzen-temizlik açısından toparlanmalıdır. Geçiş üzerinde kalan boru, kablo, moloz veya malzemeler kaldırılmalı; zorunlu hatlar koruyucu kanal veya askı sistemiyle güvenli hale getirilmelidir. Düzenleme tamamlandıktan sonra alan sorumlusu tarafından günlük saha kontrolü yapılmalıdır.",
    ));
  }

  // LPG / gaz tüpü / basınçlı kap için zorunlu fallback
  if (/(lpg|propan|bütan|butan|asetilen|gaz tüp|tüp gaz|silindir|basınçlı kap|manifold|regülatör|kompres[oö]r)/i.test(text)) {
    risks.push(createRisk(
      "Basınçlı gaz / LPG tüpü kontrol kanıtı yetersiz — patlayıcı atmosfer ve devrilme riski",
      "Basınçlı Kap",
      "high",
      50,
      55,
      "Görselde basınçlı kap / LPG tüpü görülmektedir. Tüplerin sabitleme aparatı, periyodik kontrol etiketi, manometre, emniyet ventili, hortum kondisyonu, mekanik darbe koruması ve havalandırma yeterliliği yetkili tarafından doğrulanmalıdır. 5 metre içinde ateş kaynağı ve yanıcı malzeme bulundurulmamalı; ABC tipi min 6 kg yangın söndürücü erişilebilir olmalıdır. Kapalı alanlarda gaz dedektörü zorunludur. Sorumlu: İSG Uzmanı + Bakım Şefi. Termin: 7 gün. Mevzuat: 2007/12937 Yangın Yönetmeliği, ATEX 99/92/EC.",
    ));
  }

  // Yangın / alev / sıcak iş için zorunlu fallback
  if (/(yangın|alev|ateş|duman|yanıcı|tutuşma|yanma|sıcak iş|kor|isı|fire|flame|smoke)/i.test(text)) {
    risks.push(createRisk(
      "Aktif yangın/alev veya yanıcı ortam riski — acil müdahale ve önleme gerekli",
      "Yangın",
      "critical",
      50,
      50,
      "Görselde yangın, alev veya yüksek tutuşma riski içeren bir durum tespit edilmiştir. ÖNCELİK 1: Alan derhal tahliye edilmeli ve elektrik beslemesi kesilmelidir. ÖNCELİK 2: ABC tipi yangın söndürücü ile müdahale; başarısız olunursa itfaiyeye haber. ÖNCELİK 3: Olayın kök sebebi (elektrik kısa devre, statik kıvılcım, yanıcı malzeme yakınlığı) belirlenmeli ve aynı koşullar tekrarlanmamalıdır. Sorumlu: Acil Durum Sorumlusu + İSG Uzmanı. Termin: ANINDA. Mevzuat: 2007/12937 Yangın Yönetmeliği, 6331 sy. Madde 11-12.",
    ));
  }

  if (risks.length === 0) {
    risks.push(createRisk(
      "Görselde çalışma alanı tehlike kaynakları için risk envanteri gerekli",
      "Diğer",
      "medium",
      50,
      50,
      "AI ilk geçişte boş sonuç üretmiş olsa da gerçek saha fotoğrafında görünen ekipman, zemin, erişim ve çalışma alanı unsurları risk envanteri kapsamında değerlendirilmelidir. İSG uzmanı sahada elektrik, yangın, geçiş, depolama, zemin ve acil durum başlıklarını kontrol ederek risk kayıtlarını tamamlamalıdır. Bu kayıt manuel doğrulama ile kesinleştirilmelidir.",
    ));
  }

  return risks;
}

/* ================================================================== */
/* Request normalization                                               */
/* ================================================================== */

/** Veri URL önekini kaldırır, MIME eşlemesi yapar — istemci yanlışlıkla data:image ile gönderirse şema doğrulaması geçer. */
function normalizeAnalyzeRiskPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = { ...(raw as Record<string, unknown>) };
  if (typeof o.imageBase64 === "string") {
    let b64 = o.imageBase64.trim();
    const dataUrlMatch = b64.match(/^data:([^;]+);base64,(.+)$/i);
    if (dataUrlMatch?.[2]) {
      const declaredMime = dataUrlMatch[1]?.trim().toLowerCase();
      b64 = dataUrlMatch[2].replace(/\s/g, "");
      if (o.mimeType == null && declaredMime) {
        const normalizedMime = declaredMime === "image/jpg" ? "image/jpeg" : declaredMime;
        if (
          normalizedMime === "image/jpeg" ||
          normalizedMime === "image/png" ||
          normalizedMime === "image/gif" ||
          normalizedMime === "image/webp"
        ) {
          o.mimeType = normalizedMime;
        }
      }
    } else {
      b64 = b64.replace(/\s/g, "");
    }
    o.imageBase64 = b64;
  }
  if (typeof o.mimeType === "string") {
    const m = o.mimeType.trim().toLowerCase();
    o.mimeType = m === "image/jpg" ? "image/jpeg" : m;
  }
  const rc = o.rowContext;
  if (rc && typeof rc === "object") {
    const r = rc as Record<string, unknown>;
    if (typeof r.title === "string") r.title = r.title.trim();
    if (typeof r.description === "string") r.description = r.description.trim();
    o.rowContext = r;
  }
  return o;
}

/* ================================================================== */
/* API handler                                                         */
/* ================================================================== */

export async function POST(request: NextRequest) {
  // Kimlik doğrulama zorunlu. Görsel risk AI, aylık risk_analysis kotasını
  // ve plan bazlı günlük AI rate limitini server tarafında tüketir.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const plan = await resolveAiDailyLimit(auth.userId);
    const rateLimitResponse = await enforceRateLimit(request, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      endpoint: "/api/analyze-risk",
      scope: "ai",
      limit: plan.dailyLimit,
      windowSeconds: 24 * 60 * 60,
      planKey: plan.planKey,
      metadata: { feature: "image_risk_analysis" },
    });
    if (rateLimitResponse) return rateLimitResponse;

    const entitlementResponse = await consumeEntitlement(auth, "risk_analysis");
    if (entitlementResponse) return entitlementResponse;

    const rawBody = await request.json().catch(() => null);
    const parsedBody = analyzeRiskSchema.safeParse(normalizeAnalyzeRiskPayload(rawBody));
    if (!parsedBody.success) {
      const diagnostics = buildAnalyzeRiskDiagnostics({
        ok: false,
        stage: "request_validation_failed",
        startTime: Date.now(),
        visionModel: getRiskAnalysisVisionModel(),
        mimeType: "unknown",
        imageBase64Length: 0,
        httpStatus: 400,
      });
      return NextResponse.json(
        {
          error: "Gecersiz gorsel verisi.",
          details: z.treeifyError(parsedBody.error),
          diagnostics,
        },
        { status: 400 },
      );
    }

    const { imageBase64, mimeType, method, mode, language: outputLocale, companyContext, rowContext } = parsedBody.data;
    const visionModel = mode === "fast" ? getRiskAnalysisFastVisionModel() : getRiskAnalysisVisionModel();

    if (!imageBase64 || !mimeType) {
      const diagnostics = buildAnalyzeRiskDiagnostics({
        ok: false,
        stage: "missing_image_fields",
        startTime: Date.now(),
        visionModel,
        mimeType: mimeType || "unknown",
        imageBase64Length: imageBase64?.length ?? 0,
        httpStatus: 400,
      });
      return NextResponse.json({ error: "imageBase64 ve mimeType gerekli", diagnostics }, { status: 400 });
    }

    const client = getAnthropicClient();
    if (!client) {
      const diagnostics = buildAnalyzeRiskDiagnostics({
        ok: false,
        stage: "missing_anthropic_api_key",
        startTime: Date.now(),
        visionModel,
        mimeType,
        imageBase64Length: imageBase64.length,
        httpStatus: 500,
      });
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY tan\u0131ml\u0131 de\u011Fil", diagnostics },
        { status: 500 },
      );
    }

    const startTime = Date.now();

    const visionStageStatus = "anthropic_only";

    // Firma sektör bağlamı — sektörel checklist için ipucu. Görselle çelişirse
    // model görsele güvenmeli (system prompt bunu söylüyor).
    const companyCtxBlock = (() => {
      if (!companyContext) return "";
      const lines: string[] = [];
      if (companyContext.sector) lines.push(`- Sektör: ${companyContext.sector}`);
      if (companyContext.kind) lines.push(`- Faaliyet türü: ${companyContext.kind}`);
      if (companyContext.hazardClass) lines.push(`- Tehlike sınıfı: ${companyContext.hazardClass}`);
      if (companyContext.name) lines.push(`- Firma: ${companyContext.name}`);
      if (companyContext.address) lines.push(`- Konum: ${companyContext.address}`);
      if (lines.length === 0) return "";
      return [
        "## FİRMA / SEKTÖR BAĞLAMI (görsele ek ipucu)",
        ...lines,
        "",
        "Bu bağlamı sektörel öncelik haritasıyla eşleştir; görselle çelişirse",
        "görsele güven. Sektörün ölümcül risklerini tarama listesine ekle.",
      ].join("\n");
    })();

    const rowCtxBlock = (() => {
      if (!rowContext?.title?.trim() || !rowContext?.description?.trim()) return "";
      return [
        "## RİSK SATIRI BAĞLAMI (kullanıcı tanımlı — değerlendirmede dikkate al)",
        `- Satır başlığı: ${rowContext.title.trim()}`,
        `- Açıklama: ${rowContext.description.trim()}`,
        "",
        "Bu başlık ve açıklama sahada hangi konunun fotoğraflandığını anlatır. Görselle çelişirse",
        "her iki kaynağı birlikte değerlendir; çelişkiyi areaSummary veya önerilerde kısaca belirt.",
      ].join("\n");
    })();

    const riskMemory =
      mode === "fast"
        ? { context: "", memoryIds: [] as string[] }
        : await buildRiskMemoryContext({
            organizationId: auth.organizationId,
            method,
            outputLocale,
            companyContext,
            rowContext,
          });

    const augmentedUserPrompt = [
      companyCtxBlock,
      rowCtxBlock,
      riskMemory.context,
      mode === "fast" ? buildFastUserPrompt(method, outputLocale) : buildUserPrompt(method, outputLocale),
    ]
      .filter(Boolean)
      .join("\n\n");

    const fallbackUserMessage =
      "AI gorsel analizi gecici olarak kullanilamiyor (zaman asimi). Lutfen yeniden baslatin veya manuel risk girisiyle devam edin.";

    let response: Awaited<ReturnType<Anthropic["messages"]["create"]>>;
    try {
      response = await client.messages.create({
        model: visionModel,
        max_tokens: mode === "fast" ? 4096 : 8192,
        temperature: 0.2,
        system: mode === "fast" ? buildFastSystemPrompt(outputLocale, method) : buildSystemPrompt(method, outputLocale),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: augmentedUserPrompt,
              },
            ],
          },
        ],
      });
    } catch (err) {
      const duration = Date.now() - startTime;
      const errMsg = err instanceof Error ? err.message : String(err);
      const isTransientAiFailure =
        /timeout|timed out|overloaded|temporar|socket|network|connection|503|529/i.test(errMsg);
      const diagnostics = buildAnalyzeRiskDiagnostics({
        ok: false,
        stage: isTransientAiFailure ? "anthropic_timeout" : "anthropic_api_error",
        startTime,
        visionModel,
        mimeType,
        imageBase64Length: imageBase64.length,
        err,
        httpStatus: isTransientAiFailure ? 504 : 502,
      });
      await logAiUsage({
        userId: auth.userId,
        organizationId: auth.organizationId,
        model: visionModel,
        endpoint: "/api/analyze-risk",
        success: false,
        metadata: {
          method,
          mode,
          fallback: true,
          fallbackReason: errMsg.slice(0, 300),
          directAnthropic: true,
          diagnosticsStage: diagnostics.stage,
        },
      });

      if (!isTransientAiFailure) {
        return NextResponse.json(
          {
            error: fallbackUserMessage,
            degraded: true,
            retryable: true,
            stage: "anthropic_reasoning",
            diagnostics,
          },
          { status: 502 },
        );
      }

      return NextResponse.json(
        {
          error: fallbackUserMessage,
          analysis_status: "failed",
          image_analysis_status: "failed",
          risk_count: null,
          zero_risk_allowed: false,
          risks: [],
          degraded: true,
          retryable: true,
          stage: "anthropic_timeout",
          durationMs: duration,
          diagnostics,
        },
        { status: 504 },
      );
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      await logAiUsage({
        userId: auth.userId,
        organizationId: auth.organizationId,
        model: visionModel,
        endpoint: "/api/analyze-risk",
        promptTokens: response.usage?.input_tokens ?? 0,
        completionTokens: response.usage?.output_tokens ?? 0,
        cachedTokens: Number(
          (
            response.usage as {
              cache_read_input_tokens?: number;
            } | undefined
          )?.cache_read_input_tokens ?? 0,
        ),
        success: false,
        metadata: { reason: "missing_text_block", method },
      });
      await logErrorEvent({
        level: "error",
        source: "analyze-risk",
        endpoint: "/api/analyze-risk",
        message: "Claude Vision yaniti text blogu icermiyor.",
        context: { method, mimeType },
        userId: auth.userId,
        organizationId: auth.organizationId,
      });
      const diagnostics = buildAnalyzeRiskDiagnostics({
        ok: false,
        stage: "anthropic_empty_response",
        startTime,
        visionModel,
        mimeType,
        imageBase64Length: imageBase64.length,
        httpStatus: 500,
      });
      return NextResponse.json({ error: "AI yan\u0131t vermedi", diagnostics }, { status: 500 });
    }

    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    // Claude bazen token limitinde kesildiğinde yarım JSON dönüyor → JSON.parse
    // throw eder ve 500'e düşerdi. Şimdi graceful: parse fail olursa
    // empty-but-valid response üret, client boş findings'le devam eder.
     
    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      const preview = jsonStr.slice(0, 500);
      const tailPreview = jsonStr.slice(-200);
      console.warn(
        "[analyze-risk] Claude JSON parse failed:",
        parseErr instanceof Error ? parseErr.message : String(parseErr),
        "| preview:", preview,
        "| tail:", tailPreview,
      );
      await logErrorEvent({
        level: "error",
        source: "analyze-risk",
        endpoint: "/api/analyze-risk",
        message: "Claude response JSON parse failed",
        context: {
          method,
          preview: preview.slice(0, 300),
          parseError: parseErr instanceof Error ? parseErr.message : String(parseErr),
          outputTokens: response.usage?.output_tokens ?? 0,
        },
        userId: auth.userId,
        organizationId: auth.organizationId,
      });
      const diagnostics = buildAnalyzeRiskDiagnostics({
        ok: false,
        stage: "anthropic_json_parse_failed",
        startTime,
        visionModel,
        mimeType,
        imageBase64Length: imageBase64.length,
        httpStatus: 502,
      });
      return NextResponse.json(
        {
          error: "Anthropic risk yorumu islenemedi. Lutfen analizi yeniden baslatin.",
          stage: "anthropic_reasoning",
          retryable: true,
          diagnostics,
        },
        { status: 502 },
      );
    }

    const visionValidation = validateVisionResponse(parsed);
    if (!visionValidation.ok) {
      const relevance = parsed.imageRelevance ?? "relevant";
      const isFieldImage =
        relevance === "relevant" || relevance === "irrelevant" || relevance === "not_workplace";
      if (isFieldImage) {
        console.warn("[analyze-risk] Vision validation failed:", visionValidation.error, {
          invalidRiskCount: visionValidation.invalidRiskCount,
        });
        const failDiagnostics = buildAnalyzeRiskDiagnostics({
          ok: false,
          stage: "vision_validation_failed",
          startTime,
          visionModel,
          mimeType,
          imageBase64Length: imageBase64.length,
          httpStatus: 200,
        });
        return NextResponse.json({
          analysis_status: "failed",
          image_analysis_status: "failed",
          risk_count: null,
          zero_risk_allowed: false,
          analysis_error: visionValidation.error ?? "Görsel analizi tamamlanamadı.",
          risks: [],
          faces: parsed.faces ?? [],
          positiveObservations: parsed.positiveObservations ?? [],
          photoQuality: parsed.photoQuality ?? { level: "good", note: "" },
          areaSummary: parsed.areaSummary ?? "",
          personCount: parsed.personCount ?? 0,
          imageRelevance: relevance,
          imageDescription: parsed.imageDescription ?? "",
          method,
          visionModel,
          promptVersion: RISK_ANALYSIS_PROMPT_VERSION,
          degraded: false,
          retryable: true,
          diagnostics: failDiagnostics,
        });
      }
    }
    parsed = visionValidation.parsed;

    const normalizedRawRisks = Array.isArray(parsed.risks) ? parsed.risks : [];

    /**
     * Kritik tetikleyici kategori detektörü.
     *
     * Prompt'taki "GENEL TETİKLEYİCİ KATEGORİLER" listesine paralel
     * server-side guard. Bu kategorilerden birine ait riskler asla
     * "kabul edilebilir" tier'ına düşmez — confidence < 0.70 ise
     * floor 0.75'e yükseltilir, severity en az "high" olur.
     *
     * Sebep: Saha denetiminde LPG, yüksek gerilim, açık makine vb.
     * "kabul edilebilir" değildir — kontrol kanıtı yoksa otomatik aktif risk.
     */
    function isCriticalTriggerCategory(risk: Record<string, any>): boolean {
      const haystack = [
        String(risk.title ?? ""),
        String(risk.category ?? ""),
        String(risk.description ?? ""),
        String(risk.recommendation ?? ""),
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      const triggers = [
        // i) Basınçlı kap / LPG / gaz tüpü
        "lpg", "propan", "bütan", "butan", "asetilen", "oksijen tüp",
        "gaz tüp", "tüp gaz", "basınçlı kap", "manifold", "regülatör",
        "kompresör", "kompresor",
        // ii) Yüksek gerilim / trafo / şalt
        "trafo", "transformatör", "şalt", "salt sahas", "yüksek gerilim",
        "ölüm tehlikesi", "olum tehlikesi", "ark patlama",
        "elektrik kuvvetli akım", "og pano", "ag pano", "izolatör",
        // iii) Yüksekte çalışma
        "yüksekte çalışma", "yuksekte calisma", "iskele", "yaşam hatt",
        "korkuluk eksik", "kenardan düşme", "kenardan dusme",
        // iv) Açıkta dönen makine / kesici
        "koruyucu kapak", "koruma kapağı", "döner aksam", "doner aksam",
        "pres sıkışma", "konveyör", "kesici disk",
        // v) Etiketsiz kimyasal / yanıcı sıvı
        "etiketsiz kimyasal", "yanıcı sıvı", "yanici sivi", "asit kabı", "baz kabı",
        // vi) Kapalı alan
        "kapalı alan", "kapali alan", "tank içi", "kuyu girişi", "silo girişi",
        // vii) Forklift + yaya
        "forklift", "yaya forklift", "trafik ayrımı yok",
        // viii) Yangın çıkış / söndürücü
        "acil çıkış kilitli", "acil cikis kilitli", "söndürücü erişilemez",
        "yangın yolu engelli", "yangin yolu engelli",
      ];

      return triggers.some((t) => haystack.includes(t));
    }

    let acceptableRiskCount = 0;
    let triggerSafeguardCount = 0;

    parsed.risks = normalizedRawRisks.map((rawRisk: Record<string, any>, index: number) => {
      const risk = normalizeSquareAnnotation(rawRisk, index);
      const rawConfidence = Number(risk.confidence ?? 0);

      // SAFEGUARD #1: Tetikleyici kategori riskleri "kabul edilebilir"e düşmez.
      // Confidence floor 0.75, severity en az "high".
      if (isCriticalTriggerCategory(risk)) {
        if (rawConfidence < 0.70) {
          triggerSafeguardCount += 1;
          const promotedSeverity = (risk.severity === "low" || !risk.severity) ? "high" : risk.severity;
          return {
            ...risk,
            confidence: 0.75,
            severity: promotedSeverity,
            correctiveActionRequired: true,
          };
        }
        return risk;
      }

      // SAFEGUARD #2: Standart kabul edilebilir risk yeniden etiketleme.
      if (rawConfidence > ACCEPTABLE_RISK_CONFIDENCE_MAX) {
        return risk;
      }

      acceptableRiskCount += 1;
      return {
        ...risk,
        title: typeof risk.title === "string" && risk.title.toLocaleLowerCase("tr-TR").includes("kabul edilebilir")
          ? risk.title
          : `Kabul edilebilir risk: ${risk.title || "Saha gözlemi"}`,
        category: "Kabul edilebilir risk",
        severity: "low",
        correctiveActionRequired: false,
        recommendation:
          typeof risk.recommendation === "string" && risk.recommendation.trim()
            ? risk.recommendation
            : "Mevcut durumda acil düzeltici faaliyet gerektiren belirgin bir uygunsuzluk görülmedi. Alan rutin saha kontrollerinde izlenmeli ve koşullar değişirse yeniden değerlendirilmelidir. Kabul edilebilir seviyede tutulması için düzen ve temizlik korunmalıdır.",
      };
    });

    if (triggerSafeguardCount > 0) {
      console.log(`[analyze-risk] safeguard: ${triggerSafeguardCount} kritik tetikleyici risk confidence floor 0.75'e yükseltildi`);
    }

    const interpretationModel = getAnthropicModel();
    let interpretationStageStatus: "completed" | "skipped" | "failed" = "skipped";
    let interpretationMemoryMatchCount = 0;
    // Hızlı mod: vision çıktısı yeterli; ikinci Sonnet turu zaman aşımına yol açar.
    if (Array.isArray(parsed.risks) && parsed.risks.length > 0 && mode !== "fast") {
      try {
        const interpretationMemory = await buildRiskMemoryContextFromText({
          organizationId: auth.organizationId,
          method,
          text: [
            parsed.areaSummary,
            parsed.imageDescription,
            buildRiskMemorySignature(parsed.risks),
          ].filter(Boolean).join("\n"),
          similarityThreshold: 0.76,
        });
        interpretationMemoryMatchCount = interpretationMemory.memoryIds.length;

        const interpretation = await enrichRiskInterpretationWithSonnet({
          client,
          model: interpretationModel,
          risks: parsed.risks,
          method,
          outputLocale,
          areaSummary: parsed.areaSummary,
          imageDescription: parsed.imageDescription,
          memoryContext: interpretationMemory.context,
        });
        parsed.risks = interpretation.risks;
        if (interpretation.areaSummary) parsed.areaSummary = interpretation.areaSummary;
        interpretationStageStatus = "completed";

        await logAiUsage({
          userId: auth.userId,
          organizationId: auth.organizationId,
          model: interpretationModel,
          endpoint: "/api/analyze-risk:interpretation",
          promptTokens: interpretation.usage?.input_tokens ?? 0,
          completionTokens: interpretation.usage?.output_tokens ?? 0,
          cachedTokens: Number(
            (
              interpretation.usage as {
                cache_read_input_tokens?: number;
              } | undefined
            )?.cache_read_input_tokens ?? 0,
          ),
          success: true,
          metadata: {
            method,
            sourceModel: visionModel,
            riskCount: parsed.risks.length,
            memoryMatches: interpretationMemoryMatchCount,
          },
        });
      } catch (interpretationError) {
        interpretationStageStatus = "failed";
        console.warn(
          "[analyze-risk] Sonnet interpretation failed; keeping Opus detection output:",
          interpretationError instanceof Error ? interpretationError.message : String(interpretationError),
        );
        await logAiUsage({
          userId: auth.userId,
          organizationId: auth.organizationId,
          model: interpretationModel,
          endpoint: "/api/analyze-risk:interpretation",
          success: false,
          metadata: {
            method,
            sourceModel: visionModel,
            error: interpretationError instanceof Error
              ? interpretationError.message.slice(0, 300)
              : String(interpretationError).slice(0, 300),
          },
        });
      }
    }

    if (mode !== "fast") {
      try {
        const ragService = createServiceClient();
        parsed.risks = await enrichRisksWithLegalRag(
          ragService,
          Array.isArray(parsed.risks) ? parsed.risks : [],
          auth.organizationId,
        );
      } catch (ragError) {
        console.warn(
          "[analyze-risk] legal RAG enrichment skipped:",
          ragError instanceof Error ? ragError.message : String(ragError),
        );
      }
    }

    // Debug log
    console.log("\\n========================================");
    console.log("\uD83D\uDDBC\uFE0F  YEN\u0130 G\u00D6RSEL ANAL\u0130Z\u0130 (v1.8)");
    console.log("========================================");
    console.log("Method:", method);
    console.log("Image Relevance:", parsed.imageRelevance);
    console.log("Image Description:", parsed.imageDescription);
    console.log("Person Count:", parsed.personCount);
    console.log("Photo Quality:", parsed.photoQuality?.level);
    console.log("Toplam tespit:", parsed.risks?.length || 0);
    console.log("Kabul edilebilir risk:", acceptableRiskCount, `(confidence <= ${ACCEPTABLE_RISK_CONFIDENCE_MAX})`);
    console.log("Olumlu tespitler:", parsed.positiveObservations?.length || 0);
    console.log("----------------------------------------");
    if (parsed.risks && parsed.risks.length > 0) {
       
      parsed.risks.forEach((risk: any, idx: number) => {
        console.log(`${idx + 1}. ${risk.title}`);
        console.log(`   Confidence: ${risk.confidence} | Category: ${risk.category} | Severity: ${risk.severity}`);
      });
    } else {
      console.log("Risk tespit edilmedi (bos liste)");
    }
    if (parsed.positiveObservations?.length > 0) {
      console.log("--- Olumlu Tespitler ---");
       
      parsed.positiveObservations.forEach((obs: any) => {
        console.log(`  + ${obs}`);
      });
    }
    console.log("========================================\n");

    const duration = Date.now() - startTime;
    await logAiUsage({
      userId: auth.userId,
      organizationId: auth.organizationId,
      model: visionModel,
      endpoint: "/api/analyze-risk",
      promptTokens: response.usage?.input_tokens ?? 0,
      completionTokens: response.usage?.output_tokens ?? 0,
      cachedTokens: Number(
        (
          response.usage as {
            cache_read_input_tokens?: number;
          } | undefined
        )?.cache_read_input_tokens ?? 0,
      ),
      success: true,
      metadata: {
        method,
        visionModel,
        durationMs: duration,
        personCount: parsed.personCount ?? 0,
        riskCount: Array.isArray(parsed.risks) ? parsed.risks.length : 0,
        acceptableRiskCount,
        acceptableRiskConfidenceMax: ACCEPTABLE_RISK_CONFIDENCE_MAX,
        actionableRiskConfidenceMin: ACTIONABLE_RISK_CONFIDENCE_MIN,
        visionProvider: "anthropic_only",
        interpretationModel,
        interpretationStageStatus,
        memoryMatches: riskMemory.memoryIds.length,
        interpretationMemoryMatches: interpretationMemoryMatchCount,
      },
    });

    if (mode !== "fast") {
      void storeRiskMemory({
        userId: auth.userId,
        organizationId: auth.organizationId,
        method,
        outputLocale,
        sourceModel: visionModel,
        interpretationModel,
        parsed,
      });
    }

    const successDiagnostics = buildAnalyzeRiskDiagnostics({
      ok: true,
      stage: "completed",
      startTime,
      visionModel,
      mimeType,
      imageBase64Length: imageBase64.length,
      httpStatus: 200,
    });

    const riskList = Array.isArray(parsed.risks) ? parsed.risks : [];
    const imageAnalysisStatus =
      typeof parsed.image_analysis_status === "string"
        ? parsed.image_analysis_status
        : typeof parsed.preAnalysis?.image_analysis_status === "string"
          ? parsed.preAnalysis.image_analysis_status
          : "success";

    return NextResponse.json({
      analysis_status: "success",
      image_analysis_status: imageAnalysisStatus,
      risk_count: riskList.length,
      zero_risk_allowed: parsed.zero_risk_allowed === true,
      preAnalysis: parsed.preAnalysis ?? null,
      checklist_notlari: parsed.checklist_notlari ?? null,
      dokuman_kontrol_maddeleri: parsed.dokuman_kontrol_maddeleri ?? [],
      risks: riskList,
      faces: parsed.faces ?? [],
      positiveObservations: parsed.positiveObservations ?? [],
      photoQuality: parsed.photoQuality ?? { level: "good", note: "" },
      areaSummary: parsed.areaSummary ?? "",
      personCount: parsed.personCount ?? 0,
      imageRelevance: parsed.imageRelevance ?? "relevant",
      imageDescription: parsed.imageDescription ?? "",
      method,
      visionModel,
      promptVersion: RISK_ANALYSIS_PROMPT_VERSION,
      degraded: false,
      durationMs: duration,
      tokensInput: response.usage?.input_tokens ?? 0,
      tokensOutput: response.usage?.output_tokens ?? 0,
      visionStage: null,
      visionStageStatus,
      interpretationModel,
      interpretationStageStatus,
      diagnostics: successDiagnostics,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    const stack = error instanceof Error ? error.stack : "";
    console.error("Risk analizi API hatas\u0131:", message, stack);
    await logAiUsage({
      userId: auth.userId,
      organizationId: auth.organizationId,
      model: getRiskAnalysisVisionModel(),
      endpoint: "/api/analyze-risk",
      success: false,
      metadata: { error: message.slice(0, 300) },
    });
    await logErrorEvent({
      level: "error",
      source: "analyze-risk",
      endpoint: "/api/analyze-risk",
      message,
      stackTrace: stack || null,
      context: { feature: "image_risk_analysis" },
      userId: auth.userId,
      organizationId: auth.organizationId,
    });
    await logSecurityEvent(request, "ai.analyze_risk.failed", {
      severity: "warning",
      userId: auth.userId,
      organizationId: auth.organizationId,
      details: {
        message: message.slice(0, 300),
      },
    });
    const diagnostics = buildAnalyzeRiskDiagnostics({
      ok: false,
      stage: "unhandled_server_exception",
      startTime: Date.now(),
      visionModel: getRiskAnalysisVisionModel(),
      mimeType: "unknown",
      imageBase64Length: 0,
      err: error,
      httpStatus: 500,
    });
    return NextResponse.json(
      { error: message, detail: stack?.slice(0, 500), diagnostics },
      { status: 500 },
    );
  }
}
