import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/security/server";
import { getAccountContextForUser } from "@/lib/account/account-routing";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/legal-corpus
 * Platform admin: jurisdiction aggregates + document list (sorted by title).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const context = await getAccountContextForUser(user.id);
    if (!context?.isPlatformAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const officialOnly = searchParams.get("officialOnly") !== "0";
    const jurisdiction = searchParams.get("jurisdiction")?.trim().toUpperCase() || null;
    const limit = Math.min(Number(searchParams.get("limit") || "300"), 500);

    const service = createServiceClient();

    const { data: stats, error: statsError } = await service
      .from("legal_document_stats_by_jurisdiction")
      .select("*")
      .order("jurisdiction_code", { ascending: true });

    if (statsError) {
      console.warn("[admin/legal-corpus] stats view:", statsError.message);
    }

    let docQuery = service
      .from("legal_documents")
      .select(
        "id,title,doc_number,doc_type,jurisdiction_code,corpus_scope,is_active,source_url,created_at",
      )
      .order("title", { ascending: true })
      .limit(limit);

    if (officialOnly) {
      docQuery = docQuery.eq("corpus_scope", "official");
    }
    if (jurisdiction && /^[A-Z]{2}$/.test(jurisdiction)) {
      docQuery = docQuery.eq("jurisdiction_code", jurisdiction);
    }
    if (jurisdiction === "GLOBAL") {
      docQuery = docQuery.eq("jurisdiction_code", "GLOBAL");
    }

    const { data: documents, error: docError } = await docQuery;

    if (docError) {
      return NextResponse.json(
        { error: `documents_query_failed: ${docError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      stats: stats ?? [],
      documents: documents ?? [],
      query: { officialOnly, jurisdiction, limit },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unexpected_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
