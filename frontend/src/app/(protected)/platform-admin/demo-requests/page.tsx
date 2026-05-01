import Link from "next/link";
import { ArrowLeft, Inbox, Sparkles } from "lucide-react";
import { createServiceClient } from "@/lib/security/server";
import { LeadsTable } from "../leads/_components/LeadsTable";
import type { LeadRow } from "../leads/_components/types";

export const dynamic = "force-dynamic";

const DEMO_SOURCE = "landing_demo";

export default async function PlatformAdminDemoRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params?.status ?? "all";

  const service = createServiceClient();
  let query = service
    .from("enterprise_leads")
    .select(
      "id, contact_name, email, phone, company_name, message, status, requested_account_type, source_page, estimated_employee_count, estimated_location_count, estimated_company_count, estimated_professional_count, admin_notes, created_at",
    )
    .eq("source_page", DEMO_SOURCE)
    .order("created_at", { ascending: false })
    .limit(200);

  if (statusFilter !== "all") query = query.eq("status", statusFilter);

  const { data: rawLeads, error } = await query;
  const leads: LeadRow[] = ((rawLeads as LeadRow[] | null) ?? []).filter(Boolean);

  const service2 = createServiceClient();
  const demoCount = () =>
    service2.from("enterprise_leads").select("id", { count: "exact", head: true }).eq("source_page", DEMO_SOURCE);
  const [{ count: totalCount }, { count: newCount }, { count: contactedCount }, { count: convertedCount }] =
    await Promise.all([
      demoCount(),
      demoCount().eq("status", "new"),
      demoCount().eq("status", "contacted"),
      demoCount().eq("status", "converted"),
    ]);

  return (
    <div className="space-y-6">
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
            <Sparkles className="h-6 w-6 text-[var(--gold)]" />
            Demo talepleri
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Landing sayfasındaki &quot;Demo Talep Et&quot; formundan gelen kayıtlar. Talebi inceledikten sonra{" "}
            <Link href="/platform-admin/demo-builder" className="font-medium text-primary underline underline-offset-4">
              Demo oluşturucu
            </Link>{" "}
            ile aynı e-posta adresine hesap açın: giriş bilgisi ve geçici şifre,{" "}
            <strong>RESEND_API_KEY</strong> tanımlıysa otomatik e-postayla gider; aksi halde oluşturucu ekranındaki
            önizlemeyi manuel iletin.
          </p>
        </div>
        <Link
          href="/platform-admin/demo-builder"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--gold)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110"
        >
          Demo oluşturucuya git
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
          Talepler yüklenemedi: {error.message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiBox label="Toplam (demo)" value={totalCount ?? 0} />
        <KpiBox label="Yeni" value={newCount ?? 0} tone="amber" />
        <KpiBox label="İletişime geçildi" value={contactedCount ?? 0} tone="sky" />
        <KpiBox label="Dönüşen" value={convertedCount ?? 0} tone="emerald" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Durum:</span>
        {[
          { v: "all", l: "Hepsi" },
          { v: "new", l: "Yeni" },
          { v: "contacted", l: "İletişim" },
          { v: "qualified", l: "Nitelikli" },
          { v: "converted", l: "Dönüşen" },
          { v: "rejected", l: "Reddedildi" },
        ].map((f) => (
          <FilterLink key={f.v} current={statusFilter} value={f.v} label={f.l} />
        ))}
        <span className="ml-2 text-xs text-muted-foreground">
          Tüm kurumsal talepler için{" "}
          <Link href="/platform-admin/leads" className="text-primary underline underline-offset-2">
            Teklif talepleri
          </Link>
        </span>
      </div>

      {leads.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/10 p-8 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Henüz demo talebi yok.</p>
          <p className="text-xs text-muted-foreground">
            Public demo formu kapalıysa yeni kayıt düşmez. Mevcut akış: talep → demo oluşturucu → e-posta (Resend).
          </p>
        </div>
      ) : (
        <LeadsTable leads={leads} />
      )}
    </div>
  );
}

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
}: {
  current: string;
  value: string;
  label: string;
}) {
  const href =
    value === "all" ? "/platform-admin/demo-requests" : `/platform-admin/demo-requests?status=${encodeURIComponent(value)}`;
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
