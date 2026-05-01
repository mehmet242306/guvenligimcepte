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
  type PublicBillingPlan,
} from "@/lib/billing/plans";

const keyLimitRows = [
  "nova_message",
  "ai_analysis",
  "document_generation",
  "risk_analysis",
] as const;

function getDisplayPrice(monthlyPrice: number, cycle: BillingCycle) {
  if (monthlyPrice === 0) {
    return { main: "$0", suffix: "/ ay", note: "Ücretsiz başlangıç" };
  }

  if (cycle === "yearly") {
    const yearlyPrice = monthlyPrice * 10;
    const monthlyEquivalent = yearlyPrice / 12;
    return {
      main: `$${yearlyPrice.toLocaleString("en-US")}`,
      suffix: "/ yıl",
      note: `Ayda ~${monthlyEquivalent.toFixed(0)} $ eşdeğer — 2 ay avantaj`,
    };
  }

  return {
    main: `$${monthlyPrice}`,
    suffix: "/ ay",
    note: "Aylık ödeme, istediğin zaman yükselt",
  };
}

function CardBillingToggle({
  cycle,
  onChange,
}: {
  cycle: BillingCycle;
  onChange: (next: BillingCycle) => void;
}) {
  return (
    <div
      className="w-full rounded-lg border-2 border-amber-400/55 bg-amber-50 p-1 shadow-sm dark:bg-amber-950/20"
      role="group"
      aria-label="Ödeme periyodu"
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
          Aylık
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
          Yıllık{" "}
          <span className="hidden font-semibold opacity-90 sm:inline">· 2 ay avantaj</span>
        </button>
      </div>
    </div>
  );
}

type IndividualPlanCardProps = {
  plan: PublicBillingPlan;
  activePlanKey: string | null;
  activeBillingCycle: BillingCycle | null;
};

function IndividualPlanCard({
  plan,
  activePlanKey,
  activeBillingCycle,
}: IndividualPlanCardProps) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const isFree = plan.key === "free";
  const price = getDisplayPrice(plan.priceUsd, cycle);
  const isCurrentPlan =
    activePlanKey === plan.key &&
    (isFree || !activeBillingCycle || activeBillingCycle === cycle);

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
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {plan.name}
          </h2>
          {plan.highlight ? (
            <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-200">
              {plan.highlight}
            </span>
          ) : null}
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Kim için?
          </p>
          <p className="min-h-12 text-sm leading-6 text-muted-foreground">{plan.whoFor}</p>
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

      <div className="mt-5 rounded-lg border border-dashed border-amber-400/40 bg-amber-400/[0.06] p-3 dark:border-amber-500/30 dark:bg-amber-950/25">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200/95">
          Bir üst pakete geç
        </p>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{plan.upgradeHint}</p>
        {plan.key === "professional_199" ? (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium">
            <Link href="/cozumler/osgb" className="text-primary underline underline-offset-4">
              OSGB teklif
            </Link>
            <Link href="/cozumler/kurumsal" className="text-primary underline underline-offset-4">
              Kurumsal teklif
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
            Ücretsiz başla
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
                Paketi seç
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
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Bireysel planını seç
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Ücretli planlarda her kartta aylık veya yıllık ödemeyi ayrı ayrı
          seçebilirsin. Yıllık ödemede 12 ay kullanım için 10 ay öde (kart
          içindeki fiyat buna göre güncellenir). OSGB ve kurumsal kullanım
          teklif akışıyla ilerler. Her kartta{" "}
          <span className="font-medium text-foreground">Kim için?</span> ve{" "}
          <span className="font-medium text-foreground">Bir üst pakete geç</span>{" "}
          alanlarıyla hangi profilden bir üst kademeye çıkacağını görebilirsin.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {INDIVIDUAL_BILLING_PLANS.map((plan) => (
          <IndividualPlanCard
            key={plan.key}
            plan={plan}
            activePlanKey={activePlanKey}
            activeBillingCycle={activeBillingCycle}
          />
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5">
          <MessageSquareText className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-semibold">Limitler sunucu tarafında</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Nova, analiz ve üretim hakları yalnızca ekranda değil; API
            katmanında da tüketilir.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-semibold">OSGB ve kurumsal ayrı</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Ekipli kullanım, çoklu koltuk ve kurumsal ihtiyaçlar özel teklif
            akışına yönlendirilir.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-semibold">Professional 149 önerilen</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Aktif bireysel profesyonel için en dengeli analiz, doküman ve saha
            kapasitesi burada.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-amber-400/25 bg-amber-400/10 p-6">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold">OSGB veya kurumsal kullanım</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            Çoklu kullanıcı, firma portföyü, white-label, özel onboarding ve
            kurumsal faturalandırma için bu akışta checkout veya kart ödemesi
            yoktur; bizimle iletişime geçerek teklif ve sözleşmeyi netleştirirsiniz.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/register?commercial=osgb"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-amber-500/20 bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_50%,#FBBF24_100%)] px-5 text-sm font-semibold text-white"
          >
            OSGB teklif talebi
          </Link>
          <Link
            href="/register?commercial=enterprise"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)]"
          >
            Kurumsal teklif talebi
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-transparent px-5 text-sm font-semibold text-foreground"
          >
            Ürünü incele
          </Link>
        </div>
        <p className="mt-4 text-xs leading-6 text-muted-foreground">
          Örnek paket metinleri ve sayfa içeriği:{" "}
          <Link href="/cozumler/osgb" className="font-semibold text-primary underline underline-offset-4">
            OSGB çözümü
          </Link>
          {" · "}
          <Link href="/cozumler/kurumsal" className="font-semibold text-primary underline underline-offset-4">
            Kurumsal çözüm
          </Link>
        </p>
      </div>
    </>
  );
}
