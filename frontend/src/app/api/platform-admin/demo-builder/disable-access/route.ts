import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Demo erisimi yonetimi kapatildi. Kullanicilar dogrudan kayit/giris ile platformu inceleyebilir.",
      code: "DEMO_ACCESS_MANAGEMENT_DISABLED",
    },
    { status: 410 },
  );
}
