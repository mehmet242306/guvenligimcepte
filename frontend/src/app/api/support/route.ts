import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isLocale } from "@/i18n/routing";
import { sendSupportRequestEmail } from "@/lib/mailer";
import { parseJsonBody } from "@/lib/security/server";

const supportRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  topic: z.string().trim().min(2).max(120),
  accountEmail: z.string().trim().email().max(200).optional().or(z.literal("")),
  companyName: z.string().trim().max(180).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(5000),
  locale: z.string().trim().max(12).optional(),
  website: z.string().max(0).optional(),
});

function getSupportInbox() {
  return process.env.RESEND_SUPPORT_TO_EMAIL?.trim() || process.env.SUPPORT_EMAIL?.trim() || "support@getrisknova.com";
}

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, supportRequestSchema);
  if (!parsed.ok) return parsed.response;

  const body = parsed.data;
  if (body.website) {
    return NextResponse.json({ ok: true });
  }

  try {
    const locale = isLocale(body.locale) ? body.locale : "tr";
    const result = await sendSupportRequestEmail({
      to: getSupportInbox(),
      requesterName: body.name,
      requesterEmail: body.email,
      topic: body.topic,
      accountEmail: body.accountEmail || null,
      companyName: body.companyName || null,
      message: body.message,
      locale,
      pageUrl: request.headers.get("referer"),
    });

    if (!result.delivered) {
      return NextResponse.json(
        {
          error: "Destek e-postasi gonderilemedi. RESEND_API_KEY ve gonderici e-posta ayarlarini kontrol edin.",
          reason: result.reason,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Destek talebi su anda gonderilemiyor.";
    console.error("[support] request email failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
