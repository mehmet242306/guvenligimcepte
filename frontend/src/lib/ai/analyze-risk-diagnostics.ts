/**
 * `/api/analyze-risk` için operasyon teşhisi — kullanıcıya sorunun kaynağını göstermek için.
 * API anahtarı veya ham JWT içermez.
 */

export const ANALYZE_RISK_ROUTE_MAX_DURATION_SEC = 300;

export type AnalyzeRiskDiagnostics = {
  version: 1;
  ok: boolean;
  /** İş akışı adımı */
  stage: string;
  /** İstek başından bu ana kadar geçen süre (ms) */
  durationMs?: number;
  /** Anthropic model id */
  model?: string;
  /** Next.js route segment `maxDuration` (saniye) */
  routeMaxDurationSec: number;
  /** Anthropic SDK `timeout` (ms) — route ile uyumlu */
  anthropicSdkTimeoutMs?: number;
  mimeType?: string;
  /** Base64 string uzunluğu (karakter) */
  imageBase64Chars?: number;
  /** Yaklaşık çözülmüş görsel boyutu (MB) */
  approximateImageMb?: number;
  /** Sağlayıcı hata metni (kısaltılmış) */
  providerMessage?: string;
  /** Anthropic HTTP status (varsa) */
  providerStatus?: number;
  /** API error.type veya benzeri */
  providerErrorType?: string;
  /** İstemci HTTP durumu (proxy/Vercel) */
  httpStatus?: number;
  /** Türkçe özet: muhtemel kök neden */
  likelyCauseTr: string;
  /** Ne kontrol edilmeli */
  checklistTr: string[];
};

function estimateMbFromBase64Chars(chars: number): number {
  return Math.round(((chars * 3) / 4 / 1e6) * 100) / 100;
}

export function extractAnthropicStyleError(err: unknown): {
  message: string;
  status?: number;
  type?: string;
} {
  if (err == null) return { message: "" };
  if (typeof err === "string") return { message: err.slice(0, 800) };
  if (typeof err !== "object") return { message: String(err).slice(0, 800) };

  const e = err as Record<string, unknown>;
  const msg =
    typeof e.message === "string"
      ? e.message
      : typeof e.msg === "string"
        ? e.msg
        : "";
  const status = typeof e.status === "number" ? e.status : undefined;
  let type: string | undefined;
  const nested = e.error;
  if (nested && typeof nested === "object") {
    const ne = nested as Record<string, unknown>;
    if (typeof ne.type === "string") type = ne.type;
  }
  if (!type && typeof e.type === "string") type = e.type as string;
  return {
    message: (msg || JSON.stringify(err).slice(0, 400)).slice(0, 800),
    status,
    type,
  };
}

function classifyRootCause(input: {
  providerMessage: string;
  durationMs: number;
  routeMaxDurationSec: number;
  anthropicSdkTimeoutMs: number;
}): { likelyCauseTr: string; checklistTr: string[] } {
  const m = input.providerMessage.toLowerCase();
  const dur = input.durationMs;

  if (/429|rate_limit|too many requests/.test(m)) {
    return {
      likelyCauseTr:
        "Anthropic tarafında istek hızı veya kota sınırına takılma (HTTP 429 veya rate limit).",
      checklistTr: [
        "Anthropic konsolunda kullanım/kota ve faturalandırma durumunu kontrol edin.",
        "Aynı anda çok fazla analiz tetiklenmiyorsa bir süre bekleyip tekrar deneyin.",
      ],
    };
  }

  if (/401|403|api[_ ]?key|authentication|permission/.test(m)) {
    return {
      likelyCauseTr: "API anahtarı geçersiz, iptal edilmiş veya yetkisiz.",
      checklistTr: [
        "Vercel ortamında ANTHROPIC_API_KEY / alternatif env değişkenlerini doğrulayın.",
        "Anahtarın Anthropic projesinde aktif olduğundan emin olun.",
      ],
    };
  }

  if (/timeout|timed out|etimedout|deadline|abort|socket/.test(m) || dur >= input.anthropicSdkTimeoutMs - 2000) {
    const nearWall = dur >= (input.routeMaxDurationSec - 15) * 1000;
    return {
      likelyCauseTr: nearWall
        ? `İşlem ~${Math.round(dur / 1000)} sn sürdü; Vercel sunucu fonksiyonu veya Anthropic SDK üst süresi (${Math.round(input.anthropicSdkTimeoutMs / 1000)} sn) dolmuş olabilir.`
        : "Ağ veya Anthropic yanıt süresi aşıldı (timeout).",
      checklistTr: [
        `Vercel → Project → Functions: bu route için Max Duration en az ${input.routeMaxDurationSec} sn olmalı (Pro plan gerekebilir).`,
        "Çok büyük görsel gönderiyorsanız boyutu düşürün veya çözünürlüğü azaltın.",
        "RISK_ANALYSIS_ANTHROPIC_MODEL ile daha hızlı bir vision model deneyin.",
      ],
    };
  }

  if (/503|529|overloaded|capacity|unavailable/.test(m)) {
    return {
      likelyCauseTr: "Anthropic servisi geçici olarak yoğun veya bakımda.",
      checklistTr: ["Birkaç dakika sonra yeniden deneyin.", "status.anthropic.com veya sağlayıcı durum sayfasına bakın."],
    };
  }

  if (/413|payload|too large|request entity/.test(m)) {
    return {
      likelyCauseTr: "İstek gövdesi barındırıcı veya API tarafında çok büyük.",
      checklistTr: ["Görsel dosya boyutunu küçültün.", "Vercel body size limitini kontrol edin."],
    };
  }

  return {
    likelyCauseTr:
      dur > (input.routeMaxDurationSec - 30) * 1000
        ? `İşlem ${Math.round(dur / 1000)} sn sürdü; çoğu zaman sunucu veya sağlayıcı süre sınırı.`
        : "Bilinmeyen veya özel bir API hatası.",
    checklistTr: [
      "Tarayıcı konsolunda Network sekmesinde /api/analyze-risk yanıt gövdesindeki diagnostics objesini inceleyin.",
      "Sunucu loglarında [analyze-risk] satırlarına bakın.",
    ],
  };
}

