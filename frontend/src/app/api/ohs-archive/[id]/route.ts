import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/api-auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/ohs-archive/:id
 *
 * Status polling. Returns lifecycle fields only — the actual download link is
 * served by GET /api/ohs-archive/:id/download so the expiring signed URL
 * doesn't leak into status polls.
 *
 * RLS on `ohs_archive_jobs` already scopes the row to the caller's
 * organization; this route trusts that and simply forwards.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase_unavailable" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("ohs_archive_jobs")
    .select(
      `
      id,
      company_workspace_id,
      year,
      jurisdiction_code,
      status,
      progress,
      error_message,
      error_code,
      scope,
      file_size_bytes,
      download_url_expires_at,
      download_count,
      last_downloaded_at,
      started_at,
      completed_at,
      created_at,
      updated_at
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "lookup_failed", detail: error.message },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
