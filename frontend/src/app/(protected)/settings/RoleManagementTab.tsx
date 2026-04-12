"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RoleMatrixRow = {
  role_code: string;
  role_name: string;
  permission_codes: string[];
  permission_count: number;
};

type RoleUserRow = {
  user_profile_id: string;
  auth_user_id: string;
  full_name: string | null;
  email: string | null;
  organization_id: string | null;
  organization_name: string | null;
  role_codes: string[];
  effective_role: string;
  is_active: boolean;
};

const roleOptions = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "inspector", label: "Inspector" },
  { value: "viewer", label: "Viewer" },
];

function roleLabel(roleCode: string) {
  const match = roleOptions.find((option) => option.value === roleCode);
  return match?.label ?? roleCode;
}

export function RoleManagementTab() {
  const [users, setUsers] = useState<RoleUserRow[]>([]);
  const [matrix, setMatrix] = useState<RoleMatrixRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      setError("Supabase baglantisi kurulamadi.");
      return;
    }

    setLoading(true);
    setError(null);

    const [{ data: usersData, error: usersError }, { data: matrixData, error: matrixError }] =
      await Promise.all([
        supabase.rpc("list_role_management_users"),
        supabase.rpc("list_role_management_matrix"),
      ]);

    if (usersError || matrixError) {
      setUsers([]);
      setMatrix([]);
      setError(usersError?.message || matrixError?.message || "Rol verileri yuklenemedi.");
      setLoading(false);
      return;
    }

    setUsers((usersData ?? []) as RoleUserRow[]);
    setMatrix((matrixData ?? []) as RoleMatrixRow[]);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleRoleChange(userProfileId: string, nextRole: string) {
    const supabase = createClient();
    if (!supabase) {
      setError("Rol guncelleme servisine baglanilamadi.");
      return;
    }

    setSavingUserId(userProfileId);
    setError(null);
    setFeedback(null);

    const { error: rpcError } = await supabase.rpc("set_user_access_role", {
      p_user_profile_id: userProfileId,
      p_role_code: nextRole,
    });

    if (rpcError) {
      setError(rpcError.message);
      setSavingUserId(null);
      return;
    }

    setFeedback("Rol guncellendi.");
    await load();
    setSavingUserId(null);
  }

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;

    return users.filter((user) =>
      [
        user.full_name ?? "",
        user.email ?? "",
        user.organization_name ?? "",
        user.effective_role ?? "",
        ...(user.role_codes ?? []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, users]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Rol ve Yetki Yonetimi</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Kullanicilarin uygulama rolunu yonetin. Bu atamalar yetki matrisine ve guvenlik event akisine baglidir.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
            {matrix.map((item) => (
              <div key={item.role_code} className="rounded-xl border border-border bg-background px-3 py-2 text-muted-foreground">
                <div>{item.role_name}</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{item.permission_count}</div>
                <div className="text-[11px]">{item.permission_codes.slice(0, 2).join(", ") || "Yetki yok"}</div>
              </div>
            ))}
          </div>
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
              Rol yonetim verileri yukleniyor...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Eslesen kullanici bulunamadi.
            </div>
          ) : (
            filteredUsers.map((user) => (
              <article key={user.user_profile_id} className="rounded-2xl border border-border bg-background/80 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        {user.full_name || user.email || "Adsiz kullanici"}
                      </h4>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        {roleLabel(user.effective_role)}
                      </span>
                      {!user.is_active && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          Pasif
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {user.email || "E-posta yok"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {user.organization_name || "Organizasyon bilgisi yok"}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(user.role_codes ?? []).map((roleCode) => (
                        <span
                          key={`${user.user_profile_id}-${roleCode}`}
                          className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground"
                        >
                          {roleCode}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      value={user.effective_role}
                      disabled={savingUserId === user.user_profile_id}
                      onChange={(event) => void handleRoleChange(user.user_profile_id, event.target.value)}
                      className="min-w-[180px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {savingUserId === user.user_profile_id && (
                      <span className="text-xs text-muted-foreground">Kaydediliyor...</span>
                    )}
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
