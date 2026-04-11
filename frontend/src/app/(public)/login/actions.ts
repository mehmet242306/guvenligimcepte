"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { registerSession } from "@/lib/session-tracker";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=E-posta ve sifre zorunludur.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const raw = error.message.toLowerCase();

    let message = "Giris basarisiz. Bilgilerini kontrol et.";
    if (raw.includes("email not confirmed")) {
      message = "E-posta adresini dogrulaman gerekiyor.";
    } else if (raw.includes("invalid login credentials")) {
      message = "E-posta veya sifre hatali.";
    }

    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  const accessToken = data.session?.access_token;
  const backendBaseUrl =
    process.env.BACKEND_API_URL || "http://127.0.0.1:8000";

  if (accessToken) {
    try {
      await fetch(`${backendBaseUrl}/api/v1/audit-events/login`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });
    } catch (auditError) {
      console.error("Login audit log request failed:", auditError);
    }
  }

  // Register session (max 1 web + 1 mobile)
  if (data.session && data.user) {
    const h = await headers();
    const ua = h.get("user-agent") ?? "";
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
    await registerSession(supabase, data.user.id, data.session.access_token, ua, ip);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}