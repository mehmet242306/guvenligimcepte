import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createServiceClient,
  logSecurityEventWithContext,
  parseJsonBody,
} from "@/lib/security/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import {
  getAccountContextForUser,
  hasOsgbManagementAccess,
} from "@/lib/account/account-routing";

const inviteSchema = z.object({
  email: z.string().trim().email("Gecerli bir e-posta girin."),
  notes: z.string().trim().max(500).optional(),
});

function isCompatError(message: string | undefined | null) {
  const normalized = String(message ?? "").toLowerCase();
  return (
    normalized.includes("relation") ||
    normalized.includes("schema cache") ||
    normalized.includes("does not exist")
  );
}

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Oturum bulunamadi." }, { status: 401 });
  }

  const context = await getAccountContextForUser(user.id);
  if (!context.organizationId || !context.accountType) {
    return NextResponse.json({ ok: true, perspective: null, affiliations: [] });
  }

  const service = createServiceClient();

  const baseSelect = `
    id,
    status,
    osgb_organization_id,
    professional_organization_id,
    invited_at,
    accepted_at,
    ended_at,
    notes,
    osgb:organizations!organization_osgb_affiliations_osgb_organization_id_fkey ( id, name ),
    professional:organizations!organization_osgb_affiliations_professional_organization_id_fkey ( id, name )
  `;

  try {
    if (context.accountType === "individual") {
      const { data, error } = await service
        .from("organization_osgb_affiliations")
        .select(baseSelect)
        .eq("professional_organization_id", context.organizationId)
        .order("invited_at", { ascending: false });

      if (error) {
        if (isCompatError(error.message)) {
          return NextResponse.json({ ok: true, perspective: "individual", affiliations: [] });
        }
        throw new Error(error.message);
      }

      return NextResponse.json({
        ok: true,
        perspective: "individual",
        affiliations: data ?? [],
      });
    }

    if (context.accountType === "osgb") {
      const { data, error } = await service
        .from("organization_osgb_affiliations")
        .select(baseSelect)
        .eq("osgb_organization_id", context.organizationId)
        .order("invited_at", { ascending: false });

      if (error) {
        if (isCompatError(error.message)) {
          return NextResponse.json({ ok: true, perspective: "osgb", affiliations: [] });
        }
        throw new Error(error.message);
      }

      return NextResponse.json({
        ok: true,
        perspective: "osgb",
        affiliations: data ?? [],
      });
    }

    return NextResponse.json({ ok: true, perspective: context.accountType, affiliations: [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Liste alinamadi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Oturum bulunamadi." }, { status: 401 });
  }

  const context = await getAccountContextForUser(user.id);
  if (!context.organizationId || !hasOsgbManagementAccess(context)) {
    return NextResponse.json({ error: "Bu islem icin OSGB yonetici yetkisi gerekir." }, { status: 403 });
  }

  const parsed = await parseJsonBody(request, inviteSchema);
  if (!parsed.ok) return parsed.response;

  const email = parsed.data.email.trim().toLowerCase();
  const service = createServiceClient();

  const { data: profileRows, error: profileError } = await service
    .from("user_profiles")
    .select(
      `
      organization_id,
      organization:organizations!user_profiles_organization_id_fkey (
        id,
        name,
        account_type
      )
    `,
    )
    .ilike("email", email)
    .limit(5);

  if (profileError && !isCompatError(profileError.message)) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const match = (profileRows ?? []).find((row) => {
    const org = row.organization as { account_type?: string } | null;
    return org?.account_type === "individual" && row.organization_id;
  });

  if (!match?.organization_id) {
    return NextResponse.json(
      {
        error:
          "Bu e-posta ile kayitli bireysel RiskNova hesabi bulunamadi. Kullanicinin once bireysel hesap olusturmasi gerekir.",
      },
      { status: 404 },
    );
  }

  const professionalOrganizationId = match.organization_id as string;

  if (professionalOrganizationId === context.organizationId) {
    return NextResponse.json({ error: "Kendi organizasyonunuzu davet edemezsiniz." }, { status: 400 });
  }

  const insertPayload = {
    osgb_organization_id: context.organizationId,
    professional_organization_id: professionalOrganizationId,
    status: "invited" as const,
    notes: parsed.data.notes?.trim() || null,
  };

  const { data: inserted, error: insertError } = await service
    .from("organization_osgb_affiliations")
    .insert(insertPayload)
    .select("id")
    .maybeSingle();

  let finalId = inserted?.id as string | undefined;

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: existing, error: existingError } = await service
        .from("organization_osgb_affiliations")
        .select("id, status")
        .eq("osgb_organization_id", context.organizationId)
        .eq("professional_organization_id", professionalOrganizationId)
        .maybeSingle();

      if (existingError || !existing?.id) {
        return NextResponse.json(
          { error: "Bu profesyonel ile zaten bir baglanti kaydi var." },
          { status: 409 },
        );
      }

      if (existing.status === "ended") {
        const nowIso = new Date().toISOString();
        const { error: reviveError } = await service
          .from("organization_osgb_affiliations")
          .update({
            status: "invited",
            invited_at: nowIso,
            accepted_at: null,
            ended_at: null,
            notes: parsed.data.notes?.trim() || null,
          })
          .eq("id", existing.id);

        if (reviveError) {
          return NextResponse.json({ error: reviveError.message }, { status: 500 });
        }
        finalId = existing.id;
      } else {
        return NextResponse.json(
          { error: "Bu profesyonel icin zaten aktif veya bekleyen bir baglanti var." },
          { status: 409 },
        );
      }
    } else if (isCompatError(insertError.message)) {
      return NextResponse.json(
        { error: "Baglanti tablosu henuz hazir degil. Supabase migration uygulayin." },
        { status: 503 },
      );
    } else {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  await logSecurityEventWithContext({
    eventType: "osgb_affiliation_invite",
    userId: user.id,
    organizationId: context.organizationId,
    endpoint: "/api/account/osgb-affiliations",
    severity: "info",
    details: {
      affiliationId: finalId,
      targetEmail: email,
      professionalOrganizationId,
    },
  });

  return NextResponse.json({ ok: true, id: finalId });
}
