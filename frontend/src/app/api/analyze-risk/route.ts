import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { logAiUsage, logErrorEvent } from "@/lib/admin-observability/server";
import { consumeEntitlement } from "@/lib/billing/entitlements";
import { requireAuth } from "@/lib/supabase/api-auth";
import {
  enforceRateLimit,
  logSecurityEvent,
  resolveAiDailyLimit,
} from "@/lib/security/server";
import { executeWithResilience } from "@/lib/self-healing/resilience";
import { getAnthropicKey, getRiskAnalysisVisionModel } from "@/lib/ai/provider-keys";
import {
  buildFastSystemPrompt,
  buildFastUserPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  RISK_ANALYSIS_PROMPT_VERSION,
} from "@/lib/ai/analyze-risk-prompts";

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
  const apiKey = getAnthropicKey();
  if (!apiKey) return null;
  anthropicClient ??= new Anthropic({
    apiKey,
    // Varsayılan 10 dk; resilience ile uyumlu üst sınır (LLM bekleme süresi).
    timeout: 170_000,
    maxRetries: 1,
  });
  return anthropicClient;
}

// Görsel + JSON çıktısı üretimde 60–120 sn sürebilir; iç zamanlayıcı (resilience) bundan kısa olmamalı.
// Vercel Project Settings → Functions → Max Duration bu değere yakın olmalı (ör. 180 sn).
export const maxDuration = 180;

/** Tek Anthropic çağrısı için üst süre (ms). SDK varsayılanı 10 dk; darboğaz bizim wrap. Ortamdan sıkılabilir. */
function getRiskAnalysisOperationTimeoutMs(): number {
  const raw = process.env.RISK_ANALYSIS_OPERATION_TIMEOUT_MS?.trim();
  if (raw && /^\d+$/.test(raw)) {
    const n = Number(raw);
    if (n >= 30_000 && n <= 170_000) return n;
  }
  return 160_000;
}

// Daha agresif tespit için threshold'lar gevşetildi (kullanıcı geri bildirimi:
// AI gerçek tehlikeleri "düşük confidence" diye susturmuştu).
// Halüsinasyon değil, eksik tespit asıl sorundur.
const ACCEPTABLE_RISK_CONFIDENCE_MAX = 0.40; // 0.59 → 0.40: daha az risk "kabul edilebilir"e düşer
const ACTIONABLE_RISK_CONFIDENCE_MIN = 0.55; // 0.70 → 0.55: daha geniş "aksiyon gerekli" aralığı

