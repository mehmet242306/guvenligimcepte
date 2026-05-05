"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GitBranch,
  HelpCircle,
  Network,
  Link as LinkIcon,
  Target,
  Building2,
  Activity,
  Bot,
  ArrowLeft,
  Trash2,
  Plus,
  ShieldAlert,
  AlertTriangle,
  Stethoscope,
  Eye,
} from "lucide-react";
import { METHOD_META, type AnalysisMethod } from "@/lib/analysis/types";
import type {
  IshikawaAnalysisData,
  FiveWhyData,
  FaultTreeData,
  ScatData,
  BowTieData,
  MortData,
  R2dRcaData,
  RootCauseAnalysis,
} from "@/lib/analysis/types";
import {
  fetchAnalyses,
  createAnalysis,
  updateAnalysis,
  deleteAnalysis,
  requestAiAnalysis,
} from "@/lib/analysis/api";
import type { IncidentType } from "@/lib/supabase/incident-api";
import { loadCompanyDirectory } from "@/lib/company-directory";
import { FiveWhyPanel } from "@/components/analysis/FiveWhyPanel";
import { ScatPanel } from "@/components/analysis/ScatPanel";
import { FaultTreePanel } from "@/components/analysis/FaultTreePanel";
import { BowTiePanel } from "@/components/analysis/BowTiePanel";
import { MortPanel } from "@/components/analysis/MortPanel";
import { R2dRcaPanel } from "@/components/analysis/R2dRcaPanel";
import { IshikawaDiagram } from "@/components/incidents/IshikawaDiagram";
import { RcaIntroPanel } from "@/components/analysis/RcaIntroPanel";

const ICON_MAP: Record<string, typeof GitBranch> = {
  GitBranch,
  HelpCircle,
  Network,
  Link: LinkIcon,
  Target,
  Building2,
  Activity,
};

const INCIDENT_TYPE_META: { value: IncidentType; icon: typeof ShieldAlert; color: string }[] = [
  { value: "work_accident", icon: ShieldAlert, color: "#ef4444" },
  { value: "near_miss", icon: AlertTriangle, color: "#f59e0b" },
  { value: "occupational_disease", icon: Stethoscope, color: "#6366f1" },
  { value: "other", icon: Eye, color: "#6b7280" },
];

const ANALYSIS_METHODS = Object.keys(METHOD_META) as AnalysisMethod[];

const ISHIKAWA_CATEGORIES = ["insan", "makine", "yontem", "malzeme", "cevre", "yonetim"] as const;

