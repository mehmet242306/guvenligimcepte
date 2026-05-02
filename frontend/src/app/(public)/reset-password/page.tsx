import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResetPasswordSessionClient } from "./ResetPasswordSessionClient";
import { updatePasswordAction } from "./actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; required?: string; mfa?: string }>;
}) {
  const params = await searchParams;
  const code = params?.code;
  const error = params?.error;
  const required = params?.required === "1";
  const mfaRequired = params?.mfa === "1";
  const t = await getTranslations("auth.resetPage");

  return (
    <AuthShell
      eyebrow={required ? t("eyebrowTemp") : t("eyebrow")}
      title={required ? t("titleRequired") : t("title")}
      description={required ? t("descriptionRequired") : t("description")}
      footer={
        <p className="text-sm leading-7 text-muted-foreground">
          <Link
            href="/login"
            className="font-medium text-primary underline underline-offset-4"
          >
            {t("backToLogin")}
          </Link>
        </p>
      }
    >
      <ResetPasswordSessionClient code={code} />

      {required ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          {t("requiredBanner")}
        </div>
      ) : null}

      {mfaRequired ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
          {t("mfaBanner")}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <form className="space-y-5">
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

        <Button type="submit" formAction={updatePasswordAction} className="w-full" size="lg">
          {t("submitButton")}
        </Button>
      </form>
    </AuthShell>
  );
}
