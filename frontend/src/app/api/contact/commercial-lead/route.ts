import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient, parseJsonBody } from "@/lib/security/server";

const leadSourcePageSchema = z.enum([
  "register",
  "cozumler_kurumsal",
  "cozumler_osgb",
  "landing_demo",
]);

const commercialLeadSchema = z.object({
  accountType: z.enum(["osgb", "enterprise"]),
  companyName: z.string().trim().min(2).max(180),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).optional().nullable(),
  message: z.string().trim().max(4000).optional().nullable(),
  estimatedCompanyCount: z.number().int().positive().optional().nullable(),
  estimatedEmployeeCount: z.number().int().positive().optional().nullable(),
  estimatedProfessionalCount: z.number().int().positive().optional().nullable(),
  /** Kurumsal / OSGB cozum sayfasi veya kayit akisi */
  sourcePage: leadSourcePageSchema.optional(),
});

function isSchemaCompatError(message: string | undefined | null) {
  const normalized = String(message ?? "").toLowerCase();
  return (
    normalized.includes("column") ||
    normalized.includes("schema cache") ||
    normalized.includes("does not exist")
  );
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, commercialLeadSchema);
    if (!parsed.ok) return parsed.response;

    const body = parsed.data;
    const service = createServiceClient();

    const basePayload = {
      company_name: body.companyName,
      contact_name: body.contactName,
      email: body.email,
      phone: body.phone || null,
      message: body.message || null,
      estimated_employee_count: body.estimatedEmployeeCount ?? null,
      estimated_location_count:
        body.accountType === "enterprise"
          ? body.estimatedCompanyCount ?? null
          : null,
      status: "new",
    };

    const sourcePage = body.sourcePage ?? "register";

    let insertResult = await service.from("enterprise_leads").insert({
      ...basePayload,
      requested_account_type: body.accountType,
      estimated_company_count:
        body.accountType === "osgb" ? body.estimatedCompanyCount ?? null : null,
      estimated_professional_count:
        body.estimatedProfessionalCount ?? null,
      source_page: sourcePage,
    });

    if (insertResult.error && isSchemaCompatError(insertResult.error.message)) {
      insertResult = await service.from("enterprise_leads").insert({
        ...basePayload,
        source_page: sourcePage,
      });
    }

    if (insertResult.error) {
      return NextResponse.json(
        {
          error: `Talep kaydedilemedi: ${insertResult.error.message}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Talep su anda kaydedilemiyor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
