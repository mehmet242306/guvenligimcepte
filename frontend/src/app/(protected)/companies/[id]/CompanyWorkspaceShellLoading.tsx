"use client";

import { useTranslations } from "next-intl";

export function CompanyWorkspaceShellLoading() {
  const t = useTranslations("companyWorkspace.workspaceShell");
  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
      <div className="space-y-4">
        <span className="eyebrow">{t("eyebrow")}</span>
        <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm leading-7 text-muted-foreground">{t("description")}</p>
      </div>

      <div className="mt-6 space-y-3">
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}
