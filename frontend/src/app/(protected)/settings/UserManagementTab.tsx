"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { hasAccountTypeAccess } from "@/lib/account/account-type-access";
import { formatDateTime } from "./admin-monitoring-utils";

type AdminUserRow = {
  user_profile_id: string;
  auth_user_id: string;
  full_name: string | null;
  email: string | null;
  organization_id: string | null;
  organization_name: string | null;
  role_codes: string[];
  effective_role: string;
  is_active: boolean;
  allowed_account_types: Array<"individual" | "osgb" | "enterprise">;
  last_sign_in_at: string | null;
  created_at: string | null;
  mfa_enabled: boolean;
  failed_attempts: number;
  locked_until: string | null;
  last_failed_at: string | null;
  last_activity_at: string | null;
  last_activity_event: string | null;
};

const ACCOUNT_TYPE_ACCESS_OPTIONS = [
  {
    key: "osgb" as const,
    title: "OSGB",
    description: "Firma, ekip, gorevlendirme ve operasyon panellerini acar.",
    enableLabel: "OSGB erisimini ac",
    disableLabel: "OSGB erisimini kapat",
    enabledFeedback: "OSGB erisimi acildi.",
    disabledFeedback: "OSGB erisimi kapatildi.",
  },
  {
    key: "enterprise" as const,
    title: "Kurumsal",
    description: "Kurumsal onboarding ve iletisim odakli akislarini acar.",
    enableLabel: "Kurumsal erisimi ac",
    disableLabel: "Kurumsal erisimi kapat",
    enabledFeedback: "Kurumsal erisim acildi.",
    disabledFeedback: "Kurumsal erisim kapatildi.",
  },
] as const;

export function UserManagementTab({
  onNavigateRoleManagement,
}: {
  onNavigateRoleManagement: () => void;
}) {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  async function load() {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setRows([]);
      setError((payload as { error?: string }).error ?? "Kullanici verileri alinamadi.");
    } else {
      setRows(((payload as { items?: AdminUserRow[] }).items ?? []) as AdminUserRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredRows = useMemo(() => {
    if (!deferredQuery) return rows;

    return rows.filter((row) =>
      [
        row.full_name ?? "",
        row.email ?? "",
        row.organization_name ?? "",
        row.effective_role ?? "",
        row.last_activity_event ?? "",
        ...(row.role_codes ?? []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(deferredQuery),
    );
  }, [deferredQuery, rows]);

  async function runAction(profileId: string, body: Record<string, unknown>, successMessage: string) {
    try {
      setBusyAction(`${profileId}:${String(body.action)}:${String(body.accountType ?? "")}`);
      setError(null);
      setFeedback(null);

      const response = await fetch(`/api/admin/users/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? "Kullanici islemi basarisiz.");
      }

      setFeedback(successMessage);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Bilinmeyen hata");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Kullanici Yonetimi</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Aktiflik durumu, parola sifirlama, MFA takibi ve lockout mudahalelerini bu ekrandan yonetin.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateRoleManagement}
            className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
          >
            Rol yonetimine git
          </button>
        </div>

        <div className="mt-5">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Kullanici, e-posta, organizasyon veya rol ara"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        )}

        {feedback && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            {feedback}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Kullanici verileri yukleniyor...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Eslesen kullanici bulunamadi.
            </div>
          ) : (
            filteredRows.map((row) => (
              <article key={row.user_profile_id} className="rounded-2xl border border-border bg-background/80 p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        {row.full_name || row.email || "Adsiz kullanici"}
                      </h4>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        {row.effective_role}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          row.is_active
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        }`}
                      >
                        {row.is_active ? "Aktif" : "Pasif"}
                      </span>
                      {row.locked_until && (
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                          Kilitli
                        </span>
                      )}
                      {row.mfa_enabled && (
                        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                          MFA acik
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">{row.email || "E-posta yok"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {row.organization_name || "Organizasyon yok"} - Son aktivite{" "}
                      {row.last_activity_at ? formatDateTime(row.last_activity_at) : "-"}
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                      <div className="rounded-xl border border-border/70 bg-card px-3 py-2">
                        Son giris: <span className="font-medium text-foreground">{formatDateTime(row.last_sign_in_at)}</span>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-card px-3 py-2">
                        Basarisiz deneme: <span className="font-medium text-foreground">{row.failed_attempts}</span>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-card px-3 py-2">
                        Kilit bitisi: <span className="font-medium text-foreground">{formatDateTime(row.locked_until)}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        Bireysel acik
                      </span>
                      <span className="rounded-full bg-background px-2.5 py-1 font-medium text-muted-foreground">
                        Ek hesap tipleri sag panelden yonetilir
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 xl:w-[420px]">
                    <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card to-card p-4 shadow-[var(--shadow-soft)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                            Hesap Tipi Erisimi
                          </p>
                          <h5 className="mt-1 text-sm font-semibold text-foreground">
                            OSGB ve Kurumsal seceneklerini buradan yonet
                          </h5>
                          <p className="mt-1 text-xs leading-6 text-muted-foreground">
                            Bireysel akis her zaman acik kalir. OSGB ve kurumsal onboarding yalnizca burada verilen
                            izinlerle aktiflesir.
                          </p>
                        </div>
                        <span className="rounded-full border border-primary/20 bg-background/80 px-2.5 py-1 text-[11px] font-semibold text-primary">
                          Temel kural
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3">
                        {ACCOUNT_TYPE_ACCESS_OPTIONS.map((option) => {
                          const enabled = hasAccountTypeAccess(row.allowed_account_types, option.key);
                          const actionKey = `${row.user_profile_id}:set_account_type_access:${option.key}`;

                          return (
                            <div
                              key={option.key}
                              className={`rounded-2xl border px-4 py-3 transition ${
                                enabled
                                  ? "border-sky-200 bg-sky-50/80 dark:border-sky-900/40 dark:bg-sky-950/20"
                                  : "border-border bg-background/80"
                              }`}
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h6 className="text-sm font-semibold text-foreground">{option.title}</h6>
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                        enabled
                                          ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                                          : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      {enabled ? "Yetki acik" : "Yetki kapali"}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs leading-6 text-muted-foreground">{option.description}</p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void runAction(
                                      row.user_profile_id,
                                      {
                                        action: "set_account_type_access",
                                        accountType: option.key,
                                        enabled: !enabled,
                                      },
                                      enabled ? option.disabledFeedback : option.enabledFeedback,
                                    )
                                  }
                                  disabled={busyAction === actionKey}
                                  className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {enabled ? option.disableLabel : option.enableLabel}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(
                            row.user_profile_id,
                            { action: "toggle_active", isActive: !row.is_active },
                            row.is_active ? "Kullanici pasife alindi." : "Kullanici yeniden aktif edildi.",
                          )
                        }
                        disabled={busyAction === `${row.user_profile_id}:toggle_active:`}
                        className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {row.is_active ? "Kullaniciyi devre disi birak" : "Kullaniciyi aktif et"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(
                            row.user_profile_id,
                            { action: "send_password_reset" },
                            "Parola sifirlama e-postasi gonderildi.",
                          )
                        }
                        disabled={busyAction === `${row.user_profile_id}:send_password_reset:`}
                        className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Sifre sifirla
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(
                            row.user_profile_id,
                            { action: "unlock_account" },
                            "Kilitli hesap bilgisi temizlendi.",
                          )
                        }
                        disabled={busyAction === `${row.user_profile_id}:unlock_account:`}
                        className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Hesap kilidini temizle
                      </button>
                      <button
                        type="button"
                        onClick={onNavigateRoleManagement}
                        className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
                      >
                        Rol duzenle
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
