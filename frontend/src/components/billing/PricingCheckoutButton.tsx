"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BillingCycle, BillingPlanKey } from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/client";

type PricingCheckoutButtonProps = {
  planKey: BillingPlanKey;
  cycle?: BillingCycle;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
};

export function PricingCheckoutButton({
  planKey,
  cycle = "monthly",
  className,
  disabled = false,
  children,
}: PricingCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const session = supabase
        ? (await supabase.auth.getSession()).data.session
        : null;

      if (!session?.access_token) {
        window.location.href = `/login?next=${encodeURIComponent("/pricing")}`;
        return;
      }

      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: "include",
        body: JSON.stringify({ planKey, cycle }),
      });
      const data = (await response.json().catch(() => null)) as
        | { checkoutUrl?: string; error?: string; contactUrl?: string }
        | null;

      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent("/pricing")}`;
        return;
      }

      if (data?.contactUrl) {
        window.location.href = data.contactUrl;
        return;
      }

      if (!response.ok || !data?.checkoutUrl) {
        throw new Error(data?.error || "Odeme baslatilamadi.");
      }

      window.location.href = data.checkoutUrl;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Odeme baslatilamadi.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        className={className}
        disabled={disabled || loading}
        onClick={() => void startCheckout()}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {children}
      </Button>
      {error ? (
        <p className="text-xs font-medium leading-5 text-red-500">{error}</p>
      ) : null}
    </div>
  );
}
