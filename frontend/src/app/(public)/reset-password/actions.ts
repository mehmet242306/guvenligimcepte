"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sendPasswordChangedEmail } from "@/lib/mailer";
import { resolveAppOriginFromHeaders } from "@/lib/server/app-origin";
import { createClient } from "@/lib/supabase/server";
import { validateStrongPassword } from "@/lib/security/server";
import {
  getAccountContextForUser,
  isPrivilegedAccountSelfServiceLoginBlocked,
  PRIVILEGED_ACCOUNT_LOGIN_BLOCKED_MESSAGE,
  resolvePostLoginPath,
} from "@/lib/account/account-routing";

type AfterPasswordUpdate =
  | { blocked: true }
  | { blocked: false; path: string };

async function resolveAfterPasswordUpdatePath(
  userId: string | null | undefined,
): Promise<AfterPasswordUpdate> {
  if (!userId) {
    return { blocked: false, path: "/login" };
  }

  try {
    const ctx = await getAccountContextForUser(userId);
    if (isPrivilegedAccountSelfServiceLoginBlocked(ctx)) {
      return { blocked: true };
    }
    return { blocked: false, path: resolvePostLoginPath(ctx) };
  } catch (error) {
    console.warn("[reset-password] post-update routing fallback:", error);
    return { blocked: false, path: "/workspace/onboarding" };
  }
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (!password) {
    redirect("/reset-password?error=Yeni şifre zorunludur.");
  }

  const passwordError = validateStrongPassword(password);
  if (passwordError) {
    redirect(`/reset-password?error=${encodeURIComponent(passwordError)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password,
    data: {
      must_change_password: false,
      must_set_password: false,
    },
  });

  if (error) {
    const normalized = error.message.toLowerCase();
    if (normalized.includes("aal2")) {
      redirect(
        `/auth/mfa-challenge?next=${encodeURIComponent(
          "/reset-password?required=1&mfa=1",
        )}`,
      );
    }
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    try {
      const headerStore = await headers();
      const origin = resolveAppOriginFromHeaders(headerStore);

      await sendPasswordChangedEmail({
        to: user.email,
        fullName:
          String(
            user.user_metadata?.full_name ??
              user.user_metadata?.name ??
              user.email.split("@")[0] ??
              "Kullanici",
          ) || "Kullanici",
        loginUrl: `${origin}/login`,
        changedAt: new Date().toLocaleString("tr-TR"),
      });
    } catch (mailError) {
      console.warn("[reset-password] password changed email failed:", mailError);
    }
  }

  const resolved = await resolveAfterPasswordUpdatePath(user?.id);
  if (resolved.blocked) {
    await supabase.auth.signOut();
    redirect(
      `/login?error=${encodeURIComponent(PRIVILEGED_ACCOUNT_LOGIN_BLOCKED_MESSAGE)}`,
    );
  }

  const nextPath = resolved.path;
  const separator = nextPath.includes("?") ? "&" : "?";

  redirect(`${nextPath}${separator}passwordUpdated=1`);
}
