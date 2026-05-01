import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient, parseJsonBody } from "@/lib/security/server";
import { isPublicDemoFeatureEnabled } from "@/lib/feature-flags";

// =============================================================================
// POST /api/contact/demo-request
// =============================================================================
// Landing sayfasındaki "Demo Talep Et" butonundan gelen public (auth'sız)
// talepleri enterprise_leads tablosuna yazar. Admin'ler bunu
// /platform-admin/leads sayfasında listeler.
// =============================================================================

const demoRequestSchema = z.object({
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  companyName: z.string().trim().max(180).optional().nullable(),
  message: z.string().trim().max(4000).optional().nullable(),
  accountTypeHint: z
    .enum(["bireysel", "osgb", "enterprise"])
    .optional()
    .nullable(),
  kvkkConsent: z.literal(true, {
    message: "KVKK onayı zorunludur",
  }),
});

function isSchemaCompatError(message: string | undefined | null) {
  const normalized = String(message ?? "").toLowerCase();
  return (
    normalized.includes("column") ||
    normalized.includes("schema cache") ||
    normalized.includes("does not exist") ||
    normalized.includes("check constraint")
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!isPublicDemoFeatureEnabled()) {
      return NextResponse.json(
        {
          error:
            "Geçici demo talebi şu an kabul edilmiyor. Kalıcı hesap için kayıt olabilir veya destek ile iletişime geçebilirsiniz.",
          code: "DEMO_PUBLIC_DISABLED",
        },
        { status: 403 },
      );
    }

    const parsed = await parseJsonBody(request, demoRequestSchema);
    if (!parsed.ok) return parsed.response;

    const body = parsed.data;
    const service = createServiceClient();

    // enterprise_leads.requested_account_type CHECK constraint sadece
    // ('osgb','enterprise') kabul ediyor. 'bireysel' veya boş ipucu
    // geldiyse enterprise'a düşür, gerçek niyeti message/source_page'e yaz.
    const mappedType: "osgb" | "enterprise" =
      body.accountTypeHint === "osgb" ? "osgb" : "enterprise";

    const composedMessage = [
      body.accountTypeHint && body.accountTypeHint !== mappedType
        ? `[Hesap tipi ipucu: ${body.accountTypeHint}]`
        : null,
      body.message?.trim() || null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const basePayload = {
      company_name: body.companyName?.trim() || "(belirtilmedi)",
      contact_name: body.contactName,
      email: body.email,
      phone: body.phone?.trim() || null,
      message: composedMessage || null,
      status: "new",
    };

    // Önce tam şemayla dene (yeni kolonlar varsa)
    let insertResult = await service.from("enterprise_leads").insert({
      ...basePayload,
      requested_account_type: mappedType,
      source_page: "landing_demo",
    });

    // Şema cache'i eski kolonları tanımıyorsa (migration henüz deploy'a
    // gitmemişse), kompakt payload ile tekrar dene.
    if (insertResult.error && isSchemaCompatError(insertResult.error.message)) {
      insertResult = await service.from("enterprise_leads").insert(basePayload);
    }

    if (insertResult.error) {
      console.warn("[demo-request] insert failed:", insertResult.error.message);
      return NextResponse.json(
        { error: `Talep kaydedilemedi: ${insertResult.error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Talep şu anda kaydedilemiyor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
