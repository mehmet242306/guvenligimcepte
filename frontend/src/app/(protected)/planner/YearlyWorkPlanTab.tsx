"use client";

/**
 * Yıllık İSG Çalışma Planı — firma × yıl bazlı düzenlenebilir + kaydedilir.
 *
 *  - Firma dropdown (mevcut firmalar)
 *  - Yıl seçici
 *  - Her satır editable (konu, sorumlu, mevzuat, 12 ay checkbox)
 *  - Satır ekle/sil
 *  - Supabase: yearly_work_plans tablosunda (organization_id, company_id, year) unique
 *  - PDF çıktı: resmi A4 landscape form
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getCalendarMonthNamesShort } from "@/lib/calendar-locale-labels";
import { Download, FileText, Loader2, Plus, Save, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { loadCompanyDirectory } from "@/lib/company-directory";
import { createClient } from "@/lib/supabase/client";

interface WorkItem {
  id: string;
  title: string;
  responsible: string;
  regulation: string;
  months: boolean[];
}

interface WorkSection {
  id: string;
  title: string;
  items: WorkItem[];
}

type RawTemplateItem = {
  title: string;
  responsible: string;
  regulation: string;
  months: number[];
};

type RawTemplateSection = {
  id: string;
  title: string;
  items: RawTemplateItem[];
};

function hydrateDefaultSections(raw: unknown): WorkSection[] {
  if (!Array.isArray(raw)) return [];
  return (raw as RawTemplateSection[]).map((sec) => ({
    id: sec.id,
    title: sec.title,
    items: (sec.items ?? []).map((it, j) => ({
      id: `${sec.id}-${j}`,
      title: it.title,
      responsible: it.responsible,
      regulation: it.regulation,
      months: Array.from({ length: 12 }, (_, i) => (it.months ?? []).includes(i)),
    })),
  }));
}

function newEmptyItem(sectionId: string, itemIndex: number): WorkItem {
  return {
    id: `${sectionId}-n-${itemIndex}-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
    title: "",
    responsible: "",
    regulation: "",
    months: Array.from({ length: 12 }, () => false),
  };
}

export default function YearlyWorkPlanTab() {
  const t = useTranslations("planner.yearlyWorkPlan");
  const locale = useLocale();
  const monthShort = useMemo(() => getCalendarMonthNamesShort(locale), [locale]);
  const defaultSections = useMemo(() => hydrateDefaultSections(t.raw("defaultTemplate")), [t]);

  const companies = useMemo(() => loadCompanyDirectory(), []);
  const [companyId, setCompanyId] = useState<string>(companies[0]?.id ?? "");
  const selectedCompany = companies.find((c) => c.id === companyId) ?? null;
  const [year, setYear] = useState(new Date().getFullYear());
  const [revNo, setRevNo] = useState("00");
  const [sections, setSections] = useState<WorkSection[]>(defaultSections);
  const [signers, setSigners] = useState<{ employer: string; physician: string; safetyExpert: string }>({
    employer: "",
    physician: "",
    safetyExpert: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);

  /** DB'den mevcut planı yükle */
  const loadPlan = useCallback(
    async (cid: string, y: number) => {
      if (!cid) return;
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        if (!supabase) throw new Error(t("errors.noSupabase"));
        const { data, error: e } = await supabase
          .from("yearly_work_plans")
          .select("*")
          .eq("company_workspace_id", cid)
          .eq("year", y)
          .maybeSingle();
        if (e && e.code !== "PGRST116") throw e;
        if (data) {
          const payload = data.data as { sections?: WorkSection[]; revNo?: string; signers?: typeof signers };
          if (payload?.sections) setSections(payload.sections);
          if (payload?.revNo) setRevNo(payload.revNo);
          if (payload?.signers) setSigners(payload.signers);
          else setSigners({ employer: "", physician: "", safetyExpert: "" });
          setRecordId(data.id);
        } else {
          setSections(hydrateDefaultSections(t.raw("defaultTemplate")));
          setRevNo("00");
          setSigners({ employer: "", physician: "", safetyExpert: "" });
          setRecordId(null);
        }
      } catch (e) {
        console.warn("loadPlan:", e);
        setError(e instanceof Error ? e.message : t("errors.loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (companyId) void loadPlan(companyId, year);
  }, [companyId, year, loadPlan]);

  /** DB'ye kaydet */
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

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("auth_user_id", user.id)
        .single();
      if (!profile?.organization_id) throw new Error(t("errors.orgNotFound"));

      const payload = {
        organization_id: profile.organization_id,
        company_workspace_id: companyId,
        year,
        rev_no: revNo,
        data: { sections, revNo, signers },
        created_by: user.id,
      };

      const { data, error: e } = await supabase
        .from("yearly_work_plans")
        .upsert(payload, { onConflict: "organization_id,company_workspace_id,year" })
        .select()
        .single();
      if (e) throw e;
      if (data) setRecordId(data.id);

      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2500);
    } catch (e) {
      console.warn("handleSave work plan:", e);
      setError(e instanceof Error ? e.message : t("errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  /** Editable satır güncelle */
  function updateItem(sectionIdx: number, itemIdx: number, patch: Partial<WorkItem>) {
    setSections((prev) => {
      const next = prev.map((s) => ({ ...s, items: [...s.items] }));
      next[sectionIdx].items[itemIdx] = { ...next[sectionIdx].items[itemIdx], ...patch };
      return next;
    });
  }

  function toggleMonth(sectionIdx: number, itemIdx: number, monthIdx: number) {
    setSections((prev) => {
      const next = prev.map((s) => ({ ...s, items: s.items.map((it) => ({ ...it, months: [...it.months] })) }));
      next[sectionIdx].items[itemIdx].months[monthIdx] = !next[sectionIdx].items[itemIdx].months[monthIdx];
      return next;
    });
  }

  function addItem(sectionIdx: number) {
    setSections((prev) => {
      const next = prev.map((s) => ({ ...s, items: [...s.items] }));
      const sid = next[sectionIdx].id;
      next[sectionIdx].items.push(newEmptyItem(sid, next[sectionIdx].items.length));
      return next;
    });
  }

  function removeItem(sectionIdx: number, itemIdx: number) {
    setSections((prev) => {
      const next = prev.map((s) => ({ ...s, items: [...s.items] }));
      next[sectionIdx].items.splice(itemIdx, 1);
      return next;
    });
  }

  function exportPdf() {
    const companyName = selectedCompany?.name ?? "—";
    const pdf = {
      htmlTitle: t("pdf.htmlTitle", { companyName }),
      mainTitle: t("pdf.mainTitle"),
      headerLine: t("pdf.headerLine", { companyName, year, revNo }),
      colOrder: t("pdf.colOrder"),
      colTopic: t("pdf.colTopic"),
      colResponsible: t("pdf.colResponsible"),
      colRegulation: t("pdf.colRegulation"),
      sigEmployer: t("pdf.sigEmployer"),
      sigPhysician: t("pdf.sigPhysician"),
      sigSafety: t("pdf.sigSafety"),
      sigLine: t("pdf.sigLine"),
    };
    const html = buildWorkPlanHtml({
      companyName,
      year,
      revNo,
      sections,
      signers,
      monthShort,
      htmlLang: locale,
      pdf,
    });
    const w = window.open("", "_blank", "width=1400,height=900");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="size-4 text-amber-600" />
            {t("card.title")}
          </CardTitle>
          <CardDescription>{t("card.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
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
              <label className="mb-1 block text-xs font-medium text-foreground">{t("fields.year")}</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())}
                className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{t("fields.revNo")}</label>
              <input
                value={revNo}
                onChange={(e) => setRevNo(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground"
              />
            </div>
          </div>

          {/* İmzacılar */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("signers.blockLabel")}
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-foreground">{t("signers.employer")}</label>
                <input
                  value={signers.employer}
                  onChange={(e) => setSigners((s) => ({ ...s, employer: e.target.value }))}
                  placeholder={t("signers.employerPlaceholder")}
                  className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-foreground">{t("signers.physician")}</label>
                <input
                  value={signers.physician}
                  onChange={(e) => setSigners((s) => ({ ...s, physician: e.target.value }))}
                  placeholder={t("signers.physicianPlaceholder")}
                  className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-foreground">{t("signers.safetyExpert")}</label>
                <input
                  value={signers.safetyExpert}
                  onChange={(e) => setSigners((s) => ({ ...s, safetyExpert: e.target.value }))}
                  placeholder={t("signers.safetyExpertPlaceholder")}
                  className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => void handleSave()} disabled={saving || !companyId}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : savedFeedback ? <CheckCircle2 className="size-4" /> : <Save className="size-4" />}
              {saving ? t("actions.saving") : savedFeedback ? t("actions.saved") : t("actions.save")}
            </Button>
            <Button variant="accent" onClick={exportPdf} disabled={!companyId}>
              <Download className="size-4" /> {t("actions.pdfPrint")}
            </Button>
            {recordId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-3" /> {t("actions.archivedBadge", { year })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("loading")}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t("preview.title")}</CardTitle>
            <CardDescription>{t("preview.description")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-amber-100 dark:bg-amber-900/30">
                    <th className="border border-border p-2 text-left" style={{ width: 40 }}>
                      {t("table.num")}
                    </th>
                    <th className="border border-border p-2 text-left">{t("table.topic")}</th>
                    <th className="border border-border p-2 text-left" style={{ width: 140 }}>
                      {t("table.responsible")}
                    </th>
                    <th className="border border-border p-2 text-left" style={{ width: 180 }}>
                      {t("table.regulation")}
                    </th>
                    {monthShort.map((m) => (
                      <th key={m} className="border border-border p-1 text-center font-semibold" style={{ width: 30 }}>
                        {m}
                      </th>
                    ))}
                    <th className="border border-border p-1 text-center" style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((section, si) => (
                    <SectionBlock
                      key={section.id}
                      section={section}
                      si={si}
                      onItemChange={updateItem}
                      onMonthToggle={toggleMonth}
                      onAdd={() => addItem(si)}
                      onRemove={(ii) => removeItem(si, ii)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SectionBlock({
  section,
  si,
  onItemChange,
  onMonthToggle,
  onAdd,
  onRemove,
}: {
  section: WorkSection;
  si: number;
  onItemChange: (si: number, ii: number, patch: Partial<WorkItem>) => void;
  onMonthToggle: (si: number, ii: number, mi: number) => void;
  onAdd: () => void;
  onRemove: (ii: number) => void;
}) {
  const t = useTranslations("planner.yearlyWorkPlan.table");
  return (
    <>
      <tr className="bg-amber-50 dark:bg-amber-900/10">
        <td colSpan={17} className="border border-border px-2 py-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">{section.title}</span>
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px] font-medium hover:bg-muted"
            >
              <Plus className="size-3" /> {t("addRow")}
            </button>
          </div>
        </td>
      </tr>
      {section.items.map((item, ii) => (
        <tr key={item.id} className="hover:bg-muted/40">
          <td className="border border-border p-2 text-center font-mono">
            {section.id}.{ii + 1}
          </td>
          <td className="border border-border p-0.5">
            <input
              value={item.title}
              onChange={(e) => onItemChange(si, ii, { title: e.target.value })}
              className="w-full border-none bg-transparent p-1.5 text-xs outline-none focus:bg-primary/5"
            />
          </td>
          <td className="border border-border p-0.5">
            <input
              value={item.responsible}
              onChange={(e) => onItemChange(si, ii, { responsible: e.target.value })}
              className="w-full border-none bg-transparent p-1.5 text-xs text-muted-foreground outline-none focus:bg-primary/5"
            />
          </td>
          <td className="border border-border p-0.5">
            <input
              value={item.regulation}
              onChange={(e) => onItemChange(si, ii, { regulation: e.target.value })}
              className="w-full border-none bg-transparent p-1.5 text-[10px] text-muted-foreground outline-none focus:bg-primary/5"
            />
          </td>
          {item.months.map((checked, mi) => (
            <td
              key={mi}
              onClick={() => onMonthToggle(si, ii, mi)}
              className="cursor-pointer border border-border p-0 text-center select-none"
              style={{ background: checked ? "#d1fae5" : undefined }}
            >
              <div className="py-1.5">
                {checked ? <span className="font-bold text-emerald-600">●</span> : <span className="text-muted-foreground">·</span>}
              </div>
            </td>
          ))}
          <td className="border border-border text-center">
            <button type="button" onClick={() => onRemove(ii)} className="p-1 text-muted-foreground hover:text-red-500" aria-label={t("deleteRowAria")}>
              <Trash2 className="size-3.5" />
            </button>
          </td>
        </tr>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  PDF HTML                                                           */
/* ------------------------------------------------------------------ */

type PdfStrings = {
  htmlTitle: string;
  mainTitle: string;
  headerLine: string;
  colOrder: string;
  colTopic: string;
  colResponsible: string;
  colRegulation: string;
  sigEmployer: string;
  sigPhysician: string;
  sigSafety: string;
  sigLine: string;
};

function buildWorkPlanHtml({
  companyName,
  year,
  revNo,
  sections,
  signers,
  monthShort,
  htmlLang,
  pdf,
}: {
  companyName: string;
  year: number;
  revNo: string;
  sections: WorkSection[];
  signers: { employer: string; physician: string; safetyExpert: string };
  monthShort: string[];
  htmlLang: string;
  pdf: PdfStrings;
}): string {
  const rowsHtml = sections
    .map((s) => {
      const itemRows = s.items
        .map(
          (item, idx) => `
      <tr>
        <td class="c mono">${s.id}.${idx + 1}</td>
        <td>${esc(item.title)}</td>
        <td class="muted">${esc(item.responsible)}</td>
        <td class="muted small">${esc(item.regulation)}</td>
        ${item.months.map((m) => `<td class="c">${m ? "●" : ""}</td>`).join("")}
      </tr>
    `,
        )
        .join("");
      return `
      <tr class="section-title">
        <td colspan="16">${esc(s.title)}</td>
      </tr>
      ${itemRows}
    `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="${esc(htmlLang)}">
<head>
<meta charset="UTF-8">
<title>${esc(pdf.htmlTitle)}</title>
<style>
  * { box-sizing: border-box; }
  @page { size: A4 landscape; margin: 10mm; }
  body { margin: 0; font-family: 'Inter', Arial, sans-serif; color: #111; font-size: 9px; line-height: 1.3; }
  .header-row {
    display: flex; justify-content: space-between; align-items: center;
    background: #fef3c7; border: 2px solid #d4a017; padding: 8px 14px;
    margin-bottom: 4px; font-size: 11px;
  }
  .header-row .title { font-size: 14px; font-weight: 700; color: #7c2d12; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #fef3c7; padding: 5px 4px; border: 1px solid #111; font-size: 9px; font-weight: 700; }
  td { padding: 4px 6px; border: 1px solid #6b7280; font-size: 9px; vertical-align: middle; }
  td.c { text-align: center; }
  td.mono { font-family: monospace; font-weight: 700; }
  td.muted { color: #4b5563; }
  td.small { font-size: 8px; }
  tr.section-title td {
    background: #d1fae5; font-weight: 700; color: #064e3b;
    padding: 4px 6px; font-size: 10px;
  }
  .sig-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
  .sig-box { border: 1px dashed #6b7280; padding: 12px; text-align: center; height: 80px; display: flex; flex-direction: column; justify-content: space-between; }
  .sig-line { border-top: 1px solid #111; padding-top: 2px; font-size: 8px; color: #6b7280; }
</style>
</head>
<body>
  <div class="header-row">
    <div class="title">${esc(pdf.mainTitle)}</div>
    <div>${esc(pdf.headerLine)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:32px;">${esc(pdf.colOrder)}</th>
        <th>${esc(pdf.colTopic)}</th>
        <th style="width:110px;">${esc(pdf.colResponsible)}</th>
        <th style="width:170px;">${esc(pdf.colRegulation)}</th>
        ${monthShort.map((m) => `<th style="width:22px;">${esc(m)}</th>`).join("")}
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="sig-grid">
    <div class="sig-box">
      <div style="font-weight:700;">${esc(pdf.sigEmployer)}</div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:10px;color:#111;font-weight:600;">${esc(signers.employer || "—")}</div>
      <div class="sig-line">${esc(pdf.sigLine)}</div>
    </div>
    <div class="sig-box">
      <div style="font-weight:700;">${esc(pdf.sigPhysician)}</div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:10px;color:#111;font-weight:600;">${esc(signers.physician || "—")}</div>
      <div class="sig-line">${esc(pdf.sigLine)}</div>
    </div>
    <div class="sig-box">
      <div style="font-weight:700;">${esc(pdf.sigSafety)}</div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:10px;color:#111;font-weight:600;">${esc(signers.safetyExpert || "—")}</div>
      <div class="sig-line">${esc(pdf.sigLine)}</div>
    </div>
  </div>
</body>
</html>`;
}

function esc(s: string): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
