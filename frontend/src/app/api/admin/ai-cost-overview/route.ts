import { NextRequest, NextResponse } from "next/server";
import {
  AI_COST_POLICY_ROWS,
  AI_COST_POLICY_VERSION,
  AI_RESILIENCE_NOTE_TR,
  getAiMonthlyLimitsSnapshot,
} from "@/lib/ai/cost-policy";
import { getAnthropicKey, getOpenAIKey } from "@/lib/ai/provider-keys";
import { requirePermission } from "@/lib/supabase/api-auth";

/**
 * Ayarlar → AI kullanımı sekmesi: politika özeti ve üretim anahtarlarının *yapılandırılıp yapılandırılmadığı*.
 * Anahtar değerleri asla dönmez.
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "admin.ai_usage.view");
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    policyVersion: AI_COST_POLICY_VERSION,
    providers: {
      openai: { configured: Boolean(getOpenAIKey()) },
      anthropic: { configured: Boolean(getAnthropicKey()) },
    },
    policyRows: AI_COST_POLICY_ROWS,
    monthlyLimits: getAiMonthlyLimitsSnapshot(),
    resilienceNoteTr: AI_RESILIENCE_NOTE_TR,
    costEstimateDisclaimerTr:
      "Gösterilen maliyetler ai_usage_logs üzerinden tahminidir; kesin ücret OpenAI ve Anthropic faturalarıyla doğrulanmalıdır.",
  });
}
