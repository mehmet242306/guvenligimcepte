import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicLegalFooter } from "@/components/layout/public-legal-footer";

type Section = { title: string; content: string };

export async function legalSectionsMetadata(
  docKey: "privacy" | "terms",
  canonicalPath: string,
): Promise<Metadata> {
  const t = await getTranslations(`legal.${docKey}`);
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "article",
      url: canonicalPath,
    },
  };
}

export async function legalParagraphsMetadata(
  namespace: string,
  canonicalPath: string,
): Promise<Metadata> {
  const t = await getTranslations(namespace);
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "article",
      url: canonicalPath,
    },
  };
}

/** @deprecated Prefer `legalParagraphsMetadata("legal.refund", path)`. */
export async function legalRefundMetadata(canonicalPath: string): Promise<Metadata> {
  return legalParagraphsMetadata("legal.refund", canonicalPath);
}

export async function LegalSectionsDocument({
  docKey,
}: {
  docKey: "privacy" | "terms";
}) {
  const t = await getTranslations(`legal.${docKey}`);
  const sections = t.raw("sections") as Section[];

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <section className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase text-amber-700">{t("eyebrow")}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">{t("lastUpdated")}</p>
        <div className="mt-8 space-y-7 text-base leading-8 text-muted-foreground">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{section.title}</h2>
              <p className="mt-2">{section.content}</p>
            </section>
          ))}
        </div>
      </section>
      <PublicLegalFooter />
    </main>
  );
}

export async function LegalParagraphsDocument({
  namespace = "legal.refund",
}: {
  namespace?: string;
} = {}) {
  const t = await getTranslations(namespace);
  const paragraphs = t.raw("paragraphs") as string[];

  return (
    <main className="min-h-screen bg-background">
      <PublicHeader />
      <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase text-amber-700">{t("eyebrow")}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">{t("lastUpdated")}</p>
        <div className="mt-8 space-y-6 text-base leading-8 text-muted-foreground">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>
      <PublicLegalFooter />
    </main>
  );
}
