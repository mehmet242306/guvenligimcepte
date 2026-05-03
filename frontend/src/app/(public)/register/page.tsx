import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import { DemoSessionCleaner } from "@/components/auth/DemoSessionCleaner";
import { DemoExpiredModal } from "@/components/auth/DemoExpiredModal";
import { RegisterAccountTypePreview } from "@/components/auth/RegisterAccountTypePreview";
import { StatusAlert } from "@/components/ui/status-alert";
import { DEMO_ACCESS_WINDOW_HOURS } from "@/lib/platform-admin/demo-access";
import { isPublicDemoFeatureEnabled } from "@/lib/feature-flags";
import { signup } from "./actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    checkEmail?: string;
    fromDemo?: string;
    commercial?: string;
  }>;
}) {
  const params = await searchParams;
  const error = params?.error;
  const checkEmail = params?.checkEmail === "1";
  const fromDemo = params?.fromDemo;
  const demoExpired = fromDemo === "demo-expired" || fromDemo === "1";
  const demoDisabled = fromDemo === "demo-disabled";
  const commercialParam = params?.commercial?.toLowerCase();
  const initialCommercial =
    commercialParam === "osgb" || commercialParam === "enterprise"
      ? commercialParam
      : undefined;

  const demoPublicEnabled = isPublicDemoFeatureEnabled();
  const legacyDemoLanding = demoExpired || demoDisabled;
  const t = await getTranslations("auth.registerPage");

  return (
    <AuthShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      highlights={[
        {
          title: t("highlight1Title"),
          description: t("highlight1Desc"),
        },
        {
          title: t("highlight2Title"),
          description: t("highlight2Desc"),
        },
        {
          title: t("highlight3Title"),
          description: t("highlight3Desc"),
        },
      ]}
      footer={
        <p className="text-sm leading-7 text-muted-foreground">
          {t("footerPrefix")}{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline underline-offset-4"
          >
            {t("footerLoginLink")}
          </Link>
        </p>
      }
    >
      {legacyDemoLanding ? (
        <>
          <DemoSessionCleaner />
          {demoPublicEnabled ? (
            <>
              <DemoExpiredModal status={demoDisabled ? "disabled" : "expired"} />
              {demoExpired ? (
                <StatusAlert tone="warning">
                  <span className="font-semibold text-foreground">{t("demoExpiredTitle")}</span>{" "}
                  {t("demoExpiredBody", { hours: DEMO_ACCESS_WINDOW_HOURS })}
                </StatusAlert>
              ) : (
                <StatusAlert tone="warning">
                  <span className="font-semibold text-foreground">{t("demoDisabledTitle")}</span>{" "}
                  {t("demoDisabledBody", { hours: DEMO_ACCESS_WINDOW_HOURS })}
                </StatusAlert>
              )}
            </>
          ) : demoExpired ? (
            <StatusAlert tone="warning">
              <span className="font-semibold text-foreground">{t("demoLegacyExpiredLead")}</span>{" "}
              {t("demoLegacyExpiredRest")}{" "}
              <Link href="/login" className="font-medium text-primary underline underline-offset-4">
                {t("demoLegacyExpiredLogin")}
              </Link>
              . {t("demoLegacyExpiredSupport")}{" "}
              <a
                href="mailto:support@getrisknova.com"
                className="font-medium text-primary underline underline-offset-4"
              >
                support@getrisknova.com
              </a>
              .
            </StatusAlert>
          ) : (
            <StatusAlert tone="warning">
              <span className="font-semibold text-foreground">{t("demoLegacyDisabledLead")}</span>{" "}
              {t("demoLegacyDisabledRest")}{" "}
              <Link href="/login" className="font-medium text-primary underline underline-offset-4">
                {t("demoLegacyDisabledLogin")}
              </Link>
              . {t("demoLegacyDisabledHelp")}{" "}
              <a
                href="mailto:support@getrisknova.com"
                className="font-medium text-primary underline underline-offset-4"
              >
                support@getrisknova.com
              </a>
              .
            </StatusAlert>
          )}
        </>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {checkEmail ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {t("checkEmailBanner")}
        </div>
      ) : null}

      <RegisterAccountTypePreview initialCommercial={initialCommercial}>
        <SocialLoginButtons mode="register" />

        <form id="register-individual-form" className="space-y-5">
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            label={t("emailLabel")}
            placeholder={t("emailPlaceholder")}
            hint={t("emailHint")}
          />

          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            label={t("passwordLabel")}
            placeholder={t("passwordPlaceholder")}
            hint={t("passwordHint")}
          />

          <label className="flex gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm leading-6 text-slate-600">
            <input
              type="checkbox"
              name="legalAccepted"
              required
              className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span>
              <a className="font-semibold text-slate-900 underline underline-offset-4" href="/terms">
                {t("legalCheckboxTerms")}
              </a>
              {t("legalCheckboxAfterTerms")}
              <a className="font-semibold text-slate-900 underline underline-offset-4" href="/privacy">
                {t("legalCheckboxPrivacy")}
              </a>
              {t("legalCheckboxAfterPrivacy")}
              <a className="font-semibold text-slate-900 underline underline-offset-4" href="/cookie-policy">
                {t("legalCheckboxCookie")}
              </a>
              {t("legalCheckboxAfterCookie")}
            </span>
          </label>

          <Button type="submit" formAction={signup} className="w-full" size="lg">
            {t("submitButton")}
          </Button>
        </form>
      </RegisterAccountTypePreview>
    </AuthShell>
  );
}
