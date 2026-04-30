"use client";

import { useState } from "react";
import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PricingCheckoutButton } from "@/components/billing/PricingCheckoutButton";
import {
  BILLING_ACTION_LABELS,
  INDIVIDUAL_BILLING_PLANS,
  formatLimit,
  type BillingCycle,
} from "@/lib/billing/plans";

const keyLimitRows = [
  "nova_message",
  "ai_analysis",
  "document_generation",
  "risk_analysis",
] as const;

function getDisplayPrice(monthlyPrice: number, cycle: BillingCycle) {
  if (monthlyPrice === 0) {
    return { main: "$0", suffix: "/ ay", note: "Ucretsiz baslangic" };
  }

  if (cycle === "yearly") {
    const yearlyPrice = monthlyPrice * 10;
    const monthlyEquivalent = yearlyPrice / 12;
    return {
      main: `$${yearlyPrice.toLocaleString("en-US")}`,
      suffix: "/ yil",
      note: `$${monthlyEquivalent.toFixed(0)} / ay esdegeri - 2 ay avantaj`,
    };
  }

  return {
    main: `$${monthlyPrice}`,
    suffix: "/ ay",
    note: "Aylik odeme, istedigin zaman yukselt",
  };
}

export function PricingPlansClient() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
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
      <div className="mb-7 flex flex-col gap-5 rounded-lg border border-amber-300/35 bg-card p-5 shadow-[var(--shadow-soft)] md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Bireysel planini sec
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Yillik odemede 12 ay kullanim icin 10 ay ode. OSGB ve kurumsal
            kullanim teklif akisiyle ilerler.
          </p>
        </div>
        <div className="w-full rounded-xl border-2 border-amber-400/55 bg-amber-50 p-1.5 shadow-sm dark:bg-amber-950/20 md:w-auto">
          <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={[
              "h-12 rounded-lg px-7 text-sm font-bold transition",
              cycle === "monthly"
                ? "bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_50%,#FBBF24_100%)] text-white shadow-md"
                : "bg-transparent text-amber-900 hover:bg-white/70 dark:text-amber-100",
            ].join(" ")}
          >
            Aylik
          </button>
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            className={[
              "h-12 rounded-lg px-7 text-sm font-bold transition",
              cycle === "yearly"
                ? "bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_50%,#FBBF24_100%)] text-white shadow-md"
                : "bg-transparent text-amber-900 hover:bg-white/70 dark:text-amber-100",
            ].join(" ")}
          >
            Yillik - 2 ay avantaj
          </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {INDIVIDUAL_BILLING_PLANS.map((plan) => {
          const price = getDisplayPrice(plan.priceUsd, cycle);
          const isCurrentPlan =
            activePlanKey === plan.key &&
            (!activeBillingCycle || activeBillingCycle === cycle);

          return (
            <article
              key={plan.key}
              className={[
                "flex min-h-full flex-col rounded-lg border bg-card p-5 shadow-[var(--shadow-card)]",
                plan.recommended
                  ? "border-amber-400/70 ring-2 ring-amber-300/25"
                  : "border-border",
              ].join(" ")}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    {plan.name}
                  </h2>
                  {plan.highlight ? (
                    <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-200">
                      {plan.highlight}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">
                  {plan.audience}
                </p>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-4xl font-semibold tracking-tight text-foreground">
                    {price.main}
                  </span>
                  <span className="pb-1 text-sm text-muted-foreground">
                    {price.suffix}
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-200">
                  {price.note}
                </p>
                <p className="mt-4 min-h-12 text-sm leading-6 text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg border border-border bg-secondary/35 p-3">
                {keyLimitRows.map((action) => (
                  <div key={action} className="rounded-md bg-background/60 p-2">
                    <div className="text-xs text-muted-foreground">
                      {BILLING_ACTION_LABELS[action]}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {formatLimit(plan.limits[action])}
                    </div>
                  </div>
                ))}
              </div>

              <ul className="mt-5 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm leading-6">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {plan.key === "free" ? (
                  <Link
                    href="/register"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-primary shadow-[var(--shadow-soft)] transition hover:bg-secondary"
                  >
                    Ucretsiz basla
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
                      "Mevcut plan"
                    ) : (
                      <>
                        Paketi sec
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </PricingCheckoutButton>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5">
          <MessageSquareText className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-semibold">Limitler server tarafinda</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Nova, analiz ve uretim haklari sadece ekranda degil, API katmaninda
            tuketilir.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-semibold">OSGB ve kurumsal ayri</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Ekipli kullanim, coklu koltuk ve kurumsal ihtiyaclar ozel teklif
            akisina yonlendirilir.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-semibold">Professional 149 onerilen</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Aktif bireysel profesyonel icin en dengeli analiz, dokuman ve saha
            kapasitesi burada.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-amber-400/25 bg-amber-400/10 p-6">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold">OSGB veya kurumsal kullanim</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            Coklu kullanici, firma portfoyu, white-label, ozel onboarding ve
            kurumsal faturalandirma icin self-service odeme yerine satis
            gorusmesiyle ilerliyoruz.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-amber-500/20 bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_50%,#FBBF24_100%)] px-5 text-sm font-semibold text-white"
          >
            Bizimle iletisime gec
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground"
          >
            Urunu incele
          </Link>
        </div>
      </div>
    </>
  );
}
