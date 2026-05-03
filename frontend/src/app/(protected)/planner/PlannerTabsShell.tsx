"use client";

import { useEffect, useState } from "react";
import { Calendar, FileText, GraduationCap, ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { PlannerCore } from "./PlannerClient";
import YearlyWorkPlanTab from "./YearlyWorkPlanTab";
import YearlyTrainingTab from "./YearlyTrainingTab";
import TimesheetClient from "@/app/(protected)/timesheet/TimesheetClient";
import { scanUpcomingAjandaTasks } from "@/lib/supabase/ajanda-sync";

type TabKey = "planlayici" | "yillik-calisma" | "yillik-egitim" | "puantaj";

const TABS: { key: TabKey; icon: typeof Calendar; labelKey: string; descKey: string }[] = [
  { key: "planlayici", icon: Calendar, labelKey: "tabs.planner.label", descKey: "tabs.planner.desc" },
  { key: "yillik-calisma", icon: FileText, labelKey: "tabs.workPlan.label", descKey: "tabs.workPlan.desc" },
  { key: "yillik-egitim", icon: GraduationCap, labelKey: "tabs.trainingPlan.label", descKey: "tabs.trainingPlan.desc" },
  { key: "puantaj", icon: ClipboardList, labelKey: "tabs.timesheet.label", descKey: "tabs.timesheet.desc" },
];

export default function PlannerTabsShell() {
  const t = useTranslations("planner.shell");
  const [active, setActive] = useState<TabKey>("planlayici");

  useEffect(() => {
    void scanUpcomingAjandaTasks({ daysAhead: 7 });
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`group relative flex flex-col items-start gap-1 overflow-hidden rounded-xl border-2 p-3.5 text-left transition-all ${
                isActive
                  ? "border-primary bg-gradient-to-br from-primary/15 to-primary/5 text-foreground shadow-md"
                  : "border-border bg-card text-muted-foreground hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/50 hover:shadow-sm"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className={`inline-flex size-9 items-center justify-center rounded-lg ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary"}`}>
                  <Icon className="size-4" />
                </span>
                {isActive && <span className="inline-flex size-2 rounded-full bg-primary" aria-hidden="true" />}
              </div>
              <div className={`text-sm font-semibold ${isActive ? "text-foreground" : ""}`}>{t(tab.labelKey)}</div>
              <div className="text-[10px] leading-4 text-muted-foreground">{t(tab.descKey)}</div>
            </button>
          );
        })}
      </div>

      <div>
        {active === "planlayici" && <PlannerCore showHeader={false} />}
        {active === "yillik-calisma" && <YearlyWorkPlanTab />}
        {active === "yillik-egitim" && <YearlyTrainingTab />}
        {active === "puantaj" && <TimesheetClient />}
      </div>
    </div>
  );
}
