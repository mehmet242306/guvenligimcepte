"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Wrench, GraduationCap, Building2, ClipboardCheck, Scale, MapPin, Stethoscope, CalendarDays, Plus, Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { PremiumIconBadge, type PremiumIconTone } from "@/components/ui/premium-icon-badge";
import { createClient } from "@/lib/supabase/client";

const CAT_ICON_MAP: Record<string, { icon: React.ElementType; tone: PremiumIconTone }> = {
  "Periyodik Kontrol": { icon: Wrench, tone: "danger" },
  "Eğitim": { icon: GraduationCap, tone: "cobalt" },
  "Sağlık Takibi": { icon: Stethoscope, tone: "emerald" },
  "Toplantı & Tatbikat": { icon: ClipboardCheck, tone: "violet" },
  "Yasal Yükümlülük": { icon: Scale, tone: "amber" },
  "Saha Ziyareti": { icon: MapPin, tone: "success" },
  "İSG Kurul Toplantısı": { icon: Building2, tone: "indigo" },
};
function getCatIcon(name: string) { return CAT_ICON_MAP[name] ?? { icon: CalendarDays, tone: "gold" as PremiumIconTone }; }

// ─── Types ──────────────────────────────────────────────────────────────────

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  is_default: boolean;
};

type CompanyWorkspace = {
  id: string;
  display_name: string;
};

type IsgTask = {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  company_workspace_id: string | null;
  start_date: string;
  end_date: string | null;
  recurrence: "none" | "daily" | "weekly" | "monthly" | "quarterly" | "biannual" | "annual";
  status: "planned" | "in_progress" | "completed" | "overdue" | "cancelled";
  location: string | null;
  reminder_days: number;
  include_in_timesheet: boolean;
  timesheet_hours: number | null;
  hourly_rate: number | null;
};

type CalendarView = "month" | "list";
type RecurrenceKey = IsgTask["recurrence"];
type StatusKey = IsgTask["status"];

const RECURRENCE_KEYS: RecurrenceKey[] = ["none", "daily", "weekly", "monthly", "quarterly", "biannual", "annual"];
const STATUS_KEYS: StatusKey[] = ["planned", "in_progress", "completed", "overdue", "cancelled"];

const STATUS_STYLES: Record<string, string> = {
  planned:     "bg-blue-100  text-blue-700  dark:bg-blue-950  dark:text-blue-300  [&>option]:dark:bg-slate-800 [&>option]:dark:text-white",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 [&>option]:dark:bg-slate-800 [&>option]:dark:text-white",
  completed:   "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 [&>option]:dark:bg-slate-800 [&>option]:dark:text-white",
  overdue:     "bg-red-100   text-red-700   dark:bg-red-950   dark:text-red-300   [&>option]:dark:bg-slate-800 [&>option]:dark:text-white",
  cancelled:   "bg-secondary text-muted-foreground dark:bg-slate-800 dark:text-slate-400 [&>option]:dark:bg-slate-800 [&>option]:dark:text-white",
};

// ─── Calendar helpers ────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const CATEGORY_KEY_BY_NAME: Record<string, string> = {
  "Periyodik Kontrol": "periodicControl",
  "Eğitim": "training",
  "Sağlık Takibi": "healthFollowUp",
  "Toplantı & Tatbikat": "meetingDrill",
  "Yasal Yükümlülük": "legalObligation",
  "Saha Ziyareti": "fieldVisit",
  "İSG Kurul Toplantısı": "ohsCommitteeMeeting",
  "Diğer": "other",
};

function categoryLabel(name: string, t: (key: string) => string) {
  const key = CATEGORY_KEY_BY_NAME[name];
  return key ? t(`categories.${key}`) : name;
}

// ─── TaskModal ───────────────────────────────────────────────────────────────

