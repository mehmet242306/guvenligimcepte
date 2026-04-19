import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/api-auth";

const reviewSchema = z.object({
  retrieval_run_id: z.string().uuid(),
  label: z.enum(["supported", "incomplete", "wrong_version", "wrong_scope", "incorrect_citation"]),
  notes: z.string().max(4000).optional().default(""),
  corrected_citations: z.array(z.record(z.string(), z.unknown())).optional().default([]),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const parsed = reviewSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: trace } = await supabase
    .from("legal_retrieval_runs")
    .select("id")
    .eq("id", parsed.data.retrieval_run_id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!trace) {
    return NextResponse.json({ error: "Review icin trace bulunamadi." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("legal_answer_reviews")
    .insert({
      retrieval_run_id: parsed.data.retrieval_run_id,
      user_id: auth.userId,
      organization_id: auth.organizationId,
      label: parsed.data.label,
      notes: parsed.data.notes || null,
      corrected_citations: parsed.data.corrected_citations,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, success: true });
}
