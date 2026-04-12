import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/supabase/api-auth";
import { sendDataDeletionConfirmationEmail } from "@/lib/mailer";
import {
  createServiceClient,
  enforceRateLimit,
  getClientIp,
  getUserAgent,
  parseJsonBody,
} from "@/lib/security/server";

const bodySchema = z.object({
  reason: z.string().trim().max(1200).optional().default(""),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const rateLimitResponse = await enforceRateLimit(request, {
    userId: auth.userId,
    organizationId: auth.organizationId,
    endpoint: "/api/privacy/delete-request",
    scope: "api",
    limit: 3,
    windowSeconds: 24 * 60 * 60,
    metadata: { feature: "privacy_delete_request" },
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("submit_data_deletion_request", {
      p_reason: parsed.data.reason || null,
      p_ip_address: getClientIp(request),
      p_user_agent: getUserAgent(request),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return NextResponse.json({ error: "Silme talebi olusturulamadi." }, { status: 500 });
    }

    if (row.target_email) {
      await sendDataDeletionConfirmationEmail({
        to: row.target_email,
        scheduledPurgeAt: new Intl.DateTimeFormat("tr-TR", {
          dateStyle: "long",
          timeStyle: "short",
        }).format(new Date(row.scheduled_purge_at)),
      });
    }

    return NextResponse.json({ request: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
