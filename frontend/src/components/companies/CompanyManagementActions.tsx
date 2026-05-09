"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Archive, Settings, Trash2 } from "lucide-react";
import { useLocale } from "next-intl";
import { PremiumIconBadge } from "@/components/ui/premium-icon-badge";

type CompanyManagementActionsProps = {
  companyName: string;
  onArchiveConfirm: () => void;
  onDeleteConfirm: () => void;
};

export function CompanyManagementActions({
  companyName,
  onArchiveConfirm,
  onDeleteConfirm,
}: CompanyManagementActionsProps) {
  const locale = useLocale();
  const isTr = locale === "tr";
  const deleteKeyword = isTr ? "SIL" : "DELETE";
  const copy = {
    title: isTr ? "Firma Yonetim Islemleri" : "Company management actions",
    subtitle: isTr ? "Arsivleme veya silme islemleri" : "Archive or delete actions",
    warning: isTr
      ? "Arsivleme gecmis veriyi korur. Silme ise hatali/test kayitlar icin yikici bir islemdir."
      : "Archiving keeps historical data. Delete is destructive and should only be used for incorrect or test records.",
    archiveTitle: isTr ? "Firmayi Arsivle" : "Archive company",
    archiveDescription: isTr
      ? "Aktif calisma iliskisi sona erdiginde arsive alabilirsiniz."
      : "Use this when the active working relationship has ended.",
    archiveAction: isTr ? "Arsivleme Onayi" : "Confirm archive",
    deleteTitle: isTr ? "Firmayi Sil" : "Delete company",
    deleteDescription: isTr
      ? "Hatali, test veya gereksiz kayitlar icin kullanilir."
      : "Use this for incorrect, test, or unnecessary records.",
    deleteAction: isTr ? "Silme Onayi" : "Confirm delete",
    archiveQuestion: isTr ? "arsive alinsin mi?" : "be archived?",
    archiveQuestionPrefix: isTr ? "" : "Should",
    archiveConfirmText: isTr
      ? "Bu islem firmayi aktif calisma listesinden ayirir, gecmis verileri korur."
      : "This removes the company from active work lists while preserving historical data.",
    cancel: isTr ? "Vazgec" : "Cancel",
    archiveConfirm: isTr ? "Arsivlemeyi Onayla" : "Archive",
    deleteConfirmTitle: isTr ? "kaydini silme onayi" : "delete confirmation",
    deleteInstruction: isTr
      ? `Onay icin asagiya ${deleteKeyword} yazin.`
      : `Type ${deleteKeyword} below to confirm.`,
    deletePlaceholder: isTr ? `Onay icin "${deleteKeyword}" yazin` : `Type "${deleteKeyword}" to confirm`,
    deleteConfirm: isTr ? "Silmeyi Onayla" : "Delete",
  };
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const canDelete = useMemo(
    () => deleteText.trim().toLocaleUpperCase("tr-TR") === deleteKeyword,
    [deleteKeyword, deleteText],
  );

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <PremiumIconBadge icon={Settings} tone="neutral" size="sm" />
        <div>
          <h3 className="text-sm font-bold text-foreground">{copy.title}</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{copy.subtitle}</p>
        </div>
      </div>

      <p className="mt-3 rounded-xl border border-border/40 bg-secondary/30 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
        {copy.warning}
      </p>

      <div className="mt-3 grid gap-3">
        <div className="overflow-hidden rounded-[1.25rem] border border-amber-400/40 bg-gradient-to-br from-amber-500/8 to-transparent p-4 shadow-sm transition-all hover:border-amber-400/60 hover:shadow-md dark:from-amber-500/12">
          <div className="flex items-start gap-3">
            <PremiumIconBadge icon={Archive} tone="amber" size="xs" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">{copy.archiveTitle}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{copy.archiveDescription}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setArchiveOpen(true)}
            className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-amber-600 hover:shadow-md"
          >
            <Archive size={14} strokeWidth={2.5} /> {copy.archiveAction}
          </button>
        </div>

        <div className="overflow-hidden rounded-[1.25rem] border border-red-400/40 bg-gradient-to-br from-red-500/8 to-transparent p-4 shadow-sm transition-all hover:border-red-400/60 hover:shadow-md dark:from-red-500/12">
          <div className="flex items-start gap-3">
            <PremiumIconBadge icon={Trash2} tone="danger" size="xs" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">{copy.deleteTitle}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{copy.deleteDescription}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-red-600 hover:shadow-md"
          >
            <Trash2 size={14} strokeWidth={2.5} /> {copy.deleteAction}
          </button>
        </div>
      </div>

      {archiveOpen && (
        <div className="mt-3 overflow-hidden rounded-[1.25rem] border-2 border-amber-400/50 bg-amber-50/50 p-4 dark:bg-amber-950/20">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">
                {isTr ? `"${companyName}" ${copy.archiveQuestion}` : `${copy.archiveQuestionPrefix} "${companyName}" ${copy.archiveQuestion}`}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{copy.archiveConfirmText}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setArchiveOpen(false)}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-secondary"
            >
              {copy.cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                onArchiveConfirm();
                setArchiveOpen(false);
              }}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-xl bg-amber-500 px-3 text-xs font-bold text-white shadow-sm hover:bg-amber-600"
            >
              {copy.archiveConfirm}
            </button>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="mt-3 overflow-hidden rounded-[1.25rem] border-2 border-red-400/50 bg-red-50/50 p-4 dark:bg-red-950/20">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">
                "{companyName}" {copy.deleteConfirmTitle}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{copy.deleteInstruction}</p>
            </div>
          </div>

          <input
            value={deleteText}
            onChange={(event) => setDeleteText(event.target.value)}
            placeholder={copy.deletePlaceholder}
            className="mt-3 h-10 w-full rounded-xl border-2 border-red-300/60 bg-card px-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:border-red-500 focus:outline-none"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteText("");
              }}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-secondary"
            >
              {copy.cancel}
            </button>
            <button
              type="button"
              disabled={!canDelete}
              onClick={() => {
                onDeleteConfirm();
                setDeleteOpen(false);
                setDeleteText("");
              }}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-xl bg-red-500 px-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copy.deleteConfirm}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
