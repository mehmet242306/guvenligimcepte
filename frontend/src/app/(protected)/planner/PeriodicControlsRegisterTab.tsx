"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardCheck, FileDown, Loader2, Plus, Save, Trash2 } from "lucide-react";
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

let pdfUnicodeFontPromise: Promise<void> | null = null;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function ensurePdfUnicodeFont(doc: InstanceType<typeof import("jspdf").jsPDF>): Promise<void> {
  if (!pdfUnicodeFontPromise) {
    pdfUnicodeFontPromise = (async () => {
      const [regularResp, boldResp] = await Promise.all([
        fetch("https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf"),
        fetch("https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Bold.ttf"),
      ]);
      if (!regularResp.ok || !boldResp.ok) {
        throw new Error("Unicode font yüklenemedi");
      }
      const [regularBuf, boldBuf] = await Promise.all([regularResp.arrayBuffer(), boldResp.arrayBuffer()]);
      const regularB64 = toBase64(new Uint8Array(regularBuf));
      const boldB64 = toBase64(new Uint8Array(boldBuf));

      doc.addFileToVFS("NotoSans-Regular.ttf", regularB64);
      doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
      doc.addFileToVFS("NotoSans-Bold.ttf", boldB64);
      doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
    })();
  }

  await pdfUnicodeFontPromise;
}

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
  const [exportingPdf, setExportingPdf] = useState(false);

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

  async function downloadPdf() {
    if (!rows.length) return;
    setExportingPdf(true);
    setError(null);
    try {
      const { jsPDF } = await import("jspdf");
      const QRCode = (await import("qrcode")).default;
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
      await ensurePdfUnicodeFont(doc);
      doc.setFont("NotoSans", "normal");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const normalizeForPdf = (value?: string | null) =>
        (value ?? "—")
          .trim()
          .normalize("NFC")
          .replace(/\s+/g, " ");
      const safe = (v?: string | null) => {
        const normalized = normalizeForPdf(v);
        return normalized.length > 0 ? normalized : "—";
      };
      const companyName = selectedCompany?.name ?? "—";
      const companyLogoUrl = selectedCompany?.logo_url?.trim() ?? "";
      const reportDate = new Date().toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US");
      const shareUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/planner?companyId=${encodeURIComponent(companyId)}&tab=periodicControls`
          : `https://getrisknova.com/planner?companyId=${encodeURIComponent(companyId)}&tab=periodicControls`;
      const qrDataUrl = await QRCode.toDataURL(shareUrl, { margin: 1, width: 132 });
      let logoDataUrl: string | null = null;
      let logoPlacement: { x: number; y: number; w: number; h: number } | null = null;
      if (companyLogoUrl && typeof window !== "undefined") {
        try {
          const logoResp = await fetch(companyLogoUrl);
          if (logoResp.ok) {
            const logoBlob = await logoResp.blob();
            logoDataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(String(reader.result ?? ""));
              reader.onerror = reject;
              reader.readAsDataURL(logoBlob);
            });
            if (logoDataUrl) {
              const resolvedLogoDataUrl = logoDataUrl;
              const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = resolvedLogoDataUrl;
              });
              const boxW = 38;
              const boxH = 38;
              const scale = Math.min(boxW / img.width, boxH / img.height);
              const drawW = Math.max(1, Math.round(img.width * scale));
              const drawH = Math.max(1, Math.round(img.height * scale));
              logoPlacement = {
                x: margin + 12 + (boxW - drawW) / 2,
                y: y - 6 + (boxH - drawH) / 2,
                w: drawW,
                h: drawH,
              };
            }
          }
        } catch {
          logoDataUrl = null;
          logoPlacement = null;
        }
      }

      doc.setFillColor(16, 24, 40);
      doc.rect(margin, y - 12, contentWidth, 62, "F");
      doc.setTextColor(255, 255, 255);
      if (logoDataUrl && logoPlacement) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin + 10, y - 8, 42, 42, 6, 6, "F");
        doc.addImage(logoDataUrl, "PNG", logoPlacement.x, logoPlacement.y, logoPlacement.w, logoPlacement.h);
      }
      doc.setFontSize(11);
      doc.text("RiskNova", margin + (logoDataUrl ? 56 : 12), y + 8);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(15);
      doc.text(safe(t("actions.downloadPdfTitle")), margin + (logoDataUrl ? 56 : 12), y + 28);
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(10);
      doc.text(`${safe(t("fields.company"))}: ${safe(companyName)}`, margin + (logoDataUrl ? 56 : 12), y + 44);
      doc.addImage(qrDataUrl, "PNG", pageWidth - margin - 54, y - 8, 42, 42);
      y += 66;

      doc.setTextColor(45, 55, 72);
      doc.setFontSize(10);
      doc.text(`${safe(t("fields.company"))}: ${safe(companyName)}`, margin, y);
      y += 14;
      doc.text(`${safe(t("fields.ownership"))}: ${safe(t(`ownership.${ownership}`))}`, margin, y);
      y += 14;
      doc.text(`${safe(t("fields.sector"))}: ${safe(sectorOptions[sector]?.label ?? sector)}`, margin, y);
      y += 14;
      doc.text(`${safe(t("actions.reportDate"))}: ${safe(reportDate)}`, margin, y);
      y += 14;
      doc.text(`${safe(t("actions.qrHint"))}.`, margin, y);
      y += 18;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y - 8, pageWidth - margin, y - 8);

      autoTable(doc, {
        startY: y + 2,
        margin: { left: margin, right: margin },
        head: [[
          "#",
          safe(t("table.title")),
          safe(t("table.status")),
          safe(t("table.plannedDate")),
          safe(t("table.doneDate")),
          safe(t("table.doneNote")),
          safe(t("table.regulation")),
          safe(t("table.period")),
          safe(t("table.source")),
        ]],
        body: rows.map((row, idx) => {
          const statusLabel = (row.status ?? "planned") === "completed" ? t("table.statusCompleted") : t("table.statusPlanned");
          return [
            String(idx + 1),
            safe(row.title),
            safe(statusLabel),
            safe(row.plannedDate),
            safe(row.doneDate),
            safe(row.doneNote),
            safe(row.regulation),
            safe(row.periodLabel),
            safe(row.source === "template" ? t("source.template") : t("source.manual")),
          ];
        }),
        theme: "grid",
        styles: {
          font: "NotoSans",
          fontSize: 8,
          cellPadding: 4,
          lineColor: [226, 232, 240],
          lineWidth: 0.7,
          textColor: [30, 41, 59],
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "left",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        tableWidth: contentWidth,
        columnStyles: {
          0: { cellWidth: 24, halign: "center" },
          1: { cellWidth: 150 },
          2: { cellWidth: 60 },
          3: { cellWidth: 58 },
          4: { cellWidth: 58 },
          5: { cellWidth: 90 },
          6: { cellWidth: 170 },
          7: { cellWidth: 75 },
          8: { cellWidth: 50 },
        },
      });

      const datePart = new Date().toISOString().slice(0, 10);
      doc.save(`periodic-control-register-${datePart}.pdf`);
    } catch (err) {
      console.warn("[PeriodicControlsRegisterTab] downloadPdf", err);
      setError(err instanceof Error ? err.message : t("errors.pdfFailed"));
    } finally {
      setExportingPdf(false);
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
            <Button type="button" variant="outline" onClick={() => void downloadPdf()} disabled={exportingPdf || rows.length === 0}>
              {exportingPdf ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t("actions.exportingPdf")}
                </>
              ) : (
                <>
                  <FileDown className="mr-2 size-4" />
                  {t("actions.downloadPdf")}
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

          <div className="rounded-lg border p-3">
            {rows.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">{t("empty")}</div>
            ) : (
              <div className="space-y-3">
                {rows.map((row, idx) => (
                  <div key={row.id} className={cn("rounded-lg border p-3", (row.status ?? "planned") === "completed" ? "border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-950/10" : "border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/10")}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">#{idx + 1}</span>
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
                          variant="outline"
                          className="h-8 shrink-0 border-red-300/70 px-2 text-red-700 hover:border-red-400 hover:bg-red-50 hover:text-red-800 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-900/20"
                          onClick={() => removeRow(row.id)}
                          aria-label={t("actions.deleteRow")}
                        >
                          <Trash2 className="mr-1 size-3.5" />
                          {t("actions.deleteRow")}
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{t("table.title")}</label>
                        <Input value={row.title} onChange={(e) => updateRow(row.id, { title: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{t("table.status")}</label>
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
                          className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground"
                        >
                          <option value="planned">{t("table.statusPlanned")}</option>
                          <option value="completed">{t("table.statusCompleted")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{t("table.plannedDate")}</label>
                        <Input
                          type="date"
                          value={row.plannedDate ?? ""}
                          onChange={(e) => updateRow(row.id, { plannedDate: e.target.value })}
                          disabled={(row.status ?? "planned") === "completed"}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{t("table.doneDate")}</label>
                        <Input
                          type="date"
                          value={row.doneDate ?? ""}
                          onChange={(e) => updateRow(row.id, { doneDate: e.target.value, status: "completed" })}
                          disabled={(row.status ?? "planned") !== "completed"}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{t("table.doneNote")}</label>
                        <Input
                          value={row.doneNote ?? ""}
                          onChange={(e) => updateRow(row.id, { doneNote: e.target.value })}
                          placeholder={t("table.doneNotePlaceholder")}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{t("table.regulation")}</label>
                        <Input value={row.regulation} onChange={(e) => updateRow(row.id, { regulation: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{t("table.period")}</label>
                        <Input value={row.periodLabel} onChange={(e) => updateRow(row.id, { periodLabel: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{t("table.tableRef")}</label>
                        <Input value={row.tableRef} onChange={(e) => updateRow(row.id, { tableRef: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{t("table.source")}</label>
                        <Input value={row.source === "template" ? t("source.template") : t("source.manual")} disabled />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">{t("disclaimer", { company: selectedCompany?.name ?? "—" })}</p>
          {recordId ? <p className="text-xs text-muted-foreground">{t("savedHint")}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
