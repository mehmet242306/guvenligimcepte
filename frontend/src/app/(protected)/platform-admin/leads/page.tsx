import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Inbox, Mail, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/security/server";
import {
  getAccountContextForUser,
  resolvePostLoginPath,
} from "@/lib/account/account-routing";
import { LeadsTable } from "./_components/LeadsTable";
import type { LeadRow } from "./_components/types";

export const dynamic = "force-dynamic";

export default async function PlatformAdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string }>;
}) {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const context = await getAccountContextForUser(user.id);
  if (!context || !context.isPlatformAdmin) {
    redirect(resolvePostLoginPath(context));
  }

  const params = await searchParams;
  const statusFilter = params?.status ?? "all";
  const sourceFilter = params?.source ?? "all";

  const service = createServiceClient();
  let query = service
    .from("enterprise_leads")
    .select(
      "id, contact_name, email, phone, company_name, message, status, requested_account_type, source_page, estimated_employee_count, estimated_location_count, estimated_company_count, estimated_professional_count, created_at",
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
            Platform yönetimine dön
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Inbox className="h-6 w-6 text-[var(--gold)]" />
            Demo ve Teklif Talepleri
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Landing sayfası "Demo Talep Et", kayıt akışı "OSGB" ve "Kurumsal" formlarından gelen tüm talepler burada listelenir.
            Durumu güncelle, iletişime geçilen kayıtları işaretle, müşteriye dönüşenleri kapat.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
          Talepler yüklenemedi: {error.message}
        </div>
      ) : null}

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiBox label="Toplam" value={totalCount ?? 0} />
        <KpiBox label="Yeni" value={newCount ?? 0} tone="amber" />
        <KpiBox label="İletişime geçildi" value={contactedCount ?? 0} tone="sky" />
        <KpiBox label="Dönüşen" value={convertedCount ?? 0} tone="emerald" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Durum:
        </span>
        {[
          { v: "all", l: "Hepsi" },
          { v: "new", l: "Yeni" },
          { v: "contacted", l: "İletişim" },
          { v: "qualified", l: "Nitelikli" },
          { v: "converted", l: "Dönüşen" },
          { v: "rejected", l: "Reddedildi" },
        ].map((f) => (
          <FilterLink
            key={f.v}
            current={statusFilter}
            value={f.v}
            label={f.l}
            queryKey="status"
            keepOther={{ source: sourceFilter }}
          />
        ))}
        <span className="mx-2 text-border">|</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Kaynak:
        </span>
        {[
          { v: "all", l: "Hepsi" },
          { v: "landing_demo", l: "Landing demo" },
          { v: "register", l: "Kayıt formu" },
          { v: "unknown", l: "Diğer" },
        ].map((f) => (
          <FilterLink
            key={f.v}
            current={sourceFilter}
            value={f.v}
            label={f.l}
            queryKey="source"
            keepOther={{ status: statusFilter }}
          />
        ))}
      </div>

      {/* Data table / empty state */}
      {leads.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/10 p-8 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Bu filtre için talep yok.</p>
          <p className="text-xs text-muted-foreground">
            Kayıt akışındaki OSGB/Kurumsal teklif formu ve landing &quot;Demo Talep Et&quot; başvuruları burada listelenir.
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <a href="mailto:mehmet242306@gmail.com" className="inline-flex items-center gap-1 hover:text-foreground">
              <Mail className="h-3 w-3" /> mehmet242306@gmail.com
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