export function AnalizlerContent() {
  const t = useTranslations("incidents");
  const trca = useTranslations("incidents.rca");
  const locale = useLocale();
  const [analyses, setAnalyses] = useState<RootCauseAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  const companies = useMemo(() => loadCompanyDirectory(), []);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<IncidentType | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<AnalysisMethod | null>(null);
  const [freeTitle, setFreeTitle] = useState("");
  const [activeAnalysis, setActiveAnalysis] = useState<RootCauseAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<"new" | "history">("new");

  const localizedMethodMeta = useMemo(() => {
    const out = {} as Record<AnalysisMethod, (typeof METHOD_META)[AnalysisMethod]>;
    for (const m of ANALYSIS_METHODS) {
      const base = METHOD_META[m];
      out[m] = {
        ...base,
        label: trca(`methodMeta.${m}.label`),
        subtitle: trca(`methodMeta.${m}.subtitle`),
        description: trca(`methodMeta.${m}.description`),
      };
    }
    return out;
  }, [trca]);

  useEffect(() => {
    fetchAnalyses().then((ana) => {
      setAnalyses(ana);
      setLoading(false);
    });
  }, []);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) ?? null;
  const typeLabel = selectedType ? t(`types.${selectedType}`) : "";

  const incidentTitle = [selectedCompany?.name, typeLabel, freeTitle.trim()].filter(Boolean).join(" — ");

  function handleMethodSelect(method: AnalysisMethod) {
    setError(null);
    setSelectedMethod(method);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleSave(method: AnalysisMethod, data: any) {
    if (activeAnalysis) {
      await updateAnalysis(activeAnalysis.id, data);
      setAnalyses((prev) => prev.map((a) => (a.id === activeAnalysis.id ? { ...a, data, isEdited: true } : a)));
    } else {
      const created = await createAnalysis({
        incidentId: null,
        incidentTitle: incidentTitle || trca("defaults.unnamedAnalysis"),
        method,
        data,
        isFreeMode: true,
      });
      if (created) setAnalyses((prev) => [created, ...prev]);
    }
    setSelectedMethod(null);
    setActiveAnalysis(null);
  }

  function openAnalysis(analysis: RootCauseAnalysis) {
    setActiveAnalysis(analysis);
    setSelectedMethod(analysis.method);
    setSubTab("new");
  }

  async function handleDelete(id: string) {
    if (!confirm(trca("confirmDelete"))) return;
    const ok = await deleteAnalysis(id);
    if (ok) setAnalyses((prev) => prev.filter((a) => a.id !== id));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleAiRequest(method: AnalysisMethod, context?: any) {
    setBusy(true);
    setError(null);
    try {
      return await requestAiAnalysis({
        method,
        incidentTitle: incidentTitle || trca("defaults.unknownIncident"),
        incidentDescription: freeTitle.trim() || undefined,
        locale,
        context,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : trca("aiErrorGeneric"));
      throw e;
    } finally {
      setBusy(false);
    }
  }

  function handleBack() {
    setSelectedMethod(null);
    setActiveAnalysis(null);
    setError(null);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (selectedMethod) {
    const meta = localizedMethodMeta[selectedMethod];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={handleBack} className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 inline size-4" /> {trca("back")}
          </button>
          <h3 className="text-lg font-semibold text-foreground">{meta.label}</h3>
        </div>
        {error && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
            {error}
          </div>
        )}
        {renderMethodPanel(selectedMethod)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant={subTab === "new" ? "primary" : "outline"} size="sm" onClick={() => setSubTab("new")}>
          {trca("newAnalysis")}
        </Button>
        <Button variant={subTab === "history" ? "primary" : "outline"} size="sm" onClick={() => setSubTab("history")}>
          {trca("history", { count: analyses.length })}
        </Button>
      </div>

      {subTab === "new" && (
        <>
          <RcaIntroPanel />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{trca("analysisCardTitle")}</CardTitle>
              <CardDescription>{trca("analysisCardDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">{trca("companyLabel")}</label>
                <select
                  value={selectedCompanyId ?? ""}
                  onChange={(e) => setSelectedCompanyId(e.target.value || null)}
                  className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground"
                >
                  <option value="">{trca("companyPlaceholder")}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-foreground">{trca("incidentTypeLabel")}</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {INCIDENT_TYPE_META.map((opt) => {
                    const Icon = opt.icon;
                    const active = selectedType === opt.value;
                    const label = t(`types.${opt.value}`);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSelectedType(active ? null : opt.value)}
                        className={`flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                          active ? "shadow-sm" : "border-border bg-card text-muted-foreground hover:text-foreground"
                        }`}
                        style={
                          active
                            ? { borderColor: opt.color, backgroundColor: `${opt.color}12`, color: opt.color }
                            : undefined
                        }
                      >
                        <span
                          className="inline-flex size-8 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${opt.color}18` }}
                        >
                          <Icon className="size-4" style={{ color: opt.color }} />
                        </span>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Input
                  label={trca("subjectLabel")}
                  value={freeTitle}
                  onChange={(e) => setFreeTitle(e.target.value)}
                  placeholder={trca("subjectPlaceholder")}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ANALYSIS_METHODS.map((method) => {
              const meta = localizedMethodMeta[method];
              const Icon = ICON_MAP[meta.icon] ?? GitBranch;
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => handleMethodSelect(method)}
                  disabled={busy}
                  className="group rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary/30 hover:shadow-[var(--shadow-card)]"
                  style={{ borderTopColor: meta.color, borderTopWidth: 3 }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-muted">
                        <Icon className="size-5" style={{ color: meta.color }} />
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-foreground">{meta.label}</div>
                        <div className="text-xs text-muted-foreground">{meta.subtitle}</div>
                      </div>
                    </div>
                    {meta.aiSupported && <Badge variant="warning">AI</Badge>}
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">{meta.description}</p>
                </button>
              );
            })}
          </div>
        </>
      )}

      {subTab === "history" && (
        <div className="space-y-3">
          {analyses.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">{trca("emptyHistory")}</CardContent>
            </Card>
          ) : (
            analyses.map((a) => {
              const meta = localizedMethodMeta[a.method];
              return (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <button type="button" onClick={() => openAnalysis(a)} className="flex flex-1 items-center gap-3 text-left">
                    <Badge style={{ background: `${meta.color}20`, color: meta.color, borderColor: `${meta.color}40` }}>
                      {meta.label}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{a.incidentTitle}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString(locale)}
                        {a.isFreeMode && ` — ${trca("historyFree")}`}
                        {a.isEdited && ` — ${trca("historyEdited")}`}
                      </div>
                    </div>
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} className="text-danger">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderMethodPanel(method: AnalysisMethod) {
    const data = activeAnalysis?.data ?? null;
    switch (method) {
      case "ishikawa":
        return (
          <IshikawaInlinePanel
            incidentTitle={incidentTitle}
            initialData={data as IshikawaAnalysisData | null}
            onSave={(d) => handleSave("ishikawa", d)}
            onAiRequest={() => handleAiRequest("ishikawa")}
            busy={busy}
          />
        );
      case "five_why":
        return (
          <FiveWhyPanel
            incidentTitle={incidentTitle}
            initialData={data as FiveWhyData | null}
            onSave={(d) => handleSave("five_why", d)}
            onAiRequest={(ctx) => handleAiRequest("five_why", ctx)}
          />
        );
      case "fault_tree":
        return (
          <FaultTreePanel
            incidentTitle={incidentTitle}
            initialData={data as FaultTreeData | null}
            onSave={(d) => handleSave("fault_tree", d)}
            onAiRequest={() => handleAiRequest("fault_tree")}
          />
        );
      case "scat":
        return (
          <ScatPanel
            incidentTitle={incidentTitle}
            initialData={data as ScatData | null}
            onSave={(d) => handleSave("scat", d)}
            onAiRequest={() => handleAiRequest("scat")}
          />
        );
      case "bow_tie":
        return (
          <BowTiePanel
            incidentTitle={incidentTitle}
            initialData={data as BowTieData | null}
            onSave={(d) => handleSave("bow_tie", d)}
            onAiRequest={() => handleAiRequest("bow_tie")}
          />
        );
      case "mort":
        return (
          <MortPanel
            incidentTitle={incidentTitle}
            initialData={data as MortData | null}
            onSave={(d) => handleSave("mort", d)}
            onAiRequest={() => handleAiRequest("mort")}
          />
        );
      case "r2d_rca":
        return (
          <R2dRcaPanel
            incidentTitle={incidentTitle}
            initialData={data as R2dRcaData | null}
            onSave={(d) => handleSave("r2d_rca", d)}
            onAiRequest={() => handleAiRequest("r2d_rca")}
          />
        );
    }
  }
}

function IshikawaInlinePanel({
  incidentTitle,
  initialData,
  onSave,
  onAiRequest,
  busy,
}: {
  incidentTitle: string;
  initialData: IshikawaAnalysisData | null;
  onSave: (data: IshikawaAnalysisData) => void;
  onAiRequest: () => Promise<IshikawaAnalysisData>;
  busy: boolean;
}) {
  const trca = useTranslations("incidents.rca");
  const [data, setData] = useState<IshikawaAnalysisData>(
    initialData ?? { insan: [], makine: [], yontem: [], malzeme: [], cevre: [], yonetim: [] },
  );

  const diagramData = {
    problemStatement: incidentTitle,
    manCauses: data.insan,
    machineCauses: data.makine,
    methodCauses: data.yontem,
    materialCauses: data.malzeme,
    environmentCauses: data.cevre,
    measurementCauses: data.yonetim,
  };

  return (
    <div className="space-y-4">
      <Button
        variant="accent"
        size="sm"
        disabled={busy}
        onClick={async () => {
          try {
            setData(await onAiRequest());
          } catch {
            /* */
          }
        }}
      >
        <Bot className="mr-1 size-4" /> {busy ? trca("ishikawaAiWorking") : trca("ishikawaAiButton")}
      </Button>
      <IshikawaDiagram data={diagramData} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ISHIKAWA_CATEGORIES.map((cat) => {
          const catLabel = trca(`categories.${cat}`);
          return (
            <Card key={cat}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{catLabel}</CardTitle>
                  <button
                    type="button"
                    onClick={() => setData((p) => ({ ...p, [cat]: [...p[cat], ""] }))}
                    className="inline-flex size-6 items-center justify-center rounded bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {data[cat].map((cause, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      value={cause}
                      onChange={(e) => {
                        const next = [...data[cat]];
                        next[i] = e.target.value;
                        setData((p) => ({ ...p, [cat]: next }));
                      }}
                      className="h-7 flex-1 rounded border border-border bg-input px-2 text-xs text-foreground"
                      placeholder={trca("categoryCausePlaceholder", { category: catLabel })}
                    />
                    <button
                      type="button"
                      onClick={() => setData((p) => ({ ...p, [cat]: p[cat].filter((_, j) => j !== i) }))}
                      className="text-muted-foreground hover:text-danger"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button onClick={() => onSave(data)}>{trca("ishikawaSave")}</Button>
      </div>
    </div>
  );
}
