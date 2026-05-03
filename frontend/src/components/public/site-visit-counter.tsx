"use client";

import { useEffect, useState } from "react";

const STARTING_COUNT = 94750;

function formatCount(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

export function SiteVisitCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function syncVisitCount() {
      const response = await fetch("/api/site-visits", {
        method: "POST",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as { count?: number } | null;

      if (!cancelled && typeof payload?.count === "number" && payload.count > STARTING_COUNT) {
        setCount(payload.count);
      }
    }

    void syncVisitCount().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-1 bg-[var(--navy-dark)] px-6 py-5">
      <span
        aria-busy={count === null}
        className="min-h-[2rem] min-w-[6ch] text-center text-2xl font-bold tracking-tight text-[var(--gold)]"
      >
        {count === null ? null : formatCount(count)}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400">Ziyaret</span>
    </div>
  );
}
