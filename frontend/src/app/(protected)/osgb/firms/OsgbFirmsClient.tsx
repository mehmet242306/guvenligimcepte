"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Building2,
  FileText,
  FolderOpen,
  ShieldAlert,
  ShieldCheck,
  Users,
  UserPlus2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PremiumIconBadge } from "@/components/ui/premium-icon-badge";
import type { PremiumIconTone } from "@/components/ui/premium-icon-badge";
import type { CompanyRecord } from "@/lib/company-directory";
import { fetchAccountContext, type AccountContextResponse } from "@/lib/account/account-api";
import {
  archiveCompanyInSupabase,
  createCompanyInSupabase,
  fetchArchivedFromSupabase,
  fetchCompaniesFromSupabase,
  restoreCompanyInSupabase,
} from "@/lib/supabase/company-api";
import {
  getOverallRiskState,
  hazardClassToMessageKey,
  workplaceRiskLevelBadgeVariant,
} from "@/lib/workplace-status";

function createEmptyCompany(labels: { name: string; shortName: string; kind: string }): CompanyRecord {
  return {
    id: crypto.randomUUID(),
    name: labels.name,
    shortName: labels.shortName,
    kind: labels.kind,
    companyType: "osgb_musteri",
    address: "",
    city: "",
    district: "",
    sector: "",
    naceCode: "",
    hazardClass: "",
    taxNumber: "",
    taxOffice: "",
    sgkWorkplaceNumber: "",
    fax: "",
    employerTitle: "",
    employeeCount: 0,
    shiftModel: "",
    phone: "",
    email: "",
    contactPerson: "",
    employerName: "",
    employerRepresentative: "",
    notes: "",
    activeProfessionals: 0,
    employeeRepresentativeCount: 0,
    supportStaffCount: 0,
    openActions: 0,
    overdueActions: 0,
    openRiskAssessments: 0,
    documentCount: 0,
    completionRate: 0,
    maturityScore: 0,
    openRiskScore: 0,
    last30DayImprovement: 0,
    completedTrainingCount: 0,
    expiringTrainingCount: 0,
    periodicControlCount: 0,
    overduePeriodicControlCount: 0,
    lastAnalysisDate: "",
    lastInspectionDate: "",
    lastDrillDate: "",
    locations: [""],
    departments: [""],
  };
}

function mapHazardTone(
  hazardClass: string,
): PremiumIconTone {
  if (hazardClass === "Çok Tehlikeli") return "orange";
  if (hazardClass === "Tehlikeli") return "amber";
  if (hazardClass === "Az Tehlikeli") return "emerald";
  return "cobalt";
}

const topActionClassName =
  "inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]";

const topSecondaryActionClassName = `${topActionClassName} border border-border bg-card text-foreground hover:border-primary/35 hover:bg-primary/5`;
const topAccentActionClassName = `${topActionClassName} border border-primary/20 bg-primary/10 text-foreground hover:bg-primary/15`;

const quickActionClassName =
  "inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]";

const quickActionPrimaryClassName = `${quickActionClassName} bg-primary text-primary-foreground hover:bg-primary/90`;
const quickActionSecondaryClassName = `${quickActionClassName} border border-border bg-card text-foreground hover:border-primary/35 hover:bg-primary/5`;
const quickActionAccentClassName = `${quickActionClassName} border border-primary/20 bg-primary/10 text-foreground hover:bg-primary/15`;

