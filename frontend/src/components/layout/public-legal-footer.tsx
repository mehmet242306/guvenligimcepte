import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PublicLegalBar } from "@/components/layout/public-site-footer";

export async function PublicLegalFooter() {
  const t = await getTranslations("landing");

  return (
    <footer className="mt-auto border-t border-border/70 bg-background">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-8 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <div className="font-semibold text-foreground">
          <Link href="/" className="hover:underline">
            RiskNova
          </Link>
        </div>
        <p className="mt-3 max-w-3xl leading-7">
          {t("subscriptionDisclaimer")}{" "}
          <Link href="/privacy" className="font-medium text-foreground underline-offset-4 hover:underline">
            {t("footerPrivacy")}
          </Link>
          {" · "}
          <Link href="/terms" className="font-medium text-foreground underline-offset-4 hover:underline">
            {t("footerTerms")}
          </Link>
          {" · "}
          <Link href="/cookie-policy" className="font-medium text-foreground underline-offset-4 hover:underline">
            Çerez Politikası
          </Link>
          .
        </p>
      </div>
      <PublicLegalBar />
    </footer>
  );
}
