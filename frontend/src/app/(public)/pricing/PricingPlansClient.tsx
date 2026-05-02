"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  Check,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PricingCheckoutButton } from "@/components/billing/PricingCheckoutButton";
import {
  formatLimitNumber,
  INDIVIDUAL_BILLING_PLAN_DEFS,
  type BillingCycle,
  type BillingPlanDefinition,
} from "@/lib/billing/plans";

const keyLimitRows = [
  "nova_message",
  "ai_analysis",
  "document_generation",
  "risk_analysis",
] as const;

type PlanCopy = {
  name: string;
  whoFor: string;
  description: string;
  upgradeHint: string;
  features: string[];
};

function getDisplayPrice(
  monthlyPrice: number,
  cycle: BillingCycle,
  locale: string,
  t: ReturnType<typeof useTranslations<"pricing">>,
) {
  if (monthlyPrice === 0) {
    return {
      main: "$0",
      suffix: t("priceSuffixMonth"),
      note: t("priceFreeNote"),
    };
  }

  if (cycle === "yearly") {
    const yearlyPrice = monthlyPrice * 10;
    const monthlyEquivalent = yearlyPrice / 12;
    const main = `$${yearlyPrice.toLocaleString(locale)}`;
    return {
      main,
      suffix: t("priceSuffixYear"),
      note: t("priceYearlyNote", {
        monthly: `$${Math.round(monthlyEquivalent).toLocaleString(locale)}`,
      }),
    };
  }

  return {
    main: `$${monthlyPrice.toLocaleString(locale)}`,
    suffix: t("priceSuffixMonth"),
    note: t("priceMonthlyNote"),
  };
}

function formatQuotaValue(
  value: number,
  locale: string,
  t: ReturnType<typeof useTranslations<"pricing">>,
) {
  if (value === 0) return t("limitNotIncluded");
  return formatLimitNumber(value, locale);
}

function CardBillingToggle({
  cycle,
  onChange,
}: {
  cycle: BillingCycle;
  onChange: (next: BillingCycle) => void;
}) {
  const t = useTranslations("pricing");
  return (
    <div
      className="w-full rounded-lg border-2 border-amber-400/55 bg-amber-50 p-1 shadow-sm dark:bg-amber-950/20"
      role="group"
      aria-label={t("billingPeriodAria")}
    >
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => onChange("monthly")}
          className={[
            "h-9 rounded-md px-2 text-xs font-bold transition sm:h-10 sm:px-3 sm:text-sm",
            cycle === "monthly"
              ? "bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_50%,#FBBF24_100%)] text-white shadow-md"
              : "bg-transparent text-amber-900 hover:bg-white/70 dark:text-amber-100",
          ].join(" ")}
        >
          {t("monthly")}
        </button>
        <button
          type="button"
          onClick={() => onChange("yearly")}
          className={[
            "h-9 rounded-md px-2 text-xs font-bold leading-tight transition sm:h-10 sm:px-3 sm:text-sm sm:leading-none",
            cycle === "yearly"
              ? "bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_50%,#FBBF24_100%)] text-white shadow-md"
              : "bg-transparent text-amber-900 hover:bg-white/70 dark:text-amber-100",
          ].join(" ")}
        >
          {t("yearly")}{" "}
          <span className="hidden font-semibold opacity-90 sm:inline">{t("yearlyBadge")}</span>
        </button>
      </div>
    </div>
  );
}

type IndividualPlanCardProps = {
  plan: BillingPlanDefinition;
  copy: PlanCopy;
  activePlanKey: string | null;
  activeBillingCycle: BillingCycle | null;
};

