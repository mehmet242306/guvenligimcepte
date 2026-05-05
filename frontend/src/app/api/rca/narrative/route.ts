/**
 * POST /api/rca/narrative
 *
 * R₂D-RCA hesaplama sonucuna göre Claude AI ile yerelleştirilmiş değerlendirme + aksiyon üretir.
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { consumeEntitlement } from "@/lib/billing/entitlements";
import { requireAuth } from "@/lib/supabase/api-auth";
import { enforceRateLimit } from "@/lib/security/server";
import {
  buildRcaNarrativeSystemPrompt,
  buildRcaNarrativeUserPrompt,
  normalizeR2dIncidentAiLocale,
} from "@/lib/prompts/r2d-rca-incident-ai-locale";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1500;

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY tanımlı değil" }, { status: 500 });
    }

    const rateLimited = await enforceRateLimit(request, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      endpoint: "/api/rca/narrative",
      scope: "ai",
      limit: 10,
      windowSeconds: 60,
      planKey: "incident_ai",
    });
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const {
      t0 = [], t1 = [], deltaHat = [],
      rRcaScore = 0, calculationMode = "base_score",
      overrideTriggered = false, dualReportingRequired = false,
      maxDeltaHatIndex = 0, maxWeightedIndex = 0,
      incidentTitle = "", incidentDescription = "",
      locale: localeRaw,
    } = body ?? {};
    const aiLocale = normalizeR2dIncidentAiLocale(typeof localeRaw === "string" ? localeRaw : undefined);
    const entitlementResponse = await consumeEntitlement(auth, "incident_analysis");
    if (entitlementResponse) return entitlementResponse;

    const userPrompt = buildRcaNarrativeUserPrompt(aiLocale, {
      incidentTitle,
      incidentDescription,
      t0,
      t1,
      deltaHat,
      rRcaScore,
      calculationMode,
      overrideTriggered,
      dualReportingRequired,
      maxDeltaHatIndex,
      maxWeightedIndex,
    });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildRcaNarrativeSystemPrompt(aiLocale),
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content.find((c) => c.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ error: "AI boş yanıt" }, { status: 502 });
    }

    // JSON parse
    const match = text.text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: "Geçerli JSON bulunamadı", raw: text.text }, { status: 502 });
    }

    try {
      const parsed = JSON.parse(match[0]);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ error: "JSON parse hatası", raw: text.text }, { status: 502 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Beklenmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
