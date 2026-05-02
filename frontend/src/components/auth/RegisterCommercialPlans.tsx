"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Building2, BriefcaseBusiness, Check } from "lucide-react";
import {
  OSGB_COMMERCIAL_PACKAGE_CODES,
  osgbOfferDisplayPricing,
  osgbPackageRecommended,
  type CommercialInterestType,
  type OsgbCommercialPackageCode,
} from "@/lib/account/register-offers";
import { getBillingPlanDef } from "@/lib/billing/plans";
import { Button } from "@/components/ui/button";
import { CommercialLeadDialog } from "@/components/auth/CommercialLeadDialog";
import { cn } from "@/lib/utils";

export type CommercialPlansTone = "dark" | "light";
export type CommercialPlansMode = "both" | "osgb" | "enterprise";

export type RegisterCommercialPlansProps = {
  tone?: CommercialPlansTone;
  mode?: CommercialPlansMode;
  countryCode?: string;
  languageCode?: string;
  leadSourcePage?: "register" | "cozumler_kurumsal" | "cozumler_osgb" | "landing_demo";
  onRequestLead?: (type: CommercialInterestType) => void;
  className?: string;
};

type OfferCopy = {
  name: string;
  pricePeriod: string;
  priceFinePrint: string;
  summary: string;
  workspacesLabel: string;
  seatsLabel: string;
  features: string[];
  ctaLabel: string;
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
  const t = useTranslations("solutions.commercial");
  const [internalLeadType, setInternalLeadType] =
    useState<CommercialInterestType | null>(null);

  const individualStarter = useMemo(
    () => `$${getBillingPlanDef("starter")?.priceUsd ?? 29}`,
    [],
  );

  const enterpriseHighlights = t.raw("enterpriseHighlights") as string[];

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
    : "rounded-[1.75rem] border border-amber-400/18 bg-gradient-to-b from-white/[0.09] to-white/[0.03] p-6 shadow-[0_28px_90px_-48px_rgba(0,0,0,0.65)] backdrop-blur-md sm:p-7";

  const eyebrow = isLight
    ? "text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-200/90"
    : "text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/90";

  const cardShell = isLight
    ? "rounded-2xl border border-border bg-secondary/25 p-4"
    : "group rounded-[1.4rem] border border-white/12 bg-slate-950/40 p-5 backdrop-blur-sm";

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

  function resolveOfferCopy(code: OsgbCommercialPackageCode): OfferCopy {
    const raw = t.raw(`offers.${code}`) as Omit<OfferCopy, "summary"> & { summary: string };
    return {
      ...raw,
      summary: t(`offers.${code}.summary`, { individualStarter }),
    };
  }

  return (
    <>
      <div className={cn("space-y-5 text-sm leading-7", isLight ? "text-foreground" : "text-white/92", className)}>
        {showOsgb ? (
          <div className={sectionShell}>
            <div data-landing-reveal>
              <div className={cn("flex items-center gap-2", eyebrow)}>
                <BriefcaseBusiness className="h-4 w-4" />
                {t("osgbSectionTitle")}
              </div>
              <p className={cn("mt-3 max-w-3xl text-sm leading-7", bodyCls)}>{t("osgbSectionIntro")}</p>
            </div>
            <div className="mt-6 grid gap-5 xl:grid-cols-2">
              {OSGB_COMMERCIAL_PACKAGE_CODES.map((code, index) => {
                const offer = resolveOfferCopy(code);
                const pricing = osgbOfferDisplayPricing[code];
                const recommended = osgbPackageRecommended[code];
                return (
                  <div
                    key={code}
                    data-landing-reveal
                    data-stagger={String(Math.min(index + 1, 5))}
                    className={cn(
                      cardShell,
                      "hover-lift transition-shadow duration-300",
                      !isLight &&
                        "hover:border-amber-400/25 hover:shadow-[0_24px_60px_-28px_rgba(251,191,36,0.22)]",
                      recommended &&
                        (isLight
                          ? "ring-2 ring-amber-500/35 shadow-md"
                          : "ring-2 ring-amber-400/35 shadow-[0_20px_50px_-24px_rgba(251,191,36,0.35)]"),
                    )}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex flex-wrap items-center gap-2 gap-y-1">
                          <p className={titleCls}>{offer.name}</p>
                          {recommended ? (
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                                isLight
                                  ? "bg-amber-500/20 text-amber-900 dark:text-amber-100"
                                  : "bg-amber-400/15 text-amber-100",
                              )}
                            >
                              {t("recommended")}
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
                          {pricing.priceCurrency}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-3xl font-semibold tracking-tight tabular-nums",
                            isLight ? "text-foreground" : "text-white",
                          )}
                        >
                          {pricing.priceAmount}
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
                );
              })}
            </div>

            {mode === "osgb" ? (
              <p className={cn("mt-4 text-xs", isLight ? "text-muted-foreground" : "text-white/70")}>
                {t("osgbFooterHint")}{" "}
                <Link
                  href="/cozumler/kurumsal"
                  className={cn(
                    "font-semibold underline underline-offset-4",
                    isLight ? "text-primary" : "text-amber-200",
                  )}
                >
                  {t("osgbFooterLink")}
                </Link>
                .
              </p>
            ) : null}
          </div>
        ) : null}

        {showEnterprise ? (
          <div
            data-landing-reveal
            data-stagger="3"
            className={cn(
              "rounded-[1.75rem] p-5 transition-shadow",
              isLight
                ? "border border-amber-400/20 bg-amber-400/8"
                : "border border-amber-400/18 bg-gradient-to-br from-black/35 to-black/20 backdrop-blur-sm hover-lift",
            )}
          >
            <div className={cn("flex items-center gap-2", eyebrow)}>
              <Building2 className="h-4 w-4" />
              {t("enterpriseSectionTitle")}
            </div>
            <p className={cn("mt-3 text-sm leading-7", isLight ? "text-muted-foreground" : "text-white/82")}>
              {t("enterpriseSectionIntro")}
            </p>
            <ul className={cn("mt-4 space-y-2 text-sm", isLight ? "text-muted-foreground" : "text-white/78")}>
              {enterpriseHighlights.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", featureBullet)} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" onClick={() => openLead("enterprise")}>
                {t("enterpriseCta")}
              </Button>
              <Button type="button" variant="outline" className={outlineBtn} onClick={() => openLead("osgb")}>
                {t("enterpriseSecondaryCta")}
              </Button>
            </div>

            {mode === "enterprise" ? (
              <p className={cn("mt-4 text-xs", isLight ? "text-muted-foreground" : "text-white/70")}>
                {t("enterpriseFooterHint")}{" "}
                <Link
                  href="/cozumler/osgb"
                  className={cn(
                    "font-semibold underline underline-offset-4",
                    isLight ? "text-primary" : "text-amber-200",
                  )}
                >
                  {t("enterpriseFooterLink")}
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
