import { NextResponse } from "next/server";
import { sendGoogleConnectedWelcomeEmail } from "@/lib/mailer";
import { createServiceClient } from "@/lib/security/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAccountContextForUser,
  resolvePostLoginPath,
} from "@/lib/account/account-routing";

function isFirstAuthSession(
  createdAt?: string | null,
  lastSignInAt?: string | null,
) {
  if (!createdAt || !lastSignInAt) return false;

  const createdAtMs = new Date(createdAt).getTime();
  const lastSignInAtMs = new Date(lastSignInAt).getTime();

  if (Number.isNaN(createdAtMs) || Number.isNaN(lastSignInAtMs)) {
    return false;
  }

  // Supabase first sign-in timestamps are typically nearly identical.
  return Math.abs(lastSignInAtMs - createdAtMs) <= 5 * 60 * 1000;
}

async function safeResolvePostLoginPath(
  userId: string | null | undefined,
  fallbackPath: string,
) {
  if (!userId) return fallbackPath;

  try {
    return resolvePostLoginPath(await getAccountContextForUser(userId));
  } catch (error) {
    console.warn("[auth/callback] account context fallback:", error);
    return fallbackPath;
  }
}

/**
 * OAuth Callback Route
 * Supabase OAuth provider'larından dönen code parametresini session'a çevirir.
 * Google, Apple, LinkedIn, Facebook redirect'leri buraya gelir.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next") ?? "/dashboard";
  const next = requestedNext.startsWith("/") ? requestedNext : "/dashboard";
  const intent = searchParams.get("intent");
  const registerContext = {
    preferred_account_type:
      searchParams.get("accountType") === "individual" ? "individual" : null,
    preferred_country_code: /^[A-Z]{2}$/.test(searchParams.get("countryCode") ?? "")
      ? searchParams.get("countryCode")
      : null,
    preferred_language: /^[a-z]{2}$/.test(searchParams.get("languageCode") ?? "")
      ? searchParams.get("languageCode")
      : null,
    preferred_role_key: /^[a-z_]{3,40}$/.test(searchParams.get("roleKey") ?? "")
      ? searchParams.get("roleKey")
      : null,
  };

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: assuranceData, error: assuranceError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (
        !assuranceError &&
        assuranceData?.nextLevel === "aal2" &&
        assuranceData.currentLevel !== "aal2"
      ) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const resolvedNext = await safeResolvePostLoginPath(user?.id, next);

        return NextResponse.redirect(
          `${origin}/auth/mfa-challenge?next=${encodeURIComponent(resolvedNext)}`
        );
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const providers = Array.isArray(user?.app_metadata?.providers)
        ? user.app_metadata.providers
        : [];

      if (user?.id && intent === "register") {
        try {
          const service = createServiceClient();
          await service.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...user.user_metadata,
              ...(registerContext.preferred_account_type
                ? { preferred_account_type: registerContext.preferred_account_type }
                : {}),
              ...(registerContext.preferred_country_code
                ? { preferred_country_code: registerContext.preferred_country_code }
                : {}),
              ...(registerContext.preferred_language
                ? { preferred_language: registerContext.preferred_language }
                : {}),
              ...(registerContext.preferred_role_key
                ? { preferred_role_key: registerContext.preferred_role_key }
                : {}),
            },
          });
        } catch (metadataError) {
          console.warn("[auth/callback] register context metadata update failed:", metadataError);
        }
      }

      if (
        user?.id &&
        providers.includes("google") &&
        user.user_metadata?.must_change_password === true
      ) {
        try {
          const service = createServiceClient();
          await service.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...user.user_metadata,
              must_change_password: false,
            },
          });
        } catch (metadataError) {
          console.warn("[auth/callback] google password reset flag cleanup failed:", metadataError);
        }
      }

      if (
        user?.id &&
        user.email &&
        providers.includes("google") &&
        !user.user_metadata?.google_welcome_sent_at &&
        isFirstAuthSession(user.created_at, user.last_sign_in_at)
      ) {
        try {
          const service = createServiceClient();

          await sendGoogleConnectedWelcomeEmail({
            to: user.email,
            fullName:
              String(
                user.user_metadata?.full_name ??
                  user.user_metadata?.name ??
                  user.email.split("@")[0] ??
                  "Kullanici",
              ) || "Kullanici",
            loginUrl: `${origin}/login`,
            onboardingUrl: `${origin}/workspace/onboarding`,
          });

          await service.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...user.user_metadata,
              must_change_password: false,
              google_welcome_sent_at: new Date().toISOString(),
            },
          });
        } catch (mailError) {
          console.warn("[auth/callback] google welcome email failed:", mailError);
        }
      }

      const resolvedNext = await safeResolvePostLoginPath(user?.id, next);

      return NextResponse.redirect(`${origin}${resolvedNext}`);
    }

    console.warn("[auth/callback] exchangeCodeForSession error:", error.message);
  }

  // Hata durumunda login sayfasına yönlendir
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.")}`);
}
