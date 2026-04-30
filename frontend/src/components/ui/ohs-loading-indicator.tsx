"use client";

import { ShieldCheck, HardHat, Activity } from "lucide-react";

export function OhsLoadingIndicator(props: { message?: string; compact?: boolean }) {
  const compact = props.compact ?? false;
  const message = props.message?.trim() || null;

  return (
    <div className={`flex items-center justify-center ${compact ? "py-8" : "min-h-[60vh]"}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(212,160,23,0.18)_0%,rgba(212,160,23,0)_70%)] blur-xl" />
          <div className="absolute -inset-8 rounded-full border-2 border-transparent border-t-[var(--gold)]/80 border-r-[var(--gold)]/30 animate-spin [animation-duration:2.8s]" />
          <div
            className="absolute -inset-4 rounded-full border border-[var(--border)]/70 animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "2.2s" }}
          />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-[var(--gold)]/35 bg-[linear-gradient(145deg,rgba(212,160,23,0.18),rgba(212,160,23,0.06))] shadow-[0_14px_40px_rgba(184,134,11,0.22)]">
            <ShieldCheck className="h-9 w-9 text-[var(--gold)] animate-pulse [animation-duration:1.8s]" />
          </div>
          <HardHat className="absolute -left-5 top-2 h-5 w-5 text-orange-500/90 animate-pulse [animation-duration:2.4s]" />
          <Activity className="absolute -right-5 bottom-2 h-5 w-5 text-emerald-500/90 animate-pulse [animation-duration:2.4s] [animation-delay:0.3s]" />
        </div>
        {!message ? (
          <div className="inline-flex items-center gap-1.5 text-[var(--gold)]/60" aria-hidden="true">
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-35 animate-pulse [animation-duration:2s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50 animate-pulse [animation-duration:2s] [animation-delay:0.25s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-65 animate-pulse [animation-duration:2s] [animation-delay:0.5s]" />
          </div>
        ) : null}
        {message ? <p className="text-sm font-medium text-muted-foreground">{message}</p> : null}
      </div>
    </div>
  );
}
