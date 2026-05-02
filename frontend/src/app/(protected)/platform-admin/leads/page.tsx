import Link from "next/link";
import { ArrowLeft, Inbox, Mail, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createServiceClient } from "@/lib/security/server";
import { LeadsTable } from "./_components/LeadsTable";
import type { LeadRow } from "./_components/types";

export const dynamic = "force-dynamic";

const DEFAULT_SUPPORT_EMAIL = "support@getrisknova.com";

export default async function PlatformAdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string }>;
}) {
  const t = await getTranslations("platformAdmin.leads");
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || DEFAULT_SUPPORT_EMAIL;

  const params = await searchParams;
  const statusFilter = params?.status ?? "all";
  const sourceFilter = params?.source ?? "all";

  const service = createServiceClient();
  let query = service
    .from("enterprise_leads")
    .select(
      "id, contact_name, email, phone, company_name, message, status, requested_account_type, source_page, estimated_employee_count, estimated_location_count, estimated_company_count, estimated_professional_count, admin_notes, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (statusFilter !== "all") query = query.eq("status", statusFilter);
  if (sourceFilter !== "all") query = query.eq("source_page", sourceFilter);

  const { data: rawLeads, error } = await query;
  const leads: LeadRow[] = ((rawLeads as LeadRow[] | null) ?? []).filter(Boolean);

  // Toplam sayaçlar (filter bağımsız)
  const service2 = createServiceClient();
  const [{ count: totalCount }, { count: newCount }, { count: contactedCount }, { count: convertedCount }] =
    await Promise.all([
      service2.from("enterprise_leads").select("id", { count: "exact", head: true }),
      service2
        .from("enterprise_leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
      service2
        .from("enterprise_leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "contacted"),
      service2
        .from("enterprise_leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "converted"),
    ]);

  const statusFilters = [
    { v: "all", label: t("statusAll") },
    { v: "new", label: t("statusNew") },
    { v: "contacted", label: t("filterStatusContacted") },
    { v: "qualified", label: t("statusQualified") },
    { v: "converted", label: t("statusConverted") },
    { v: "rejected", label: t("statusRejected") },
  ];

  const sourceFilters = [
    { v: "all", label: t("sourceAll") },
    { v: "landing_demo", label: t("source_landing_demo") },
    { v: "register", label: t("source_register") },
    { v: "cozumler_kurumsal", label: t("source_cozumler_kurumsal") },
    { v: "cozumler_osgb", label: t("source_cozumler_osgb") },
    { v: "unknown", label: t("source_unknown") },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <Link
            href="/platform-admin"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            {t("backLink")}
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Inbox className="h-6 w-6 text-[var(--gold)]" />
            {t("title")}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
          {t("loadError", { message: error.message })}
        </div>
      ) : null}

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiBox label={t("kpiTotal")} value={totalCount ?? 0} />
        <KpiBox label={t("kpiNew")} value={newCount ?? 0} tone="amber" />
        <KpiBox label={t("kpiContacted")} value={contactedCount ?? 0} tone="sky" />
        <KpiBox label={t("kpiConverted")} value={convertedCount ?? 0} tone="emerald" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("filterStatus")}
        </span>
        {statusFilters.map((f) => (
          <FilterLink
            key={f.v}
            current={statusFilter}
            value={f.v}
            label={f.label}
            queryKey="status"
            keepOther={{ source: sourceFilter }}
          />
        ))}
        <span className="mx-2 text-border">|</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("filterSource")}
        </span>
        {sourceFilters.map((f) => (
          <FilterLink
            key={f.v}
            current={sourceFilter}
            value={f.v}
            label={f.label}
            queryKey="source"
            keepOther={{ status: statusFilter }}
          />
        ))}
      </div>

      {/* Data table / empty state */}
      {leads.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/10 p-8 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{t("emptyTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("emptyDescription")}</p>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <a
              href={`mailto:${supportEmail}`}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Mail className="h-3 w-3" /> {supportEmail}
            </a>
          </div>
        </div>
      ) : (
        <LeadsTable leads={leads} />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Helper components
// -----------------------------------------------------------------------------

function KpiBox({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "amber" | "sky" | "emerald";
}) {
  const toneClass: Record<typeof tone, string> = {
    slate: "border-border bg-muted/30 text-foreground",
    amber: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100",
    sky: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-100",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100",
  };
  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClass[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-3xl font-bold leading-tight">{value}</p>
    </div>
  );
}

function FilterLink({
  current,
  value,
  label,
  queryKey,
  keepOther,
}: {
  current: string;
  value: string;
  label: string;
  queryKey: string;
  keepOther: Record<string, string>;
}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(keepOther)) {
    if (v && v !== "all") params.set(k, v);
  }
  if (value !== "all") params.set(queryKey, value);
  const href = params.toString()
    ? `/platform-admin/leads?${params.toString()}`
    : "/platform-admin/leads";
  const active = current === value;
  return (
    <Link
      href={href}
      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
        active
          ? "border-[var(--gold)] bg-[var(--gold)]/10 text-foreground"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
