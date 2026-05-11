import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Demo erisimi yenileme kapatildi. Kullanicilar dogrudan kayit/giris ile platformu inceleyebilir.",
      code: "DEMO_ACCESS_REISSUE_DISABLED",
    },
    { status: 410 },
  );
}
