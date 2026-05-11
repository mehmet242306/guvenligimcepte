import { NextResponse } from "next/server";

// =============================================================================
// POST /api/contact/demo-request
// =============================================================================
// Public demo talebi kapatildi. Endpoint geriye donuk uyumluluk icin durur,
// ancak yeni kayit olusturmaz.
// =============================================================================

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Demo talebi kapatildi. Platformu incelemek icin kayit olabilir veya mevcut hesabinizla giris yapabilirsiniz.",
      code: "DEMO_REQUESTS_DISABLED",
    },
    { status: 410 },
  );
}
