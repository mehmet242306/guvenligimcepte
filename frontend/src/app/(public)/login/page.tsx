import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string; passwordUpdated?: string; next?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;
  const reset = params?.reset === "1" || params?.passwordUpdated === "1";
  const next = params?.next || "/dashboard";
  const t = await getTranslations("auth.loginPage");

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
      spotlight={
        <div className="space-y-3 text-sm leading-7 text-white/92">
          <p>{t("spotlightP1")}</p>
          <p>{t("spotlightP2")}</p>
        </div>
      }
      footer={
        <p className="text-sm leading-7 text-muted-foreground">
          {t("footerPrefix")}{" "}
          <Link
            href="/register"
            className="font-medium text-primary underline underline-offset-4"
          >
            {t("footerRegisterLink")}
          </Link>
        </p>
      }
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {reset ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {t("passwordUpdatedBanner")}
        </div>
      ) : null}

      <SocialLoginButtons mode="login" nextPath={next} />

      <form className="space-y-5">
        <input type="hidden" name="next" value={next} />

        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          label={t("emailLabel")}
          placeholder={t("emailPlaceholder")}
        />

        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          label={t("passwordLabel")}
          placeholder={t("passwordPlaceholder")}
        />

        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary underline underline-offset-4"
          >
            {t("forgotLink")}
          </Link>
        </div>

        <Button type="submit" formAction={login} className="w-full" size="lg">
          {t("submitButton")}
        </Button>
      </form>
    </AuthShell>
  );
}
