"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Clock3, ListTodo, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchCorrectiveActions,
  type CorrectiveActionPriority,
  type CorrectiveActionRecord,
} from "@/lib/supabase/corrective-actions-api";

const PRIORITY_ORDER: CorrectiveActionPriority[] = ["Düşük", "Orta", "Yüksek", "Kritik"];

const PRIORITY_I18N_KEY: Record<CorrectiveActionPriority, "low" | "medium" | "high" | "critical"> = {
  Düşük: "low",
  Orta: "medium",
  Yüksek: "high",
  Kritik: "critical",
};

export function CorrectiveActionsClient() {
  const t = useTranslations("capaManagementPage");

  const statusMeta = useMemo(
    (): Record<
      CorrectiveActionRecord["status"],
      { label: string; badge: "accent" | "warning" | "neutral" | "success" | "danger" }
    > => ({
      tracking: { label: t("statuses.tracking"), badge: "accent" },
      in_progress: { label: t("statuses.in_progress"), badge: "warning" },
      on_hold: { label: t("statuses.on_hold"), badge: "neutral" },
      completed: { label: t("statuses.completed"), badge: "success" },
      overdue: { label: t("statuses.overdue"), badge: "danger" },
    }),
    [t],
  );
  const [items, setItems] = useState<CorrectiveActionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CorrectiveActionRecord["status"] | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<CorrectiveActionRecord["priority"] | "all">("all");
  const [companyFilter, setCompanyFilter] = useState("all");

  useEffect(() => {
    fetchCorrectiveActions().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const companyOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.companyName).filter(Boolean))),
    [items],
  );

  const stats = useMemo(() => {
    const overdue = items.filter((item) => item.status === "overdue").length;
    const active = items.filter((item) => item.status === "tracking" || item.status === "in_progress").length;
    const completed = items.filter((item) => item.status === "completed").length;
    return { total: items.length, overdue, active, completed };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !search.trim() ||
        [item.code, item.title, item.rootCause, item.companyName, item.incidentCode]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(search.trim().toLowerCase()));

      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
      const matchesCompany = companyFilter === "all" || item.companyName === companyFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesCompany;
    });
  }, [items, search, statusFilter, priorityFilter, companyFilter]);

  const statusKeys: CorrectiveActionRecord["status"][] = ["tracking", "in_progress", "on_hold", "completed", "overdue"];

  return (
    <div className="page-stack">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Link href="/incidents/new">
            <Button variant="accent">
              <Plus className="mr-1 size-4" /> {t("addManual")}
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t("stats.total")} value={stats.total} icon={ListTodo} />
        <StatCard title={t("stats.overdue")} value={stats.overdue} icon={AlertTriangle} tone="danger" />
        <StatCard title={t("stats.active")} value={stats.active} icon={Clock3} tone="warning" />
        <StatCard title={t("stats.completed")} value={stats.completed} icon={CheckCircle2} tone="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
          <CardDescription>{t("list.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-11 w-full rounded-xl border border-border bg-input pl-10 pr-3 text-sm text-foreground"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as CorrectiveActionRecord["status"] | "all")}
              className="h-11 rounded-xl border border-border bg-input px-3 text-sm text-foreground"
            >
              <option value="all">{t("filters.allStatuses")}</option>
              {statusKeys.map((s) => (
                <option key={s} value={s}>
                  {t(`statuses.${s}`)}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as CorrectiveActionRecord["priority"] | "all")}
              className="h-11 rounded-xl border border-border bg-input px-3 text-sm text-foreground"
            >
              <option value="all">{t("filters.allPriorities")}</option>
              {PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>
                  {t(`priorities.${PRIORITY_I18N_KEY[p]}`)}
                </option>
              ))}
            </select>
            <select
              value={companyFilter}
              onChange={(event) => setCompanyFilter(event.target.value)}
              className="h-11 rounded-xl border border-border bg-input px-3 text-sm text-foreground"
            >
              <option value="all">{t("filters.allCompanies")}</option>
              {companyOptions.map((company) => (
                <option key={company} value={company ?? ""}>
                  {company}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="text-base font-semibold text-foreground">{t("empty.title")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("empty.hint")}</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{item.code ?? t("card.codeFallback")}</p>
                      <Badge variant={statusMeta[item.status].badge}>{statusMeta[item.status].label}</Badge>
                    </div>
                    <p className="mt-1 text-base font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("card.sourceLabel")}{" "}
                      {item.incidentCode ?? t("card.standalone")} · {item.companyName ?? t("card.noCompany")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{t("card.deadline")}</p>
                    <p className="text-sm font-medium text-foreground">{item.deadline}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {t("card.responsible")} {item.responsibleRole ?? t("card.unassigned")}
                  </p>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-muted-foreground">
                      {t("card.completion", { percent: item.completionPercentage })}
                    </p>
                    <Link href={`/corrective-actions/${item.id}`}>
                      <Button variant="outline" size="sm">
                        {t("card.detail")}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  tone = "accent",
}: {
  title: string;
  value: number;
  icon: typeof ListTodo;
  tone?: "accent" | "warning" | "danger" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-400/40"
      : tone === "warning"
        ? "border-amber-400/40"
        : tone === "success"
          ? "border-emerald-400/40"
          : "border-sky-400/40";

  return (
    <Card className={toneClass}>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-muted">
          <Icon className="size-5 text-[var(--gold)]" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
