import { PublicHeader } from "@/components/layout/public-header";
import { PublicLegalFooter } from "@/components/layout/public-legal-footer";
import { PaddlePaymentLinkHandler } from "@/components/billing/PaddlePaymentLinkHandler";
import { PricingPlansClient } from "./PricingPlansClient";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background">
      <PaddlePaymentLinkHandler />
      <PublicHeader />

      <section className="border-b border-white/10 bg-[var(--navy-dark)] text-white">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
              Bireysel planlar
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              ISG profesyonelleri icin net ve olceklenebilir paketler.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
              Free ile deneyin; Starter, Plus ve Professional kademeleriyle
              Nova, risk analizi, saha denetimi ve dokuman uretimini calisma
              temponuza gore buyutun.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-4 py-10 sm:px-6 lg:px-8">
        <PricingPlansClient />
      </section>

      <PublicLegalFooter />
    </main>
  );
}
