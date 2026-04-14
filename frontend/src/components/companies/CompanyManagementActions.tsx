"use client";

import { useMemo, useState } from "react";
import { Settings, Archive, Trash2, AlertTriangle } from "lucide-react";
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
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const canDelete = useMemo(() => deleteText.trim() === "SİL", [deleteText]);

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <PremiumIconBadge icon={Settings} tone="neutral" size="sm" />
        <div>
          <h3 className="text-sm font-bold text-foreground">Firma Yönetim İşlemleri</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Arşivleme veya silme işlemleri</p>
        </div>
      </div>

      <p className="mt-3 rounded-xl border border-border/40 bg-secondary/30 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
        Arşivleme geçmiş veriyi korur. Silme ise hatalı/test kayıtlar için yıkıcı bir işlemdir.
      </p>

      <div className="mt-3 grid gap-3">
        {/* Archive box */}
        <div className="overflow-hidden rounded-[1.25rem] border border-amber-400/40 bg-gradient-to-br from-amber-500/8 to-transparent p-4 shadow-sm transition-all hover:border-amber-400/60 hover:shadow-md dark:from-amber-500/12">
          <div className="flex items-start gap-3">
            <PremiumIconBadge icon={Archive} tone="amber" size="xs" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">Firmayı Arşivle</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Aktif çalışma ilişkisi sona erdiğinde arşive alabilirsiniz.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setArchiveOpen(true)}
            className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-amber-600 hover:shadow-md"
          >
            <Archive size={14} strokeWidth={2.5} /> Arşivleme Onayı
          </button>
        </div>

        {/* Delete box */}
        <div className="overflow-hidden rounded-[1.25rem] border border-red-400/40 bg-gradient-to-br from-red-500/8 to-transparent p-4 shadow-sm transition-all hover:border-red-400/60 hover:shadow-md dark:from-red-500/12">
          <div className="flex items-start gap-3">
            <PremiumIconBadge icon={Trash2} tone="danger" size="xs" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">Firmayı Sil</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Hatalı, test veya gereksiz kayıtlar için kullanılır.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-red-600 hover:shadow-md"
          >
            <Trash2 size={14} strokeWidth={2.5} /> Silme Onayı
          </button>
        </div>
      </div>

      {archiveOpen && (
        <div className="mt-3 overflow-hidden rounded-[1.25rem] border-2 border-amber-400/50 bg-amber-50/50 p-4 dark:bg-amber-950/20">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">
                &ldquo;{companyName}&rdquo; arşive alınsın mı?
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Bu işlem firmayı aktif çalışma listesinden ayırır, geçmiş verileri korur.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setArchiveOpen(false)}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-secondary"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={() => { onArchiveConfirm(); setArchiveOpen(false); }}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-xl bg-amber-500 px-3 text-xs font-bold text-white shadow-sm hover:bg-amber-600"
            >
              Arşivlemeyi Onayla
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
                &ldquo;{companyName}&rdquo; kaydını silme onayı
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Onay için aşağıya <span className="font-bold text-red-600 dark:text-red-400">SİL</span> yazın.
              </p>
            </div>
          </div>

          <input
            value={deleteText}
            onChange={(event) => setDeleteText(event.target.value)}
            placeholder='Onay için "SİL" yazın'
            className="mt-3 h-10 w-full rounded-xl border-2 border-red-300/60 bg-card px-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:border-red-500 focus:outline-none"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setDeleteOpen(false); setDeleteText(""); }}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-secondary"
            >
              Vazgeç
            </button>
            <button
              type="button"
              disabled={!canDelete}
              onClick={() => { onDeleteConfirm(); setDeleteOpen(false); setDeleteText(""); }}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-xl bg-red-500 px-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Silmeyi Onayla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
