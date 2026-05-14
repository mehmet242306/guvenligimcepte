"use client";

import type { ReactNode } from "react";
import { AccessibilityProvider } from "@/components/accessibility/accessibility-context";
import { AccessibilityDock } from "@/components/accessibility/accessibility-dock";

export function AccessibilityAppShell({ children }: { children: ReactNode }) {
  return (
    <AccessibilityProvider>
      {children}
      <AccessibilityDock />
    </AccessibilityProvider>
  );
}
