import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/api-auth";

const paramsSchema = z.object({
  traceId: z.string().uuid(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ traceId: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Gecersiz trace kimligi." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("legal_retrieval_runs")
    .select("id, query_text, as_of_date, answer_mode, retrieval_trace, answer_preview, confidence, created_at")
    .eq("id", parsedParams.data.traceId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Trace bulunamadi." }, { status: 404 });
  }

  return NextResponse.json(data);
}
