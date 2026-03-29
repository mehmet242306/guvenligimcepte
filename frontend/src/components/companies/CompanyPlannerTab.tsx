"use client";

import { PlannerCore } from "@/app/(protected)/planner/PlannerClient";

export function CompanyPlannerTab({
  companyId,
}: {
  companyId: string;
  companyName?: string;
}) {
  return <PlannerCore fixedCompanyId={companyId} />;
}
