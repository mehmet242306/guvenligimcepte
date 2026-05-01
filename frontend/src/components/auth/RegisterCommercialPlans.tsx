"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, BriefcaseBusiness } from "lucide-react";
import {
  companyOfferHighlights,
  osgbPackageOffers,
  type CommercialInterestType,
} from "@/lib/account/register-offers";
import { Button } from "@/components/ui/button";
import { CommercialLeadDialog } from "@/components/auth/CommercialLeadDialog";
import { cn } from "@/lib/utils";

export type CommercialPlansTone = "dark" | "light";
export type CommercialPlansMode = "both" | "osgb" | "enterprise";

export type RegisterCommercialPlansProps = {
  tone?: CommercialPlansTone;
  /** Hangi bloklar gorunsun (kayit akisinda tek kanala odaklanmak icin). */
  mode?: CommercialPlansMode;
  countryCode?: string;
  languageCode?: string;
  /** Parent diyalog aciyorsa ic ice diyalog olmasin. */
  onRequestLead?: (type: CommercialInterestType) => void;
  className?: string;
};

export function RegisterCommercialPlans({
  tone = "dark",
  mode = "both",
  countryCode = "TR",
  languageCode = "tr",
  onRequestLead,
  className,
}: RegisterCommercialPlansProps) {
  const [internalLeadType, setInternalLeadType] =
    useState<CommercialInterestType | null>(null);

  const openLead = (type: CommercialInterestType) => {
    if (onRequestLead) {
      onRequestLead(type);
      return;
    }
    setInternalLeadType(type);
  };

  const showOsgb = mode === "both" || mode === "osgb";
  const showEnterprise = mode === "both" || mode === "enterprise";

  const isLight = tone === "light";

  const sectionShell = isLight
    ? "rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5"
    : "rounded-[1.75rem] border border-white/10 bg-white/6 p-5 backdrop-blur-sm";

  const eyebrow = isLight
    ? "text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-200/90"
    : "text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/90";

  const cardShell = isLight
    ? "rounded-2xl border border-border bg-secondary/25 p-4"
    : "rounded-[1.4rem] border border-white/10 bg-slate-950/28 p-4";

  const titleCls = isLight ? "text-base font-semibold text-foreground" : "text-base font-semibold text-white";
  const bodyCls = isLight ? "text-sm text-muted-foreground" : "text-sm text-white/72";
  const priceCls = isLight
    ? "rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-900 dark:text-amber-100"
    : "rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-sm font-semibold text-amber-100";

  const pillCls = isLight
    ? "rounded-2xl border border-border bg-background/80 px-3 py-2 text-xs text-muted-foreground"
    : "rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/78";

  const featureBullet = isLight ? "bg-amber-600 dark:bg-amber-300" : "bg-amber-300";
  const featureText = isLight ? "text-sm text-foreground/90" : "text-sm text-white/80";

  const outlineBtn = isLight
    ? "w-full border-border bg-secondary/40 hover:bg-secondary/60"
    : "w-full border-white/10 bg-white/8 text-white hover:bg-white/12";

  return (
    <>
      <div className={cn("space-y-5 text-sm leading-7", isLight ? "text-foreground" : "text-white/92", className)}>
        {showOsgb ? (
          <div className={sectionShell}>
            <div className={cn("flex items-center gap-2", eyebrow)}>
              <BriefcaseBusiness className="h-4 w-4" />
              OSGB paketleri
            </div>
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {osgbPackageOffers.map((offer) => (
                <div key={offer.code} className={cardShell}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={titleCls}>{offer.name}</p>
                      <p className={cn("mt-1", bodyCls)}>{offer.summary}</p>
                    </div>
                    <div className={priceCls}>{offer.priceLabel}</div>
                  </div>

                  <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                    <div className={pillCls}>{offer.workspacesLabel}</div>
                    <div className={pillCls}>{offer.seatsLabel}</div>
                  </div>

                  <ul className={cn("mt-4 space-y-2", featureText)}>
                    {offer.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", featureBullet)} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4">
                    <Button variant="outline" className={outlineBtn} onClick={() => openLead("osgb")}>
                      {offer.ctaLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {mode === "osgb" ? (
              <p className={cn("mt-4 text-xs", isLight ? "text-muted-foreground" : "text-white/70")}>
                Çok lokasyonlu tek işyeri mi?{" "}
                <Link
                  href="/cozumler/kurumsal"
                  className={cn(
                    "font-semibold underline underline-offset-4",
                    isLight ? "text-primary" : "text-amber-200",
                  )}
                >
                  Kurumsal çözüm sayfasına bakın
                </Link>
                .
              </p>
            ) : null}
          </div>
        ) : null}

        {showEnterprise ? (
          <div
            className={cn(
              "rounded-[1.75rem] p-5",
              isLight
                ? "border border-amber-400/20 bg-amber-400/8"
                : "border border-amber-400/14 bg-black/22",
            )}
          >
            <div className={cn("flex items-center gap-2", eyebrow)}>
              <Building2 className="h-4 w-4" />
              Firma / kurumsal özel teklif
            </div>
            <p className={cn("mt-3 text-sm leading-7", isLight ? "text-muted-foreground" : "text-white/82")}>
              Çok lokasyonlu firmalar, saha ağırlıklı yapılar ve özel kurgular için self-servis yerine önce sizi
              tanımak istiyoruz. Yapınıza uygun paketler, seçenekler ve kurulum için satış ekibiyle görüşün.
            </p>
            <ul className={cn("mt-4 space-y-2 text-sm", isLight ? "text-muted-foreground" : "text-white/78")}>
              {companyOfferHighlights.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", featureBullet)} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" onClick={() => openLead("enterprise")}>
                Teklif talebi oluştur
              </Button>
              <Button type="button" variant="outline" className={outlineBtn} onClick={() => openLead("osgb")}>
                OSGB paketi için yazın
              </Button>
            </div>

            {mode === "enterprise" ? (
              <p className={cn("mt-4 text-xs", isLight ? "text-muted-foreground" : "text-white/70")}>
                OSGB olarak hizmet veriyorsanız{" "}
                <Link
                  href="/cozumler/osgb"
                  className={cn(
                    "font-semibold underline underline-offset-4",
                    isLight ? "text-primary" : "text-amber-200",
                  )}
                >
                  OSGB paket sayfasına gidin
                </Link>
                .
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {onRequestLead ? null : (
        <CommercialLeadDialog
          accountType={internalLeadType ?? "enterprise"}
          open={internalLeadType !== null}
          onClose={() => setInternalLeadType(null)}
          countryCode={countryCode}
          languageCode={languageCode}
        />
      )}
    </>
  );
}
