import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicLegalFooter } from "@/components/layout/public-legal-footer";
import { SupportForm } from "./SupportForm";

const supportEmail = "support@getrisknova.com";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("support.meta");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/support" },
    robots: { index: true, follow: true },
    openGraph: {
      title: t("title"),
      description: t("description"),
      type: "website",
      url: "/support",
    },
  };
}

export default async function SupportPage() {
  const t = await getTranslations("support");
  const topics = ["account", "mobile", "billing", "privacy"] as const;

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase text-amber-700">{t("eyebrow")}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">{t("description")}</p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{t("formTitle")}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{t("formDescription")}</p>
            <div className="mt-6">
              <SupportForm />
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("directTitle")}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{t("directDescription")}</p>
              <a
                href={`mailto:${supportEmail}?subject=RiskNova%20Support%20Request`}
                className="mt-5 inline-flex rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                {supportEmail}
              </a>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {topics.map((topic) => (
                <article key={topic} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {t(`topics.${topic}.title`)}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {t(`topics.${topic}.description`)}
                  </p>
                </article>
              ))}
            </section>
          </aside>
        </div>

        <section className="mt-8 rounded-lg border border-border bg-card p-6 text-base leading-8 text-muted-foreground">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{t("linksTitle")}</h2>
          <p className="mt-3">
            {t("linksLead")}{" "}
            <Link href="/privacy" className="font-medium text-foreground underline-offset-4 hover:underline">
              {t("privacy")}
            </Link>
            ,{" "}
            <Link href="/terms" className="font-medium text-foreground underline-offset-4 hover:underline">
              {t("terms")}
            </Link>
            ,{" "}
            <Link href="/delete-account" className="font-medium text-foreground underline-offset-4 hover:underline">
              {t("deleteAccount")}
            </Link>
            .
          </p>
        </section>
      </section>
      <PublicLegalFooter />
    </main>
  );
}
