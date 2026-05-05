import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/supabase/api-auth";
import { createServiceClient, parseJsonBody } from "@/lib/security/server";

const requestSchema = z.object({
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  jurisdiction_code: z.string().regex(/^[A-Z]{2}$/).optional().default("TR"),
  limit: z.number().int().min(1).max(100).optional().default(30),
});

const MODULE_RULES: Array<{ module: string; route: string; keywords: RegExp }> = [
  { module: "Risk Analizi", route: "/risk-analysis", keywords: /(risk|tehlike|degerlendirme|assessment)/i },
  { module: "DÖF", route: "/corrective-actions", keywords: /(duzeltici|onleyici|dof|uygunsuzluk|aksiyon)/i },
  { module: "Olaylar", route: "/incidents", keywords: /(olay|kaza|ramak|incident|is kazasi)/i },
  { module: "Egitim", route: "/training", keywords: /(egitim|sertifika|yetkinlik|training)/i },
  { module: "Ajanda", route: "/planner", keywords: /(periyot|takvim|plan|sure|hatirlat)/i },
  { module: "ISG Kutuphanesi", route: "/isg-library", keywords: /(yonetmelik|kanun|teblig|mevzuat|madde)/i },
];

type ImpactBucket = {
  module: string;
  route: string;
  reasons: string[];
  count: number;
};

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "ai.use");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, requestSchema);
  if (!parsed.ok) return parsed.response;

  const body = parsed.data;
  const today = new Date().toISOString().slice(0, 10);
  const fromDate =
    body.from_date ??
    new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const toDate = body.to_date ?? today;

  const service = createServiceClient();
  const { data: versions, error } = await service
    .from("legal_document_versions")
    .select(`
      id,
      document_id,
      version_label,
      effective_from,
      publication_date,
      normalized_text,
      raw_text,
      legal_documents!inner (
        id,
        title,
        doc_number,
        jurisdiction_code,
        corpus_scope,
        is_active
      )
    `)
    .gte("effective_from", fromDate)
    .lte("effective_from", toDate)
    .eq("legal_documents.jurisdiction_code", body.jurisdiction_code)
    .order("effective_from", { ascending: false })
    .limit(body.limit);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const buckets = new Map<string, ImpactBucket>();
  const matchedDocuments: Array<Record<string, unknown>> = [];

  for (const row of versions ?? []) {
    const doc = (row as {
      legal_documents?: {
        title?: string | null;
        doc_number?: string | null;
        jurisdiction_code?: string | null;
        corpus_scope?: string | null;
      } | null;
      normalized_text?: string | null;
      raw_text?: string | null;
      effective_from?: string | null;
      version_label?: string | null;
      document_id?: string | null;
    }) ?? null;

    const title = doc?.legal_documents?.title ?? "Belge";
    const text = `${title}\n${doc?.normalized_text ?? doc?.raw_text ?? ""}`.slice(0, 4000);
    const triggered = MODULE_RULES.filter((rule) => rule.keywords.test(text));
    if (triggered.length === 0) {
      continue;
    }

    matchedDocuments.push({
      document_id: doc?.document_id ?? null,
      title,
      doc_number: doc?.legal_documents?.doc_number ?? null,
      effective_from: doc?.effective_from ?? null,
      version_label: doc?.version_label ?? null,
      jurisdiction_code: doc?.legal_documents?.jurisdiction_code ?? null,
      corpus_scope: doc?.legal_documents?.corpus_scope ?? null,
      affected_modules: triggered.map((rule) => rule.module),
    });

    for (const rule of triggered) {
      const current = buckets.get(rule.module) ?? {
        module: rule.module,
        route: rule.route,
        reasons: [],
        count: 0,
      };
      current.count += 1;
      if (current.reasons.length < 3) {
        current.reasons.push(title);
      }
      buckets.set(rule.module, current);
    }
  }

  const impacts = Array.from(buckets.values()).sort((a, b) => b.count - a.count);
  return NextResponse.json({
    range: { from_date: fromDate, to_date: toDate, jurisdiction_code: body.jurisdiction_code },
    impact_summary: impacts,
    documents: matchedDocuments.slice(0, body.limit),
    note:
      "Bu analiz kural-tabanli etki eslemesi yapar. Nihai uyum karari icin uzman degerlendirmesi gerekir.",
  });
}
