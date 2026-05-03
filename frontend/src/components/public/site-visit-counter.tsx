"use client";

import { useEffect, useState } from "react";

const FALLBACK_COUNT = 94750;

function formatCount(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

export function SiteVisitCounter() {
  const [count, setCount] = useState(FALLBACK_COUNT);

  useEffect(() => {
    let cancelled = false;

    async function syncVisitCount() {
      const response = await fetch("/api/site-visits", {
        method: "POST",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as { count?: number } | null;

      if (!cancelled && typeof payload?.count === "number") {
        setCount(payload.count);
      }
    }

    void syncVisitCount().catch(() => {
      if (!cancelled) setCount(FALLBACK_COUNT);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-1 bg-[var(--navy-dark)] px-6 py-5">
      <span className="text-2xl font-bold tracking-tight text-[var(--gold)]">{formatCount(count)}</span>
      <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400">Ziyaret</span>
    </div>
  );
}
