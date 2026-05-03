"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  GitBranch,
  HelpCircle,
  Network,
  Link as LinkIcon,
  Target,
  Building2,
  Activity,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type MethodKey = "r2d_rca" | "ishikawa" | "five_why" | "fault_tree" | "scat" | "bow_tie" | "mort";

interface MethodGuide {
  key: MethodKey;
  label: string;
  icon: typeof GitBranch;
  color: string;
  bestFor: string;
  example: string;
  badge?: string;
}

const METHOD_ORDER: { key: MethodKey; icon: typeof GitBranch; color: string }[] = [
  { key: "r2d_rca", icon: Activity, color: "#e05a7a" },
  { key: "ishikawa", icon: GitBranch, color: "#d4a017" },
  { key: "five_why", icon: HelpCircle, color: "#5a9ee0" },
  { key: "fault_tree", icon: Network, color: "#5ae0a0" },
  { key: "scat", icon: LinkIcon, color: "#e0a05a" },
  { key: "bow_tie", icon: Target, color: "#5ae0e0" },
  { key: "mort", icon: Building2, color: "#a05ae0" },
];

interface RcaIntroPanelProps {
  defaultOpen?: boolean;
}

export function RcaIntroPanel({ defaultOpen = false }: RcaIntroPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const t = useTranslations("analysis.rcaIntro");

  const methodGuides = useMemo((): MethodGuide[] => {
    return METHOD_ORDER.map(({ key, icon, color }) => ({
      key,
      icon,
      color,
      label: t(`methods.${key}.label`),
      bestFor: t(`methods.${key}.bestFor`),
      example: t(`methods.${key}.example`),
      ...(key === "r2d_rca" ? { badge: t("methods.r2d_rca.badge") } : {}),
    }));
  }, [t]);

  const whenUse = t.raw("whenUse") as string[];
  const tips = t.raw("tips") as string[];
  const processSteps = t.raw("processSteps") as string[];

  return (
    <Card aria-label={t("panelAria")}>
      <CardHeader
        className="cursor-pointer pb-3 transition-colors hover:bg-muted/30"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
              <BookOpen className="size-4 text-amber-700 dark:text-amber-400" />
            </span>
            <div>
              <CardTitle className="text-sm">{t("title")}</CardTitle>
              <CardDescription className="text-xs">{t("description")}</CardDescription>
            </div>
          </div>
          <button
            type="button"
            className="text-xs text-muted-foreground"
            aria-label={open ? t("toggleCollapse") : t("toggleExpand")}
          >
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="space-y-5 border-t border-border pt-4">
          <section>
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb className="size-4 text-amber-600" />
              <h4 className="text-sm font-semibold text-foreground">{t("whatIsHeading")}</h4>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{t("whatIsBody")}</p>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle className="size-4 text-orange-600" />
              <h4 className="text-sm font-semibold text-foreground">{t("whenHeading")}</h4>
            </div>
            <ul className="ml-4 space-y-1.5 text-sm leading-6 text-muted-foreground">
              {whenUse.map((line, i) => (
                <li key={i}>• {line}</li>
              ))}
            </ul>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <h4 className="text-sm font-semibold text-foreground">{t("methodsHeading")}</h4>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {methodGuides.map((g) => {
                const Icon = g.icon;
                return (
                  <div
                    key={g.key}
                    className="rounded-xl border border-border p-3 transition-colors hover:bg-muted/30"
                    style={{ borderLeftWidth: 3, borderLeftColor: g.color }}
                  >
                    <div className="mb-1.5 flex items-start gap-2">
                      <span
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${g.color}20` }}
                      >
                        <Icon className="size-3.5" style={{ color: g.color }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h5 className="text-sm font-semibold text-foreground">{g.label}</h5>
                          {g.badge ? (
                            <Badge variant="warning" className="text-[9px]">
                              {g.badge}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
                      <strong className="text-foreground">{t("bestForLabel")}</strong> {g.bestFor}
                    </p>
                    <p className="mt-1.5 rounded-lg bg-muted/40 p-2 text-[11px] leading-5 text-muted-foreground">
                      <strong className="text-foreground">{t("exampleLabel")}</strong> {g.example}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb className="size-4 text-amber-700" />
              <h4 className="text-sm font-semibold text-foreground">{t("tipsHeading")}</h4>
            </div>
            <ul className="ml-4 space-y-1.5 text-[12px] leading-5 text-muted-foreground">
              {tips.map((line, i) => (
                <li key={i}>• {line}</li>
              ))}
            </ul>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2">
              <Network className="size-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-foreground">{t("processHeading")}</h4>
            </div>
            <ol className="ml-4 space-y-1.5 text-sm leading-6 text-muted-foreground">
              {processSteps.map((line, i) => (
                <li key={i}>
                  <strong className="text-foreground">{i + 1}.</strong> {line}
                </li>
              ))}
            </ol>
          </section>
        </CardContent>
      )}
    </Card>
  );
}
