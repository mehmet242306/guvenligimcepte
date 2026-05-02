import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, enforceRateLimit, parseJsonBody } from "@/lib/security/server";
import { getAccountContextForUser } from "@/lib/account/account-routing";
import { fetchUkUksiFeed, parseUkUksiAtom } from "@/lib/legal-corpus/connectors/uk-uksi-feed";
import { upsertOfficialLegalDocument } from "@/lib/legal-corpus/upsert-official-document";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const bodySchema = z.object({
  connector: z.enum(["uk_uksi_feed"]),
  limit: z.number().int().min(1).max(40).optional().default(15),
});

/**
 * POST /api/admin/legal-corpus/ingest
 * Platform admin: pull official Atom feeds and upsert into legal_documents (official corpus).
 */
export async function POST(request: NextRequest) {
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

    const rateLimitResponse = await enforceRateLimit(request, {
      userId: user.id,
      organizationId: context.organizationId ?? null,
      endpoint: "/api/admin/legal-corpus/ingest",
      scope: "api",
      limit: 8,
      windowSeconds: 3600,
      metadata: { feature: "legal_corpus_ingest" },
    });
    if (rateLimitResponse) return rateLimitResponse;

    const parsed = await parseJsonBody(request, bodySchema);
    if (!parsed.ok) return parsed.response;

    const { connector, limit } = parsed.data;
    const service = createServiceClient();

    if (connector !== "uk_uksi_feed") {
      return NextResponse.json({ error: "unsupported_connector" }, { status: 400 });
    }

    const xml = await fetchUkUksiFeed();
    const items = parseUkUksiAtom(xml).slice(0, limit);

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        const result = await upsertOfficialLegalDocument(service, {
          sourceKey: "legislation_gov_uk",
          jurisdictionCode: "GB",
          docType: "regulation",
          docNumber: item.docNumber,
          title: item.title,
          sourceUrl: item.webUrl,
          summaryText: item.summary.length > 0 ? item.summary : item.title,
        });
        if (result.inserted) inserted += 1;
        else skipped += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${item.docNumber}: ${msg}`);
      }
    }

    return NextResponse.json({
      connector,
      attempted: items.length,
      inserted,
      skipped,
      errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unexpected_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
