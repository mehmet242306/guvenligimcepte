"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  COMPANY_SHARE_MODULES,
  createDefaultCompanySharePermissions,
  type CompanyPermissionLevel,
} from "@/lib/company-share-registry";

type InviteProfessionalModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    email: string;
    permissions: Record<string, CompanyPermissionLevel>;
  }) => void;
};

export function InviteProfessionalModal({
  open,
  onClose,
  onSubmit,
}: InviteProfessionalModalProps) {
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState<Record<string, CompanyPermissionLevel>>(
    () => createDefaultCompanySharePermissions(),
  );

  const groupedModules = useMemo(() => {
    const sorted = [...COMPANY_SHARE_MODULES].sort((a, b) => a.order - b.order);
    const groups = new Map<string, typeof sorted>();
    for (const shareModule of sorted) {
      const list = groups.get(shareModule.group) ?? [];
      list.push(shareModule);
      groups.set(shareModule.group, list);
    }
    return Array.from(groups.entries()).map(([group, modules]) => ({
      group,
      modules,
    }));
  }, []);

  function handleClose() {
    onClose();
  }

  function handleSubmit() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) return;
    onSubmit({
      email: normalizedEmail,
      permissions,
    });
    setEmail("");
    setPermissions(createDefaultCompanySharePermissions());
  }

  function setLevel(moduleKey: string, level: CompanyPermissionLevel) {
    setPermissions((prev) => ({
      ...prev,
      [moduleKey]: level,
    }));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Profesyonel davet et ve paylaşım ayarla
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Davet göndermeden önce, davet edilen profesyonelin hangi modülleri
              hangi seviyede göreceğini belirleyin.
            </p>
          </div>

          <Button type="button" variant="outline" onClick={handleClose}>
            Kapat
          </Button>
        </div>

        <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
          <label className="text-sm font-medium text-slate-900">
            Davet edilecek profesyonelin e-posta adresi
          </label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ornek@alanadi.com"
            className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-[0_4px_16px_rgba(15,23,42,0.04)]"
          />
        </div>

        <div className="mt-5 space-y-4">
          {groupedModules.map((group) => (
            <div
              key={group.group}
              className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4"
            >
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">
                {group.group}
              </h3>

              <div className="mt-3 space-y-3">
                {group.modules.map((module) => (
                  <div
                    key={module.key}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-950">
                          {module.label}
                        </p>
                        <p className="text-sm leading-7 text-slate-600">
                          {module.description}
                        </p>
                      </div>

                      <select
                        value={permissions[module.key] ?? "none"}
                        onChange={(event) =>
                          setLevel(
                            module.key,
                            event.target.value as CompanyPermissionLevel,
                          )
                        }
                        className="h-10 min-w-[160px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                      >
                        <option value="none">Erişim Yok</option>
                        <option value="read">Görüntüleyebilir</option>
                        <option value="write">Düzenleyebilir</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={handleClose}>
            İptal
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!email.trim()}>
            Daveti ve paylaşım tercihlerini hazırla
          </Button>
        </div>
      </div>
    </div>
  );
}
