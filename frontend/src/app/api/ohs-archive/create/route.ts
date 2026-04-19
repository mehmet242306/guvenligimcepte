import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/api-auth";

const bodySchema = z.object({
  company_workspace_id: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  jurisdiction_code: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional()
    .default("TR"),
  categories: z.array(z.string().min(1).max(64)).min(1).max(20).optional(),
  preset_key: z.string().min(1).max(64).optional(),
});

function getSupabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!value) throw new Error("NEXT_PUBLIC_SUPABASE_URL tanımlı değil.");
  return value.replace(/\/+$/, "");
}

function getInternalKey(): string | null {
  return process.env.INTERNAL_WORKER_KEY?.trim() ?? null;
}

/**
 * POST /api/ohs-archive/create
 *
 * Creates a Workplace OHS File archive job row and fires a fire-and-forget
 * call to the `ohs-archive-worker` Edge Function to process it.
 *
 * Flow:
 *   1. Authenticate user + resolve their organization.
 *   2. Verify the company_workspace belongs to that organization.
 *   3. Resolve scope (explicit `categories`, or `preset_key`, or the
 *      jurisdiction's default preset).
 *   4. Insert job row (status='pending').
 *   5. Dispatch worker (fire-and-forget); caller polls GET /:id for status.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_body", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase_unavailable" }, { status: 500 });
  }

  // 1) Verify the company_workspace belongs to the user's organization.
  const { data: cw, error: cwErr } = await supabase
    .from("company_workspaces")
    .select("id, organization_id, company_identity_id")
    .eq("id", body.company_workspace_id)
    .maybeSingle();

  if (cwErr) {
    return NextResponse.json(
      { error: "company_lookup_failed", detail: cwErr.message },
      { status: 500 },
    );
  }
  if (!cw) {
    return NextResponse.json({ error: "company_not_found" }, { status: 404 });
  }
  if (cw.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "company_not_in_your_org" }, { status: 403 });
  }

  // 2) Resolve scope: explicit > preset_key > jurisdiction default preset.
  let categories: string[] | null = body.categories ?? null;
  if (!categories) {
    const presetQuery = supabase
      .from("ohs_archive_scope_presets")
      .select("categories, is_default, preset_key, jurisdiction_code")
      .eq("jurisdiction_code", body.jurisdiction_code)
      .eq("is_active", true);

    const { data: presets, error: presetErr } = body.preset_key
      ? await presetQuery.eq("preset_key", body.preset_key).limit(1)
      : await presetQuery.eq("is_default", true).limit(1);

    if (presetErr || !presets || presets.length === 0) {
      return NextResponse.json(
        { error: "scope_preset_not_found", detail: presetErr?.message },
        { status: 400 },
      );
    }
    const presetCategories = presets[0].categories as Array<{ key: string }>;
    categories = presetCategories.map((c) => c.key);
  }

  // 3) Insert job row. RLS policy forces organization_id + requested_by.
  const { data: inserted, error: insertErr } = await supabase
    .from("ohs_archive_jobs")
    .insert({
      organization_id: auth.organizationId,
      company_workspace_id: body.company_workspace_id,
      company_identity_id: cw.company_identity_id,
      jurisdiction_code: body.jurisdiction_code,
      year: body.year,
      requested_by: auth.userId,
      status: "pending",
      scope: { version: 1, categories },
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json(
      { error: "job_create_failed", detail: insertErr?.message },
      { status: 500 },
    );
  }

  const jobId = inserted.id as string;

  // 4) Fire-and-forget dispatch to the Edge Function worker. We do not await
  //    the response — the client will poll GET /api/ohs-archive/:id for status.
  //    In local dev without INTERNAL_WORKER_KEY configured, we silently skip
  //    so the job row still exists for manual inspection.
  const internalKey = getInternalKey();
  if (internalKey) {
    const workerUrl = `${getSupabaseUrl()}/functions/v1/ohs-archive-worker`;
    fetch(workerUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-auth": internalKey,
      },
      body: JSON.stringify({ jobId }),
    }).catch((err) => {
      // Worker dispatch failure is logged server-side; job remains pending and
      // a future retry/cron can pick it up.
      console.error("[ohs-archive] worker dispatch failed:", err);
    });
  }

  return NextResponse.json({ ok: true, jobId, status: "pending" }, { status: 202 });
}
