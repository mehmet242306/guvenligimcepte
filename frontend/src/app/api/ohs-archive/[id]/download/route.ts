import { NextRequest, NextResponse } from "next/server";
import { consumeEntitlement } from "@/lib/billing/entitlements";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/security/server";
import { requireAuth } from "@/lib/supabase/api-auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/ohs-archive/:id/download
 *
 * Serves the completed archive ZIP as a 302 redirect to a fresh signed URL.
 * Signed URLs on `ohs_archive_jobs.download_url` expire; this route regenerates
 * a 10-minute-lived URL on every call so stale expiry is never a user problem.
 *
 * Increments `download_count` and stamps `last_downloaded_at` via the service
 * client (RLS on the table prevents end-users from updating that directly).
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase_unavailable" }, { status: 500 });
  }

  // RLS-scoped read: caller only sees jobs in their own organization.
  const { data: job, error } = await supabase
    .from("ohs_archive_jobs")
    .select("id, organization_id, status, storage_bucket, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "lookup_failed", detail: error.message },
      { status: 500 },
    );
  }
  if (!job) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (job.status !== "completed" || !job.storage_path) {
    return NextResponse.json(
      { error: "not_ready", status: job.status },
      { status: 409 },
    );
  }

  const service = createServiceClient();

  const { data: jobQuota } = await service
    .from("ohs_archive_jobs")
    .select("download_count")
    .eq("id", id)
    .maybeSingle();

  const isFirstDownload = (jobQuota?.download_count ?? 0) === 0;
  if (isFirstDownload) {
    const quota = await consumeEntitlement(auth, "export");
    if (quota) return quota;
  }

  // Issue fresh signed URL (RLS blocks end-users from raw storage paths).
  const { data: signed, error: signErr } = await service.storage
    .from(job.storage_bucket)
    .createSignedUrl(job.storage_path, 60 * 10); // 10 minutes

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: "signed_url_failed", detail: signErr?.message },
      { status: 500 },
    );
  }

  // Best-effort bookkeeping: fetch current count, +1 and stamp last download.
  // Write failure here is non-critical for the redirect.
  try {
    const { data: current } = await service
      .from("ohs_archive_jobs")
      .select("download_count")
      .eq("id", id)
      .maybeSingle();
    await service
      .from("ohs_archive_jobs")
      .update({
        download_count: (current?.download_count ?? 0) + 1,
        last_downloaded_at: new Date().toISOString(),
        last_downloaded_by: auth.userId,
      })
      .eq("id", id);
  } catch (err) {
    console.error("[ohs-archive] download counter update failed:", err);
  }

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}
