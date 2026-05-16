import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { fetchPublishedConsentVersion } from "@/lib/supabase/consent-api";

type PageProps = {
  params: Promise<{ versionId: string }>;
};

export default async function ConsentDocumentPage({ params }: PageProps) {
  const { versionId } = await params;
  const t = await getTranslations("consentGate");
  const doc = await fetchPublishedConsentVersion(versionId);

  if (!doc) {
    notFound();
  }

  return (
    <main className="min-h-[100dvh] bg-background">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/dash"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("backToPlatform")}
        </Link>

        <div className="mt-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t(`consentType.${doc.consent_type}`)}
            <span className="mx-2">·</span>
            {doc.version}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{doc.title}</h1>
        </div>

        <article className="mt-8 rounded-2xl border border-border bg-card px-4 py-5 sm:px-6">
          <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">{doc.content_markdown}</div>
        </article>
      </div>
    </main>
  );
}
