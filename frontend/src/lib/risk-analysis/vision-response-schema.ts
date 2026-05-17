/**
 * Görsel risk analizi — AI JSON yanıt doğrulama.
 */

import { z } from "zod";

const visionRiskSchema = z.object({
  title: z.string().min(3).max(500),
  category: z.string().min(1).max(120),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  confidence: z.number().min(0).max(1).optional(),
  recommendation: z.string().optional(),
  correctiveActionRequired: z.boolean().optional(),
  pinX: z.number().optional(),
  pinY: z.number().optional(),
  boxX: z.number().optional(),
  boxY: z.number().optional(),
  boxW: z.number().optional(),
  boxH: z.number().optional(),
  risk_id: z.string().optional(),
});

const visionResponseSchema = z.object({
  analysis_status: z.enum(["success", "failed"]).optional(),
  analysis_error: z.string().optional(),
  imageRelevance: z.enum(["relevant", "irrelevant", "not_real_photo", "not_workplace"]).optional(),
  imageDescription: z.string().optional(),
  areaSummary: z.string().optional(),
  personCount: z.number().optional(),
  risks: z.array(z.unknown()).optional(),
});

const SYNTHETIC_RISK_TITLE =
  /(?:ai\s*yanit|timeout|analiz\s*tamamlanamad|saha\s*risk\s*envanteri\s*gerekli)/i;

export function isValidVisionRisk(raw: unknown): raw is Record<string, unknown> {
  const parsed = visionRiskSchema.safeParse(raw);
  if (!parsed.success) return false;
  const title = String(parsed.data.title ?? "");
  if (SYNTHETIC_RISK_TITLE.test(title)) return false;
  return true;
}

export function filterValidVisionRisks(risks: unknown[]): Record<string, unknown>[] {
  return risks.filter((r): r is Record<string, unknown> => isValidVisionRisk(r));
}

export type VisionValidationResult = {
  ok: boolean;
  parsed: Record<string, any>;
  error?: string;
  invalidRiskCount: number;
};

export function validateVisionResponse(parsed: Record<string, any>): VisionValidationResult {
  const shell = visionResponseSchema.safeParse(parsed);
  if (!shell.success) {
    return {
      ok: false,
      parsed,
      error: "AI yanıtı beklenen JSON şemasına uymuyor.",
      invalidRiskCount: 0,
    };
  }

  if (parsed.analysis_status === "failed") {
    return {
      ok: false,
      parsed,
      error: typeof parsed.analysis_error === "string" ? parsed.analysis_error : "Görsel analizi başarısız.",
      invalidRiskCount: 0,
    };
  }

  const rawRisks = Array.isArray(parsed.risks) ? parsed.risks : [];
  const validRisks = filterValidVisionRisks(rawRisks);
  const invalidRiskCount = rawRisks.length - validRisks.length;

  parsed.risks = validRisks;

  const relevance = parsed.imageRelevance ?? "relevant";

  if (relevance === "not_real_photo") {
    parsed.risks = [];
    return { ok: true, parsed, invalidRiskCount };
  }

  const requiresRisks =
    relevance === "relevant" || relevance === "irrelevant" || relevance === "not_workplace";

  if (requiresRisks && validRisks.length === 0) {
    return {
      ok: false,
      parsed,
      error: "Geçerli risk kaydı üretilemedi; manuel doğrulama veya yeniden analiz gerekli.",
      invalidRiskCount,
    };
  }

  return { ok: true, parsed, invalidRiskCount };
}
