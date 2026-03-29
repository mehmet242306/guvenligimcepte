import type { Metadata } from "next";
import PlannerClient from "./PlannerClient";

export const metadata: Metadata = {
  title: "İSG Planlayıcı | RiskNova",
};

export default function PlannerPage() {
  return <PlannerClient />;
}
