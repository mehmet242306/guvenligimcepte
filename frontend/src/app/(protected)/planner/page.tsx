import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PlannerTabsShell from "./PlannerTabsShell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("planner.shell");
  return { title: `${t("title")} | RiskNova` };
}

export default function PlannerPage() {
  return <PlannerTabsShell />;
}
