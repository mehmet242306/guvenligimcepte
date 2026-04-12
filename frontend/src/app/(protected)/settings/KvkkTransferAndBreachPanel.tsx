"use client";

import { useEffect, useEffectEvent, useState } from "react";
import {
  listBreachIncidents,
  listBreachNotificationTemplates,
  listInternationalTransfers,
  listMaskingEvents,
  saveBreachIncident,
  saveBreachNotificationTemplate,
  type BreachIncidentRow,
  type BreachNotificationTemplateRow,
  type InternationalTransferRow,
  type MaskingEventRow,
} from "@/lib/supabase/privacy-api";

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

type TemplateFormState = {
  id: string;
  title: string;
  notificationWindowHours: number;
  summary: string;
  authorityTemplate: string;
  customerTemplate: string;
  internalChecklist: string;
  notificationContacts: string;
  isActive: boolean;
};

type IncidentFormState = {
  id: string;
  templateId: string;
  title: string;
  summary: string;
  severity: BreachIncidentRow["severity"];
  status: BreachIncidentRow["status"];
  detectedAt: string;
  reportedAt: string;
  authorityNotificationDueAt: string;
  authorityNotifiedAt: string;
  customerNotifiedAt: string;
  requiresAuthorityNotification: boolean;
  transferRelated: boolean;
  affectedSubjectCount: number;
  dataCategories: string;
  affectedSystems: string;
  actionsTaken: string;
  evidenceNotes: string;
};

const emptyTemplateForm: TemplateFormState = {
  id: "",
  title: "",
  notificationWindowHours: 72,
  summary: "",
  authorityTemplate: "",
  customerTemplate: "",
  internalChecklist: "",
  notificationContacts: "",
  isActive: true,
};

