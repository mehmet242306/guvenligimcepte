import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAccountContextForUser } from "@/lib/account/account-routing";
import { consumeEntitlement } from "@/lib/billing/entitlements";
import { collectAnnualEvaluationFacts } from "@/lib/reports/annual-evaluation-data";
import { enforceRateLimit } from "@/lib/security/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/api-auth";

export const maxDuration = 120;

const bodySchema = z.object({
  company_workspace_id: z.string().uuid(),
  year: z.number().int().min(2020).max(2035),
  locale: z.enum(["tr", "en"]).optional().default("tr"),
});

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY tanımlı değil." }, { status: 500 });
  }

  const accountContext = await getAccountContextForUser(auth.userId);
  const bypassLimits = accountContext?.isPlatformAdmin === true;

  if (!bypassLimits) {
    const rateLimited = await enforceRateLimit(request, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      endpoint: "/api/reports/annual-evaluation",
      scope: "ai",
      limit: 8,
      windowSeconds: 3600,
      planKey: "nova_message",
    });
    if (rateLimited) return rateLimited;

    const entitlementResponse = await consumeEntitlement(auth, "nova_message");
    if (entitlementResponse) return entitlementResponse;
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON gövdesi." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { company_workspace_id: workspaceId, year, locale } = parsed.data;
  const supabase = await createClient();

  const { data: ws, error: wsErr } = await supabase
    .from("company_workspaces")
    .select("id, display_name, organization_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (wsErr || !ws) {
    return NextResponse.json({ error: "Çalışma alanı bulunamadı." }, { status: 404 });
  }
  if (ws.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "Bu çalışma alanına erişim yok." }, { status: 403 });
  }

  const companyName = (ws.display_name as string) || "Firma";

  const facts = await collectAnnualEvaluationFacts(supabase, auth.organizationId, workspaceId, companyName, year);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const factsJson = JSON.stringify(facts, null, 2);

  const systemTr = `Sen Türkiye iş sağlığı ve güvenliği (İSG) uzmanısın. Aşağıdaki JSON, bir işyeri çalışma alanında belirli bir takvim yılında RiskNova sisteminde kayıtlı operasyonel verilerin özetidir (risk analizleri, bulgular, DÖF, olaylar, dokümanlar, saha denetimleri, ajanda görevleri, eğitimler, periyodik kontroller, İSG kurulu toplantıları).

Görevin: 6331 sayılı Kanun ve iyi uygulama çerçevesinde "Yıllık Değerlendirme Raporu" niteliğinde profesyonel bir metin üretmek.

Kurallar:
- Sadece verilen JSON'daki sayılara dayan; uydurma rakam veya olay yazma.
- Veri yoksa veya çok azsa bunu açıkça belirt ve hangi modüllerin doldurulması gerektiğini kısaca öner.
- Markdown kullan: ## başlıklar, madde işaretleri, ve en az bir özet tablo (| ile).
- Tabloda modül bazında sayıları göster (Risk analizi, Bulgu, DÖF, Olay, Doküman, Saha denetimi, Görev, Eğitim, Periyodik kontrol, Kurul).
- Son bölümde "Öncelikli öneriler" (maks. 5 madde) ver.
- Ton: resmi ama anlaşılır Türkçe.`;

  const systemEn = `You are an OHS professional. The JSON is a year-scoped operational summary from the RiskNova system for one company workspace.

Produce an "Annual evaluation report" style narrative. Rules:
- Only use counts from the JSON; do not invent figures.
- If data is sparse, say so and suggest which modules to populate.
- Use Markdown with ## headings, bullet lists, and at least one summary table (pipe tables).
- Table: counts by module (risk assessments, findings, CAPA, incidents, documents, field inspections, tasks, trainings, periodic controls, committee meetings).
- End with "Priority recommendations" (max 5 bullets).
- Tone: formal, clear English.`;

  const userPrompt =
    locale === "en"
      ? `Company: ${companyName}\nReporting year: ${year}\n\nFactsheet JSON:\n${factsJson}`
      : `Firma: ${companyName}\nRapor yılı: ${year}\n\nÖzet JSON:\n${factsJson}`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 6000,
      system: locale === "en" ? systemEn : systemTr,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    const markdown = textBlock && textBlock.type === "text" ? textBlock.text : "";

    if (!markdown.trim()) {
      return NextResponse.json({ error: "AI boş yanıt döndü." }, { status: 502 });
    }

    return NextResponse.json({
      markdown,
      factsheet: facts,
      meta: {
        year,
        companyName,
        companyWorkspaceId: workspaceId,
        locale,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Beklenmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
