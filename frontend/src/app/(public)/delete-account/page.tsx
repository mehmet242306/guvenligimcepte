import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicLegalFooter } from "@/components/layout/public-legal-footer";

const DELETION_CONTACT_EMAIL = "mehmet242306@gmail.com";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("deleteAccountPage.meta");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/delete-account" },
    robots: { index: true, follow: true },
    openGraph: {
      title: t("ogTitle"),
      description: t("description"),
      type: "article",
      url: "/delete-account",
    },
  };
}

export default async function DeleteAccountPage() {
  const t = await getTranslations("deleteAccountPage");
  const steps = t.raw("steps") as string[];

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <section className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase text-amber-700">{t("eyebrow")}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-4 text-base leading-8 text-muted-foreground">{t("intro")}</p>

        <section className="mt-10 rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{t("stepsTitle")}</h2>
          <ol className="mt-5 space-y-3 text-base leading-7 text-muted-foreground">
            {steps.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-600" aria-hidden="true" />
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <Link
            href="/profile"
            className="mt-6 inline-flex rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            {t("ctaProfile")}
          </Link>
        </section>

        <section className="mt-8 space-y-4 text-base leading-8 text-muted-foreground">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{t("retainedTitle")}</h2>
          <p>{t("retainedBody")}</p>
          <p>
            {t("contactLead")}{" "}
            <a
              href={`mailto:${DELETION_CONTACT_EMAIL}`}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {DELETION_CONTACT_EMAIL}
            </a>
            {t("contactTrail")}
          </p>
          <p>
            {t("privacyLead")}{" "}
            <Link href="/privacy" className="font-medium text-foreground underline-offset-4 hover:underline">
              {t("privacyPolicy")}
            </Link>
            {t("privacyTrail")}
          </p>
        </section>
      </section>
      <PublicLegalFooter />
    </main>
  );
}
