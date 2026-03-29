"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

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
    <div className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
      <h3 className="text-sm font-semibold text-foreground">Firma yönetim işlemleri</h3>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
        Arşivleme ve silme farklı işlemlerdir. Arşivleme geçmiş veriyi korur,
        silme ise hatalı/test/gereksiz kaydı kaldırmak için yıkıcı bir işlemdir.
      </p>

      <div className="mt-3 grid gap-2">
        {/* Archive box */}
        <div className="overflow-hidden rounded-lg border border-warning/30 bg-warning/5 p-3">
          <p className="text-xs font-semibold text-foreground">Firmayı Arşivle</p>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Aktif çalışma ilişkisi sona erdiğinde firmayı arşive alabilirsiniz.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => setArchiveOpen(true)}
          >
            Arşivleme Onayı
          </Button>
        </div>

        {/* Delete box */}
        <div className="overflow-hidden rounded-lg border border-danger/30 bg-danger/5 p-3">
          <p className="text-xs font-semibold text-foreground">Firmayı Sil</p>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Hatalı, test veya gereksiz kayıtlar için kullanılır. Bu işlem yıkıcıdır.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 border-danger/30 text-danger hover:bg-danger/10"
            onClick={() => setDeleteOpen(true)}
          >
            Silme Onayı
          </Button>
        </div>
      </div>

      {archiveOpen && (
        <div className="mt-3 overflow-hidden rounded-lg border border-warning/30 bg-card p-3">
          <p className="text-xs font-semibold text-foreground">
            &ldquo;{companyName}&rdquo; arşive alınsın mı?
          </p>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Bu işlem firmayı aktif çalışma listesinden ayırır, geçmiş verileri korur.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setArchiveOpen(false)}>
              Vazgeç
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onArchiveConfirm();
                setArchiveOpen(false);
              }}
            >
              Arşivlemeyi Onayla
            </Button>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="mt-3 overflow-hidden rounded-lg border border-danger/30 bg-card p-3">
          <p className="text-xs font-semibold text-foreground">
            &ldquo;{companyName}&rdquo; kaydını silme onayı
          </p>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Onay için aşağıya <span className="font-semibold">SİL</span> yazın.
          </p>

          <input
            value={deleteText}
            onChange={(event) => setDeleteText(event.target.value)}
            placeholder='Onay için "SİL" yazın'
            className="mt-2 h-8 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground placeholder:text-muted-foreground/60"
          />

          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteText("");
              }}
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={!canDelete}
              onClick={() => {
                onDeleteConfirm();
                setDeleteOpen(false);
                setDeleteText("");
              }}
            >
              Silmeyi Onayla
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
