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
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
      <h3 className="text-base font-semibold text-slate-950">Firma yönetim işlemleri</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        Arşivleme ve silme farklı işlemlerdir. Arşivleme geçmiş veriyi korur,
        silme ise hatalı/test/gereksiz kaydı kaldırmak için yıkıcı bir işlemdir.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Firmayı Arşivle</p>
          <p className="mt-2 text-sm leading-7 text-amber-700">
            Aktif çalışma ilişkisi sona erdiğinde firmayı arşive alabilirsiniz.
            Geçmiş kayıtlar korunur ve firma aktif listeden ayrılır.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => setArchiveOpen(true)}
          >
            Arşivleme Onayı Aç
          </Button>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">Firmayı Sil</p>
          <p className="mt-2 text-sm leading-7 text-red-700">
            Hatalı, test veya gereksiz kayıtlar için kullanılır. Bu işlem yıkıcıdır
            ve geri alma stratejisi phase 2 kuralları ile netleştirilecektir.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
            onClick={() => setDeleteOpen(true)}
          >
            Silme Onayı Aç
          </Button>
        </div>
      </div>

      {archiveOpen ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-950">
            “{companyName}” arşive alınsın mı?
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Bu işlem firmayı aktif çalışma listesinden ayırır, geçmiş verileri
            korur ve daha sonra tekrar açma/senkronizasyon phase 2’de bağlanır.
          </p>
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="outline" onClick={() => setArchiveOpen(false)}>
              Vazgeç
            </Button>
            <Button
              type="button"
              onClick={() => {
                onArchiveConfirm();
                setArchiveOpen(false);
              }}
            >
              Arşivlemeyi Onayla
            </Button>
          </div>
        </div>
      ) : null}

      {deleteOpen ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-950">
            “{companyName}” kaydını silme onayı
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Onay için aşağıya <span className="font-semibold">SİL</span> yazın.
            Bu işlem arşivlemeden farklıdır ve yıkıcı işlem kategorisindedir.
          </p>

          <input
            value={deleteText}
            onChange={(event) => setDeleteText(event.target.value)}
            placeholder='Onay için "SİL" yazın'
            className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900"
          />

          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteText("");
              }}
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
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
      ) : null}
    </div>
  );
}