function toDateTimeInput(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

const emptyIncidentForm: IncidentFormState = {
  id: "",
  templateId: "",
  title: "",
  summary: "",
  severity: "medium",
  status: "open",
  detectedAt: toDateTimeInput(new Date().toISOString()),
  reportedAt: toDateTimeInput(new Date().toISOString()),
  authorityNotificationDueAt: "",
  authorityNotifiedAt: "",
  customerNotifiedAt: "",
  requiresAuthorityNotification: true,
  transferRelated: false,
  affectedSubjectCount: 0,
  dataCategories: "",
  affectedSystems: "",
  actionsTaken: "",
  evidenceNotes: "",
};

export function KvkkTransferAndBreachPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<InternationalTransferRow[]>([]);
  const [maskingEvents, setMaskingEvents] = useState<MaskingEventRow[]>([]);
  const [templates, setTemplates] = useState<BreachNotificationTemplateRow[]>([]);
  const [incidents, setIncidents] = useState<BreachIncidentRow[]>([]);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(emptyTemplateForm);
  const [incidentForm, setIncidentForm] = useState<IncidentFormState>(emptyIncidentForm);

  async function loadData() {
    setLoading(true);
    setError(null);

    const [transferRows, maskingRows, templateRows, incidentRows] = await Promise.all([
      listInternationalTransfers(8),
      listMaskingEvents(8),
      listBreachNotificationTemplates(),
      listBreachIncidents(8),
    ]);

    setTransfers(transferRows);
    setMaskingEvents(maskingRows);
    setTemplates(templateRows);
    setIncidents(incidentRows);
    setLoading(false);
  }

  const load = useEffectEvent(async () => {
    await loadData();
  });

  useEffect(() => {
    void load();
  }, []);

  function fillTemplateForm(template: BreachNotificationTemplateRow) {
    setTemplateForm({
      id: template.id,
      title: template.title,
      notificationWindowHours: template.notification_window_hours,
      summary: template.summary ?? "",
      authorityTemplate: template.authority_template,
      customerTemplate: template.customer_template,
      internalChecklist: template.internal_checklist.join("\n"),
      notificationContacts: template.notification_contacts
        .map((item) => String(item.label ?? item.email ?? item.name ?? ""))
        .filter(Boolean)
        .join("\n"),
      isActive: template.is_active,
    });
  }

  function fillIncidentForm(incident: BreachIncidentRow) {
    setIncidentForm({
      id: incident.id,
      templateId: incident.template_id ?? "",
      title: incident.title,
      summary: incident.summary,
      severity: incident.severity,
      status: incident.status,
      detectedAt: toDateTimeInput(incident.detected_at),
      reportedAt: toDateTimeInput(incident.reported_at),
      authorityNotificationDueAt: toDateTimeInput(incident.authority_notification_due_at),
      authorityNotifiedAt: toDateTimeInput(incident.authority_notified_at),
      customerNotifiedAt: toDateTimeInput(incident.customer_notified_at),
      requiresAuthorityNotification: incident.requires_authority_notification,
      transferRelated: incident.transfer_related,
      affectedSubjectCount: incident.affected_subject_count,
      dataCategories: incident.data_categories.join(", "),
      affectedSystems: incident.affected_systems.join(", "),
      actionsTaken: incident.actions_taken ?? "",
      evidenceNotes: incident.evidence_notes ?? "",
    });
  }

  async function handleTemplateSave() {
    setSaving(true);
    setFeedback(null);
    setError(null);

    const saved = await saveBreachNotificationTemplate({
      id: templateForm.id || undefined,
      title: templateForm.title.trim(),
      notification_window_hours: Number(templateForm.notificationWindowHours) || 72,
      summary: templateForm.summary.trim() || null,
      authority_template: templateForm.authorityTemplate.trim(),
      customer_template: templateForm.customerTemplate.trim(),
      internal_checklist: splitLines(templateForm.internalChecklist),
      notification_contacts: splitLines(templateForm.notificationContacts).map((line) => ({ label: line })),
      is_active: templateForm.isActive,
    });

    if (!saved) {
      setError("Veri ihlali bildirimi sablonu kaydedilemedi.");
      setSaving(false);
      return;
    }

    setFeedback("Veri ihlali bildirimi sablonu kaydedildi.");
    await loadData();
    fillTemplateForm(saved);
    setSaving(false);
  }

  async function handleIncidentSave() {
    setSaving(true);
    setFeedback(null);
    setError(null);

    const saved = await saveBreachIncident({
      id: incidentForm.id || undefined,
      template_id: incidentForm.templateId || null,
      title: incidentForm.title.trim(),
      summary: incidentForm.summary.trim(),
      severity: incidentForm.severity,
      status: incidentForm.status,
      detected_at: incidentForm.detectedAt ? new Date(incidentForm.detectedAt).toISOString() : new Date().toISOString(),
      reported_at: incidentForm.reportedAt ? new Date(incidentForm.reportedAt).toISOString() : new Date().toISOString(),
      authority_notification_due_at: incidentForm.authorityNotificationDueAt
        ? new Date(incidentForm.authorityNotificationDueAt).toISOString()
        : null,
      authority_notified_at: incidentForm.authorityNotifiedAt
        ? new Date(incidentForm.authorityNotifiedAt).toISOString()
        : null,
      customer_notified_at: incidentForm.customerNotifiedAt
        ? new Date(incidentForm.customerNotifiedAt).toISOString()
        : null,
      requires_authority_notification: incidentForm.requiresAuthorityNotification,
      transfer_related: incidentForm.transferRelated,
      affected_subject_count: Number(incidentForm.affectedSubjectCount) || 0,
      data_categories: splitCsv(incidentForm.dataCategories),
      affected_systems: splitCsv(incidentForm.affectedSystems),
      actions_taken: incidentForm.actionsTaken.trim() || null,
      evidence_notes: incidentForm.evidenceNotes.trim() || null,
    });

    if (!saved) {
      setError("Veri ihlali kaydi kaydedilemedi.");
      setSaving(false);
      return;
    }

    setFeedback("Veri ihlali kaydi kaydedildi.");
    await loadData();
    fillIncidentForm(saved);
    setSaving(false);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Yurt Disi Aktarim ve Veri Ihlali Plani</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            AI aktarim kayitlarini, cihaz ustu maskeleme loglarini ve 72 saatlik veri ihlali planini tek merkezde yonetin.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-background px-3 py-2">
            <div className="text-muted-foreground">Aktarim</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{transfers.length}</div>
          </div>
          <div className="rounded-xl border border-border bg-background px-3 py-2">
            <div className="text-muted-foreground">Maskeleme</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{maskingEvents.length}</div>
          </div>
          <div className="rounded-xl border border-border bg-background px-3 py-2">
            <div className="text-muted-foreground">Ihlal</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{incidents.length}</div>
          </div>
          <div className="rounded-xl border border-border bg-background px-3 py-2">
            <div className="text-muted-foreground">Sablon</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{templates.length}</div>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
          {feedback}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="text-sm font-semibold text-foreground">Yurt Disi Aktarim Kayitlari</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Claude Vision veya benzeri harici servislere giden veri akislarini denetim icin tutun.
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Aktarim kayitlari yukleniyor...
                </div>
              ) : transfers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Henuz bir yurt disi aktarim kaydi yok.
                </div>
              ) : (
                transfers.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{item.provider}</span>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                        {item.transfer_context}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {item.destination_region}{item.destination_country ? ` / ${item.destination_country}` : ""} · {formatDateTime(item.created_at)}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">{item.reason}</div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Veri: {item.data_category} · Kare sayisi: {item.frame_count}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="text-sm font-semibold text-foreground">Maskeleme Olaylari</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Mobil uygulama cihaz ustu blur uyguladiginda bu loglara yazmali. Orijinal kare saklanmamali.
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Maskeleme loglari yukleniyor...
                </div>
              ) : maskingEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Henuz bir maskeleme logu yok.
                </div>
              ) : (
                maskingEvents.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{item.source_context}</span>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                        {item.masking_status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {item.media_type} · {formatDateTime(item.created_at)}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Yuz: {item.detected_faces} · Plaka: {item.detected_plates} · Kimlik: {item.detected_identity_cards}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Orijinal kaydedildi mi: {item.original_persisted ? "Evet" : "Hayir"}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Veri Ihlali Bildirim Sablonu</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  72 saat icinde hazirlanacak resmi ve kullanici bildirim metinleri.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTemplateForm(emptyTemplateForm)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
              >
                Yeni sablon
              </button>
            </div>

            {!!templates.length && (
              <div className="mt-4 flex flex-wrap gap-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => fillTemplateForm(template)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground transition hover:border-primary hover:text-primary"
                  >
                    {template.title}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 grid gap-3">
              <input
                value={templateForm.title}
                onChange={(event) => setTemplateForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Sablon basligi"
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <input
                type="number"
                min={1}
                value={templateForm.notificationWindowHours}
                onChange={(event) =>
                  setTemplateForm((current) => ({
                    ...current,
                    notificationWindowHours: Number(event.target.value) || 72,
                  }))
                }
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <textarea
                rows={2}
                value={templateForm.summary}
                onChange={(event) => setTemplateForm((current) => ({ ...current, summary: event.target.value }))}
                placeholder="Kisa ozet"
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <textarea
                rows={4}
                value={templateForm.authorityTemplate}
                onChange={(event) =>
                  setTemplateForm((current) => ({ ...current, authorityTemplate: event.target.value }))
                }
                placeholder="KVKK otorite bildirimi"
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <textarea
                rows={4}
                value={templateForm.customerTemplate}
                onChange={(event) =>
                  setTemplateForm((current) => ({ ...current, customerTemplate: event.target.value }))
                }
                placeholder="Veri sahibi bildirimi"
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <textarea
                rows={3}
                value={templateForm.internalChecklist}
                onChange={(event) =>
                  setTemplateForm((current) => ({ ...current, internalChecklist: event.target.value }))
                }
                placeholder="Ic kontrol adimlari, her satira bir madde"
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <textarea
                rows={2}
                value={templateForm.notificationContacts}
                onChange={(event) =>
                  setTemplateForm((current) => ({ ...current, notificationContacts: event.target.value }))
                }
                placeholder="Bildirim kisileri, her satira bir kisi"
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <label className="inline-flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={templateForm.isActive}
                  onChange={(event) =>
                    setTemplateForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                Aktif sablon
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void handleTemplateSave()}
                disabled={
                  saving ||
                  !templateForm.title.trim() ||
                  !templateForm.authorityTemplate.trim() ||
                  !templateForm.customerTemplate.trim()
                }
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Kaydediliyor..." : templateForm.id ? "Sablonu guncelle" : "Sablon olustur"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Veri Ihlali Kayitlari</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  72 saatlik resmi bildirim surecine girecek olaylari buradan yonetin.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIncidentForm(emptyIncidentForm)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
              >
                Yeni olay
              </button>
            </div>

            {!!incidents.length && (
              <div className="mt-4 space-y-2">
                {incidents.map((incident) => (
                  <button
                    key={incident.id}
                    type="button"
                    onClick={() => fillIncidentForm(incident)}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-left transition hover:border-primary"
                  >
                    <span className="text-sm font-medium text-foreground">{incident.title}</span>
                    <span className="text-xs text-muted-foreground">{incident.status}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 grid gap-3">
              <select
                value={incidentForm.templateId}
                onChange={(event) => setIncidentForm((current) => ({ ...current, templateId: event.target.value }))}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              >
                <option value="">Sablon secilmedi</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
              <input
                value={incidentForm.title}
                onChange={(event) => setIncidentForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ihlal basligi"
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <textarea
                rows={3}
                value={incidentForm.summary}
                onChange={(event) => setIncidentForm((current) => ({ ...current, summary: event.target.value }))}
                placeholder="Olay ozeti"
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={incidentForm.severity}
                  onChange={(event) =>
                    setIncidentForm((current) => ({
                      ...current,
                      severity: event.target.value as BreachIncidentRow["severity"],
                    }))
                  }
                  className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
                >
                  <option value="low">Dusuk</option>
                  <option value="medium">Orta</option>
                  <option value="high">Yuksek</option>
                  <option value="critical">Kritik</option>
                </select>
                <select
                  value={incidentForm.status}
                  onChange={(event) =>
                    setIncidentForm((current) => ({
                      ...current,
                      status: event.target.value as BreachIncidentRow["status"],
                    }))
                  }
                  className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
                >
                  <option value="open">Acik</option>
                  <option value="investigating">Inceleniyor</option>
                  <option value="notification_prepared">Bildirim hazirlandi</option>
                  <option value="notified">Bildirim yapildi</option>
                  <option value="closed">Kapandi</option>
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="datetime-local"
                  value={incidentForm.detectedAt}
                  onChange={(event) => setIncidentForm((current) => ({ ...current, detectedAt: event.target.value }))}
                  className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
                />
                <input
                  type="datetime-local"
                  value={incidentForm.reportedAt}
                  onChange={(event) => setIncidentForm((current) => ({ ...current, reportedAt: event.target.value }))}
                  className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
                />
              </div>
              <input
                type="datetime-local"
                value={incidentForm.authorityNotificationDueAt}
                onChange={(event) =>
                  setIncidentForm((current) => ({
                    ...current,
                    authorityNotificationDueAt: event.target.value,
                  }))
                }
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <input
                value={incidentForm.dataCategories}
                onChange={(event) =>
                  setIncidentForm((current) => ({ ...current, dataCategories: event.target.value }))
                }
                placeholder="Veri kategorileri, virgulle"
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <input
                value={incidentForm.affectedSystems}
                onChange={(event) =>
                  setIncidentForm((current) => ({ ...current, affectedSystems: event.target.value }))
                }
                placeholder="Etkilenen sistemler, virgulle"
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <input
                type="number"
                min={0}
                value={incidentForm.affectedSubjectCount}
                onChange={(event) =>
                  setIncidentForm((current) => ({
                    ...current,
                    affectedSubjectCount: Number(event.target.value) || 0,
                  }))
                }
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <textarea
                rows={3}
                value={incidentForm.actionsTaken}
                onChange={(event) =>
                  setIncidentForm((current) => ({ ...current, actionsTaken: event.target.value }))
                }
                placeholder="Alinan aksiyonlar"
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <textarea
                rows={3}
                value={incidentForm.evidenceNotes}
                onChange={(event) =>
                  setIncidentForm((current) => ({ ...current, evidenceNotes: event.target.value }))
                }
                placeholder="Toplanan kanitlar veya notlar"
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={incidentForm.requiresAuthorityNotification}
                    onChange={(event) =>
                      setIncidentForm((current) => ({
                        ...current,
                        requiresAuthorityNotification: event.target.checked,
                      }))
                    }
                  />
                  Otorite bildirimi gerekli
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={incidentForm.transferRelated}
                    onChange={(event) =>
                      setIncidentForm((current) => ({
                        ...current,
                        transferRelated: event.target.checked,
                      }))
                    }
                  />
                  Yurt disi aktarimla iliskili
                </label>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void handleIncidentSave()}
                disabled={saving || !incidentForm.title.trim() || !incidentForm.summary.trim()}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Kaydediliyor..." : incidentForm.id ? "Olayi guncelle" : "Olay olustur"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
