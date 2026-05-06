"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardCheck, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { loadCompanyDirectory } from "@/lib/company-directory";
import {
  getSuggestedTemplateIds,
  PERIODIC_CONTROL_TEMPLATE_BY_ID,
  SECTOR_PROFILE_ORDER,
  templateIdsForPicker,
  type OwnershipScope,
  type SectorProfile,
} from "@/lib/planner/periodic-control-templates";
import { createClient } from "@/lib/supabase/client";
import { createPeriodicControl } from "@/lib/supabase/tracking-api";

type RegisterRow = {
  id: string;
  templateId: string | null;
  title: string;
  regulation: string;
  periodLabel: string;
  tableRef: string;
  source: "template" | "manual";
  controlType: string;
  status?: "planned" | "completed";
  plannedDate?: string;
  doneDate?: string;
  doneNote?: string;
};

function newRowId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function emptyManualRow(): RegisterRow {
  return {
    id: newRowId(),
    templateId: null,
    title: "",
    regulation: "",
    periodLabel: "",
    tableRef: "—",
    source: "manual",
    controlType: "diger",
    status: "planned",
    plannedDate: "",
    doneDate: "",
    doneNote: "",
  };
}

function rowFromTemplate(templateId: string, locale: string): RegisterRow {
  const def = PERIODIC_CONTROL_TEMPLATE_BY_ID[templateId];
  const tr = locale === "tr";
  return {
    id: newRowId(),
    templateId,
    title: tr ? def.title.tr : def.title.en,
    regulation: tr ? def.regulation.tr : def.regulation.en,
    periodLabel: tr ? def.period.tr : def.period.en,
    tableRef: def.tableRef,
    source: "template",
    controlType: def.controlType,
    status: "planned",
    plannedDate: "",
    doneDate: "",
    doneNote: "",
  };
}

