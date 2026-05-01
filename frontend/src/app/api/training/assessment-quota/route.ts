import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";
import { consumeEntitlement } from "@/lib/billing/entitlements";

/**
 * Manuel anket/sınav kaydı öncesi bir adet training_slide kotası düşer.
 * AI ile soru üretiminde /api/training-ai zaten tükettiği için istemci tekrar çağırmaz.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const block = await consumeEntitlement(auth, "training_slide");
  if (block) return block;

  return NextResponse.json({ ok: true });
}
