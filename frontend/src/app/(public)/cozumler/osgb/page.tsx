import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicLegalFooter } from "@/components/layout/public-legal-footer";
import { CommercialLeadPageContent } from "@/components/public/CommercialLeadPageContent";
import { LandingHeroAtmosphere } from "@/components/public/landing-hero-atmosphere";

export const metadata: Metadata = {
  title: "OSGB çözümü ve teklif | RiskNova",
  description:
    "Birden fazla işyerine hizmet veren OSGB’ler için paket seçenekleri ve özelleştirilmiş teklif talebi.",
};

const primaryCtaClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-amber-500/20 bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_50%,#FBBF24_100%)] px-7 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(184,134,11,0.28)] transition-all hover:brightness-[1.05] hover-glow";

const secondaryCtaClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[0.06] px-7 text-sm font-semibold text-white transition-colors hover:bg-white/[0.12]";

export default function OsgbSolutionsPage() {
  return (
    <main className="min-h-screen bg-background">
      <PublicHeader />

      <section className="relative overflow-hidden border-b border-white/10 bg-[var(--navy-dark)] text-white">
        <LandingHeroAtmosphere />
        <div className="relative z-[1] mx-auto w-full max-w-[1240px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <span className="tag-label landing-hero-eyebrow landing-hero-enter mb-6 border-amber-400/35 text-amber-100">
            OSGB
          </span>
          <h1 className="landing-hero-enter landing-hero-enter--d1 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Firma portföyünüzü ve ekibinizi{" "}
            <span className="text-accent-serif">tek panelde</span> toplayın.
          </h1>
          <p className="landing-hero-enter landing-hero-enter--d2 mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Personel, görev takibi ve müşteri işyerleri ile çalışma düzeninizi netleştirin. Bireysel paketlerimiz{" "}
            <span className="font-semibold text-white">29 $/ay</span> Starter ile başlar; OSGB modeli çoklu işyeri
            portföyü ve ek koltukları kapsadığı için aşağıdaki tutarlar{" "}
            <span className="font-semibold text-white">USD</span> üzerinden gösterge segmentlerdir — kesin koşullar
            teklif formu veya kayıt akışı sonrası netleşir.
          </p>
          <div className="landing-hero-enter landing-hero-enter--d3 mt-10 flex flex-wrap gap-3">
            <Link href="/register?commercial=osgb" className={primaryCtaClass}>
              Kayıt üzerinden teklif talebi
            </Link>
            <a href="#osgb-teklif" className={secondaryCtaClass}>
              Teklif formuna git
            </a>
          </div>
          <p className="landing-hero-enter landing-hero-enter--d4 mt-8 text-sm leading-7 text-slate-400">
            Çok lokasyonlu tek işyeri modeli için{" "}
            <Link href="/cozumler/kurumsal" className="font-semibold text-amber-200 underline underline-offset-4">
              kurumsal çözüm sayfası
            </Link>
            .
          </p>
        </div>
      </section>

      <CommercialLeadPageContent mode="osgb" sectionId="osgb-teklif" />

      <PublicLegalFooter />
    </main>
  );
}