export default function PeriodicControlsRegisterTab() {
  const t = useTranslations("planner.periodicControls");
  const locale = useLocale();
  const companies = useMemo(() => loadCompanyDirectory(), []);
  const [companyId, setCompanyId] = useState<string>(companies[0]?.id ?? "");
  const [ownership, setOwnership] = useState<OwnershipScope>("private");
  const [sector, setSector] = useState<SectorProfile>("manufacturing");
  const [rows, setRows] = useState<RegisterRow[]>([]);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [templatePick, setTemplatePick] = useState<string>("");

  const sectorOptions = useMemo(
    () =>
      (t.raw("sectors") as Record<SectorProfile, { label: string; desc: string }>) ?? ({} as Record<SectorProfile, { label: string; desc: string }>),
    [t],
  );

  const pickerIds = useMemo(() => templateIdsForPicker(ownership), [ownership]);

  const loadRegister = useCallback(
    async (cid: string) => {
      if (!cid) return;
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        if (!supabase) throw new Error(t("errors.noSupabase"));
        const { data, error: e } = await supabase
          .from("planner_periodic_control_registers")
          .select("*")
          .eq("company_workspace_id", cid)
          .is("deleted_at", null)
          .maybeSingle();
        if (e && e.code !== "PGRST116") throw e;
        if (data?.data && typeof data.data === "object") {
          const payload = data.data as {
            ownership?: OwnershipScope;
            sector?: SectorProfile;
            rows?: RegisterRow[];
          };
          if (payload.ownership) setOwnership(payload.ownership);
          if (payload.sector) setSector(payload.sector);
          if (Array.isArray(payload.rows)) setRows(payload.rows);
          else setRows([]);
          setRecordId(data.id);
        } else {
          setRows([]);
          setRecordId(null);
        }
      } catch (err) {
        console.warn("[PeriodicControlsRegisterTab] load", err);
        setError(err instanceof Error ? err.message : t("errors.loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (companyId) void loadRegister(companyId);
  }, [companyId, loadRegister]);

  async function handleSave() {
    if (!companyId) {
      setError(t("errors.selectCompany"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error(t("errors.noSupabase"));
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(t("errors.sessionNotFound"));
      const { data: profile } = await supabase.from("user_profiles").select("organization_id").eq("auth_user_id", user.id).single();
      if (!profile?.organization_id) throw new Error(t("errors.orgNotFound"));

      const payload = {
        organization_id: profile.organization_id,
        company_workspace_id: companyId,
        data: { ownership, sector, rows },
        created_by: user.id,
      };
      const { data, error: e } = await supabase
        .from("planner_periodic_control_registers")
        .upsert(payload, { onConflict: "organization_id,company_workspace_id" })
        .select()
        .single();
      if (e) throw e;
      if (data?.id) setRecordId(data.id);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2200);
    } catch (err) {
      console.warn("[PeriodicControlsRegisterTab] save", err);
      setError(err instanceof Error ? err.message : t("errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  function applySuggestions() {
    const ids = getSuggestedTemplateIds(ownership, sector);
    setRows((prev) => {
      const existingTpl = new Set(prev.map((r) => r.templateId).filter(Boolean) as string[]);
      const additions = ids.filter((id) => !existingTpl.has(id)).map((id) => rowFromTemplate(id, locale));
      return [...prev, ...additions];
    });
  }

  function addFromPicker() {
    if (!templatePick) return;
    setRows((prev) => {
      if (prev.some((r) => r.templateId === templatePick)) return prev;
      return [...prev, rowFromTemplate(templatePick, locale)];
    });
    setTemplatePick("");
  }

  function addManual() {
    setRows((prev) => [...prev, emptyManualRow()]);
  }

  function updateRow(id: string, patch: Partial<RegisterRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch, source: r.source } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function pushRowToTracking(row: RegisterRow) {
    if (!companyId || !row.title.trim()) {
      setError(t("errors.needTitle"));
      return;
    }
    setPushingId(row.id);
    setError(null);
    try {
      const rowStatus = row.status ?? "planned";
      const notes = [
        row.regulation ? `${t("fields.regulation")}: ${row.regulation}` : "",
        row.periodLabel ? `${t("fields.period")}: ${row.periodLabel}` : "",
        row.doneNote?.trim() ? `${t("table.doneNote")}: ${row.doneNote.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      const id = await createPeriodicControl(companyId, {
        title: row.title.trim(),
        controlType: row.controlType || "diger",
        inspectorName: "",
        inspectionDate:
          rowStatus === "completed"
            ? (row.doneDate?.trim() || new Date().toISOString().split("T")[0])
            : "",
        nextInspectionDate: rowStatus === "planned" ? (row.plannedDate?.trim() || "") : "",
        result: "uygun",
        reportReference: row.tableRef && row.tableRef !== "—" ? `${t("fields.tableRef")} ${row.tableRef}` : "",
        notes,
        status: rowStatus,
      });
      if (!id) throw new Error(t("errors.pushFailed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.pushFailed"));
    } finally {
      setPushingId(null);
    }
  }

  const selectedCompany = companies.find((c) => c.id === companyId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <ClipboardCheck className="size-5" />
              </span>
              <div>
                <CardTitle>{t("card.title")}</CardTitle>
                <CardDescription className="mt-1 max-w-3xl">{t("card.description")}</CardDescription>
              </div>
            </div>
            {savedFlash && (
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t("actions.saved")}</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{t("fields.company")}</label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground"
              >
                <option value="">{t("fields.companyPlaceholder")}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{t("fields.ownership")}</label>
              <select
                value={ownership}
                onChange={(e) => setOwnership(e.target.value as OwnershipScope)}
                className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground"
              >
                <option value="private">{t("ownership.private")}</option>
                <option value="public">{t("ownership.public")}</option>
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium text-foreground">{t("fields.sector")}</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value as SectorProfile)}
                className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground"
              >
                {SECTOR_PROFILE_ORDER.map((key) => (
                  <option key={key} value={key}>
                    {sectorOptions[key]?.label ?? key}
                  </option>
                ))}
              </select>
              {sectorOptions[sector]?.desc ? (
                <p className="mt-1 text-xs text-muted-foreground">{sectorOptions[sector].desc}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={applySuggestions}>
              {t("actions.applySuggestions")}
            </Button>
            <Button type="button" variant="outline" onClick={addManual}>
              <Plus className="mr-1.5 size-4" />
              {t("actions.addManual")}
            </Button>
            <Button type="button" variant="primary" onClick={() => void handleSave()} disabled={saving || !companyId}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t("actions.saving")}
                </>
              ) : (
                <>
                  <Save className="mr-2 size-4" />
                  {t("actions.save")}
                </>
              )}
            </Button>
            <Link
              href={companyId ? `/companies/${companyId}?tab=tracking` : "/companies"}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium",
                "border border-border bg-card text-primary shadow-[var(--shadow-soft)] hover:bg-secondary",
              )}
            >
              {t("actions.openTracking")}
            </Link>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/30 p-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-foreground">{t("actions.addFromTemplate")}</label>
              <select
                value={templatePick}
                onChange={(e) => setTemplatePick(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground"
              >
                <option value="">{t("actions.pickTemplatePlaceholder")}</option>
                {pickerIds.map((tid) => {
                  const def = PERIODIC_CONTROL_TEMPLATE_BY_ID[tid];
                  const label = locale === "tr" ? def.title.tr : def.title.en;
                  return (
                    <option key={tid} value={tid}>
                      {def.tableRef} — {label}
                    </option>
                  );
                })}
              </select>
            </div>
            <Button type="button" variant="secondary" disabled={!templatePick} onClick={addFromPicker}>
              {t("actions.addSelectedTemplate")}
            </Button>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("loading")}
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">{t("table.title")}</th>
                  <th className="px-3 py-2">{t("table.status")}</th>
                  <th className="px-3 py-2">{t("table.plannedDate")}</th>
                  <th className="px-3 py-2">{t("table.doneDate")}</th>
                  <th className="px-3 py-2">{t("table.doneNote")}</th>
                  <th className="px-3 py-2">{t("table.regulation")}</th>
                  <th className="px-3 py-2">{t("table.period")}</th>
                  <th className="px-3 py-2">{t("table.tableRef")}</th>
                  <th className="px-3 py-2">{t("table.source")}</th>
                  <th className="px-3 py-2 w-40">{t("table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-10 text-center text-muted-foreground">
                      {t("empty")}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={row.id} className={cn("border-t", (row.status ?? "planned") === "completed" ? "bg-emerald-50/40 dark:bg-emerald-950/10" : "bg-amber-50/30 dark:bg-amber-950/10")}>
                      <td className="px-3 py-2 align-top text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-2 align-top">
                        <Input value={row.title} onChange={(e) => updateRow(row.id, { title: e.target.value })} className="min-w-[200px]" />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <select
                          value={row.status ?? "planned"}
                          onChange={(e) => {
                            const status = e.target.value as "planned" | "completed";
                            updateRow(row.id, {
                              status,
                              plannedDate: status === "completed" ? "" : row.plannedDate ?? "",
                              doneDate: status === "planned" ? "" : row.doneDate ?? "",
                            });
                          }}
                          className="h-9 min-w-[120px] rounded-xl border border-border bg-input px-2 text-xs text-foreground"
                        >
                          <option value="planned">{t("table.statusPlanned")}</option>
                          <option value="completed">{t("table.statusCompleted")}</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <Input
                          type="date"
                          value={row.plannedDate ?? ""}
                          onChange={(e) => updateRow(row.id, { plannedDate: e.target.value })}
                          disabled={(row.status ?? "planned") === "completed"}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <Input
                          type="date"
                          value={row.doneDate ?? ""}
                          onChange={(e) => updateRow(row.id, { doneDate: e.target.value, status: "completed" })}
                          disabled={(row.status ?? "planned") !== "completed"}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <Input
                          value={row.doneNote ?? ""}
                          onChange={(e) => updateRow(row.id, { doneNote: e.target.value })}
                          placeholder={t("table.doneNotePlaceholder")}
                          className="min-w-[180px]"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <Input value={row.regulation} onChange={(e) => updateRow(row.id, { regulation: e.target.value })} className="min-w-[220px]" />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <Input value={row.periodLabel} onChange={(e) => updateRow(row.id, { periodLabel: e.target.value })} />
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-muted-foreground">{row.tableRef}</td>
                      <td className="px-3 py-2 align-top text-xs">
                        {row.source === "template" ? t("source.template") : t("source.manual")}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            disabled={pushingId === row.id}
                            onClick={() => void pushRowToTracking(row)}
                          >
                            {pushingId === row.id ? <Loader2 className="size-3.5 animate-spin" /> : t("actions.toTracking")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 shrink-0 p-0"
                            onClick={() => removeRow(row.id)}
                            aria-label={t("actions.deleteRow")}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">{t("disclaimer", { company: selectedCompany?.name ?? "—" })}</p>
          {recordId ? <p className="text-xs text-muted-foreground">{t("savedHint")}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
