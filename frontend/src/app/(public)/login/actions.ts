"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=E-posta ve şifre zorunludur.");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const raw = error.message.toLowerCase();

    let message = "Giriş başarısız. Bilgilerini kontrol et.";
    if (raw.includes("email not confirmed")) {
      message = "E-posta adresini doğrulaman gerekiyor.";
    } else if (raw.includes("invalid login credentials")) {
      message = "E-posta veya şifre hatalı.";
    }

    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