export function buildAnalyzeRiskDiagnostics(input: {
  ok: boolean;
  stage: string;
  startTime: number;
  visionModel: string;
  mimeType: string;
  imageBase64Length: number;
  err?: unknown;
  httpStatus?: number;
}): AnalyzeRiskDiagnostics {
  const durationMs = Date.now() - input.startTime;
  const routeMaxDurationSec = ANALYZE_RISK_ROUTE_MAX_DURATION_SEC;
  const anthropicSdkTimeoutMs = Math.min(600_000, routeMaxDurationSec * 1000 - 5_000);
  const prov = input.err ? extractAnthropicStyleError(input.err) : { message: "", status: undefined, type: undefined };
  const approximateImageMb = estimateMbFromBase64Chars(input.imageBase64Length);

  const { likelyCauseTr, checklistTr } = classifyRootCause({
    providerMessage: prov.message,
    durationMs,
    routeMaxDurationSec,
    anthropicSdkTimeoutMs,
  });

  return {
    version: 1,
    ok: input.ok,
    stage: input.stage,
    durationMs,
    model: input.visionModel,
    routeMaxDurationSec,
    anthropicSdkTimeoutMs,
    mimeType: input.mimeType,
    imageBase64Chars: input.imageBase64Length,
    approximateImageMb,
    providerMessage: prov.message ? prov.message.slice(0, 600) : undefined,
    providerStatus: prov.status,
    providerErrorType: prov.type,
    httpStatus: input.httpStatus,
    likelyCauseTr,
    checklistTr,
  };
}

/** UI / panoya kopyalanabilir düz metin */
/** API'den gelen `diagnostics` gövdesini güvenli şekilde parse eder */
export function parseAnalyzeRiskDiagnosticsFromApi(input: unknown): AnalyzeRiskDiagnostics | undefined {
  if (input == null || typeof input !== "object") return undefined;
  const d = input as Record<string, unknown>;
  if (d.version !== 1) return undefined;
  if (typeof d.ok !== "boolean") return undefined;
  if (typeof d.stage !== "string") return undefined;
  if (typeof d.routeMaxDurationSec !== "number") return undefined;
  if (typeof d.likelyCauseTr !== "string") return undefined;
  if (!Array.isArray(d.checklistTr) || !d.checklistTr.every((x) => typeof x === "string")) return undefined;
  return input as AnalyzeRiskDiagnostics;
}

export function formatDiagnosticsPlainTr(d: AnalyzeRiskDiagnostics): string {
  const lines = [
    "--- RiskNova AI görsel analiz teşhisi ---",
    `Durum: ${d.ok ? "Başarılı" : "Başarısız"}`,
    `Aşama: ${d.stage}`,
    typeof d.durationMs === "number" ? `Süre: ${d.durationMs} ms (~${(d.durationMs / 1000).toFixed(1)} sn)` : "",
    d.model ? `Model: ${d.model}` : "",
    `Route max süre (sunucu): ${d.routeMaxDurationSec} sn`,
    typeof d.anthropicSdkTimeoutMs === "number"
      ? `Anthropic SDK timeout: ${d.anthropicSdkTimeoutMs} ms`
      : "",
    typeof d.approximateImageMb === "number"
      ? `Görsel (yaklaşık): ~${d.approximateImageMb} MB · base64 uzunluk: ${d.imageBase64Chars ?? "?"} karakter`
      : "",
    d.mimeType ? `MIME: ${d.mimeType}` : "",
    typeof d.httpStatus === "number" ? `HTTP: ${d.httpStatus}` : "",
    d.providerStatus ? `Sağlayıcı HTTP: ${d.providerStatus}` : "",
    d.providerErrorType ? `Hata tipi: ${d.providerErrorType}` : "",
    d.providerMessage ? `Sağlayıcı mesajı: ${d.providerMessage}` : "",
    "",
    "Muhtemel neden:",
    d.likelyCauseTr,
    "",
    "Kontrol listesi:",
    ...d.checklistTr.map((c) => `• ${c}`),
  ];
  return lines.filter(Boolean).join("\n");
}
