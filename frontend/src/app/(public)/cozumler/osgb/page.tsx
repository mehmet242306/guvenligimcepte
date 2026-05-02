import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicLegalFooter } from "@/components/layout/public-legal-footer";
import { CommercialLeadPageContent } from "@/components/public/CommercialLeadPageContent";
import { LandingHeroAtmosphere } from "@/components/public/landing-hero-atmosphere";
import { getBillingPlanDef } from "@/lib/billing/plans";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("solutions.osgbPage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const primaryCtaClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-amber-500/20 bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_50%,#FBBF24_100%)] px-7 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(184,134,11,0.28)] transition-all hover:brightness-[1.05] hover-glow";

const secondaryCtaClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[0.06] px-7 text-sm font-semibold text-white transition-colors hover:bg-white/[0.12]";

export default async function OsgbSolutionsPage() {
  const t = await getTranslations("solutions.osgbPage");
  const starterUsd = getBillingPlanDef("starter")?.priceUsd ?? 29;
  const starterPrice = `$${starterUsd}`;

  return (
    <main className="min-h-screen bg-background">
      <PublicHeader />

      <section className="relative overflow-hidden border-b border-white/10 bg-[var(--navy-dark)] text-white">
        <LandingHeroAtmosphere />
        <div className="relative z-[1] mx-auto w-full max-w-[1240px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <span className="tag-label landing-hero-eyebrow landing-hero-enter mb-6 border-amber-400/35 text-amber-100">
            {t("heroEyebrow")}
          </span>
          <h1 className="landing-hero-enter landing-hero-enter--d1 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            {t("heroTitleLead")}{" "}
            <span className="text-accent-serif">{t("heroTitleAccent")}</span>
            {t("heroTitleTrail")}
          </h1>
          <p className="landing-hero-enter landing-hero-enter--d2 mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            {t("heroBody", { starterPrice })}
          </p>
          <div className="landing-hero-enter landing-hero-enter--d3 mt-10 flex flex-wrap gap-3">
            <Link href="/register?commercial=osgb" className={primaryCtaClass}>
              {t("ctaRegister")}
            </Link>
            <a href="#osgb-teklif" className={secondaryCtaClass}>
              {t("ctaForm")}
            </a>
          </div>
          <p className="landing-hero-enter landing-hero-enter--d4 mt-8 text-sm leading-7 text-slate-400">
            {t("footerNoteLead")}{" "}
            <Link href="/cozumler/kurumsal" className="font-semibold text-amber-200 underline underline-offset-4">
              {t("footerNoteLink")}
            </Link>
            {t("footerNoteTrail")}
          </p>
        </div>
      </section>

      <CommercialLeadPageContent mode="osgb" sectionId="osgb-teklif" />

      <PublicLegalFooter />
    </main>
  );
}