function IndividualPlanCard({
  plan,
  copy,
  activePlanKey,
  activeBillingCycle,
}: IndividualPlanCardProps) {
  const t = useTranslations("pricing");
  const locale = useLocale();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const isFree = plan.key === "free";
  const price = getDisplayPrice(plan.priceUsd, cycle, locale, t);
  const isCurrentPlan =
    activePlanKey === plan.key &&
    (isFree || !activeBillingCycle || activeBillingCycle === cycle);

  const highlight =
    plan.highlightKey === "mostPopular"
      ? t("planHighlights.mostPopular")
      : plan.highlightKey === "premium"
        ? t("planHighlights.premium")
        : undefined;

  return (
    <article
      className={[
        "flex min-h-full flex-col rounded-lg border bg-card p-5 shadow-[var(--shadow-card)]",
        plan.recommended
          ? "border-amber-400/70 ring-2 ring-amber-300/25"
          : "border-border",
      ].join(" ")}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{copy.name}</h2>
          {highlight ? (
            <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-200">
              {highlight}
            </span>
          ) : null}
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("whoForLabel")}
          </p>
          <p className="min-h-12 text-sm leading-6 text-muted-foreground">{copy.whoFor}</p>
        </div>

        {isFree ? null : (
          <div className="mt-4">
            <CardBillingToggle cycle={cycle} onChange={setCycle} />
          </div>
        )}

        <div className="mt-4 flex items-end gap-1">
          <span className="text-4xl font-semibold tracking-tight text-foreground">
            {price.main}
          </span>
          <span className="pb-1 text-sm text-muted-foreground">{price.suffix}</span>
        </div>
        <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-200">{price.note}</p>
        <p className="mt-4 min-h-12 text-sm leading-6 text-muted-foreground">{copy.description}</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg border border-border bg-secondary/35 p-3">
        {keyLimitRows.map((action) => (
          <div key={action} className="rounded-md bg-background/60 p-2">
            <div className="text-xs text-muted-foreground">{t(`actions.${action}`)}</div>
            <div className="mt-1 text-sm font-semibold text-foreground">
              {formatQuotaValue(plan.limits[action], locale, t)}
            </div>
          </div>
        ))}
      </div>

      <ul className="mt-5 flex-1 space-y-3">
        {copy.features.map((feature) => (
          <li key={feature} className="flex gap-2 text-sm leading-6">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-lg border border-dashed border-amber-400/40 bg-amber-400/[0.06] p-3 dark:border-amber-500/30 dark:bg-amber-950/25">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200/95">
          {t("upgradeSectionTitle")}
        </p>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{copy.upgradeHint}</p>
        {plan.key === "professional_199" ? (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium">
            <Link href="/cozumler/osgb" className="text-primary underline underline-offset-4">
              {t("osgbOfferLink")}
            </Link>
            <Link href="/cozumler/kurumsal" className="text-primary underline underline-offset-4">
              {t("enterpriseOfferLink")}
            </Link>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        {plan.key === "free" ? (
          <Link
            href="/register"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-primary shadow-[var(--shadow-soft)] transition hover:bg-secondary"
          >
            {t("freeStart")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <PricingCheckoutButton
            planKey={plan.key}
            cycle={cycle}
            disabled={isCurrentPlan}
            className="w-full rounded-lg"
          >
            {isCurrentPlan ? (
              t("currentPlan")
            ) : (
              <>
                {t("selectPlan")}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </PricingCheckoutButton>
        )}
      </div>
    </article>
  );
}

export function PricingPlansClient() {
  const t = useTranslations("pricing");
  const [activePlanKey, setActivePlanKey] = useState<string | null>(null);
  const [activeBillingCycle, setActiveBillingCycle] = useState<BillingCycle | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBillingStatus() {
      try {
        const response = await fetch("/api/billing/status", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = (await response.json().catch(() => null)) as
          | {
              subscription?: {
                planKey?: string | null;
                billingCycle?: BillingCycle | null;
              } | null;
            }
          | null;

        if (cancelled) return;

        setActivePlanKey(data?.subscription?.planKey ?? null);
        setActiveBillingCycle(data?.subscription?.billingCycle ?? null);
      } catch {
        if (!cancelled) {
          setActivePlanKey(null);
          setActiveBillingCycle(null);
        }
      }
    }

    void loadBillingStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="mb-7 rounded-lg border border-amber-300/35 bg-card p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("introTitle")}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t("introBody")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {INDIVIDUAL_BILLING_PLAN_DEFS.map((def) => {
          const copy = t.raw(`plans.${def.key}`) as PlanCopy;
          return (
            <IndividualPlanCard
              key={def.key}
              plan={def}
              copy={copy}
              activePlanKey={activePlanKey}
              activeBillingCycle={activeBillingCycle}
            />
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5">
          <MessageSquareText className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-semibold">{t("footerLimitsTitle")}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("footerLimitsBody")}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-semibold">{t("footerOsgbTitle")}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("footerOsgbBody")}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-semibold">{t("footerPro149Title")}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("footerPro149Body")}</p>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-amber-400/25 bg-amber-400/10 p-6">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold">{t("enterpriseTitle")}</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{t("enterpriseBody")}</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/register?commercial=osgb"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-amber-500/20 bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_50%,#FBBF24_100%)] px-5 text-sm font-semibold text-white"
          >
            {t("enterpriseOsgbCta")}
          </Link>
          <Link
            href="/register?commercial=enterprise"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)]"
          >
            {t("enterpriseCorporateCta")}
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-transparent px-5 text-sm font-semibold text-foreground"
          >
            {t("enterpriseExplore")}
          </Link>
        </div>
        <p className="mt-4 text-xs leading-6 text-muted-foreground">
          {t("enterpriseFootnoteLead")}{" "}
          <Link href="/cozumler/osgb" className="font-semibold text-primary underline underline-offset-4">
            {t("enterpriseFootnoteOsgb")}
          </Link>
          {" · "}
          <Link href="/cozumler/kurumsal" className="font-semibold text-primary underline underline-offset-4">
            {t("enterpriseFootnoteEnterprise")}
          </Link>
        </p>
      </div>
    </>
  );
}
