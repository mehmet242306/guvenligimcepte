"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { getCalendarMonthNamesLong } from "@/lib/calendar-locale-labels";
import { exportTimesheetExcel, exportPayrollExcel, downloadBlob, type TimesheetExportData } from "@/lib/timesheet-export";

// ─── Types ─────────────────────────────────────────────────────────────────

type Company = { id: string; display_name: string };
type Entry = {
  id: string;
  timesheet_id: string;
  company_workspace_id: string;
  entry_date: string;
  hours: number;
  task_id: string | null;
  notes: string | null;
};
type Timesheet = {
  id: string;
  organization_id: string;
  professional_id: string;
  month: number;
  year: number;
  total_hours: number;
  status: "draft" | "submitted" | "approved" | "paid";
  notes: string | null;
  created_at: string;
};
type Settings = {
  id?: string;
  header_type: string;
  header_logo_url: string | null;
  header_line1: string;
  header_line2: string;
  header_line3: string;
  professional_title: string;
  certificate_no: string;
  footer_note: string;
  salary_coefficient: number;
  base_indicator: number;
  stamp_tax_rate: number;
  is_government_employee: boolean;
};
type MainTab = "grid" | "archive" | "settings";

// ─── Constants ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { labelKey: string; cls: string; next?: string }> = {
  draft:     { labelKey: "status.draft", cls: "bg-secondary text-muted-foreground", next: "submitted" },
  submitted: { labelKey: "status.submitted", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", next: "approved" },
  approved:  { labelKey: "status.approved", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", next: "paid" },
  paid:      { labelKey: "status.paid", cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
};

const selectCls = "h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0b5fc1]/40 dark:bg-slate-800 dark:text-white dark:border-slate-600";
const inputCls = "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0b5fc1]/40 dark:bg-slate-800 dark:text-white dark:border-slate-600";
const btnPrimary = "inline-flex items-center gap-1.5 rounded-xl bg-[#0b5fc1] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0a4fa8] transition-colors";
const btnSecondary = "inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors";

const defaultSettings: Settings = {
  header_type: "custom", header_logo_url: null,
  header_line1: "", header_line2: "", header_line3: "",
  professional_title: "", certificate_no: "", footer_note: "",
  salary_coefficient: 0.013304, base_indicator: 200, stamp_tax_rate: 0.00759, is_government_employee: false,
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function isWeekend(y: number, m: number, d: number) { const w = new Date(y, m - 1, d).getDay(); return w === 0 || w === 6; }
function ds(y: number, m: number, d: number) { return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function fmtTL(n: number) { return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function calcGovPayment(hours: number, coef: number, indicator: number, stampRate: number) {
  const hourlyRate = indicator * coef;
  const gross = hourlyRate * hours;
  const stampTax = gross * stampRate;
  const net = gross - stampTax;
  return { hourlyRate, gross, stampTax, net };
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function TimesheetClient() {
  const t = useTranslations("planner.timesheet");
  const locale = useLocale();
  const today = new Date();
  const [tab, setTab] = useState<MainTab>("grid");
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [companies, setCompanies] = useState<Company[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null);

  // Grid edit
  const [editCell, setEditCell] = useState<{ companyId: string; day: number } | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  // Archive
  const [archiveSheets, setArchiveSheets] = useState<Timesheet[]>([]);
  const [archiveYear, setArchiveYear] = useState(today.getFullYear());
  const [archiveStatus, setArchiveStatus] = useState<string>("all");
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // PDF preview
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const daysInMonth = new Date(year, month, 0).getDate();
  const monthNames = useMemo(() => getCalendarMonthNamesLong(locale), [locale]);
  const statusLabel = useCallback((status: string) => t(STATUS_MAP[status]?.labelKey ?? "status.draft"), [t]);

  // ═══════════════════════════════════════════
  // Data Loading
  // ═══════════════════════════════════════════

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: prof } = await supabase.from("user_profiles").select("id, organization_id, full_name").eq("auth_user_id", user.id).single();
      if (!prof) { setLoading(false); return; }
      setProfileId(prof.id); setOrgId(prof.organization_id); setProfileName(prof.full_name ?? "");

      const [{ data: comps }, { data: tsData }, { data: sData }] = await Promise.all([
        supabase.from("company_workspaces").select("id, display_name").eq("is_archived", false).order("display_name"),
        supabase.from("timesheets").select("*").eq("professional_id", prof.id).eq("month", month).eq("year", year).maybeSingle(),
        supabase.from("timesheet_settings").select("*").eq("user_profile_id", prof.id).maybeSingle(),
      ]);
      setCompanies(comps ?? []);
      setTimesheet(tsData as Timesheet | null);
      if (sData) {
        // Replace null values with defaults to avoid null in controlled inputs
        const merged = { ...defaultSettings } as Record<string, unknown>;
        for (const [k, v] of Object.entries(sData)) {
          if (v !== null && v !== undefined) merged[k] = v;
        }
        setSettings(merged as Settings);
      }

      if (tsData) {
        const { data: eData } = await supabase.from("timesheet_entries").select("*").eq("timesheet_id", tsData.id);
        setEntries(eData ?? []);
      } else { setEntries([]); }
    } catch (err) { console.error("[Timesheet] load error:", err); }
    finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => { editRef.current?.focus(); }, [editCell]);

  // Archive loader
  const loadArchive = useCallback(async () => {
    setArchiveLoading(true);
    const supabase = createClient();
    if (!supabase || !profileId) { setArchiveLoading(false); return; }
    let q = supabase.from("timesheets").select("*").eq("professional_id", profileId).eq("year", archiveYear).order("month", { ascending: false });
    if (archiveStatus !== "all") q = q.eq("status", archiveStatus);
    const { data } = await q;
    setArchiveSheets((data ?? []) as Timesheet[]);
    setArchiveLoading(false);
  }, [profileId, archiveYear, archiveStatus]);

  useEffect(() => { if (tab === "archive" && profileId) void loadArchive(); }, [tab, loadArchive, profileId]);

  // ═══════════════════════════════════════════
  // Timesheet CRUD
  // ═══════════════════════════════════════════

  async function ensureTimesheet(): Promise<string | null> {
    if (timesheet) return timesheet.id;
    if (!profileId || !orgId) return null;
    const supabase = createClient();
    if (!supabase) return null;
    const { data, error } = await supabase.from("timesheets")
      .insert({ organization_id: orgId, professional_id: profileId, month, year })
      .select("id").single();
    if (error) { console.error("[Timesheet] create error:", JSON.stringify(error, null, 2), error.message); return null; }
    return data.id;
  }

  function getEntry(cid: string, day: number) {
    return entries.find((e) => e.company_workspace_id === cid && e.entry_date === ds(year, month, day));
  }
  function companyTotal(cid: string) {
    return entries.filter((e) => e.company_workspace_id === cid).reduce((s, e) => s + e.hours, 0);
  }

  async function saveCell(cid: string, day: number, hours: number | null) {
    const supabase = createClient();
    if (!supabase) return;
    const tsId = await ensureTimesheet();
    if (!tsId) return;
    const d = ds(year, month, day);
    const existing = getEntry(cid, day);

    if (hours === null || hours === 0) {
      if (existing) await supabase.from("timesheet_entries").delete().eq("id", existing.id);
    } else if (existing) {
      await supabase.from("timesheet_entries").update({ hours }).eq("id", existing.id);
    } else {
      await supabase.from("timesheet_entries").insert({ timesheet_id: tsId, company_workspace_id: cid, entry_date: d, hours });
    }
    // Recalc
    const { data: allE } = await supabase.from("timesheet_entries").select("hours").eq("timesheet_id", tsId);
    const total = (allE ?? []).reduce((s, e) => s + (e.hours ?? 0), 0);
    await supabase.from("timesheets").update({ total_hours: total }).eq("id", tsId);
    setEditCell(null);
    void loadData();
  }

  function handleCellClick(cid: string, day: number) {
    if (timesheet && timesheet.status !== "draft") return;
    setEditCell({ companyId: cid, day });
    setEditValue(getEntry(cid, day)?.hours?.toString() ?? "8");
  }

  function handleCellKey(e: React.KeyboardEvent, cid: string, day: number) {
    if (e.key === "Enter") saveCell(cid, day, editValue.trim() ? parseFloat(editValue) : null);
    else if (e.key === "Escape") setEditCell(null);
  }

  async function updateStatus(s: string) {
    if (!timesheet) return;
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from("timesheets").update({ status: s }).eq("id", timesheet.id);
    void loadData();
  }

  async function deleteTimesheet(id: string) {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from("timesheet_entries").delete().eq("timesheet_id", id);
    await supabase.from("timesheets").delete().eq("id", id);
    setDeleteConfirm(null);
    void loadArchive();
    if (timesheet?.id === id) void loadData();
  }

  // ═══════════════════════════════════════════
  // Settings save
  // ═══════════════════════════════════════════

  async function handleSettingsSave() {
    if (!profileId) return;
    setSavingSettings(true); setSettingsFeedback(null);
    const supabase = createClient();
    if (!supabase) { setSavingSettings(false); return; }
    const { error } = await supabase.from("timesheet_settings").upsert({
      user_profile_id: profileId,
      header_type: settings.header_type,
      header_logo_url: settings.header_logo_url || null,
      header_line1: settings.header_line1 || null,
      header_line2: settings.header_line2 || null,
      header_line3: settings.header_line3 || null,
      professional_title: settings.professional_title || null,
      certificate_no: settings.certificate_no || null,
      footer_note: settings.footer_note || null,
      salary_coefficient: settings.salary_coefficient,
      base_indicator: settings.base_indicator,
      stamp_tax_rate: settings.stamp_tax_rate,
      is_government_employee: settings.is_government_employee,
    }, { onConflict: "user_profile_id" });
    setSavingSettings(false);
    setSettingsFeedback(error ? t("settings.errorPrefix", { message: error.message }) : t("settings.saved"));
  }

  // ═══════════════════════════════════════════
  // Export
  // ═══════════════════════════════════════════

  function buildExportData(): TimesheetExportData {
    return {
      profileName, professionalTitle: settings.professional_title, certificateNo: settings.certificate_no,
      month, year, daysInMonth,
      companies: companies.map((c) => ({ id: c.id, name: c.display_name })),
      entries: entries.map((e) => {
        const d = new Date(e.entry_date);
        return { company_id: e.company_workspace_id, day: d.getDate(), hours: e.hours };
      }),
      headerLine1: settings.header_line1, headerLine2: settings.header_line2, headerLine3: settings.header_line3,
      footerNote: settings.footer_note,
      isGovernment: settings.is_government_employee,
      salaryCoefficient: settings.salary_coefficient, baseIndicator: settings.base_indicator, stampTaxRate: settings.stamp_tax_rate,
    };
  }

  async function handleExportTimesheet() {
    const blob = await exportTimesheetExcel(buildExportData());
    downloadBlob(blob, `${profileName || t("title")}_${t("title")}_${monthNames[month - 1]}_${year}.xlsx`);
  }

  async function handleExportPayroll() {
    const blob = await exportPayrollExcel(buildExportData());
    downloadBlob(blob, `${profileName || t("payroll.title")}_${t("payroll.title")}_${monthNames[month - 1]}_${year}.xlsx`);
  }

  function printPdf() {
    const el = document.getElementById("pdf-content");
    if (!el) return;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html lang="${locale}"><head><title>${t("pdf.title", { month: monthNames[month - 1], year })}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#1a1a1a;font-size:12px}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #333;padding:4px 6px;text-align:center;font-size:11px}
        th{background:#e8e8e8;font-weight:bold}
        .weekend{background:#fee2e2}
        .header{text-align:center;margin-bottom:20px}
        .header h1{font-size:14px;margin:2px 0}
        .header h2{font-size:12px;font-weight:normal;margin:2px 0}
        .total-cell{font-weight:bold;background:#f0f0f0}
        .footer{margin-top:30px;font-size:11px}
        .signatures{display:flex;justify-content:space-between;margin-top:50px}
        .sig-box{text-align:center;width:200px}
        .sig-line{border-top:1px solid #333;margin-top:60px;padding-top:5px}
        .legal{margin-top:20px;padding:10px;border:1px solid #ccc;font-size:10px;color:#555}
        @media print{body{padding:15px}@page{margin:10mm}}
      </style>
    </head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  }

  function printPayrollPdf() {
    const gp = govPay;
    if (!gp) return;
    const monthName = monthNames[month - 1].toUpperCase();
    const legalText = t("payroll.legalNotice");

    const html = `<!DOCTYPE html><html lang="${locale}"><head><title>${t("payroll.pdfTitle", { month: monthNames[month - 1], year })}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#1a1a1a;font-size:12px}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #333;padding:5px 8px;font-size:10px}
        th{background:#e8e8e8;font-weight:bold;text-align:center}
        .center{text-align:center}
        .right{text-align:right}
        .bold{font-weight:bold}
        .total-row td{background:#f0f0f0;font-weight:bold}
        .legal{margin-top:20px;padding:10px;border:1px solid #999;font-size:8px;color:#333;line-height:1.6}
        .signatures{display:flex;justify-content:space-between;margin-top:60px}
        .sig-box{text-align:center;width:200px}
        .sig-line{border-top:1px solid #333;margin-top:60px;padding-top:5px;font-size:10px}
        .sig-name{font-size:9px;color:#555;margin-top:3px}
        @media print{body{padding:15px}@page{margin:10mm;size:landscape}}
      </style>
    </head><body>
      <div class="center"><h2 style="margin:2px 0">${settings.header_line1 || "T.C."}</h2></div>
      <div class="center"><p style="margin:2px 0">${settings.header_line2 || ""}</p></div>
      <div class="center"><p style="margin:2px 0">${settings.header_line3 || ""}</p></div>
      <div class="right" style="margin-top:8px;font-size:10px">${t("payroll.periodLine", { month: monthName, year })}</div>
      <h2 class="center" style="margin:15px 0">${t("payroll.pdfMainTitle")}</h2>
      <table>
        <thead><tr>
          <th>${t("payroll.columns.no")}</th><th>${t("payroll.columns.fullName")}</th><th>${t("payroll.columns.salaryCoefficient")}</th><th>${t("payroll.columns.paymentCoefficient")}</th>
          <th>${t("payroll.columns.hourlyRate")}</th><th>${t("payroll.columns.assignmentHours")}</th>
          <th>${t("payroll.columns.gross")}</th><th>${t("payroll.columns.stampTax")}</th><th>${t("payroll.columns.netPaid")}</th>
        </tr></thead>
        <tbody>
          <tr>
            <td class="center">1</td><td>${profileName}</td>
            <td class="center">${settings.salary_coefficient}</td><td class="center">${settings.base_indicator}</td>
            <td class="right">${fmtTL(gp.hourlyRate)}</td><td class="center">${grandTotal}</td>
            <td class="right">${fmtTL(gp.gross)}</td><td class="right">${fmtTL(gp.stampTax)}</td><td class="right">${fmtTL(gp.net)}</td>
          </tr>
          ${Array.from({ length: 9 }, (_, i) => `<tr><td class="center">${i + 2}</td>${"<td></td>".repeat(8)}</tr>`).join("")}
          <tr class="total-row">
            <td></td><td>${t("table.total")}</td><td></td><td></td><td></td>
            <td class="center">${grandTotal}</td><td class="right">${fmtTL(gp.gross)}</td>
            <td class="right">${fmtTL(gp.stampTax)}</td><td class="right bold">${fmtTL(gp.net)}</td>
          </tr>
        </tbody>
      </table>
      <div class="legal">${legalText}</div>
      ${settings.footer_note ? `<p style="font-size:9px;color:#666;margin-top:10px;font-style:italic">${settings.footer_note}</p>` : ""}
      <div class="signatures">
        <div class="sig-box"><div class="sig-line">${t("pdf.preparedBy")}</div><div class="sig-name">${profileName}<br/>${settings.professional_title || t("defaultProfessional")}</div></div>
        <div class="sig-box"><div class="sig-line">${t("pdf.approvedBy")}</div><div class="sig-name">${t("pdf.employerRepresentative")}</div></div>
      </div>
    </body></html>`;

    const w = window.open("", "_blank", "width=1000,height=700");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  }

  // ═══════════════════════════════════════════
  // Computed
  // ═══════════════════════════════════════════

  const grandTotal = entries.reduce((s, e) => s + e.hours, 0);
  const uniqueDays = new Set(entries.map((e) => e.entry_date)).size;
  const activeCompanies = companies.filter((c) => entries.some((e) => e.company_workspace_id === c.id));
  const st = timesheet ? STATUS_MAP[timesheet.status] ?? STATUS_MAP.draft : STATUS_MAP.draft;
  const govPay = settings.is_government_employee
    ? calcGovPayment(grandTotal, settings.salary_coefficient, settings.base_indicator, settings.stamp_tax_rate)
    : null;

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-[#0b5fc1]" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profileName && <span className="font-medium text-foreground">{profileName}</span>}
            {profileName && " — "}
            {settings.professional_title || t("defaultProfessional")}
            {settings.certificate_no && ` · ${settings.certificate_no}`}
          </p>
        </div>
        <div className="flex rounded-xl border border-border bg-secondary/50 p-0.5">
          {([["grid",t("tabs.grid")],["archive",t("tabs.archive")],["settings",t("tabs.settings")]] as [MainTab,string][]).map(([k,l]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={["rounded-lg px-3 py-1.5 text-xs font-medium transition-all", tab === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"].join(" ")}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          TAB: Puantaj Grid
      ═══════════════════════════════════════════ */}
      {tab === "grid" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={selectCls}>
              {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectCls}>
              {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className={`ml-1 inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${st.cls}`}>{statusLabel(timesheet?.status ?? "draft")}</span>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {/* Status transitions */}
              {timesheet && st.next && entries.length > 0 && (
                <button type="button" onClick={() => updateStatus(st.next!)} className={btnPrimary}>
                  {st.next === "submitted" ? t("actions.submit") : st.next === "approved" ? t("actions.approve") : t("actions.markPaid")}
                </button>
              )}
              {timesheet && (timesheet.status === "approved" || timesheet.status === "submitted") && (
                <button type="button" onClick={() => updateStatus("draft")} className={btnSecondary}>
                  {t("actions.revert")}
                </button>
              )}
              <button type="button" onClick={() => setShowPdfPreview(true)} disabled={entries.length === 0} className={btnSecondary + " disabled:opacity-50"}>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                {t("actions.previewPdf")}
              </button>
              <button type="button" onClick={handleExportTimesheet} disabled={entries.length === 0} className={btnSecondary + " disabled:opacity-50"}>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {t("actions.timesheetExcel")}
              </button>
              {settings.is_government_employee && (
                <>
                  <button type="button" onClick={handleExportPayroll} disabled={entries.length === 0} className={btnSecondary + " disabled:opacity-50"}>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                    {t("actions.payrollExcel")}
                  </button>
                  <button type="button" onClick={printPayrollPdf} disabled={entries.length === 0} className={btnSecondary + " disabled:opacity-50"}>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    {t("actions.payrollPdf")}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className={`grid gap-4 ${govPay ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6" : "grid-cols-3"}`}>
            <StatCard icon="📅" color="text-blue-500" value={String(uniqueDays)} label={t("stats.workedDays")} />
            <StatCard icon="⏱️" color="text-amber-500" value={grandTotal.toFixed(1)} label={t("stats.totalHours")} />
            <StatCard icon="🏢" color="text-green-500" value={String(activeCompanies.length)} label={t("stats.activeCompanies")} />
            {govPay && (
              <>
                <StatCard icon="💰" color="text-emerald-600" value={`₺${fmtTL(govPay.gross)}`} label={t("stats.gross")} />
                <StatCard icon="📄" color="text-red-500" value={`₺${fmtTL(govPay.stampTax)}`} label={t("stats.stampTax")} />
                <StatCard icon="✅" color="text-[#0b5fc1]" value={`₺${fmtTL(govPay.net)}`} label={t("stats.netPaid")} />
              </>
            )}
          </div>

          {/* Grid Table */}
          <div className="rounded-[1.25rem] border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
            {companies.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="text-4xl">🏢</div>
                <p className="text-sm font-medium text-muted-foreground">{t("empty.noCompanies")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-secondary/40">
                      <th className="sticky left-0 z-10 bg-secondary/40 border-b border-r border-border px-3 py-2.5 text-left font-semibold text-foreground min-w-[160px]">{t("table.company")}</th>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const d = i + 1, we = isWeekend(year, month, d);
                        return <th key={d} className={["border-b border-r border-border px-1 py-2.5 text-center font-semibold min-w-[36px]", we ? "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400" : "text-foreground"].join(" ")}>{d}</th>;
                      })}
                      <th className="border-b border-border px-3 py-2.5 text-center font-semibold text-foreground min-w-[60px] bg-secondary/60">{t("table.totalShort")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((c) => (
                      <tr key={c.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="sticky left-0 z-10 bg-card border-b border-r border-border px-3 py-2 font-medium text-foreground truncate max-w-[200px]" title={c.display_name}>{c.display_name}</td>
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const d = i + 1, we = isWeekend(year, month, d), entry = getEntry(c.id, d);
                          const isEdit = editCell?.companyId === c.id && editCell?.day === d;
                          return (
                            <td key={d} onClick={() => handleCellClick(c.id, d)}
                              className={["border-b border-r border-border px-0.5 py-1 text-center cursor-pointer transition-colors", we ? "bg-red-50/50 dark:bg-red-900/10" : "", entry && !isEdit ? "bg-[#0b5fc1]/10 font-semibold text-[#0b5fc1] dark:text-blue-400" : "text-muted-foreground"].join(" ")}>
                              {isEdit ? (
                                <input ref={editRef} type="number" min={0} max={24} step={0.5} value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => handleCellKey(e, c.id, d)}
                                  onBlur={() => saveCell(c.id, d, editValue.trim() ? parseFloat(editValue) : null)}
                                  className="w-full h-6 rounded border border-[#0b5fc1] bg-white dark:bg-slate-800 px-1 text-center text-xs font-medium text-foreground focus:outline-none" />
                              ) : entry ? entry.hours : ""}
                            </td>
                          );
                        })}
                        <td className="border-b border-border px-2 py-2 text-center font-bold text-foreground bg-secondary/30">{companyTotal(c.id) || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-secondary/40 font-bold">
                      <td className="sticky left-0 z-10 bg-secondary/40 border-r border-border px-3 py-2.5 text-foreground">{t("table.total")}</td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const d = i + 1;
                        const dt = entries.filter((e) => e.entry_date === ds(year, month, d)).reduce((s, e) => s + e.hours, 0);
                        return <td key={d} className="border-r border-border px-1 py-2.5 text-center text-foreground">{dt || ""}</td>;
                      })}
                      <td className="px-2 py-2.5 text-center text-[#0b5fc1] text-sm">{grandTotal || ""}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Gov payment summary (if applicable) */}
          {govPay && entries.length > 0 && (
            <div className="rounded-[1.25rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{t("payroll.calculationTitle")}</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
                <div><span className="text-muted-foreground">Gösterge:</span> <span className="font-medium text-foreground">{settings.base_indicator}</span></div>
                <div><span className="text-muted-foreground">Katsayı:</span> <span className="font-medium text-foreground">{settings.salary_coefficient}</span></div>
                <div><span className="text-muted-foreground">Saatlik Ücret:</span> <span className="font-medium text-foreground">₺{fmtTL(govPay.hourlyRate)}</span></div>
                <div><span className="text-muted-foreground">Toplam Saat:</span> <span className="font-medium text-foreground">{grandTotal}</span></div>
                <div><span className="text-muted-foreground">Brüt Tutar:</span> <span className="font-bold text-foreground">₺{fmtTL(govPay.gross)}</span></div>
                <div><span className="text-muted-foreground">Damga V. (%{(settings.stamp_tax_rate * 100).toFixed(3)}):</span> <span className="font-medium text-red-600">-₺{fmtTL(govPay.stampTax)}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Net Ödenen:</span> <span className="font-bold text-[#0b5fc1] text-base">₺{fmtTL(govPay.net)}</span></div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════
          TAB: Arşiv
      ═══════════════════════════════════════════ */}
      {tab === "archive" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <select value={archiveYear} onChange={(e) => setArchiveYear(Number(e.target.value))} className={selectCls}>
              {[year - 2, year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={archiveStatus} onChange={(e) => setArchiveStatus(e.target.value)} className={selectCls}>
              <option value="all">{t("filters.allStatuses")}</option>
              <option value="draft">{t("status.draft")}</option>
              <option value="submitted">{t("status.submitted")}</option>
              <option value="approved">{t("status.approved")}</option>
              <option value="paid">{t("status.paid")}</option>
            </select>
          </div>

          <div className="rounded-[1.25rem] border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
            {archiveLoading ? (
              <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-4 border-border border-t-[#0b5fc1]" /></div>
            ) : archiveSheets.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="text-4xl">📦</div>
                <p className="text-sm font-medium text-muted-foreground">{t("empty.noArchive", { year: archiveYear })}</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="px-4 py-3 text-left font-semibold text-foreground">{t("archive.period")}</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">{t("stats.totalHours")}</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">{t("archive.status")}</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">{t("archive.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {archiveSheets.map((s) => {
                    const sm = STATUS_MAP[s.status] ?? STATUS_MAP.draft;
                    return (
                      <tr key={s.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{monthNames[s.month - 1]} {s.year}</td>
                        <td className="px-4 py-3 text-right text-foreground">{s.total_hours}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${sm.cls}`}>{statusLabel(s.status)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button type="button" onClick={() => { setMonth(s.month); setYear(s.year); setTab("grid"); }}
                              className="rounded-lg px-2 py-1 text-xs text-[#0b5fc1] hover:bg-[#0b5fc1]/10 transition-colors">{t("actions.view")}</button>
                            {s.status === "draft" && (
                              <button type="button" onClick={() => setDeleteConfirm(s.id)}
                                className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">{t("actions.delete")}</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB: Ayarlar
      ═══════════════════════════════════════════ */}
      {tab === "settings" && (
        <div className="max-w-2xl space-y-5">
          {settingsFeedback && (
            <div className={["rounded-xl px-4 py-3 text-sm font-medium", settingsFeedback.startsWith(t("settings.errorPrefixStart")) ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"].join(" ")}>
              {settingsFeedback}
            </div>
          )}

          {/* Header settings */}
          <SettingsCard title={t("settings.headerTitle")}>
            <Field label={t("settings.headerType")}>
              <select value={settings.header_type} onChange={(e) => setSettings((s) => ({ ...s, header_type: e.target.value }))} className={selectCls + " w-full"}>
                <option value="custom">{t("settings.headerTypes.custom")}</option><option value="osgb">OSGB</option><option value="company">{t("table.company")}</option><option value="government">{t("settings.headerTypes.government")}</option>
              </select>
            </Field>
            <Field label={t("settings.line1")}><input value={settings.header_line1} onChange={(e) => setSettings((s) => ({ ...s, header_line1: e.target.value }))} placeholder={t("settings.line1Placeholder")} className={inputCls} /></Field>
            <Field label={t("settings.line2")}><input value={settings.header_line2} onChange={(e) => setSettings((s) => ({ ...s, header_line2: e.target.value }))} placeholder={t("settings.line2Placeholder")} className={inputCls} /></Field>
            <Field label={t("settings.line3")}><input value={settings.header_line3} onChange={(e) => setSettings((s) => ({ ...s, header_line3: e.target.value }))} placeholder={t("settings.line3Placeholder")} className={inputCls} /></Field>
          </SettingsCard>

          {/* Professional info */}
          <SettingsCard title={t("settings.professionalTitle")}>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("settings.professionalRole")}><input value={settings.professional_title} onChange={(e) => setSettings((s) => ({ ...s, professional_title: e.target.value }))} placeholder={t("settings.professionalRolePlaceholder")} className={inputCls} /></Field>
              <Field label={t("settings.certificateNo")}><input value={settings.certificate_no} onChange={(e) => setSettings((s) => ({ ...s, certificate_no: e.target.value }))} placeholder={t("settings.certificateNoPlaceholder")} className={inputCls} /></Field>
            </div>
          </SettingsCard>

          {/* Government payroll */}
          <SettingsCard title={t("settings.payrollTitle")}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={settings.is_government_employee}
                onChange={(e) => setSettings((s) => ({ ...s, is_government_employee: e.target.checked }))}
                className="h-4 w-4 rounded border-border text-[#0b5fc1] focus:ring-[#0b5fc1]/40" />
              <span className="text-sm font-medium text-foreground">{t("settings.governmentEmployee")}</span>
            </label>
            {settings.is_government_employee && (
              <div className="mt-3 space-y-4 rounded-xl border border-border bg-secondary/20 p-4">
                <div className="grid grid-cols-3 gap-4">
                  <Field label={t("settings.salaryCoefficient")}>
                    <input type="number" step="0.000001" value={settings.salary_coefficient}
                      onChange={(e) => setSettings((s) => ({ ...s, salary_coefficient: parseFloat(e.target.value) || 0 }))}
                      className={inputCls} />
                  </Field>
                  <Field label={t("settings.baseIndicator")}>
                    <input type="number" value={settings.base_indicator} readOnly className={inputCls + " opacity-60 cursor-not-allowed"} />
                  </Field>
                  <Field label={t("settings.stampTaxRate")}>
                    <input type="text" value={`%${(settings.stamp_tax_rate * 100).toFixed(3)}`} readOnly className={inputCls + " opacity-60 cursor-not-allowed"} />
                  </Field>
                </div>
                <div className="rounded-lg bg-[#0b5fc1]/5 p-3 text-xs text-muted-foreground dark:bg-[#0b5fc1]/10">
                  <p className="font-medium text-foreground mb-1">{t("settings.formulaTitle")}</p>
                  <p>{t("settings.hourlyRateFormula", { indicator: settings.base_indicator, coefficient: settings.salary_coefficient, amount: fmtTL(settings.base_indicator * settings.salary_coefficient) })}</p>
                  <p>{t("settings.grossFormula")}</p>
                  <p>{t("settings.stampFormula", { rate: (settings.stamp_tax_rate * 100).toFixed(3) })}</p>
                  <p>{t("settings.netFormula")}</p>
                </div>
              </div>
            )}
          </SettingsCard>

          {/* Footer note */}
          <SettingsCard title={t("settings.footerNote")}>
            <textarea value={settings.footer_note} onChange={(e) => setSettings((s) => ({ ...s, footer_note: e.target.value }))}
              placeholder={t("settings.footerNotePlaceholder")} rows={3}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0b5fc1]/40 dark:bg-slate-800 dark:text-white dark:border-slate-600 resize-none" />
          </SettingsCard>

          <div className="flex justify-end">
            <button type="button" onClick={handleSettingsSave} disabled={savingSettings}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0b5fc1] px-5 text-sm font-medium text-white shadow-lg hover:bg-[#0a4fa8] disabled:opacity-60 transition-colors">
              {savingSettings ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />{t("actions.saving")}</> : t("settings.save")}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          Delete confirm dialog
      ═══════════════════════════════════════════ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[1.5rem] border border-border bg-card p-6 shadow-[0_32px_80px_rgba(0,0,0,0.3)] space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{t("delete.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("delete.description")}</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteConfirm(null)} className={btnSecondary}>{t("actions.cancel")}</button>
              <button type="button" onClick={() => deleteTimesheet(deleteConfirm)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors">{t("actions.delete")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          PDF Preview Modal
      ═══════════════════════════════════════════ */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-[1.5rem] border border-border bg-card shadow-[0_32px_80px_rgba(0,0,0,0.3)]">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">{t("pdf.previewTitle")}</h2>
              <div className="flex items-center gap-2">
                <button type="button" onClick={printPdf} className={btnPrimary}>{t("pdf.printDownload")}</button>
                <button type="button" onClick={() => setShowPdfPreview(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            {/* PDF content */}
            <div className="overflow-y-auto p-6">
              <div id="pdf-content" className="bg-white text-black p-8 rounded-lg" style={{ fontFamily: "Arial, sans-serif", fontSize: "12px" }}>
                {/* Antet */}
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  {settings.header_line1 && <h1 style={{ fontSize: "14px", fontWeight: "bold", margin: "2px 0" }}>{settings.header_line1}</h1>}
                  {settings.header_line2 && <h2 style={{ fontSize: "12px", fontWeight: "normal", margin: "2px 0" }}>{settings.header_line2}</h2>}
                  {settings.header_line3 && <h2 style={{ fontSize: "12px", fontWeight: "normal", margin: "2px 0" }}>{settings.header_line3}</h2>}
                  <h2 style={{ fontSize: "13px", fontWeight: "bold", margin: "10px 0 5px" }}>{t("pdf.workScheduleTitle", { month: monthNames[month - 1], year })}</h2>
                  <p style={{ fontSize: "11px", color: "#555" }}>
                    {profileName}{settings.professional_title && ` — ${settings.professional_title}`}{settings.certificate_no && ` · ${settings.certificate_no}`}
                  </p>
                </div>

                {/* Table */}
                <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: "15px" }}>
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "left", background: "#e8e8e8", fontWeight: "bold", fontSize: "10px" }}>{t("table.company")}</th>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const d = i + 1, we = isWeekend(year, month, d);
                        return <th key={d} style={{ border: "1px solid #333", padding: "2px", textAlign: "center", background: we ? "#fee2e2" : "#e8e8e8", fontWeight: "bold", fontSize: "9px", minWidth: "18px" }}>{d}</th>;
                      })}
                      <th style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center", background: "#d0d0d0", fontWeight: "bold", fontSize: "10px" }}>{t("table.totalShort")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.filter((c) => entries.some((e) => e.company_workspace_id === c.id)).map((c) => (
                      <tr key={c.id}>
                        <td style={{ border: "1px solid #333", padding: "3px 6px", fontSize: "10px", fontWeight: "500" }}>{c.display_name}</td>
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const d = i + 1, en = getEntry(c.id, d), we = isWeekend(year, month, d);
                          return <td key={d} style={{ border: "1px solid #333", padding: "1px", textAlign: "center", fontSize: "9px", background: we ? "#fff5f5" : "transparent", fontWeight: en ? "bold" : "normal", color: en ? "#0b5fc1" : "#999" }}>{en ? en.hours : ""}</td>;
                        })}
                        <td style={{ border: "1px solid #333", padding: "3px", textAlign: "center", fontSize: "10px", fontWeight: "bold", background: "#f0f0f0" }}>{companyTotal(c.id)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td style={{ border: "1px solid #333", padding: "4px 6px", fontWeight: "bold", fontSize: "10px", background: "#e8e8e8" }}>{t("table.total")}</td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const d = i + 1;
                        const dt = entries.filter((e) => e.entry_date === ds(year, month, d)).reduce((s, e) => s + e.hours, 0);
                        return <td key={d} style={{ border: "1px solid #333", padding: "1px", textAlign: "center", fontSize: "9px", fontWeight: "bold", background: "#e8e8e8" }}>{dt || ""}</td>;
                      })}
                      <td style={{ border: "1px solid #333", padding: "3px", textAlign: "center", fontSize: "11px", fontWeight: "bold", background: "#d0d0d0", color: "#0b5fc1" }}>{grandTotal}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Gov payment table */}
                {govPay && (
                  <table style={{ borderCollapse: "collapse", width: "50%", margin: "15px 0" }}>
                    <tbody>
                      <tr><td style={{ border: "1px solid #333", padding: "4px 8px", fontSize: "11px" }}>{t("payroll.indicatorCoefficient")}</td><td style={{ border: "1px solid #333", padding: "4px 8px", fontSize: "11px", textAlign: "right" }}>{settings.base_indicator} × {settings.salary_coefficient}</td></tr>
                      <tr><td style={{ border: "1px solid #333", padding: "4px 8px", fontSize: "11px" }}>{t("payroll.hourlyRate")}</td><td style={{ border: "1px solid #333", padding: "4px 8px", fontSize: "11px", textAlign: "right" }}>₺{fmtTL(govPay.hourlyRate)}</td></tr>
                      <tr><td style={{ border: "1px solid #333", padding: "4px 8px", fontSize: "11px" }}>{t("stats.totalHours")}</td><td style={{ border: "1px solid #333", padding: "4px 8px", fontSize: "11px", textAlign: "right" }}>{grandTotal}</td></tr>
                      <tr><td style={{ border: "1px solid #333", padding: "4px 8px", fontSize: "11px", fontWeight: "bold" }}>{t("stats.gross")}</td><td style={{ border: "1px solid #333", padding: "4px 8px", fontSize: "11px", textAlign: "right", fontWeight: "bold" }}>₺{fmtTL(govPay.gross)}</td></tr>
                      <tr><td style={{ border: "1px solid #333", padding: "4px 8px", fontSize: "11px", color: "red" }}>{t("payroll.stampTaxWithRate", { rate: (settings.stamp_tax_rate * 100).toFixed(3) })}</td><td style={{ border: "1px solid #333", padding: "4px 8px", fontSize: "11px", textAlign: "right", color: "red" }}>-₺{fmtTL(govPay.stampTax)}</td></tr>
                      <tr><td style={{ border: "1px solid #333", padding: "4px 8px", fontSize: "12px", fontWeight: "bold" }}>{t("stats.netPaid")}</td><td style={{ border: "1px solid #333", padding: "4px 8px", fontSize: "12px", textAlign: "right", fontWeight: "bold", color: "#0b5fc1" }}>₺{fmtTL(govPay.net)}</td></tr>
                    </tbody>
                  </table>
                )}

                {/* Narrative text */}
                <p style={{ margin: "15px 0", fontSize: "11px", fontStyle: "italic" }}>
                  {t("pdf.narrative", { profileName, year, month: monthNames[month - 1].toUpperCase(), total: grandTotal })}
                </p>

                {/* Legal notice — only for government payroll */}
                {settings.is_government_employee && (
                  <div style={{ margin: "20px 0", padding: "10px", border: "1px solid #ccc", fontSize: "8px", color: "#333", lineHeight: "1.5" }}>
                    <strong>{t("payroll.warning")}:</strong> {t("payroll.legalNotice")}
                  </div>
                )}

                {/* Footer note */}
                {settings.footer_note && (
                  <p style={{ fontSize: "10px", color: "#666", marginBottom: "15px" }}>{settings.footer_note}</p>
                )}

                {/* Signatures */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "50px" }}>
                  <div style={{ textAlign: "center", width: "200px" }}>
                    <div style={{ borderTop: "1px solid #333", marginTop: "60px", paddingTop: "5px", fontSize: "11px" }}>{t("pdf.preparedBy")}</div>
                    <div style={{ fontSize: "10px", color: "#666" }}>{profileName}</div>
                    <div style={{ fontSize: "10px", color: "#666" }}>{settings.professional_title}</div>
                  </div>
                  <div style={{ textAlign: "center", width: "200px" }}>
                    <div style={{ borderTop: "1px solid #333", marginTop: "60px", paddingTop: "5px", fontSize: "11px" }}>{t("pdf.approvedBy")}</div>
                    <div style={{ fontSize: "10px", color: "#666" }}>{t("pdf.employerRepresentative")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon, color, value, label }: { icon: string; color: string; value: string; label: string }) {
  return (
    <div className="rounded-[1.25rem] border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className={`text-lg ${color}`}>{icon}</div>
      <div className="mt-1 text-xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}
