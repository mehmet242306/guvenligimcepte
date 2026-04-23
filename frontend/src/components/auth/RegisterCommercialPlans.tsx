"use client";

import { useState } from "react";
import { ArrowRight, Building2, BriefcaseBusiness } from "lucide-react";
import {
  companyOfferHighlights,
  osgbPackageOffers,
  type CommercialInterestType,
} from "@/lib/account/register-offers";
import { Button } from "@/components/ui/button";
import { CommercialLeadDialog } from "@/components/auth/CommercialLeadDialog";

export function RegisterCommercialPlans() {
  const [activeLeadType, setActiveLeadType] =
    useState<CommercialInterestType | null>(null);

  return (
    <>
      <div className="space-y-5 text-sm leading-7 text-white/92">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/90">
            <BriefcaseBusiness className="h-4 w-4" />
            OSGB paketleri
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {osgbPackageOffers.map((offer) => (
              <div
                key={offer.code}
                className="rounded-[1.4rem] border border-white/10 bg-slate-950/28 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">
                      {offer.name}
                    </p>
                    <p className="mt-1 text-sm text-white/72">
                      {offer.summary}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-sm font-semibold text-amber-100">
                    {offer.priceLabel}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-xs text-white/78 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    {offer.workspacesLabel}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    {offer.seatsLabel}
                  </div>
                </div>

                <ul className="mt-4 space-y-2 text-sm text-white/80">
                  {offer.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-300" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="w-full border-white/10 bg-white/8 text-white hover:bg-white/12"
                    onClick={() => setActiveLeadType("osgb")}
                  >
                    {offer.ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-amber-400/14 bg-black/22 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/90">
            <Building2 className="h-4 w-4" />
            Firma / kurumsal ozel teklif
          </div>
          <p className="mt-3 text-sm leading-7 text-white/82">
            Cok lokasyonlu firmalar, saha agir yapilar ve ozel kurgular icin
            self-service yerine sizi tanimak istiyoruz. Yapiniza uygun paketler,
            secenekler ve kurulum adimlari icin gelistirici ekiple gorusebilirsiniz.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-white/78">
            {companyOfferHighlights.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => setActiveLeadType("enterprise")}>
              Gelistirici ile iletisime gec
            </Button>
            <Button
              variant="outline"
              className="border-white/10 bg-white/8 text-white hover:bg-white/12"
              onClick={() => setActiveLeadType("osgb")}
            >
              OSGB icin ozel teklif iste
            </Button>
          </div>
        </div>
      </div>

      <CommercialLeadDialog
        accountType={activeLeadType ?? "enterprise"}
        open={activeLeadType !== null}
        onClose={() => setActiveLeadType(null)}
      />
    </>
  );
}
