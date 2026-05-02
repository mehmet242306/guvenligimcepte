import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js, proje kökünde veya src/ içinde "middleware.ts" dosyasını otomatik
// algılar. Export adı "middleware" olmalı. Eski frontend/proxy.ts dosyası
// yanlış isimlendirildiği için çalışmıyordu (dead code). Gerçek mantık
// lib/supabase/proxy.ts:updateSession içinde — burası sadece entry point.
//
// updateSession'ın işlevleri:
// - Supabase session cookie'sini yeniler (token expiry önlemi)
// - Demo erişimi sona erenleri /register?fromDemo=... sayfasına yönlendirir
// - must_change_password=true olanları /reset-password'a zorlar
// - Auth olmayanları /login'e yönlendirir (public yollar hariç)
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Static asset'leri (favicon, _next/static, _next/image, image dosyaları)
  // middleware dışında bırak — performans için.
  matcher: [
    // sw.js / manifest: must not be rewritten or redirected (PWA registration).
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
