"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Gauge, TrendingUp } from "lucide-react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { registerRcaChartDependencies } from "@/components/rca/chart-register";
import { cn } from "@/lib/utils";
import type { CompanyFileCategory } from "../_lib/company-file-collector";
import { computeAnalytics, type CompanyAnalytics } from "../_lib/company-analytics";

registerRcaChartDependencies();

type Props = {
  categories: CompanyFileCategory[];
  loading?: boolean;
};

export function CompanyOverview({ categories, loading }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const analytics: CompanyAnalytics = useMemo(
    () => computeAnalytics(categories),
    [categories],
  );

  if (loading) {
    return (
      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex h-48 animate-pulse items-center justify-center text-sm text-muted-foreground">
          İstatistikler hesaplanıyor...
        </div>
      </section>
    );
  }

  const { kpis, severity, dofStatus, findingsTrend, incidentsMonthly, totals } = analytics;
  const anyData =
    totals.risks + totals.findings + totals.dofs + totals.incidents + totals.runs > 0;

  if (!anyData) {
    return (
      <section className="rounded-[1.75rem] border border-dashed border-border bg-muted/20 p-8 text-center">
        <p className="text-base font-semibold text-foreground">
          Henüz analiz edilecek veri yok
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Risk analizi, tespit, DÖF veya olay kaydı girildikçe bu ekran canlanır.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={AlertTriangle}
          label="Açık Tespit"
          value={kpis.openFindings}
          hint={`${totals.findings} toplam tespit`}
          tone="amber"
        />
        <KpiCard
          icon={Bell}
          label="Vadesi Geçmiş DÖF"
          value={kpis.overdueDofs}
          hint={`${totals.dofs} toplam DÖF`}
          tone={kpis.overdueDofs > 0 ? "red" : "emerald"}
        />
        <KpiCard
          icon={TrendingUp}
          label="Bu Ay Olay"
          value={kpis.incidentsThisMonth}
          hint={`${totals.incidents} toplam kayıt`}
          tone={kpis.incidentsThisMonth > 0 ? "red" : "slate"}
        />
        <KpiCard
          icon={Gauge}
          label="Saha Hazırlığı"
          value={kpis.avgReadiness !== null ? `%${kpis.avgReadiness}` : "—"}
          hint={`${totals.runs} toplam denetim`}
          tone={
            kpis.avgReadiness === null
              ? "slate"
              : kpis.avgReadiness >= 75
                ? "emerald"
                : kpis.avgReadiness >= 50
                  ? "amber"
                  : "red"
          }
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Tespit Şiddet Dağılımı"
          subtitle={`${totals.findings} tespit, şiddete göre`}
        >
          {mounted ? (
            <Doughnut
              data={{
                labels: severity.labels,
                datasets: [
                  {
                    data: severity.counts,
                    backgroundColor: severity.colors,
                    borderWidth: 0,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "bottom", labels: { boxWidth: 10, padding: 12 } },
                },
                cutout: "62%",
              }}
            />
          ) : null}
        </ChartCard>

        <ChartCard
          title="DÖF Durum Dağılımı"
          subtitle={`${totals.dofs} kayıt`}
        >
          {mounted ? (
            <Doughnut
              data={{
                labels: dofStatus.labels,
                datasets: [
                  {
                    data: dofStatus.counts,
                    backgroundColor: dofStatus.colors,
                    borderWidth: 0,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "bottom", labels: { boxWidth: 10, padding: 12 } },
                },
                cutout: "62%",
              }}
            />
          ) : null}
        </ChartCard>

        <ChartCard
          title="Tespit Akışı (12 Hafta)"
          subtitle="Haftalık yeni tespit sayısı"
        >
          {mounted ? (
            <Line
              data={{
                labels: findingsTrend.labels,
                datasets: [
                  {
                    label: "Yeni tespit",
                    data: findingsTrend.opened,
                    borderColor: "#d9a21b",
                    backgroundColor: "rgba(217, 162, 27, 0.18)",
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 } },
                  x: { ticks: { autoSkip: true, maxRotation: 0 } },
                },
              }}
            />
          ) : null}
        </ChartCard>

        <ChartCard
          title="Aylık Olay Kayıtları (12 Ay)"
          subtitle="Her ay raporlanan olay sayısı"
        >
          {mounted ? (
            <Bar
              data={{
                labels: incidentsMonthly.labels,
                datasets: [
                  {
                    label: "Olay",
                    data: incidentsMonthly.counts,
                    backgroundColor: "rgba(220, 38, 38, 0.75)",
                    borderRadius: 6,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 } },
                  x: { ticks: { autoSkip: false } },
                },
              }}
            />
          ) : null}
        </ChartCard>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// KPI card
// -----------------------------------------------------------------------------

type KpiTone = "emerald" | "amber" | "red" | "slate";

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number | string;
  hint?: string;
  tone: KpiTone;
}) {
  const toneStyles: Record<KpiTone, string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100",
    amber: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100",
    red: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-100",
    slate: "border-border bg-muted/30 text-foreground",
  };
  const iconTone: Record<KpiTone, string> = {
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
    slate: "text-muted-foreground",
  };
  return (
    <div className={cn("rounded-2xl border px-4 py-4", toneStyles[tone])}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-75">{label}</p>
          <p className="text-3xl font-bold leading-tight">{value}</p>
        </div>
        <Icon size={20} className={iconTone[tone]} />
      </div>
      {hint ? <p className="mt-2 text-xs opacity-70">{hint}</p> : null}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="h-64">
        {children || <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4" /><span>Yükleniyor...</span></div>}
      </div>
    </div>
  );
}
