"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateStrongPassword } from "@/lib/security/server";
import {
  getAccountContextForUser,
  isPrivilegedAccountSelfServiceLoginBlocked,
  PRIVILEGED_ACCOUNT_LOGIN_BLOCKED_MESSAGE,
  resolvePostLoginPath,
} from "@/lib/account/account-routing";
import { resolveAppOriginFromHeaders } from "@/lib/server/app-origin";
import { createServiceClient } from "@/lib/security/server";
import { releaseDemoUserLock } from "@/lib/auth/demo-release";

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const accountType = String(formData.get("accountType") ?? "individual").trim();
  const countryCode = String(formData.get("countryCode") ?? "TR").trim().toUpperCase();
  const languageCode = String(formData.get("languageCode") ?? "tr").trim().toLowerCase();
  const roleKey = String(formData.get("roleKey") ?? "safety_professional").trim();
  const legalAccepted = formData.get("legalAccepted") === "on";

  if (!email || !password) {
    redirect("/register?error=E-posta ve şifre zorunludur.");
  }

  if (!legalAccepted) {
    redirect(
      `/register?error=${encodeURIComponent(
        "Devam etmek için Kullanım Şartları, Gizlilik Politikası ve KVKK bilgilendirmesini kabul etmelisiniz.",
      )}`,
    );
  }

  const passwordError = validateStrongPassword(password);
  if (passwordError) {
    redirect(`/register?error=${encodeURIComponent(passwordError)}`);
  }

  const supabase = await createClient();
  const headerStore = await headers();
  const origin = resolveAppOriginFromHeaders(headerStore);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/dashboard`,
      data: {
        preferred_account_type: accountType === "individual" ? "individual" : null,
        preferred_country_code: /^[A-Z]{2}$/.test(countryCode) ? countryCode : "TR",
        preferred_language: /^[a-z]{2}$/.test(languageCode) ? languageCode : "tr",
        preferred_role_key: /^[a-z_]{3,40}$/.test(roleKey)
          ? roleKey
          : "safety_professional",
      },
    },
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");

  if (data.session && data.user) {
    try {
      const service = createServiceClient();
      await releaseDemoUserLock(service, data.user);
      await supabase.auth.refreshSession();
    } catch (cleanupError) {
      console.warn("[signup] demo kilidi kaldirma veya oturum yenileme:", cleanupError);
    }
    const signupContext = await getAccountContextForUser(data.session.user.id);
    if (isPrivilegedAccountSelfServiceLoginBlocked(signupContext)) {
      await supabase.auth.signOut();
      redirect(
        `/login?error=${encodeURIComponent(PRIVILEGED_ACCOUNT_LOGIN_BLOCKED_MESSAGE)}`,
      );
    }
    redirect(resolvePostLoginPath(signupContext));
  }

  redirect("/register?checkEmail=1");
}
