import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Demo hesap ve ornek veri olusturma kapatildi. Kullanicilar dogrudan kayit/giris ile platformu inceleyebilir.",
      code: "DEMO_BUILDER_DISABLED",
    },
    { status: 410 },
  );
}
