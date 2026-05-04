import type { useTranslations } from "next-intl";
import type { RunStartIssue } from "@/lib/supabase/inspection-api";

export type FieldInspectionTranslator = ReturnType<typeof useTranslations<"fieldInspection">>;

export function formatRunStartIssue(issue: RunStartIssue, t: FieldInspectionTranslator): string {
  switch (issue.key) {
    case "noSession":
      return t("errors.noSession");
    case "templateNotFound":
      return t("errors.templateNotFound");
    case "quotaExceeded":
      return t("errors.quotaExceeded", {
        used: issue.used ?? "—",
        limit: issue.limit ?? "—",
      });
    case "quotaCheckFailed":
      return t("errors.quotaCheckFailed");
    case "runInsertFailed":
      return t("errors.runInsertFailed");
    case "invalidServerResponse":
      return t("errors.invalidServerResponse");
    case "generic":
      return issue.detail ? t("errors.generic", { detail: issue.detail }) : t("errors.genericUnknown");
    default:
      return t("errors.genericUnknown");
  }
}
