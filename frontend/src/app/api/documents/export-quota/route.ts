import { NextRequest, NextResponse } from "next/server";
import { consumeEntitlement } from "@/lib/billing/entitlements";
import { requireAuth } from "@/lib/supabase/api-auth";

/**
 * Doküman editöründen Word indirme / PDF yazdırma öncesi export kotası düşer.
 * İstemci tarafında üretilen DOCX ve tarayıcı print akışı sunucuya gitmez;
 * kota yalnızca bu endpoint ile kontrol edilir.
 */
export async function POST(_request: NextRequest) {
  const auth = await requireAuth(_request);
  if (!auth.ok) return auth.response;

  const entitlementResponse = await consumeEntitlement(auth, "export");
  if (entitlementResponse) return entitlementResponse;

  return NextResponse.json({ ok: true });
}
