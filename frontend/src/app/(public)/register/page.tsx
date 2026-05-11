import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import { RegisterAccountTypePreview } from "@/components/auth/RegisterAccountTypePreview";
import { signup } from "./actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    checkEmail?: string;
    commercial?: string;
  }>;
}) {
  const params = await searchParams;
  const error = params?.error;
  const checkEmail = params?.checkEmail === "1";
  const commercialParam = params?.commercial?.toLowerCase();
  const initialCommercial =
    commercialParam === "osgb" || commercialParam === "enterprise"
      ? commercialParam
      : undefined;

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
