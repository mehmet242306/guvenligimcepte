"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, BriefcaseBusiness, Check } from "lucide-react";
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
  /** Cozum sayfasi formlarinda lead kaynagi (platform admin filtreleri). */
  leadSourcePage?: "register" | "cozumler_kurumsal" | "cozumler_osgb" | "landing_demo";
  /** Parent diyalog aciyorsa ic ice diyalog olmasin. */
  onRequestLead?: (type: CommercialInterestType) => void;
  className?: string;
};

export function RegisterCommercialPlans({
  tone = "dark",
  mode = "both",
  countryCode = "TR",
  languageCode = "tr",
  leadSourcePage,
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
  const priceBlockShell = isLight
    ? "rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/12 to-amber-600/5 px-4 py-3 text-right shadow-sm"
    : "rounded-2xl border border-amber-300/25 bg-gradient-to-br from-amber-400/12 to-amber-600/5 px-4 py-3 text-right shadow-[0_0_0_1px_rgba(251,191,36,0.06)_inset]";

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
            <p className={cn("mt-3 max-w-3xl text-sm leading-7", bodyCls)}>
              Tutarlar{" "}
              <span className={cn("font-semibold", isLight ? "text-foreground" : "text-white/90")}>USD</span> cinsinden
              gösterge başlangıç segmentleridir; vergi, kur ve sözleşme kapsamı teklif netleşince yazılır. Kartla ödeme
              yok — önce yapınızı paylaşıp size özel limit ve fiyatı birlikte belirliyoruz.
            </p>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {osgbPackageOffers.map((offer) => (
                <div
                  key={offer.code}
                  className={cn(
                    cardShell,
                    "transition-shadow",
                    offer.recommended &&
                      (isLight
                        ? "ring-2 ring-amber-500/35 shadow-md"
                        : "ring-2 ring-amber-400/35 shadow-[0_20px_50px_-24px_rgba(251,191,36,0.35)]"),
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex flex-wrap items-center gap-2 gap-y-1">
                        <p className={titleCls}>{offer.name}</p>
                        {offer.recommended ? (
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                              isLight
                                ? "bg-amber-500/20 text-amber-900 dark:text-amber-100"
                                : "bg-amber-400/15 text-amber-100",
                            )}
                          >
                            Önerilen
                          </span>
                        ) : null}
                      </div>
                      <p className={cn("mt-1.5", bodyCls)}>{offer.summary}</p>
                    </div>
                    <div className={cn("shrink-0 sm:min-w-[9.5rem]", priceBlockShell)}>
                      <p
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-wider",
                          isLight ? "text-amber-900/70 dark:text-amber-200/80" : "text-white/55",
                        )}
                      >
                        {offer.priceCurrency}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-3xl font-semibold tracking-tight tabular-nums",
                          isLight ? "text-foreground" : "text-white",
                        )}
                      >
                        {offer.priceAmount}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-xs font-medium",
                          isLight ? "text-muted-foreground" : "text-white/75",
                        )}
                      >
                        {offer.pricePeriod}
                      </p>
                    </div>
                  </div>

                  <p className={cn("mt-4 text-xs leading-5", isLight ? "text-muted-foreground" : "text-white/60")}>
                    {offer.priceFinePrint}
                  </p>

                  <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                    <div className={pillCls}>{offer.workspacesLabel}</div>
                    <div className={pillCls}>{offer.seatsLabel}</div>
                  </div>

                  <ul className={cn("mt-4 space-y-2.5", featureText)}>
                    {offer.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            isLight ? "text-amber-600 dark:text-amber-400" : "text-amber-300",
                          )}
                          strokeWidth={2.5}
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5">
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
              Cok lokasyonlu firmalar, saha agirlikli yapilar ve ozel kurgular icin bu sayfada kartla odeme yoktur.
              Once sizi tanimak, ihtiyacinizi netlestirmek ve size ozel teklif sunmak icin bizimle iletisime gecmenizi
              rica ederiz; formu doldurdugunuzda satis ekibimiz size doner.
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
          sourcePage={leadSourcePage}
        />
      )}
    </>
  );
}
