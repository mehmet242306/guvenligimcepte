import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/security/server";
import { releaseDemoUserLock } from "@/lib/auth/demo-release";
import { getDemoAccessState } from "@/lib/platform-admin/demo-access";
import { getRequestUser } from "@/lib/supabase/request-user";

/**
 * Demo suresi dolmus kullanici Google ile **giris** yaptiginda JWT hala demo oldugu
 * icin middleware /register'a geri atiyordu. OAuth ile kimlik dogrulaninca (yeniden
 * kayit sihirbazina gerek yok) sadece **expired** demo bayraklarini kaldir.
 * Admin tarafindan kapatilmis (disabled) demo burada cozulmez.
 */
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "Oturum bulunamadi." }, { status: 401 });
  }

  const state = getDemoAccessState({
    userMetadata: user.user_metadata,
    appMetadata: user.app_metadata,
  });

  if (!state.isBlocked) {
    return NextResponse.json({ ok: true, released: false });
  }

  if (state.status === "disabled") {
    return NextResponse.json(
      {
        error: "Demo erisimi admin tarafindan kapatildi.",
        code: "DEMO_DISABLED",
      },
      { status: 403 },
    );
  }

  try {
    const service = createServiceClient();
    await releaseDemoUserLock(service, user, { onlyIfExpired: true });
    return NextResponse.json({ ok: true, released: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Demo kilidi kaldirilamadi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