type TaskModalProps = {
  categories: Category[];
  companies: CompanyWorkspace[];
  task: Partial<IsgTask> | null;
  defaultDate?: string;
  /** When set, the company is fixed (company-scoped view) */
  fixedCompanyId?: string;
  onSave: (task: Partial<IsgTask>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
};

function TaskModal({
  categories, companies, task, defaultDate, fixedCompanyId, onSave, onClose, saving,
}: TaskModalProps) {
  const t = useTranslations("planner.core");
  const recurrenceLabels = useMemo(
    () => Object.fromEntries(RECURRENCE_KEYS.map((key) => [key, t(`recurrence.${key}`)])) as Record<RecurrenceKey, string>,
    [t],
  );
  const statusLabels = useMemo(
    () => Object.fromEntries(STATUS_KEYS.map((key) => [key, t(`status.${key}`)])) as Record<StatusKey, string>,
    [t],
  );
  const [form, setForm] = useState<Partial<IsgTask>>({
    title: "",
    description: "",
    category_id: null,
    company_workspace_id: fixedCompanyId ?? null,
    start_date: defaultDate ?? new Date().toISOString().split("T")[0],
    end_date: null,
    recurrence: "none",
    status: "planned",
    location: "",
    reminder_days: 7,
    include_in_timesheet: false,
    timesheet_hours: null,
    hourly_rate: null,
    ...task,
    // if fixed company, always override
    ...(fixedCompanyId ? { company_workspace_id: fixedCompanyId } : {}),
  });

  const set = <K extends keyof IsgTask>(key: K, value: IsgTask[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_32px_80px_rgba(0,0,0,0.3)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {task?.id ? t("modal.editTitle") : t("modal.newTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t("modal.fields.title")}</label>
            <input
              value={form.title ?? ""}
              onChange={(e) => set("title", e.target.value)}
              placeholder={t("modal.placeholders.title")}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t("modal.fields.description")}</label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder={t("modal.placeholders.description")}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Category + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t("modal.fields.category")}</label>
              <select
                value={form.category_id ?? ""}
                onChange={(e) => set("category_id", e.target.value || null)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-slate-800 dark:text-white dark:border-slate-600 [&>option]:bg-white [&>option]:text-foreground dark:[&>option]:bg-slate-800 dark:[&>option]:text-white"
              >
                <option value="">{t("modal.placeholders.category")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {categoryLabel(c.name, t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t("modal.fields.status")}</label>
              <select
                value={form.status ?? "planned"}
                onChange={(e) => set("status", e.target.value as IsgTask["status"])}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-slate-800 dark:text-white dark:border-slate-600 [&>option]:bg-white [&>option]:text-foreground dark:[&>option]:bg-slate-800 dark:[&>option]:text-white"
              >
                {Object.entries(statusLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Company (only when not fixed) */}
          {!fixedCompanyId && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t("modal.fields.company")}</label>
              <select
                value={form.company_workspace_id ?? ""}
                onChange={(e) => set("company_workspace_id", e.target.value || null)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-slate-800 dark:text-white dark:border-slate-600 [&>option]:bg-white [&>option]:text-foreground dark:[&>option]:bg-slate-800 dark:[&>option]:text-white"
              >
                <option value="">{t("modal.placeholders.company")}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.display_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t("modal.fields.startDate")}</label>
              <input
                type="date"
                value={form.start_date ?? ""}
                onChange={(e) => set("start_date", e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-slate-800 dark:text-white dark:border-slate-600 [&>option]:bg-white [&>option]:text-foreground dark:[&>option]:bg-slate-800 dark:[&>option]:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t("modal.fields.endDate")}</label>
              <input
                type="date"
                value={form.end_date ?? ""}
                onChange={(e) => set("end_date", e.target.value || null)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-slate-800 dark:text-white dark:border-slate-600 [&>option]:bg-white [&>option]:text-foreground dark:[&>option]:bg-slate-800 dark:[&>option]:text-white"
              />
            </div>
          </div>

          {/* Recurrence + Reminder */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t("modal.fields.recurrence")}</label>
              <select
                value={form.recurrence ?? "none"}
                onChange={(e) => set("recurrence", e.target.value as IsgTask["recurrence"])}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-slate-800 dark:text-white dark:border-slate-600 [&>option]:bg-white [&>option]:text-foreground dark:[&>option]:bg-slate-800 dark:[&>option]:text-white"
              >
                {Object.entries(recurrenceLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t("modal.fields.reminderDays")}</label>
              <input
                type="number"
                min={0}
                max={365}
                value={form.reminder_days ?? 7}
                onChange={(e) => set("reminder_days", parseInt(e.target.value) || 0)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-slate-800 dark:text-white dark:border-slate-600 [&>option]:bg-white [&>option]:text-foreground dark:[&>option]:bg-slate-800 dark:[&>option]:text-white"
              />
            </div>
          </div>

          {/* Puantaj */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.include_in_timesheet ?? false}
                onChange={(e) => set("include_in_timesheet", e.target.checked)}
                className="h-4 w-4 rounded border-border text-[#0b5fc1] focus:ring-[#0b5fc1]/40"
              />
              <span className="text-sm font-medium text-foreground">{t("modal.fields.includeTimesheet")}</span>
            </label>
            {form.include_in_timesheet && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("modal.fields.timesheetHours")}</label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={form.timesheet_hours ?? ""}
                    onChange={(e) => set("timesheet_hours", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder={t("modal.placeholders.hours")}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0b5fc1]/40 dark:bg-slate-800 dark:text-white dark:border-slate-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("modal.fields.hourlyRate")} <span className="text-muted-foreground/60">{t("modal.optional")}</span></label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.hourly_rate ?? ""}
                    onChange={(e) => set("hourly_rate", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder={t("modal.placeholders.rate")}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0b5fc1]/40 dark:bg-slate-800 dark:text-white dark:border-slate-600"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-secondary px-4 text-sm font-medium text-foreground transition hover:bg-secondary/80"
          >
            {t("actions.cancel")}
          </button>
          <button
            type="button"
            disabled={saving || !form.title || !form.start_date}
            onClick={() => onSave(form)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0b5fc1] px-5 text-sm font-medium text-white shadow-lg hover:bg-[#0a4fa8] disabled:opacity-60 transition-colors"
          >
            {saving ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {t("actions.saving")}
              </>
            ) : (task?.id ? t("actions.update") : t("actions.create"))}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PlannerCore — shared between PlannerClient and CompanyPlannerTab ─────────

export type PlannerCoreProps = {
  /** When set, only tasks for this company_workspace_id are shown/created */
  fixedCompanyId?: string;
  /** Show page-level header with title and "Yeni Görev" button */
  showHeader?: boolean;
};

export function PlannerCore({ fixedCompanyId, showHeader }: PlannerCoreProps) {
  const t = useTranslations("planner.core");
  const today = new Date();
  const [view, setView] = useState<CalendarView>("month");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tasks, setTasks] = useState<IsgTask[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<CompanyWorkspace[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [modalTask, setModalTask] = useState<Partial<IsgTask> | null | undefined>(undefined);
  const [modalDate, setModalDate] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [filterCompanyId, setFilterCompanyId] = useState<string>("all");
  const monthNames = useMemo(() => t.raw("months") as string[], [t]);
  const weekdays = useMemo(() => t.raw("weekdays") as string[], [t]);
  const recurrenceLabels = useMemo(
    () => Object.fromEntries(RECURRENCE_KEYS.map((key) => [key, t(`recurrence.${key}`)])) as Record<RecurrenceKey, string>,
    [t],
  );
  const statusLabels = useMemo(
    () => Object.fromEntries(STATUS_KEYS.map((key) => [key, t(`status.${key}`)])) as Record<StatusKey, string>,
    [t],
  );

  // ─── Load data ────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }

    try {
      // Fetch user's organization_id from user_profiles (needed for RLS)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("organization_id")
          .eq("auth_user_id", user.id)
          .single();
        if (profileData?.organization_id) setOrgId(profileData.organization_id);
      }

      const catQuery = supabase
        .from("isg_task_categories")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name");

      const taskQuery = fixedCompanyId
        ? supabase.from("isg_tasks").select("*").eq("company_workspace_id", fixedCompanyId).order("start_date")
        : supabase.from("isg_tasks").select("*").order("start_date");

      if (fixedCompanyId) {
        const [catRes, taskRes] = await Promise.all([catQuery, taskQuery]);
        if (catRes.data) setCategories(catRes.data as Category[]);
        if (taskRes.data) setTasks(taskRes.data as IsgTask[]);
      } else {
        const compQuery = supabase
          .from("company_workspaces")
          .select("id, display_name")
          .eq("is_archived", false)
          .order("display_name");
        const [catRes, taskRes, compRes] = await Promise.all([catQuery, taskQuery, compQuery]);
        if (catRes.data) setCategories(catRes.data as Category[]);
        if (taskRes.data) setTasks(taskRes.data as IsgTask[]);
        if (compRes.data) setCompanies(compRes.data as CompanyWorkspace[]);
      }
    } catch (err) {
      console.error("[PlannerCore] loadData error:", err);
    } finally {
      setLoading(false);
    }
  }, [fixedCompanyId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Save task ─────────────────────────────────────────────────────────

  async function handleSave(form: Partial<IsgTask>) {
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();
    if (!supabase) { setSaving(false); return; }

    // Re-fetch org_id if we don't have it yet (safety net)
    let currentOrgId = orgId;
    if (!currentOrgId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("user_profiles")
          .select("organization_id")
          .eq("auth_user_id", user.id)
          .single();
        currentOrgId = data?.organization_id ?? null;
        if (currentOrgId) setOrgId(currentOrgId);
      }
    }

    if (!currentOrgId) {
      setSaveError(t("errors.orgNotFound"));
      setSaving(false);
      return;
    }

    try {
      const payload = {
        organization_id: currentOrgId,
        title: form.title,
        description: form.description || null,
        category_id: form.category_id || null,
        company_workspace_id: form.company_workspace_id || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        recurrence: form.recurrence ?? "none",
        status: form.status ?? "planned",
        location: form.location || null,
        reminder_days: form.reminder_days ?? 7,
        include_in_timesheet: form.include_in_timesheet ?? false,
        timesheet_hours: form.include_in_timesheet ? (form.timesheet_hours ?? null) : null,
        hourly_rate: form.include_in_timesheet ? (form.hourly_rate ?? null) : null,
      };

      let savedTaskId: string | null = form.id ?? null;

      if (form.id) {
        const { error } = await supabase
          .from("isg_tasks")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("isg_tasks")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        savedTaskId = inserted?.id ?? null;
      }

      // ── Puantaj entegrasyonu ──
      if (form.include_in_timesheet && form.company_workspace_id && form.start_date) {
        try {
          const taskDate = new Date(form.start_date);
          const tsMonth = taskDate.getMonth() + 1;
          const tsYear = taskDate.getFullYear();

          // Get current user profile id
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: prof } = await supabase
              .from("user_profiles")
              .select("id")
              .eq("auth_user_id", user.id)
              .single();

            if (prof && currentOrgId) {
              // Find or create timesheet for this month
              let { data: ts } = await supabase
                .from("timesheets")
                .select("id")
                .eq("professional_id", prof.id)
                .eq("month", tsMonth)
                .eq("year", tsYear)
                .maybeSingle();

              if (!ts) {
                const { data: newTs } = await supabase
                  .from("timesheets")
                  .insert({ organization_id: currentOrgId, professional_id: prof.id, month: tsMonth, year: tsYear })
                  .select("id")
                  .single();
                ts = newTs;
              }

              if (ts) {
                await supabase.from("timesheet_entries").upsert({
                  timesheet_id: ts.id,
                  company_workspace_id: form.company_workspace_id,
                  entry_date: form.start_date,
                  hours: form.timesheet_hours ?? 8,
                  task_id: savedTaskId,
                }, { onConflict: "timesheet_id,company_workspace_id,entry_date" });

                // Recalc totals
                const { data: allE } = await supabase
                  .from("timesheet_entries")
                  .select("hours")
                  .eq("timesheet_id", ts.id);
                const totalH = (allE ?? []).reduce((s, e) => s + (e.hours ?? 0), 0);
                await supabase.from("timesheets").update({ total_hours: totalH }).eq("id", ts.id);
              }
            }
          }
        } catch (tsErr) {
          console.error("[PlannerCore] timesheet sync error:", tsErr);
          // Don't fail the task save if timesheet sync fails
        }
      }

      setModalTask(undefined);
      await loadData();
    } catch (err: unknown) {
      const supaErr = err as { message?: string; details?: string; code?: string };
      const msg = supaErr.message ?? supaErr.details ?? JSON.stringify(err);
      console.error("[PlannerCore] save error:", JSON.stringify(err, null, 2), "message:", msg);
      setSaveError(msg || t("errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete task ────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDeleteTask"))) return;
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from("isg_tasks").delete().eq("id", id);
    if (error) console.error("[PlannerCore] delete error:", JSON.stringify(error, null, 2));
    await loadData();
  }

  // ─── Quick status change ────────────────────────────────────────────────

  async function handleStatusChange(id: string, status: IsgTask["status"]) {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from("isg_tasks").update({ status }).eq("id", id);
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
  }

  // ─── Derived data ───────────────────────────────────────────────────────

  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.display_name]));
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterCategoryId !== "all" && t.category_id !== filterCategoryId) return false;
    if (!fixedCompanyId && filterCompanyId !== "all" && t.company_workspace_id !== filterCompanyId) return false;
    return true;
  });

  const stats = {
    total: tasks.length,
    planned: tasks.filter((t) => t.status === "planned").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: tasks.filter((t) => t.status === "overdue").length,
  };

  // ─── Month navigation ───────────────────────────────────────────────────

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  function tasksForDate(dateStr: string) {
    return filteredTasks.filter((t) => t.start_date === dateStr);
  }

  function buildCalendarDays() {
    const days: Array<{ date: string; day: number; isCurrentMonth: boolean }> = [];
    const firstDay = (firstDayOfMonth(year, month) + 6) % 7; // Mon-first
    const total = daysInMonth(year, month);
    const prevTotal = daysInMonth(year, month === 0 ? 11 : month - 1);

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevTotal - i;
      const m2 = month === 0 ? 11 : month - 1;
      const y2 = month === 0 ? year - 1 : year;
      days.push({ date: `${y2}-${String(m2 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d, isCurrentMonth: false });
    }
    for (let d = 1; d <= total; d++) {
      days.push({ date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d, isCurrentMonth: true });
    }
    let next = 1;
    while (days.length < 42) {
      const m2 = month === 11 ? 0 : month + 1;
      const y2 = month === 11 ? year + 1 : year;
      days.push({ date: `${y2}-${String(m2 + 1).padStart(2, "0")}-${String(next).padStart(2, "0")}`, day: next++, isCurrentMonth: false });
    }
    return days;
  }

  const todayStr = today.toISOString().split("T")[0];

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header (page view) */}
      {showHeader && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("pageTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("pageDescription")}</p>
          </div>
          <button
            type="button"
            onClick={() => { setModalDate(undefined); setModalTask(null); }}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-red-400/40 bg-[linear-gradient(135deg,#0b5fc1_0%,#2788ff_100%)] px-5 text-sm font-medium text-white shadow-[0_16px_34px_rgba(11,95,193,0.28)] hover:brightness-[1.04]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t("actions.newTask")}
          </button>
        </div>
      )}

      {/* "Yeni Görev" button for embedded (company tab) view */}
      {!showHeader && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { setModalDate(undefined); setModalTask(null); }}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-[linear-gradient(135deg,#0b5fc1_0%,#2788ff_100%)] px-4 text-sm font-medium text-white shadow-[0_8px_20px_rgba(11,95,193,0.25)] hover:brightness-[1.04]"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t("actions.newTask")}
          </button>
        </div>
      )}

      {/* Save error banner */}
      {saveError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span>{saveError}</span>
          <button type="button" onClick={() => setSaveError(null)} className="ml-auto shrink-0 opacity-60 hover:opacity-100" aria-label={t("actions.dismissError")}>x</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { key: "total",       label: t("stats.total"), color: "text-foreground",                                  bg: "bg-gradient-to-br from-secondary/50 to-transparent" },
          { key: "planned",     label: statusLabels.planned, color: "text-blue-600 dark:text-blue-400",             bg: "bg-gradient-to-br from-blue-500/8 to-transparent dark:from-blue-500/12" },
          { key: "in_progress", label: statusLabels.in_progress, color: "text-amber-600 dark:text-amber-400",       bg: "bg-gradient-to-br from-amber-500/8 to-transparent dark:from-amber-500/12" },
          { key: "completed",   label: statusLabels.completed, color: "text-green-600 dark:text-green-400",         bg: "bg-gradient-to-br from-green-500/8 to-transparent dark:from-green-500/12" },
          { key: "overdue",     label: statusLabels.overdue, color: "text-red-600 dark:text-red-400",               bg: "bg-gradient-to-br from-red-500/8 to-transparent dark:from-red-500/12" },
        ].map(({ key, label, color, bg }) => (
          <div key={key} className={`rounded-[1.25rem] border border-border/60 ${bg} px-5 py-4 shadow-sm`}>
            <div className={`text-3xl font-bold ${color}`}>{stats[key as keyof typeof stats]}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters + View toggle */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category filter */}
        <select
          value={filterCategoryId}
          onChange={(e) => setFilterCategoryId(e.target.value)}
          className="h-11 rounded-xl border border-border/60 bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition-all focus:outline-none focus:border-[var(--gold)]/40 focus:shadow-md dark:bg-slate-800 dark:text-white dark:border-slate-600 [&>option]:bg-white [&>option]:text-foreground dark:[&>option]:bg-slate-800 dark:[&>option]:text-white"
        >
          <option value="all">{t("filters.allCategories")}</option>
          {categories.filter((c) => c.name !== "Diğer").map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {categoryLabel(c.name, t)}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-11 rounded-xl border border-border/60 bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition-all focus:outline-none focus:border-[var(--gold)]/40 focus:shadow-md dark:bg-slate-800 dark:text-white dark:border-slate-600 [&>option]:bg-white [&>option]:text-foreground dark:[&>option]:bg-slate-800 dark:[&>option]:text-white"
        >
          <option value="all">{t("filters.allStatuses")}</option>
          {Object.entries(statusLabels).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {/* Company filter — only in global view */}
        {!fixedCompanyId && companies.length > 0 && (
          <select
            value={filterCompanyId}
            onChange={(e) => setFilterCompanyId(e.target.value)}
            className="h-11 rounded-xl border border-border/60 bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition-all focus:outline-none focus:border-[var(--gold)]/40 focus:shadow-md dark:bg-slate-800 dark:text-white dark:border-slate-600 [&>option]:bg-white [&>option]:text-foreground dark:[&>option]:bg-slate-800 dark:[&>option]:text-white"
          >
            <option value="all">{t("filters.allCompanies")}</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.display_name}</option>
            ))}
          </select>
        )}

        <div className="ml-auto flex rounded-xl border border-border/60 bg-secondary/20 p-1 shadow-sm">
          {(["month", "list"] as CalendarView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={[
                "rounded-[0.6rem] px-4 py-2 text-sm font-semibold transition-all",
                view === v ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              ].join(" ")}
            >
              {v === "month" ? t("views.month") : t("views.list")}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-border border-t-primary" />
        </div>
      )}

      {/* ── Sol sidebar (kategoriler) + Sağ içerik (takvim/liste) ── */}
      {!loading && (
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        {/* Sol: Kategori navigasyonu */}
        <aside className="rounded-[1.5rem] border border-border/80 bg-card p-4 shadow-[var(--shadow-card)] lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("sidebar.categories")}</p>
          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => setFilterCategoryId("all")}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${filterCategoryId === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-secondary"}`}
            >
              <span className="flex items-center gap-2.5">
                <PremiumIconBadge icon={CalendarDays} tone={filterCategoryId === "all" ? "gold" : "neutral"} size="xs" />
                {t("sidebar.all")}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${filterCategoryId === "all" ? "bg-white/20" : "bg-muted"}`}>{tasks.length}</span>
            </button>
            {categories.filter((c) => c.name !== "Diğer").map((c) => {
              const count = tasks.filter((t) => t.category_id === c.id).length;
              const isActive = filterCategoryId === c.id;
              const ci = getCatIcon(c.name);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFilterCategoryId(isActive ? "all" : c.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${isActive ? "text-white shadow-sm" : "text-foreground hover:bg-secondary"}`}
                  style={isActive ? { backgroundColor: c.color } : undefined}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <PremiumIconBadge icon={ci.icon} tone={isActive ? "gold" : ci.tone} size="xs" />
                    <span className="truncate">{categoryLabel(c.name, t)}</span>
                  </span>
                  {count > 0 && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? "bg-white/20" : "bg-muted"}`}>{count}</span>}
                </button>
              );
            })}
          </nav>
          <div className="mt-4 border-t border-border/60 pt-3">
            <button
              type="button"
              onClick={() => { setModalDate(new Date().toISOString().split("T")[0]); setModalTask(null); }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-border/50 px-3 py-2.5 text-sm text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
            >
              <Plus size={15} /> {t("sidebar.addCategory")}
            </button>
          </div>
          <div className="mt-3 border-t border-border/60 pt-3">
            <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("sidebar.quickAdd")}</p>
            <div className="mt-2 space-y-1">
              {categories.filter((c) => c.name !== "Diğer").map((c) => (
                <button
                  key={`add-${c.id}`}
                  type="button"
                  onClick={() => { setModalDate(new Date().toISOString().split("T")[0]); setModalTask(null); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                  + {categoryLabel(c.name, t)}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Sağ: Takvim veya Liste */}
        <div>
      {view === "month" && (
        <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-foreground">{monthNames[month]} {year}</h2>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-border">
            {weekdays.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {buildCalendarDays().map(({ date, day, isCurrentMonth }, idx) => {
              const dayTasks = tasksForDate(date);
              const isToday = date === todayStr;
              return (
                <div
                  key={date}
                  className={[
                    "min-h-[100px] cursor-pointer border-b border-r border-border p-1.5 transition hover:bg-secondary/30",
                    idx % 7 === 6 ? "border-r-0" : "",
                    !isCurrentMonth ? "opacity-40" : "",
                  ].join(" ")}
                  onClick={() => { setModalDate(date); setModalTask(null); }}
                >
                  <div className={[
                    "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday ? "bg-primary text-white" : "text-foreground",
                  ].join(" ")}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 3).map((t) => {
                      const cat = t.category_id ? catMap[t.category_id] : null;
                      const companyName = t.company_workspace_id ? companyMap[t.company_workspace_id] : null;
                      return (
                        <div
                          key={t.id}
                          onClick={(e) => { e.stopPropagation(); setModalDate(undefined); setModalTask(t); }}
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white transition hover:brightness-110 cursor-pointer"
                          style={{ background: cat?.color ?? "#6B7280" }}
                          title={companyName ? `${t.title} — ${companyName}` : t.title}
                        >
                          <div className="truncate font-semibold leading-tight">{t.title}</div>
                          {companyName && (
                            <div className="truncate text-[8.5px] leading-tight opacity-90">{companyName}</div>
                          )}
                        </div>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <div className="px-1.5 text-[10px] text-muted-foreground">{t("calendar.more", { count: dayTasks.length - 3 })}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── List view ── */}
      {view === "list" && (
        <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow-card)]">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="text-5xl">📋</div>
              <p className="font-medium text-muted-foreground">{t("empty.title")}</p>
              <p className="text-sm text-muted-foreground">{t("empty.description")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredTasks.map((task) => {
                const cat = task.category_id ? catMap[task.category_id] : null;
                const companyName = task.company_workspace_id ? companyMap[task.company_workspace_id] : null;
                return (
                  <div key={task.id} className="flex items-start gap-4 px-6 py-4 hover:bg-secondary/20 transition">
                    <div
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{ background: cat?.color ?? "#6B7280" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{task.title}</span>
                        {cat && (
                          <span className="text-xs text-muted-foreground">{cat.icon} {categoryLabel(cat.name, t)}</span>
                        )}
                        {companyName && !fixedCompanyId && (
                          <span className="inline-flex items-center rounded-lg bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                            {companyName}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">{task.description}</p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{task.start_date}</span>
                        {task.recurrence !== "none" && <span>· {recurrenceLabels[task.recurrence]}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as IsgTask["status"])}
                        className={[
                          "rounded-xl border-0 px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary/40",
                          STATUS_STYLES[task.status],
                        ].join(" ")}
                      >
                        {Object.entries(statusLabels).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => { setModalDate(undefined); setModalTask(task); }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(task.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

        </div>
      </div>
      )}

      {/* Task Modal */}
      {modalTask !== undefined && (
        <TaskModal
          categories={categories}
          companies={companies}
          task={modalTask}
          defaultDate={modalDate}
          fixedCompanyId={fixedCompanyId}
          onSave={handleSave}
          onClose={() => setModalTask(undefined)}
          saving={saving}
        />
      )}
    </div>
  );
}

// ─── Page-level wrapper ───────────────────────────────────────────────────────

export default function PlannerClient() {
  return <PlannerCore showHeader />;
}
