import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { persistNovaTurnLearning } from "@/lib/nova/turn-learning";
import { createServiceClient } from "@/lib/security/server";
import { requireAuth } from "@/lib/supabase/api-auth";

const learnRequestSchema = z.object({
  question: z.string().min(1).max(8000),
  answer: z.string().min(1).max(24000),
  sources: z.array(z.unknown()).optional(),
  session_id: z.string().max(120).nullable().optional(),
  gateway_mode: z.string().max(80).nullable().optional(),
  context_surface: z.string().max(80).nullable().optional(),
  language: z.string().max(12).nullable().optional(),
  company_workspace_id: z.string().uuid().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 });
  }

  const parsed = learnRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz öğrenme isteği." }, { status: 400 });
  }

  const payload = parsed.data;
  const service = createServiceClient();

  const result = await persistNovaTurnLearning(service, {
    userId: auth.userId,
    organizationId: auth.organizationId,
    companyWorkspaceId: payload.company_workspace_id ?? null,
    question: payload.question,
    answer: payload.answer,
    sources: payload.sources,
    sessionId: payload.session_id ?? null,
    gatewayMode: payload.gateway_mode ?? null,
    contextSurface: payload.context_surface ?? null,
    language: payload.language ?? "tr",
  });

  return NextResponse.json(result);
}