export function OsgbFirmsClient() {
  const router = useRouter();
  const t = useTranslations("osgbFirms");
  const tw = useTranslations("workplaceRisk");
  const [mounted, setMounted] = useState(false);
  const [account, setAccount] = useState<AccountContextResponse | null>(null);
  const [activeCompanies, setActiveCompanies] = useState<CompanyRecord[]>([]);
  const [archivedCompanies, setArchivedCompanies] = useState<CompanyRecord[]>([]);
  const [search, setSearch] = useState("");
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [accountContext, activeRows, archivedRows] = await Promise.all([
      fetchAccountContext(),
      fetchCompaniesFromSupabase(),
      fetchArchivedFromSupabase(),
    ]);

    setAccount(accountContext);
    setActiveCompanies(activeRows ?? []);
    setArchivedCompanies(archivedRows ?? []);
    setMounted(true);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const usage = account?.usage ?? null;
  const activeLimitReached = Boolean(
    usage &&
      usage.maxActiveWorkspaces !== null &&
      usage.activeWorkspaceCount >= usage.maxActiveWorkspaces,
  );

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return activeCompanies;

    return activeCompanies.filter((company) =>
      [
        company.name,
        company.shortName,
        company.sector,
        company.address,
        company.city,
        company.hazardClass,
        company.naceCode,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [activeCompanies, search]);

  const stats = useMemo(() => {
    return {
      firmCount: activeCompanies.length,
      employeeCount: activeCompanies.reduce((sum, company) => sum + company.employeeCount, 0),
      assignedProfessionalCount: activeCompanies.reduce(
        (sum, company) => sum + company.activeProfessionals,
        0,
      ),
      overdueCount: activeCompanies.reduce((sum, company) => sum + company.overdueActions, 0),
    };
  }, [activeCompanies]);

  async function handleCreateCompany() {
    if (activeLimitReached) return;

    const company = createEmptyCompany({
      name: t("emptyCompany.name"),
      shortName: t("emptyCompany.shortName"),
      kind: t("emptyCompany.kind"),
    });
    const workspaceId = await createCompanyInSupabase(company);

    await loadData();

    if (workspaceId) {
      router.push(`/workspace/${workspaceId}`);
    }
  }

  async function handleArchiveCompany(companyId: string) {
    setArchivingId(companyId);
    try {
      await archiveCompanyInSupabase(companyId);
      await loadData();
    } finally {
      setArchivingId(null);
    }
  }

  async function handleRestoreCompany(companyId: string) {
    if (activeLimitReached) return;
    setRestoringId(companyId);
    try {
      await restoreCompanyInSupabase(companyId);
      await loadData();
    } finally {
      setRestoringId(null);
    }
  }

  if (!mounted) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("loading.eyebrow")}
          title={t("loading.title")}
          description={t("loading.description")}
        />
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
        meta={
          <>
            <Badge variant="neutral">
              {!usage || usage.maxActiveWorkspaces === null
                ? t("badges.activeCompaniesUnlimited", {
                    count: usage?.activeWorkspaceCount ?? activeCompanies.length,
                  })
                : t("badges.activeCompaniesMax", {
                    count: usage?.activeWorkspaceCount ?? activeCompanies.length,
                    max: usage!.maxActiveWorkspaces,
                  })}
            </Badge>
            <Badge variant="neutral">
              {!usage || usage.maxActiveStaffSeats === null
                ? t("badges.activeStaffUnlimited", { count: usage?.activeStaffCount ?? 0 })
                : t("badges.activeStaffMax", {
                    count: usage?.activeStaffCount ?? 0,
                    max: usage!.maxActiveStaffSeats,
                  })}
            </Badge>
          </>
        }
        actions={
          <>
            <Link
              href="/osgb/personnel"
              className={topAccentActionClassName}
            >
              <UserPlus2 className="h-4 w-4" />
              {t("topActions.personnelInvite")}
            </Link>
            <Link
              href="/osgb/assignments"
              className={topSecondaryActionClassName}
            >
              <ShieldCheck className="h-4 w-4" />
              {t("topActions.openAssignments")}
            </Link>
            <Button onClick={() => void handleCreateCompany()} disabled={activeLimitReached}>
              <ArrowRight className="h-4 w-4" />
              {t("topActions.addCompany")}
            </Button>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("stats.activeFirms.label")}
          </p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{stats.firmCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("stats.activeFirms.hint")}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("stats.assignedProfessionals.label")}
          </p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            {stats.assignedProfessionalCount}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("stats.assignedProfessionals.hint")}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("stats.totalEmployees.label")}
          </p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{stats.employeeCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("stats.totalEmployees.hint")}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("stats.overdueWork.label")}
          </p>
          <p className="mt-2 text-3xl font-semibold text-danger">{stats.overdueCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("stats.overdueWork.hint")}
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("focus.title")}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {t("focus.p1")}
              </p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {t("focus.p2")}
              </p>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-foreground lg:min-w-[15rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("focus.sidebarEyebrow")}
              </p>
              <p className="mt-2 text-2xl font-semibold">{stats.firmCount}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t("focus.sidebarBody", {
                  firms: stats.firmCount,
                  professionals: stats.assignedProfessionalCount,
                  overdue: stats.overdueCount,
                })}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/osgb/personnel" className={quickActionPrimaryClassName}>
              <UserPlus2 className="h-4 w-4" />
              {t("quickLinks.inviteStaff")}
            </Link>
            <Link href="/osgb/assignments" className={quickActionAccentClassName}>
              <ShieldCheck className="h-4 w-4" />
              {t("quickLinks.manageAssignments")}
            </Link>
            <Link href="/osgb/contracts" className={quickActionSecondaryClassName}>
              <Building2 className="h-4 w-4" />
              {t("quickLinks.openContracts")}
            </Link>
            <Link href="/osgb/documents" className={quickActionSecondaryClassName}>
              <FileText className="h-4 w-4" />
              {t("quickLinks.docCenter")}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <PremiumIconBadge icon={ShieldAlert} tone="gold" size="md" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("nova.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("nova.subtitle")}
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>{t("nova.bullet1")}</li>
            <li>{t("nova.bullet2")}</li>
            <li>{t("nova.bullet3")}</li>
            <li>{t("nova.bullet4")}</li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/osgb/tasks" className={quickActionPrimaryClassName}>
              <ShieldAlert className="h-4 w-4" />
              {t("nova.openTasks")}
            </Link>
            <Link href="/osgb/tasks" className={quickActionAccentClassName}>
              <ArrowRight className="h-4 w-4" />
              {t("nova.reviewOverdue")}
            </Link>
            <Link href="/osgb/assignments" className={quickActionSecondaryClassName}>
              <ShieldCheck className="h-4 w-4" />
              {t("nova.seeAssignmentGaps")}
            </Link>
          </div>
        </div>
      </section>

      {activeLimitReached ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-foreground">
          {t("limitBanner")}
        </div>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">{t("activeSection.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("activeSection.description")}
            </p>
          </div>
          <div className="w-full md:max-w-sm">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t("activeSection.searchLabel")}
            </label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("activeSection.searchPlaceholder")}
              className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {filteredCompanies.length === 0 ? (
            <EmptyState
              title={t("emptyActive.title")}
              description={t("emptyActive.description")}
              action={
                <Button onClick={() => void handleCreateCompany()} disabled={activeLimitReached}>
                  {t("emptyActive.cta")}
                </Button>
              }
            />
          ) : (
            filteredCompanies.map((company) => {
              const riskState = getOverallRiskState(company);
              const hazardKey = company.hazardClass ? hazardClassToMessageKey(company.hazardClass) : null;
              return (
                <article
                  key={company.id}
                  className="rounded-2xl border border-border bg-background p-5 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex items-start gap-4">
                      <PremiumIconBadge
                        icon={Building2}
                        tone={mapHazardTone(company.hazardClass)}
                        size="lg"
                      />
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/workspace/${company.slug || company.id}`}
                            className="text-xl font-semibold text-foreground transition-colors hover:text-primary"
                          >
                            {company.name}
                          </Link>
                          <Badge variant={workplaceRiskLevelBadgeVariant(riskState.level)}>
                            {riskState.score !== null
                              ? `${tw(`level.${riskState.level}`)} ${riskState.score}`
                              : tw(`level.${riskState.level}`)}
                          </Badge>
                          {company.hazardClass ? (
                            <Badge variant="neutral">
                              {hazardKey ? tw(`hazardClass.${hazardKey}`) : company.hazardClass}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {company.sector || t("companyCard.sectorUnknown")}
                          {company.address ? ` · ${company.address}` : ""}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1">
                            <Users className="h-3.5 w-3.5" />
                            {t("companyCard.assignedProfessionals", { count: company.activeProfessionals })}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1">
                            <FileText className="h-3.5 w-3.5" />
                            {t("companyCard.documentsCount", { count: company.documentCount })}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1">
                            {t("companyCard.employees", { count: company.employeeCount })}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1">
                            {t("companyCard.overdueTasks", { count: company.overdueActions })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 xl:max-w-[34rem] xl:justify-end">
                      <Link
                        href={`/workspace/${company.slug || company.id}`}
                        className={quickActionSecondaryClassName}
                      >
                        <FolderOpen className="h-4 w-4" />
                        {t("companyCard.workspace")}
                      </Link>
                      <Link
                        href={`/osgb/personnel?workspaceId=${company.id}`}
                        className={quickActionPrimaryClassName}
                      >
                        <UserPlus2 className="h-4 w-4" />
                        {t("companyCard.personnelInvite")}
                      </Link>
                      <Link
                        href={`/osgb/assignments?workspaceId=${company.id}`}
                        className={quickActionAccentClassName}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {t("companyCard.assignments")}
                      </Link>
                      <Link
                        href={`/osgb/tasks?workspaceId=${company.id}`}
                        className={quickActionSecondaryClassName}
                      >
                        <ArrowRight className="h-4 w-4" />
                        {t("companyCard.taskTracking")}
                      </Link>
                      <Link
                        href={`/osgb/documents?workspaceId=${company.id}`}
                        className={quickActionSecondaryClassName}
                      >
                        <FileText className="h-4 w-4" />
                        {t("companyCard.documentsLink")}
                      </Link>
                      <Link
                        href={`/osgb/contracts?workspaceId=${company.id}`}
                        className={quickActionSecondaryClassName}
                      >
                        <Building2 className="h-4 w-4" />
                        {t("companyCard.contracts")}
                      </Link>
                      <Button
                        variant="outline"
                        onClick={() => void handleArchiveCompany(company.id)}
                        disabled={archivingId === company.id}
                        className="h-11 rounded-2xl border-border px-4 text-sm font-semibold shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:border-warning/35 hover:bg-warning/5 hover:shadow-[var(--shadow-card)]"
                      >
                        {archivingId === company.id ? t("companyCard.archiving") : t("companyCard.archive")}
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("archivedSection.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("archivedSection.description")}
            </p>
          </div>
          <Badge variant="neutral">{t("archivedSection.badge", { count: archivedCompanies.length })}</Badge>
        </div>

        <div className="mt-5 space-y-3">
          {archivedCompanies.length === 0 ? (
            <EmptyState
              title={t("emptyArchived.title")}
              description={t("emptyArchived.description")}
            />
          ) : (
            archivedCompanies.map((company) => (
              <div
                key={company.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-base font-semibold text-foreground">{company.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {company.sector || t("companyCard.sectorUnknown")} · {t("companyCard.employees", { count: company.employeeCount })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => void handleRestoreCompany(company.id)}
                  disabled={activeLimitReached || restoringId === company.id}
                >
                  {restoringId === company.id ? t("archivedRow.restoring") : t("archivedRow.restore")}
                </Button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
