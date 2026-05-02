import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicLegalFooter } from "@/components/layout/public-legal-footer";
import { CommercialLeadPageContent } from "@/components/public/CommercialLeadPageContent";

export const metadata: Metadata = {
  title: "Kurumsal çözüm ve teklif | RiskNova",
  description:
    "Çok lokasyonlu ve özel gereksinimli işyerleri için RiskNova kurumsal teklif talebi ve iletişim.",
};

export default async function KurumsalSolutionsPage() {
  return (
    <main className="min-h-screen bg-background">
      <PublicHeader />

      <section className="border-b border-white/10 bg-[var(--navy-dark)] text-white">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <span className="inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
            Kurumsal
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Lokasyonlarınız için tutarlı İSG operasyonu ve özel kurulum.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
            Kurumsal kullanımda kartla self-servis ödeme sunmuyoruz. İhtiyacınızı paylaşın; satış ekibimiz size özel
            teklif, limitler ve kurulum için iletişime geçsin.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register?commercial=enterprise"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-amber-500/30 bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_50%,#FBBF24_100%)] px-5 text-sm font-semibold text-white"
            >
              Kayıt üzerinden teklif talebi
            </Link>
            <a
              href="#kurumsal-teklif"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/15"
            >
              Bizimle iletişime geçin (form)
            </a>
          </div>
          <p className="mt-6 text-sm text-white/65">
            OSGB olarak hizmet veriyorsanız{" "}
            <Link href="/cozumler/osgb" className="font-semibold text-amber-200 underline underline-offset-4">
              OSGB paket sayfası
            </Link>
            .
          </p>
        </div>
      </section>

      <CommercialLeadPageContent mode="enterprise" sectionId="kurumsal-teklif" />
      <PublicLegalFooter />
    </main>
  );
}