const analyzeRiskSchema = z.object({
  imageBase64: z.string().min(100).max(20_000_000),
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
  return o;
}

/* ================================================================== */
/* API handler                                                         */
/* ================================================================== */

export async function POST(request: NextRequest) {
  // GÜVENLİK: requireAuth + günlük rate limit + risk_analysis kotası.
  // Hız odaklı varsayılan: Claude 3.5 Haiku vision (RISK_ANALYSIS_ANTHROPIC_MODEL ile değiştirilebilir).
  // OpenAI yardımcı gözlem aşaması sadece RISK_ANALYSIS_OPENAI_HELPER=true ise çalışır.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const visionModel = getRiskAnalysisVisionModel();
    const plan = await resolveAiDailyLimit(auth.userId);
    const rateLimitResponse = await enforceRateLimit(request, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      endpoint: "/api/analyze-risk",
      scope: "ai",
      limit: plan.dailyLimit,
      windowSeconds: 24 * 60 * 60,
      planKey: plan.planKey,
      metadata: { feature: "analyze_risk" },
    });
    if (rateLimitResponse) return rateLimitResponse;

    const rawBody = await request.json().catch(() => null);
    const parsedBody = analyzeRiskSchema.safeParse(normalizeAnalyzeRiskPayload(rawBody));
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Gecersiz gorsel verisi.",
          details: z.treeifyError(parsedBody.error),
        },
        { status: 400 },
      );
    }

    const { imageBase64, mimeType, method, mode, language: outputLocale, companyContext } = parsedBody.data;

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: "imageBase64 ve mimeType gerekli" }, { status: 400 });
    }

    const entitlementResponse = await consumeEntitlement(auth, "risk_analysis");
    if (entitlementResponse) return entitlementResponse;

    const client = getAnthropicClient();
    if (!client) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY tan\u0131ml\u0131 de\u011Fil" }, { status: 500 });
    }

    const startTime = Date.now();

    // ═══════════════════════════════════════════════════════════════════
    // OPTIONAL STAGE 1 — OpenAI gpt-4o Vision: TARAFSIZ SAHNE / NESNE GÖZLEMİ
    // ═══════════════════════════════════════════════════════════════════
    // OpenAI bu akışta risk kararı vermez; yalnızca nötr sahne/nesne gözlemi
    // üretir. Nihai risk tespitini Anthropic, aynı görsele doğrudan bakarak
    // yapar. OpenAI notları sadece KKD/konum gibi halüsinasyonları azaltan
    // yardımcı bağlamdır.
    //
    // Analiz süresini kısaltmak için varsayılan kapalıdır. Gerektiğinde
    // RISK_ANALYSIS_OPENAI_HELPER=true ile tekrar yardımcı gözlem moduna alınır.
    const visionStageStatus = "anthropic_only";

    // Claude'a verilecek yardımcı kontekst (varsa); yoksa boş string → eski davranış.
    // Bu blok risk listesi değildir; Claude nihai kararı doğrudan görselden verir.
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

    const augmentedUserPrompt = [
      companyCtxBlock,
      mode === "fast" ? buildFastUserPrompt(method, outputLocale) : buildUserPrompt(method, outputLocale),
    ]
      .filter(Boolean)
      .join("\n\n");

    // ═══════════════════════════════════════════════════════════════════
    // STAGE 2 — Anthropic Claude Sonnet 4: DOĞRUDAN GÖRSEL ÜZERİNDEN RİSK TESPİTİ
    // ═══════════════════════════════════════════════════════════════════
    // Aynı görsel Claude'a da verilir. Risk listesi, skorlar ve öneriler
    // Claude'un doğrudan görsel incelemesiyle üretilir; OpenAI sadece yardımcı
    // gözlem bağlamıdır.
    // Bir Anthropic çağrısı çoğu zaman 40–120 sn sürer. İki kez 65 sn denemek hem UX kötü
    // hem de ikinci denemede yine kesilebiliyor. Tek deneme + uzun süre (SDK zaten 10 dk).
    // retryDelaysMs uzunluğu 1 = tek deneme (executeWithResilience döngüsü).
    const operationTimeoutMs =
      mode === "fast"
        ? Math.min(getRiskAnalysisOperationTimeoutMs(), 120_000)
        : getRiskAnalysisOperationTimeoutMs();
    const resilientResponse = await executeWithResilience({
      serviceKey: mode === "fast" ? "anthropic.risk_analysis.fast_v3" : "anthropic.risk_analysis.fast_v2",
      displayName: "Anthropic API",
      serviceType: "external_api",
      operationName: "risk_image_analysis",
      endpoint: request.nextUrl.pathname,
      userId: auth.userId,
      organizationId: auth.organizationId,
      timeoutMs: operationTimeoutMs,
      retryDelaysMs: [4000],
      openAfterFailures: 8,
      cooldownSeconds: 60,
      fallbackMessage:
        "AI gorsel analizi gecici olarak kullanilamiyor (zaman asimi). Lutfen yeniden baslatin veya manuel risk girisiyle devam edin.",
      operation: () =>
        client.messages.create({
          model: visionModel,
          // Haiku varsayılan (hız); RISK_ANALYSIS_ANTHROPIC_MODEL ile Sonnet seçilebilir.
          max_tokens: mode === "fast" ? 1400 : 2400,
          temperature: 0.2,
          system: mode === "fast" ? buildFastSystemPrompt(outputLocale) : buildSystemPrompt(method, outputLocale),
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
        }),
    });

    if (!resilientResponse.ok) {
      const duration = Date.now() - startTime;
      const isTransientAiFailure =
        /timeout|timed out|overloaded|temporar|socket|network|connection|503|529/i.test(resilientResponse.error);
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
          fallbackReason: resilientResponse.error.slice(0, 300),
          queueTaskId: resilientResponse.queuedTaskId ?? null,
        },
      });

      if (!isTransientAiFailure) {
        return NextResponse.json(
          {
            error: resilientResponse.fallbackMessage,
            degraded: true,
            retryable: true,
            stage: "anthropic_reasoning",
            queueTaskId: resilientResponse.queuedTaskId ?? null,
          },
          { status: 502 },
        );
      }

      const contextSummary = [
        companyContext?.sector ? `Sektor: ${companyContext.sector}` : null,
        companyContext?.kind ? `Faaliyet turu: ${companyContext.kind}` : null,
        companyContext?.hazardClass ? `Tehlike sinifi: ${companyContext.hazardClass}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
      const timeoutFallbackParsed = {
        imageDescription:
          "AI gorsel analizi zaman asimina ugradigi icin gorsel aciklamasi otomatik uretilemedi.",
        areaSummary:
          contextSummary ||
          "AI zaman asimi nedeniyle saha ozeti otomatik uretilemedi; on risk envanteri manuel dogrulama gerektirir.",
        photoQuality: {
          level: "moderate",
          note: "AI zaman asimi nedeniyle on risk envanteri manuel dogrulama gerektirir.",
        },
      };

      return NextResponse.json({
        risks: buildFallbackRisksForEmptyFieldReview(timeoutFallbackParsed),
        faces: [],
        positiveObservations: [],
        photoQuality: timeoutFallbackParsed.photoQuality,
        areaSummary: timeoutFallbackParsed.areaSummary,
        personCount: 0,
        imageRelevance: "relevant",
        imageDescription: timeoutFallbackParsed.imageDescription,
        method,
        mode,
        visionModel,
        promptVersion: RISK_ANALYSIS_PROMPT_VERSION,
        degraded: true,
        durationMs: duration,
        tokensInput: 0,
        tokensOutput: 0,
        visionStage: null,
        visionStageStatus,
        queueTaskId: resilientResponse.queuedTaskId ?? null,
        fallback: {
          type: "ai_timeout_degraded",
          label: "On risk envanteri manuel dogrulama gerektirir",
        },
      });
    }

    const response = resilientResponse.data;

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
      return NextResponse.json({ error: "AI yan\u0131t vermedi" }, { status: 500 });
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
      return NextResponse.json(
        {
          error: "Anthropic risk yorumu islenemedi. Lutfen analizi yeniden baslatin.",
          stage: "anthropic_reasoning",
          retryable: true,
        },
        { status: 502 },
      );
    }

    const rawRisks = Array.isArray(parsed.risks) ? parsed.risks : [];
    if (rawRisks.length === 0 && (parsed.imageRelevance ?? "relevant") === "relevant") {
      parsed.risks = buildFallbackRisksForEmptyFieldReview(parsed);
      console.warn("[analyze-risk] Claude returned empty risks for relevant field image; generated fallback risk inventory.", {
        promptVersion: RISK_ANALYSIS_PROMPT_VERSION,
        imageDescription: parsed.imageDescription,
        areaSummary: parsed.areaSummary,
        fallbackRiskCount: parsed.risks.length,
      });
    }

    const normalizedRawRisks = Array.isArray(parsed.risks) ? parsed.risks : rawRisks;

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

    parsed.risks = normalizedRawRisks.map((risk: Record<string, any>) => {
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

    // Not: Boş risks: [] durumu için zaten yukarıda
    // buildFallbackRisksForEmptyFieldReview() çağrılıyor (satır ~1686).
    // Burada ek fallback guard'a gerek yok — çift fallback parse karışıklığı
    // yaratıyordu (kullanıcı raporu: "AI analizi tamamlanamadı").

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
      },
    });

    return NextResponse.json({
      risks: parsed.risks ?? [],
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
      degraded: resilientResponse.degraded,
      durationMs: duration,
      tokensInput: response.usage?.input_tokens ?? 0,
      tokensOutput: response.usage?.output_tokens ?? 0,
      visionStage: null,
      visionStageStatus,
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
    return NextResponse.json({ error: message, detail: stack?.slice(0, 500) }, { status: 500 });
  }
}
