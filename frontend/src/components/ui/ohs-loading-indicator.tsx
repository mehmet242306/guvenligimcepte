"use client";

import { ShieldCheck, HardHat, Activity } from "lucide-react";

export function OhsLoadingIndicator(props: { message?: string; compact?: boolean }) {
  const compact = props.compact ?? false;
  const message = props.message ?? "ISG operasyon akisi hazirlaniyor...";

  return (
    <div className={`flex items-center justify-center ${compact ? "py-8" : "min-h-[60vh]"}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute -inset-8 rounded-full border-2 border-transparent border-t-[var(--gold)]/80 border-r-[var(--gold)]/30 animate-spin" />
          <div
            className="absolute -inset-4 rounded-full border border-[var(--border)]/70 animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "1.8s" }}
          />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-[var(--gold)]/35 bg-[var(--gold)]/10 shadow-[0_10px_35px_rgba(184,134,11,0.2)]">
            <ShieldCheck className="h-9 w-9 text-[var(--gold)] animate-pulse" />
          </div>
          <HardHat className="absolute -left-5 top-2 h-5 w-5 text-orange-500 animate-bounce" />
          <Activity className="absolute -right-5 bottom-2 h-5 w-5 text-emerald-500 animate-pulse" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
