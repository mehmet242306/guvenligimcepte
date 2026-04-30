import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient, parseJsonBody } from "@/lib/security/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import {
  getAccountContextForUser,
  hasOsgbManagementAccess,
} from "@/lib/account/account-routing";

const patchSchema = z.object({
  action: z.enum(["accept", "decline", "cancel", "suspend", "resume", "end"]),
});

function isCompatError(message: string | undefined | null) {
  const normalized = String(message ?? "").toLowerCase();
  return (
    normalized.includes("relation") ||
    normalized.includes("schema cache") ||
    normalized.includes("does not exist")
  );
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Oturum bulunamadi." }, { status: 401 });
  }

  const { id: affiliationId } = await context.params;
  if (!affiliationId || !z.string().uuid().safeParse(affiliationId).success) {
    return NextResponse.json({ error: "Gecersiz kayit." }, { status: 400 });
  }

  const parsed = await parseJsonBody(request, patchSchema);
  if (!parsed.ok) return parsed.response;

  const accountContext = await getAccountContextForUser(user.id);
  if (!accountContext.organizationId) {
    return NextResponse.json({ error: "Hesap baglami bulunamadi." }, { status: 403 });
  }

  const service = createServiceClient();
  const { data: row, error: rowError } = await service
    .from("organization_osgb_affiliations")
    .select("id, status, osgb_organization_id, professional_organization_id")
    .eq("id", affiliationId)
    .maybeSingle();

  if (rowError) {
    if (isCompatError(rowError.message)) {
      return NextResponse.json({ error: "Baglanti tablosu hazir degil." }, { status: 503 });
    }
    return NextResponse.json({ error: rowError.message }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({ error: "Kayit bulunamadi." }, { status: 404 });
  }

  const isOsgbSide = accountContext.organizationId === row.osgb_organization_id;
  const isProfessionalSide = accountContext.organizationId === row.professional_organization_id;

  if (!isOsgbSide && !isProfessionalSide) {
    return NextResponse.json({ error: "Bu kayit uzerinde islem yetkiniz yok." }, { status: 403 });
  }

  const isOsgbManager = hasOsgbManagementAccess(accountContext);
  const isProfessionalOwner =
    accountContext.accountType === "individual" &&
    (accountContext.membershipRole === "owner" || accountContext.membershipRole === "admin");

  const action = parsed.data.action;
  let nextStatus: string | null = null;
  const patch: Record<string, unknown> = {};

  switch (action) {
    case "accept":
      if (!isProfessionalSide || !isProfessionalOwner) {
        return NextResponse.json({ error: "Daveti yalnizca bireysel hesap sahibi kabul edebilir." }, { status: 403 });
      }
      if (row.status !== "invited") {
        return NextResponse.json({ error: "Yalnizca bekleyen davet kabul edilebilir." }, { status: 409 });
      }
      nextStatus = "active";
      patch.accepted_at = new Date().toISOString();
      patch.ended_at = null;
      break;

    case "decline":
      if (!isProfessionalSide || !isProfessionalOwner) {
        return NextResponse.json({ error: "Daveti yalnizca bireysel hesap reddedebilir." }, { status: 403 });
      }
      if (row.status !== "invited") {
        return NextResponse.json({ error: "Yalnizca bekleyen davet reddedilebilir." }, { status: 409 });
      }
      nextStatus = "ended";
      patch.ended_at = new Date().toISOString();
      break;

    case "cancel":
      if (!isOsgbSide || !isOsgbManager) {
        return NextResponse.json({ error: "Daveti yalnizca OSGB yoneticisi iptal edebilir." }, { status: 403 });
      }
      if (row.status !== "invited") {
        return NextResponse.json({ error: "Yalnizca bekleyen davet iptal edilebilir." }, { status: 409 });
      }
      nextStatus = "ended";
      patch.ended_at = new Date().toISOString();
      break;

    case "suspend":
      if (!isOsgbSide || !isOsgbManager) {
        return NextResponse.json({ error: "Askiya alma yalnizca OSGB yoneticisi tarafindan yapilir." }, { status: 403 });
      }
      if (row.status !== "active") {
        return NextResponse.json({ error: "Yalnizca aktif baglanti askiya alinabilir." }, { status: 409 });
      }
      nextStatus = "suspended";
      break;

    case "resume":
      if (!isOsgbSide || !isOsgbManager) {
        return NextResponse.json({ error: "Devam ettirme yalnizca OSGB yoneticisi tarafindan yapilir." }, { status: 403 });
      }
      if (row.status !== "suspended") {
        return NextResponse.json({ error: "Yalnizca askidaki baglanti devam ettirilebilir." }, { status: 409 });
      }
      nextStatus = "active";
      break;

    case "end":
      if (isOsgbSide && !isOsgbManager) {
        return NextResponse.json({ error: "OSGB tarafinda yalnizca yonetici sonlandirabilir." }, { status: 403 });
      }
      if (isProfessionalSide && !isProfessionalOwner) {
        return NextResponse.json({ error: "Bireysel tarafta yalnizca hesap sahibi sonlandirabilir." }, { status: 403 });
      }
      if (row.status === "ended" || row.status === "invited") {
        return NextResponse.json({ error: "Bu durumdaki kayit sonlandirilamaz." }, { status: 409 });
      }
      nextStatus = "ended";
      patch.ended_at = new Date().toISOString();
      break;

    default:
      return NextResponse.json({ error: "Gecersiz islem." }, { status: 400 });
  }

  patch.status = nextStatus;

  const { error: updateError } = await service
    .from("organization_osgb_affiliations")
    .update(patch)
    .eq("id", affiliationId);

  if (updateError) {
    if (isCompatError(updateError.message)) {
      return NextResponse.json({ error: "Guncelleme yapilamadi." }, { status: 503 });
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
