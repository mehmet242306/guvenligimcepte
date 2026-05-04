"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  PERMISSION_CATEGORIES,
  ALL_PERMISSION_KEYS,
  emptyPermissions,
  countGranted,
  type Permissions,
} from "@/lib/company-share-registry";

/* ── Types ── */
type PermissionTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  permissions: Permissions;
  is_default: boolean;
  sort_order: number;
};

type TeamMemberOption = {
  id: string;
  full_name: string;
  email: string;
  title: string | null;
};

type WorkspaceInvitation = {
  id: string;
  invitee_email: string;
  invitee_name: string | null;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  invited_at: string;
  expires_at: string;
  custom_permissions: Permissions;
  permission_templates: { name: string; icon: string }[] | { name: string; icon: string } | null;
};

type Props = {
  open: boolean;
  companyId: string;
  onClose: () => void;
};

function findCustomTemplate(templates: PermissionTemplate[]): PermissionTemplate | undefined {
  return templates.find((tmpl) => Object.keys(tmpl.permissions ?? {}).length === 0);
}

/* ── Status badge ── */
function StatusBadge({ status }: { status: WorkspaceInvitation["status"] }) {
  const t = useTranslations("companyWorkspace.inviteProfessional.status");
  const map = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    cancelled: "bg-secondary text-muted-foreground",
  };
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${map[status]}`}>
      {t(status)}
    </span>
  );
}

/* ── Main modal ── */
export function InviteProfessionalModal({ open, companyId, onClose }: Props) {
  const t = useTranslations("companyWorkspace.inviteProfessional");
  const tRow = useTranslations("companyWorkspace.organization.memberRow");
  const locale = useLocale();

  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [selectedMemberId, setSelectedMemberId] = useState<string>("manual");
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [message, setMessage] = useState("");
  const [expiryDays, setExpiryDays] = useState<7 | 14 | 30>(7);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [permissions, setPermissions] = useState<Permissions>(() => emptyPermissions());
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    const supabase = createClient();
    if (!supabase) {
      setLoadingData(false);
      return;
    }

    const qTemplates = supabase
      .from("permission_templates")
      .select("id, name, description, icon, permissions, is_default, sort_order")
      .order("sort_order");

    const qMembers = supabase
      .from("team_members")
      .select("id, full_name, email, title")
      .eq("company_workspace_id", companyId)
      .eq("is_active", true)
      .not("email", "is", null)
      .order("full_name");

    const qInvitations = supabase
      .from("workspace_invitations")
      .select("id, invitee_email, invitee_name, status, invited_at, expires_at, custom_permissions, permission_templates(name, icon)")
      .eq("company_workspace_id", companyId)
      .order("invited_at", { ascending: false })
      .limit(20);

    const [{ data: tmpl }, { data: mems }, { data: invs }] = await Promise.all([
      qTemplates,
      qMembers,
      qInvitations,
    ]);

    setTemplates((tmpl as PermissionTemplate[]) ?? []);
    setTeamMembers((mems as TeamMemberOption[]) ?? []);
    setInvitations((invs as WorkspaceInvitation[]) ?? []);

    const expanded: Record<string, boolean> = {};
    for (const cat of PERMISSION_CATEGORIES) expanded[cat.title] = true;
    setExpandedCats(expanded);

    setLoadingData(false);
  }, [companyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) void loadData();
  }, [open, loadData]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleMemberSelect = useCallback((memberId: string) => {
    setSelectedMemberId(memberId);
    if (memberId !== "manual") {
      const row = teamMembers.find((m) => m.id === memberId);
      if (row) {
        setManualEmail(row.email);
        setManualName(row.full_name);
      }
    } else {
      setManualEmail("");
      setManualName("");
    }
  }, [teamMembers]);

  const handleTemplateSelect = useCallback(
    (tmplId: string) => {
      setSelectedTemplateId(tmplId);
      const tmpl = templates.find((x) => x.id === tmplId);
      if (!tmpl) return;
      if (Object.keys(tmpl.permissions ?? {}).length === 0) {
        setPermissions(emptyPermissions());
      } else {
        const merged = emptyPermissions();
        for (const key of ALL_PERMISSION_KEYS) {
          merged[key] = tmpl.permissions[key] === true;
        }
        setPermissions(merged);
      }
    },
    [templates],
  );

  const togglePermission = useCallback(
    (key: string) => {
      setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
      const customTmpl = findCustomTemplate(templates);
      if (customTmpl) setSelectedTemplateId(customTmpl.id);
    },
    [templates],
  );

  const toggleCategory = useCallback(
    (keys: string[], value: boolean) => {
      setPermissions((prev) => {
        const next = { ...prev };
        for (const k of keys) next[k] = value;
        return next;
      });
      const customTmpl = findCustomTemplate(templates);
      if (customTmpl) setSelectedTemplateId(customTmpl.id);
    },
    [templates],
  );

  const cancelInvitation = useCallback(
    async (id: string) => {
      const supabase = createClient();
      if (!supabase) return;
      await supabase.from("workspace_invitations").update({ status: "cancelled" }).eq("id", id);
      void loadData();
    },
    [loadData],
  );

  const handleSubmit = useCallback(async () => {
    const email = manualEmail.trim();
    if (!email) {
      setSaveError(t("emailRequiredError"));
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setSaveError(t("connectionError"));
      return;
    }

    setSaving(true);
    setSaveError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    let inviterId: string | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();
      inviterId = profile?.id ?? null;
    }

    const tmplId = selectedTemplateId || null;
    const selectedMember =
      selectedMemberId !== "manual" ? teamMembers.find((m) => m.id === selectedMemberId) : null;

    const expiresAt = new Date(Date.now() + expiryDays * 86400000).toISOString();

    const { error } = await supabase.from("workspace_invitations").insert({
      company_workspace_id: companyId,
      inviter_id: inviterId,
      invitee_email: email,
      invitee_name: manualName.trim() || selectedMember?.full_name || null,
      team_member_id: selectedMember?.id ?? null,
      permission_template_id: tmplId,
      custom_permissions: permissions,
      message: message.trim() || null,
      expires_at: expiresAt,
    });

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    setSelectedMemberId("manual");
    setManualEmail("");
    setManualName("");
    setMessage("");
    setExpiryDays(7);
    setSelectedTemplateId("");
    setPermissions(emptyPermissions());
    setSaving(false);
    void loadData();
  }, [
    manualEmail,
    manualName,
    selectedMemberId,
    selectedTemplateId,
    permissions,
    companyId,
    teamMembers,
    loadData,
    expiryDays,
    message,
    t,
  ]);

  const grantedCount = countGranted(permissions);

  const fmtShort = useCallback(
    (iso: string) =>
      new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso)),
    [locale],
  );

  if (!open) return null;

  const inp =
    "h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-800 dark:text-white dark:border-slate-600";

  return (
    <div className="fixed inset-0 z-[70] flex flex-col sm:block">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col items-stretch justify-end overflow-hidden sm:block sm:overflow-y-auto sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-professional-title"
          className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl dark:bg-slate-900 sm:mx-auto sm:my-8 sm:max-h-[min(92dvh,920px)] sm:max-w-3xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
            <div>
              <h2 id="invite-professional-title" className="text-base font-semibold text-foreground">
                {t("title")}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("subtitle")}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:p-6">
            <div className="space-y-6">
              {loadingData && (
                <div className="flex items-center justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              )}

              {!loadingData && (
                <>
                  <div className="rounded-xl border border-border bg-secondary/30 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">{t("section1")}</h3>

                    {teamMembers.length > 0 && (
                      <div className="mb-3">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("pickFromTeam")}</label>
                        <select
                          className={`${inp} [&>option]:dark:bg-slate-800 [&>option]:dark:text-white`}
                          value={selectedMemberId}
                          onChange={(e) => handleMemberSelect(e.target.value)}
                        >
                          <option value="manual">{t("manualEntry")}</option>
                          {teamMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.full_name}
                              {m.title ? ` — ${m.title}` : ""} ({m.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("fullName")}</label>
                        <input
                          className={inp}
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          placeholder={t("fullNamePlaceholder")}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("emailRequired")}</label>
                        <input
                          className={inp}
                          type="email"
                          value={manualEmail}
                          onChange={(e) => {
                            setManualEmail(e.target.value);
                            setSelectedMemberId("manual");
                          }}
                          placeholder={t("emailPlaceholder")}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/30 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">{t("section2")}</h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                      {templates.map((tmpl) => {
                        const active = selectedTemplateId === tmpl.id;
                        return (
                          <button
                            key={tmpl.id}
                            type="button"
                            onClick={() => handleTemplateSelect(tmpl.id)}
                            title={tmpl.description}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                              active
                                ? "border-primary bg-primary/10 ring-1 ring-primary"
                                : "border-border bg-card hover:border-primary/40 hover:bg-secondary/60"
                            }`}
                          >
                            <span className="text-xl">{tmpl.icon}</span>
                            <span
                              className={`text-[11px] font-medium leading-tight ${active ? "text-primary" : "text-foreground"}`}
                            >
                              {tmpl.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/30 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">{t("section3")}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          grantedCount > 0
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {t("permissionsSelected", { granted: grantedCount, total: ALL_PERMISSION_KEYS.length })}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {PERMISSION_CATEGORIES.map((cat) => {
                        const catKeys = cat.permissions.map((p) => p.key);
                        const checkedCount = catKeys.filter((k) => permissions[k]).length;
                        const allChecked = checkedCount === catKeys.length;
                        const expanded = expandedCats[cat.title] ?? true;

                        return (
                          <div key={cat.title} className="rounded-lg border border-border bg-card overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2.5">
                              <button
                                type="button"
                                className="flex flex-1 items-center gap-2 text-left"
                                onClick={() => setExpandedCats((p) => ({ ...p, [cat.title]: !expanded }))}
                              >
                                <span className="text-base">{cat.icon}</span>
                                <span className="text-sm font-medium text-foreground">{cat.title}</span>
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({checkedCount}/{catKeys.length})
                                </span>
                                <svg
                                  className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleCategory(catKeys, !allChecked)}
                                className="ml-3 shrink-0 rounded px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-secondary transition-colors"
                              >
                                {allChecked ? t("toggleAllOff") : t("toggleAllOn")}
                              </button>
                            </div>

                            {expanded && (
                              <div className="border-t border-border px-4 py-3 grid gap-2 sm:grid-cols-2">
                                {cat.permissions.map((perm) => (
                                  <label
                                    key={perm.key}
                                    className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-secondary/60 transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={permissions[perm.key] ?? false}
                                      onChange={() => togglePermission(perm.key)}
                                      className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-border accent-primary"
                                    />
                                    <span className="text-xs leading-5 text-foreground">
                                      {perm.label}
                                      {perm.sensitive && (
                                        <span className="ml-1.5 rounded px-1 py-0.5 text-[9px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                          {t("sensitiveTag")}
                                        </span>
                                      )}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/30 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">{t("section4")}</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("validity")}</label>
                        <select
                          className={`${inp} [&>option]:dark:bg-slate-800 [&>option]:dark:text-white`}
                          value={expiryDays}
                          onChange={(e) => setExpiryDays(Number(e.target.value) as 7 | 14 | 30)}
                        >
                          <option value={7}>{t("expiryDays", { days: 7 })}</option>
                          <option value={14}>{t("expiryDays", { days: 14 })}</option>
                          <option value={30}>{t("expiryDays", { days: 30 })}</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("messageLabel")}</label>
                        <textarea
                          className="h-16 w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-slate-800 dark:text-white dark:border-slate-600"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder={t("messagePlaceholder")}
                        />
                      </div>
                    </div>
                  </div>

                  {saveError && (
                    <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                      {saveError}
                    </div>
                  )}

                  {invitations.length > 0 && (
                    <div className="rounded-xl border border-border bg-secondary/30 p-4">
                      <h3 className="mb-3 text-sm font-semibold text-foreground">
                        {t("sentInvitations")}
                        <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {invitations.length}
                        </span>
                      </h3>
                      <div className="space-y-2">
                        {invitations.map((inv) => {
                          const granted = countGranted(inv.custom_permissions);
                          const expired = new Date(inv.expires_at) < new Date();
                          const tmplRow = Array.isArray(inv.permission_templates)
                            ? inv.permission_templates[0]
                            : inv.permission_templates;
                          return (
                            <div key={inv.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {inv.invitee_name && (
                                    <span className="text-xs font-medium text-foreground">{inv.invitee_name}</span>
                                  )}
                                  <span className="text-xs text-muted-foreground truncate">{inv.invitee_email}</span>
                                  <StatusBadge status={expired && inv.status === "pending" ? "cancelled" : inv.status} />
                                  {tmplRow && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {tmplRow.icon} {tmplRow.name}
                                    </span>
                                  )}
                                  {granted > 0 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {tRow("permissionsCount", { count: granted })}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                  {fmtShort(inv.invited_at)}
                                  {expired && inv.status === "pending" && t("expiredSuffix")}
                                </p>
                              </div>
                              {inv.status === "pending" && (
                                <button
                                  type="button"
                                  onClick={() => void cancelInvitation(inv.id)}
                                  className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                                >
                                  {t("cancel")}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {!loadingData ? (
            <div className="shrink-0 border-t border-border bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:bg-slate-900 sm:px-6">
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={saving || !manualEmail.trim()}
                  className="flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60 transition-colors"
                >
                  {saving && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  )}
                  {saving ? t("sending") : t("send")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
