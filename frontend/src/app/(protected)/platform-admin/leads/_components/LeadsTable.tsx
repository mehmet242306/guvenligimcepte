"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Copy, Mail, Phone } from "lucide-react";
import { STATUS_LABELS, STATUS_OPTIONS, type LeadRow, type LeadStatus } from "./types";

type Props = {
  leads: LeadRow[];
};

const STATUS_TONE: Record<LeadStatus, string> = {
  new: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100",
  contacted:
    "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-100",
  qualified:
    "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-100",
  converted:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100",
  rejected:
    "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-100",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function sourceLabel(s: string | null): string {
  if (!s) return "—";
  const map: Record<string, string> = {
    landing_demo: "Landing Demo",
    register: "Kayıt Formu",
    unknown: "Bilinmiyor",
  };
  return map[s] ?? s;
}

export function LeadsTable({ leads }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  async function updateStatus(id: string, status: LeadStatus) {
    setSavingId(id);
    setErrorById((prev) => ({ ...prev, [id]: "" }));
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text.slice(0, 200) || `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setErrorById((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : "Güncellenemedi",
      }));
    } finally {
      setSavingId(null);
    }
  }

  function copy(text: string) {
    if (typeof navigator === "undefined") return;
    void navigator.clipboard.writeText(text);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 w-8"></th>
              <th className="px-3 py-2.5">İletişim</th>
              <th className="px-3 py-2.5">Firma</th>
              <th className="px-3 py-2.5">Kaynak / Tip</th>
              <th className="px-3 py-2.5">Tarih</th>
              <th className="px-3 py-2.5">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.map((lead) => {
              const isOpen = expanded === lead.id;
              return (
                <Fragment key={lead.id}>
                  <tr
                    className="cursor-pointer transition hover:bg-muted/20"
                    onClick={() => setExpanded(isOpen ? null : lead.id)}
                  >
                    <td className="px-3 py-3 align-top text-muted-foreground">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className="font-medium text-foreground">{lead.contact_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
                      {lead.phone ? (
                        <p className="text-xs text-muted-foreground">{lead.phone}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className="truncate text-foreground" title={lead.company_name ?? ""}>
                        {lead.company_name || "—"}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className="text-xs text-foreground">{sourceLabel(lead.source_page)}</p>
                      {lead.requested_account_type ? (
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {lead.requested_account_type}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 align-top text-xs text-muted-foreground">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-3 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                        disabled={savingId === lead.id}
                        className={`rounded-lg border px-2 py-1 text-xs font-medium ${STATUS_TONE[lead.status]}`}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {errorById[lead.id] ? (
                        <p className="mt-1 text-[10px] text-red-600">{errorById[lead.id]}</p>
                      ) : null}
                    </td>
                  </tr>

                  {isOpen ? (
                    <tr className="bg-muted/10">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <DetailField label="Ad Soyad" value={lead.contact_name} />
                          <DetailField
                            label="E-posta"
                            value={lead.email}
                            actions={
                              <>
                                <IconLink href={`mailto:${lead.email}`} title="E-posta gönder">
                                  <Mail className="h-3.5 w-3.5" />
                                </IconLink>
                                <IconButton onClick={() => copy(lead.email)} title="Kopyala">
                                  <Copy className="h-3.5 w-3.5" />
                                </IconButton>
                              </>
                            }
                          />
                          {lead.phone ? (
                            <DetailField
                              label="Telefon"
                              value={lead.phone}
                              actions={
                                <>
                                  <IconLink href={`tel:${lead.phone}`} title="Ara">
                                    <Phone className="h-3.5 w-3.5" />
                                  </IconLink>
                                  <IconButton onClick={() => copy(lead.phone ?? "")} title="Kopyala">
                                    <Copy className="h-3.5 w-3.5" />
                                  </IconButton>
                                </>
                              }
                            />
                          ) : null}
                          <DetailField label="Firma" value={lead.company_name} />
                          <DetailField
                            label="Talep tipi"
                            value={lead.requested_account_type}
                          />
                          <DetailField label="Kaynak" value={sourceLabel(lead.source_page)} />

                          {lead.estimated_company_count !== null ? (
                            <DetailField
                              label="Tahmini firma"
                              value={String(lead.estimated_company_count)}
                            />
                          ) : null}
                          {lead.estimated_employee_count !== null ? (
                            <DetailField
                              label="Tahmini çalışan"
                              value={String(lead.estimated_employee_count)}
                            />
                          ) : null}
                          {lead.estimated_location_count !== null ? (
                            <DetailField
                              label="Tahmini lokasyon"
                              value={String(lead.estimated_location_count)}
                            />
                          ) : null}
                          {lead.estimated_professional_count !== null ? (
                            <DetailField
                              label="Tahmini uzman"
                              value={String(lead.estimated_professional_count)}
                            />
                          ) : null}
                        </div>

                        {lead.message ? (
                          <div className="mt-4">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Mesaj
                            </p>
                            <p className="whitespace-pre-wrap rounded-xl border border-border bg-background p-3 text-sm leading-6 text-foreground">
                              {lead.message}
                            </p>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  actions,
}: {
  label: string;
  value: string | null | undefined;
  actions?: React.ReactNode;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5 flex items-center gap-1.5">
        <p className="text-sm text-foreground">{value}</p>
        {actions ? <span className="flex gap-1">{actions}</span> : null}
      </div>
    </div>
  );
}

function IconLink({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      title={title}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {children}
    </a>
  );
}

function IconButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}
