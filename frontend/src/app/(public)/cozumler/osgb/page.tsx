import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicLegalFooter } from "@/components/layout/public-legal-footer";
import { CommercialLeadPageContent } from "@/components/public/CommercialLeadPageContent";

export const metadata: Metadata = {
  title: "OSGB çözümü ve teklif | RiskNova",
  description:
    "Birden fazla işyerine hizmet veren OSGB’ler için paket seçenekleri ve özelleştirilmiş teklif talebi.",
};

export default function OsgbSolutionsPage() {
  return (
    <main className="min-h-screen bg-background">
      <PublicHeader />

      <section className="border-b border-white/10 bg-[var(--navy-dark)] text-white">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <span className="inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
            OSGB
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Firma portföyünüzü ve ekibinizi tek panelde toplayın.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
            Personel, görev takibi ve müşteri işyerleri ile çalışma düzeninizi netleştirin. Bireysel paketlerimiz{" "}
            <span className="font-semibold text-white/88">29 $/ay</span> Starter ile başlar; OSGB modeli çoklu işyeri
            portföyü ve ek koltukları kapsadığı için aşağıdaki tutarlar{" "}
            <span className="font-semibold text-white/88">USD</span> üzerinden gösterge segmentlerdir — kesin koşullar
            teklif formu veya kayıt akışı sonrası netleşir.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register?commercial=osgb"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-amber-500/30 bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_50%,#FBBF24_100%)] px-5 text-sm font-semibold text-white"
            >
              Kayıt üzerinden teklif talebi
            </Link>
            <a
              href="#osgb-teklif"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/15"
            >
              Teklif formuna in
            </a>
          </div>
          <p className="mt-6 text-sm text-white/65">
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
