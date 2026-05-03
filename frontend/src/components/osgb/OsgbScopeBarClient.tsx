"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { OsgbCompanyOption } from "@/lib/osgb/server";

type ScopeBarProps = {
  companies: OsgbCompanyOption[];
  selectedWorkspaceId?: string | null;
  basePath: string;
};

export function OsgbScopeBar({
  companies,
  selectedWorkspaceId,
  basePath,
}: ScopeBarProps) {
  const t = useTranslations("osgb.chrome");

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("scopeEyebrow")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("scopeDescription")}</p>
        </div>
        <Link
          href={basePath}
          className={`inline-flex h-10 items-center rounded-xl border px-4 text-sm font-medium transition-colors ${
            !selectedWorkspaceId
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:bg-secondary"
          }`}
        >
          {t("allCompanies")}
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {companies.map((company) => {
          const href = `${basePath}?workspaceId=${company.workspaceId}`;
          const active = selectedWorkspaceId === company.workspaceId;
          return (
            <Link
              key={company.workspaceId}
              href={href}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <span>{company.displayName}</span>
              {company.hazardClass ? (
                <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {company.hazardClass}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
