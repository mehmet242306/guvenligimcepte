import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendResetLink } from "./actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;
  const sent = params?.sent === "1";
  const t = await getTranslations("auth.forgotPage");

  return (
    <AuthShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
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
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {sent ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {t("sentBanner")}
        </div>
      ) : null}

      <form className="space-y-5">
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

        <Button type="submit" formAction={sendResetLink} className="w-full" size="lg">
          {t("submitButton")}
        </Button>
      </form>
    </AuthShell>
  );
}
