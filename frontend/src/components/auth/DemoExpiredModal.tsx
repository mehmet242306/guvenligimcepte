"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PartyPopper, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DEMO_ACCESS_WINDOW_HOURS } from "@/lib/platform-admin/demo-access";

type Props = {
  status: "expired" | "disabled";
};

export function DemoExpiredModal({ status }: Props) {
  const t = useTranslations("auth.demoModal");
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !mounted) return null;

  const hours = DEMO_ACCESS_WINDOW_HOURS;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-[var(--gold)]/50 bg-card shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
      >
        <div className="relative bg-gradient-to-br from-[var(--gold)]/25 via-[var(--gold)]/10 to-transparent px-6 pb-4 pt-6">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={t("closeAria")}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--gold)]/20 ring-4 ring-[var(--gold)]/30">
              <PartyPopper className="h-7 w-7 text-[var(--gold)]" />
            </span>
            <div>
              <h2 className="text-2xl font-bold leading-tight text-foreground">{t("title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-base leading-7 text-foreground">
            {status === "disabled" ? t("bodyDisabled") : t("bodyExpired", { hours })}
          </p>
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm leading-6 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
            {status === "expired" ? (
              <>
                <strong className="font-semibold">{t("calloutExpiredLead")}</strong>{" "}
                {t("calloutExpiredRest", { hours })}
              </>
            ) : (
              <>
                <strong className="font-semibold">{t("calloutDisabledLead")}</strong>{" "}
                {t("calloutDisabledRest", { hours })}
              </>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
            {t("pathsIntro")}{" "}
            <strong className="text-foreground">{t("pathsHighlight")}</strong>
            {t("pathsSuffix")}
            <ul className="mt-3 space-y-1.5 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gold)]" />
                <span>
                  <span className="font-semibold text-foreground">{t("pathIndividualLabel")}</span>
                  {" — "}
                  {t("pathIndividualDesc")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gold)]" />
                <span>
                  <span className="font-semibold text-foreground">{t("pathOsgbLabel")}</span>
                  {" — "}
                  {t("pathOsgbDesc")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gold)]" />
                <span>
                  <span className="font-semibold text-foreground">{t("pathEnterpriseLabel")}</span>
                  {" — "}
                  {t("pathEnterpriseDesc")}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border bg-muted/20 px-6 py-4">
          <Button size="lg" className="w-full" onClick={() => setOpen(false)}>
            {t("ctaPrimary")}
          </Button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t("ctaLater")}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
