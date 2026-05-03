"use client";

/**
 * Yıllık Eğitim Planı — firma × yıl bazlı düzenlenebilir + kaydedilir.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, GraduationCap, Loader2, Plus, Save, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { loadCompanyDirectory } from "@/lib/company-directory";
import { createClient } from "@/lib/supabase/client";

interface TrainingRow {
  id: string;
  category: "genel" | "saglik" | "teknik";
  title: string;
  trainer: string;
  audience: string;
  plannedDate: string;
  durationHours: number;
  realizedDate: string;
  certificate: "var" | "yok" | "";
  attendance: number | "";
}

function row(category: TrainingRow["category"], title: string, trainer: string, audience: string): TrainingRow {
  return { id: Math.random().toString(36).slice(2, 10), category, title, trainer, audience, plannedDate: "", durationHours: 4, realizedDate: "", certificate: "", attendance: "" };
}

function hydrateDefaultTrainings(raw: unknown): TrainingRow[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Array<{ category: TrainingRow["category"]; title: string; trainer: string; audience: string }>).map((item) =>
    row(item.category, item.title, item.trainer, item.audience),
  );
}

const CATEGORY_STYLE = {
  genel: { bg: "#fef3c7", fg: "#7c2d12" },
  saglik: { bg: "#dbeafe", fg: "#1e40af" },
  teknik: { bg: "#dcfce7", fg: "#166534" },
} as const;

export default function YearlyTrainingTab() {
  const t = useTranslations("planner.yearlyTraining");
  const locale = useLocale();
  const defaultTrainings = useMemo(() => hydrateDefaultTrainings(t.raw("defaultTrainings")), [t]);
  const companies = useMemo(() => loadCompanyDirectory(), []);
  const [companyId, setCompanyId] = useState<string>(companies[0]?.id ?? "");
  const selectedCompany = companies.find((c) => c.id === companyId) ?? null;
  const [year, setYear] = useState(new Date().getFullYear());
  const [trainings, setTrainings] = useState<TrainingRow[]>(defaultTrainings);
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

  const loadPlan = useCallback(async (cid: string, y: number) => {
    if (!cid) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error(t("errors.noSupabase"));
      const { data, error: e } = await supabase
        .from("yearly_training_plans")
        .select("*")
        .eq("company_workspace_id", cid)
        .eq("year", y)
        .maybeSingle();
      if (e && e.code !== "PGRST116") throw e;
      if (data) {
        const payload = data.data as { trainings?: TrainingRow[]; signers?: typeof signers };
        if (payload?.trainings) setTrainings(payload.trainings);
        if (payload?.signers) setSigners(payload.signers);
        else setSigners({ employer: "", physician: "", safetyExpert: "" });
        setRecordId(data.id);
      } else {
        setTrainings(defaultTrainings);
        setSigners({ employer: "", physician: "", safetyExpert: "" });
        setRecordId(null);
      }
    } catch (e) {
      console.warn("loadPlan training:", e);
      setError(e instanceof Error ? e.message : t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [defaultTrainings, t]);

  useEffect(() => {
    if (companyId) void loadPlan(companyId, year);
  }, [companyId, year, loadPlan]);

  async function handleSave() {
    if (!companyId) { setError(t("errors.selectCompany")); return; }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error(t("errors.noSupabase"));
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("errors.sessionNotFound"));
      const { data: profile } = await supabase.from("user_profiles").select("organization_id").eq("auth_user_id", user.id).single();
      if (!profile?.organization_id) throw new Error(t("errors.orgNotFound"));

      const payload = {
        organization_id: profile.organization_id,
        company_workspace_id: companyId,
        year,
        data: { trainings, signers },
        created_by: user.id,
      };
      const { data, error: e } = await supabase
        .from("yearly_training_plans")
        .upsert(payload, { onConflict: "organization_id,company_workspace_id,year" })
        .select()
        .single();
      if (e) throw e;
      if (data) setRecordId(data.id);
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  function updateRow(idx: number, patch: Partial<TrainingRow>) {
    setTrainings((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function addRow(category: TrainingRow["category"]) {
    setTrainings((prev) => [...prev, row(category, "", t("defaults.trainer"), t("defaults.audience"))]);
  }

  function removeRow(idx: number) {
    setTrainings((prev) => prev.filter((_, i) => i !== idx));
  }

  function exportPdf() {
    const pdf = {
      htmlTitle: t("pdf.htmlTitle", { companyName: selectedCompany?.name ?? "—" }),
      mainTitle: t("pdf.mainTitle"),
      headerLine: t("pdf.headerLine", { companyName: selectedCompany?.name ?? "—", year }),
      colNo: t("pdf.colNo"),
      colTopic: t("pdf.colTopic"),
      colTrainer: t("pdf.colTrainer"),
      colAudience: t("pdf.colAudience"),
      colPlanned: t("pdf.colPlanned"),
      colDuration: t("pdf.colDuration"),
      colRealized: t("pdf.colRealized"),
      colCertificate: t("pdf.colCertificate"),
      colAttendance: t("pdf.colAttendance"),
      sigEmployer: t("pdf.sigEmployer"),
      sigPhysician: t("pdf.sigPhysician"),
      sigSafety: t("pdf.sigSafety"),
      sigLine: t("pdf.sigLine"),
      empty: t("pdf.empty"),
      categoryLabels: {
        genel: t("categories.genel"),
        saglik: t("categories.saglik"),
        teknik: t("categories.teknik"),
      },
    };
    const html = buildTrainingHtml({ htmlLang: locale, companyName: selectedCompany?.name ?? "—", year, trainings, signers, pdf });
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
            <GraduationCap className="size-4 text-blue-600" />
            {t("card.title")}
          </CardTitle>
          <CardDescription>{t("card.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{t("fields.company")}</label>
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground">
                <option value="">{t("fields.companyPlaceholder")}</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">{t("fields.year")}</label>
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())}
                className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground" />
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
                <input value={signers.employer} onChange={(e) => setSigners((s) => ({ ...s, employer: e.target.value }))} placeholder={t("signers.employerPlaceholder")} className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-foreground">{t("signers.physician")}</label>
                <input value={signers.physician} onChange={(e) => setSigners((s) => ({ ...s, physician: e.target.value }))} placeholder={t("signers.physicianPlaceholder")} className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-foreground">{t("signers.safetyExpert")}</label>
                <input value={signers.safetyExpert} onChange={(e) => setSigners((s) => ({ ...s, safetyExpert: e.target.value }))} placeholder={t("signers.safetyExpertPlaceholder")} className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground" />
              </div>
            </div>
          </div>

          {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{error}</div>}
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
        <Card><CardContent className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("loading")}
        </CardContent></Card>
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
                    <th className="border border-border p-2 text-left" style={{ width: 30 }}>#</th>
                    <th className="border border-border p-2 text-left">{t("table.topic")}</th>
                    <th className="border border-border p-2 text-left" style={{ width: 140 }}>{t("table.trainer")}</th>
                    <th className="border border-border p-2 text-left" style={{ width: 120 }}>{t("table.audience")}</th>
                    <th className="border border-border p-2 text-center" style={{ width: 110 }}>{t("table.planned")}</th>
                    <th className="border border-border p-2 text-center" style={{ width: 50 }}>{t("table.duration")}</th>
                    <th className="border border-border p-2 text-center" style={{ width: 110 }}>{t("table.realized")}</th>
                    <th className="border border-border p-2 text-center" style={{ width: 70 }}>{t("table.certificate")}</th>
                    <th className="border border-border p-2 text-center" style={{ width: 60 }}>{t("table.attendance")}</th>
                    <th className="border border-border p-1" style={{ width: 32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {(["genel", "saglik", "teknik"] as const).map((cat) => (
                    <CategoryBlock
                      key={cat}
                      cat={cat}
                      rows={trainings}
                      labels={{ category: t(`categories.${cat}`), addRow: t("table.addRow"), deleteRow: t("table.deleteRowAria"), yes: t("certificate.yes"), no: t("certificate.no"), empty: t("certificate.empty") }}
                      onUpdate={updateRow}
                      onAdd={() => addRow(cat)}
                      onRemove={removeRow}
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

function CategoryBlock({ cat, rows, labels, onUpdate, onAdd, onRemove }: {
  cat: keyof typeof CATEGORY_STYLE;
  rows: TrainingRow[];
  labels: { category: string; addRow: string; deleteRow: string; yes: string; no: string; empty: string };
  onUpdate: (idx: number, patch: Partial<TrainingRow>) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  const meta = CATEGORY_STYLE[cat];
  const catRows = rows.map((r, i) => ({ row: r, globalIdx: i })).filter((x) => x.row.category === cat);
  let n = 0;
  return (
    <>
      <tr>
        <td colSpan={10} className="border border-border px-2 py-1.5 text-xs font-bold" style={{ background: meta.bg, color: meta.fg }}>
          <div className="flex items-center justify-between">
            <span>{labels.category}</span>
            <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 rounded-md border border-black/10 bg-white/60 px-2 py-0.5 text-[10px] font-medium hover:bg-white">
              <Plus className="size-3" /> {labels.addRow}
            </button>
          </div>
        </td>
      </tr>
      {catRows.map(({ row: r, globalIdx }) => {
        n++;
        return (
          <tr key={r.id} className="hover:bg-muted/40">
            <td className="border border-border p-2 text-center font-mono">{n}</td>
            <td className="border border-border p-0.5"><input value={r.title} onChange={(e) => onUpdate(globalIdx, { title: e.target.value })} className="w-full border-none bg-transparent p-1.5 text-xs outline-none focus:bg-primary/5" /></td>
            <td className="border border-border p-0.5"><input value={r.trainer} onChange={(e) => onUpdate(globalIdx, { trainer: e.target.value })} className="w-full border-none bg-transparent p-1.5 text-xs text-muted-foreground outline-none focus:bg-primary/5" /></td>
            <td className="border border-border p-0.5"><input value={r.audience} onChange={(e) => onUpdate(globalIdx, { audience: e.target.value })} className="w-full border-none bg-transparent p-1.5 text-xs text-muted-foreground outline-none focus:bg-primary/5" /></td>
            <td className="border border-border p-0.5"><input type="date" value={r.plannedDate} onChange={(e) => onUpdate(globalIdx, { plannedDate: e.target.value })} className="w-full border-none bg-transparent p-1.5 text-[10px] text-muted-foreground outline-none focus:bg-primary/5" /></td>
            <td className="border border-border p-0.5"><input type="number" value={r.durationHours} onChange={(e) => onUpdate(globalIdx, { durationHours: Number(e.target.value) || 0 })} className="w-full border-none bg-transparent p-1.5 text-center text-xs font-semibold outline-none focus:bg-primary/5" /></td>
            <td className="border border-border p-0.5"><input type="date" value={r.realizedDate} onChange={(e) => onUpdate(globalIdx, { realizedDate: e.target.value })} className="w-full border-none bg-transparent p-1.5 text-[10px] text-muted-foreground outline-none focus:bg-primary/5" /></td>
            <td className="border border-border p-0.5">
              <select value={r.certificate} onChange={(e) => onUpdate(globalIdx, { certificate: e.target.value as TrainingRow["certificate"] })} className="w-full border-none bg-transparent p-1.5 text-center text-xs outline-none focus:bg-primary/5">
                <option value="">{labels.empty}</option>
                <option value="var">{labels.yes}</option>
                <option value="yok">{labels.no}</option>
              </select>
            </td>
            <td className="border border-border p-0.5">
              <input type="number" value={r.attendance} onChange={(e) => onUpdate(globalIdx, { attendance: e.target.value ? Number(e.target.value) : "" })} className="w-full border-none bg-transparent p-1.5 text-center text-xs outline-none focus:bg-primary/5" />
            </td>
            <td className="border border-border text-center">
              <button type="button" onClick={() => onRemove(globalIdx)} className="p-1 text-muted-foreground hover:text-red-500" aria-label={labels.deleteRow}>
                <Trash2 className="size-3.5" />
              </button>
            </td>
          </tr>
        );
      })}
    </>
  );
}

type TrainingPdfStrings = {
  htmlTitle: string;
  mainTitle: string;
  headerLine: string;
  colNo: string;
  colTopic: string;
  colTrainer: string;
  colAudience: string;
  colPlanned: string;
  colDuration: string;
  colRealized: string;
  colCertificate: string;
  colAttendance: string;
  sigEmployer: string;
  sigPhysician: string;
  sigSafety: string;
  sigLine: string;
  empty: string;
  categoryLabels: Record<TrainingRow["category"], string>;
};

function buildTrainingHtml({ htmlLang, companyName, year, trainings, signers, pdf }: { htmlLang: string; companyName: string; year: number; trainings: TrainingRow[]; signers: { employer: string; physician: string; safetyExpert: string }; pdf: TrainingPdfStrings }): string {
  const rowsByCat = (["genel", "saglik", "teknik"] as const).map((cat) => {
    const catRows = trainings.filter((t) => t.category === cat);
    const meta = CATEGORY_STYLE[cat];
    const inner = catRows.map((r, i) => `
      <tr>
        <td class="c mono">${i + 1}</td>
        <td>${esc(r.title)}</td>
        <td class="muted">${esc(r.trainer)}</td>
        <td class="muted">${esc(r.audience)}</td>
        <td class="c muted">${esc(r.plannedDate || pdf.empty)}</td>
        <td class="c strong">${r.durationHours}</td>
        <td class="c muted">${esc(r.realizedDate || pdf.empty)}</td>
        <td class="c muted">${esc(r.certificate || pdf.empty)}</td>
        <td class="c muted">${r.attendance === "" ? esc(pdf.empty) : r.attendance}</td>
      </tr>
    `).join("");
    return `
      <tr><td colspan="9" class="section-title" style="background:${meta.bg};color:${meta.fg};">${esc(pdf.categoryLabels[cat])}</td></tr>
      ${inner}
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="${esc(htmlLang)}">
<head>
<meta charset="UTF-8">
<title>${esc(pdf.htmlTitle)}</title>
<style>
  * { box-sizing: border-box; }
  @page { size: A4 landscape; margin: 10mm; }
  body { margin: 0; font-family: 'Inter', Arial, sans-serif; color: #111; font-size: 9px; }
  .header-row { display: flex; justify-content: space-between; align-items: center; background: #dbeafe; border: 2px solid #1e40af; padding: 8px 14px; margin-bottom: 4px; font-size: 11px; }
  .header-row .title { font-size: 14px; font-weight: 700; color: #1e40af; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #dbeafe; padding: 5px 4px; border: 1px solid #111; font-size: 9px; font-weight: 700; }
  td { padding: 4px 6px; border: 1px solid #6b7280; font-size: 9px; }
  td.c { text-align: center; } td.mono { font-family: monospace; font-weight: 700; }
  td.muted { color: #4b5563; } td.strong { font-weight: 700; }
  td.section-title { font-weight: 700; font-size: 10px; padding: 5px 8px; }
  .sig-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
  .sig-box { border: 1px dashed #6b7280; padding: 12px; text-align: center; height: 80px; display: flex; flex-direction: column; justify-content: space-between; }
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
        <th style="width:30px;">${esc(pdf.colNo)}</th><th>${esc(pdf.colTopic)}</th>
        <th style="width:110px;">${esc(pdf.colTrainer)}</th><th style="width:100px;">${esc(pdf.colAudience)}</th>
        <th style="width:85px;">${esc(pdf.colPlanned)}</th><th style="width:45px;">${esc(pdf.colDuration)}</th>
        <th style="width:85px;">${esc(pdf.colRealized)}</th><th style="width:50px;">${esc(pdf.colCertificate)}</th><th style="width:45px;">${esc(pdf.colAttendance)}</th>
      </tr>
    </thead>
    <tbody>${rowsByCat}</tbody>
  </table>
  <div class="sig-grid">
    <div class="sig-box">
      <div style="font-weight:700;">${esc(pdf.sigEmployer)}</div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:10px;color:#111;font-weight:600;">${esc(signers.employer || pdf.empty)}</div>
      <div style="border-top:1px solid #111;padding-top:2px;font-size:8px;color:#6b7280;">${esc(pdf.sigLine)}</div>
    </div>
    <div class="sig-box">
      <div style="font-weight:700;">${esc(pdf.sigPhysician)}</div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:10px;color:#111;font-weight:600;">${esc(signers.physician || pdf.empty)}</div>
      <div style="border-top:1px solid #111;padding-top:2px;font-size:8px;color:#6b7280;">${esc(pdf.sigLine)}</div>
    </div>
    <div class="sig-box">
      <div style="font-weight:700;">${esc(pdf.sigSafety)}</div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:10px;color:#111;font-weight:600;">${esc(signers.safetyExpert || pdf.empty)}</div>
      <div style="border-top:1px solid #111;padding-top:2px;font-size:8px;color:#6b7280;">${esc(pdf.sigLine)}</div>
    </div>
  </div>
</body>
</html>`;
}

function esc(s: string): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
