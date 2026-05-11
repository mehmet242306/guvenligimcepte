import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient, parseJsonBody } from "@/lib/security/server";
import { validateSurveyTokenWithServiceRole } from "@/lib/supabase/survey-public-server";

// POST /api/survey/public/session
// Token ile anket oturumu başlatır (service role). Public sayfa doğrudan Supabase anon
// anahtarıyla survey_tokens okuyamaz — RLS sıkılaştırmasından sonra zorunlu.

const bodySchema = z.object({
  token: z.string().trim().min(6).max(80),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, bodySchema);
    if (!parsed.ok) return parsed.response;

    const admin = createServiceClient();
    const payload = await validateSurveyTokenWithServiceRole(admin, parsed.data.token);
    return NextResponse.json(payload);
  } catch (e) {
    console.error("survey public session:", e);
    return NextResponse.json(
      { error: "Sunucu yapılandırması veya veritabanı hatası.", valid: false },
      { status: 503 },
    );
  }
}
