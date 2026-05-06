"use client";

import { useLiveFieldScanAccess } from "@/lib/hooks/use-live-field-scan-access";
import { LiveScanClient } from "./LiveScanClient";
import { useTranslations } from "next-intl";

export function LiveScanAccessGate() {
  const t = useTranslations("liveScan.access");
  const allowed = useLiveFieldScanAccess();

  if (allowed === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8 text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("body")}</p>
      </div>
    );
  }

  return <LiveScanClient />;
}
