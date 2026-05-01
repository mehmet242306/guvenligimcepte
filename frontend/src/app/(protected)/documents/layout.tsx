import type { ReactNode } from "react";
import { TurkeyOnlyLayoutGate } from "@/components/workspace/turkey-only-layout-gate";

export default function DocumentsLayout({ children }: { children: ReactNode }) {
  return <TurkeyOnlyLayoutGate>{children}</TurkeyOnlyLayoutGate>;
}
