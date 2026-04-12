"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createConsentDocumentVersion,
  fetchConsentDocuments,
  fetchDataProcessingInventory,
  publishConsentDocumentVersion,
  saveConsentDocument,
  saveDataProcessingInventory,
  type ConsentDocumentRow,
  type ConsentScopeContext,
  type ConsentType,
  type DataProcessingInventoryRow,
} from "@/lib/supabase/consent-api";
import { KvkkDataRightsPanel } from "./KvkkDataRightsPanel";
import { KvkkTransferAndBreachPanel } from "./KvkkTransferAndBreachPanel";

const consentTypeOptions: Array<{ value: ConsentType; label: string }> = [
  { value: "aydinlatma", label: "Aydinlatma" },
  { value: "kvkk", label: "KVKK" },
  { value: "acik_riza", label: "Acik Riza" },
  { value: "yurt_disi_aktarim", label: "Yurt Disi Aktarim" },
  { value: "pazarlama", label: "Pazarlama" },
];

const scopeOptions: Array<{ value: ConsentScopeContext; label: string }> = [
  { value: "platform", label: "Platform girisi" },
  { value: "photo_upload", label: "Fotograf yukleme" },
  { value: "live_scan", label: "Canli tarama" },
  { value: "international_transfer", label: "Yurt disi aktarim" },
  { value: "marketing", label: "Pazarlama" },
];

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function KvkkCenterTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishingVersionId, setPublishingVersionId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ConsentDocumentRow[]>([]);
  const [inventory, setInventory] = useState<DataProcessingInventoryRow[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [documentForm, setDocumentForm] = useState({
    id: "",
    title: "",
    description: "",
    consentType: "aydinlatma" as ConsentType,
    scopeContext: "platform" as ConsentScopeContext,
    isRequired: true,
    isActive: true,
    displayOrder: 100,
  });

  const [versionForm, setVersionForm] = useState({
    version: "v1.0",
    summary: "",
    contentMarkdown: "",
  });

  const [inventoryForm, setInventoryForm] = useState({
    id: "",
    title: "",
    dataCategory: "",
    processingPurpose: "",
    legalBasis: "",
    retentionSummary: "",
    dataSubjects: "",
    accessRoles: "",
    transferRegions: "",
    notes: "",
    displayOrder: 100,
    internationalTransfer: false,
    isActive: true,
  });

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId],
  );

  async function load() {
    setLoading(true);
    setError(null);

    const [documentsData, inventoryData] = await Promise.all([
      fetchConsentDocuments(),
      fetchDataProcessingInventory(),
    ]);

    setDocuments(documentsData);
    setInventory(inventoryData);

    if (documentsData.length > 0) {
      if (selectedDocumentId) {
        const refreshedSelected = documentsData.find((document) => document.id === selectedDocumentId);
        if (refreshedSelected) {
          fillDocumentForm(refreshedSelected);
        }
      } else {
        fillDocumentForm(documentsData[0]);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fillDocumentForm(document: ConsentDocumentRow) {
    setSelectedDocumentId(document.id);
    setDocumentForm({
      id: document.id,
      title: document.title,
      description: document.description ?? "",
      consentType: document.consent_type,
      scopeContext: document.scope_context,
      isRequired: document.is_required,
      isActive: document.is_active,
      displayOrder: document.display_order,
    });
    setVersionForm({
      version: `v${(document.versions?.length ?? 0) + 1}.0`,
      summary: "",
      contentMarkdown: "",
    });
  }

  function fillInventoryForm(item: DataProcessingInventoryRow) {
    setInventoryForm({
      id: item.id,
      title: item.title,
      dataCategory: item.data_category,
      processingPurpose: item.processing_purpose,
      legalBasis: item.legal_basis,
      retentionSummary: item.retention_summary,
      dataSubjects: item.data_subject_categories.join(", "),
      accessRoles: item.access_roles.join(", "),
      transferRegions: item.transfer_regions.join(", "),
      notes: item.notes ?? "",
      displayOrder: item.display_order,
      internationalTransfer: item.international_transfer,
      isActive: item.is_active,
    });
  }

  async function handleDocumentSave() {
    setSaving(true);
    setFeedback(null);
    setError(null);

    const saved = await saveConsentDocument({
      id: documentForm.id || undefined,
      title: documentForm.title.trim(),
      description: documentForm.description.trim() || null,
      consent_type: documentForm.consentType,
      scope_context: documentForm.scopeContext,
      is_required: documentForm.isRequired,
      is_active: documentForm.isActive,
      display_order: Number(documentForm.displayOrder) || 100,
    });

    if (!saved) {
      setError("Onay metni kaydedilemedi.");
      setSaving(false);
      return;
    }

    setFeedback("Onay metni kaydedildi.");
    await load();
    fillDocumentForm(saved);
    setSaving(false);
  }

  async function handleVersionCreate() {
    if (!selectedDocumentId) {
      setError("Once bir onay dokumani secin.");
      return;
    }

    setSaving(true);
    setFeedback(null);
    setError(null);

    const created = await createConsentDocumentVersion({
      documentId: selectedDocumentId,
      version: versionForm.version.trim(),
      summary: versionForm.summary.trim() || null,
      contentMarkdown: versionForm.contentMarkdown.trim(),
    });

    if (!created) {
      setError("Versiyon olusturulamadi.");
      setSaving(false);
      return;
    }

    setFeedback("Yeni versiyon taslak olarak eklendi.");
    await load();
    const currentVersionCount = selectedDocument?.versions?.length ?? 0;
    setVersionForm({
      version: `v${currentVersionCount + 2}.0`,
      summary: "",
      contentMarkdown: "",
    });
    setSaving(false);
  }

  async function handlePublish(versionId: string) {
    setPublishingVersionId(versionId);
    setFeedback(null);
    setError(null);

    const ok = await publishConsentDocumentVersion(versionId);
    if (!ok) {
      setError("Versiyon yayina alinamadi.");
      setPublishingVersionId(null);
      return;
    }

    setFeedback("Versiyon yayina alindi. Yeni kullanicilardan tekrar onay istenecek.");
    await load();
    setPublishingVersionId(null);
  }

  async function handleInventorySave() {
    setSaving(true);
    setFeedback(null);
    setError(null);

    const saved = await saveDataProcessingInventory({
      id: inventoryForm.id || undefined,
      title: inventoryForm.title.trim(),
      data_category: inventoryForm.dataCategory.trim(),
      processing_purpose: inventoryForm.processingPurpose.trim(),
      legal_basis: inventoryForm.legalBasis.trim(),
      retention_summary: inventoryForm.retentionSummary.trim(),
      data_subject_categories: splitCsv(inventoryForm.dataSubjects),
      access_roles: splitCsv(inventoryForm.accessRoles),
      transfer_regions: splitCsv(inventoryForm.transferRegions),
      notes: inventoryForm.notes.trim() || null,
      display_order: Number(inventoryForm.displayOrder) || 100,
      international_transfer: inventoryForm.internationalTransfer,
      is_active: inventoryForm.isActive,
    });

    if (!saved) {
      setError("Veri isleme kaydi kaydedilemedi.");
      setSaving(false);
      return;
    }

    setFeedback("Veri isleme envanteri kaydedildi.");
    await load();
    fillInventoryForm(saved);
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">KVKK Merkezi</h3>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Aydinlatma ve acik riza metinlerinin surumlerini yonetin, veri isleme envanterini canli tutun ve
              veri haklari sureclerini tek merkezden izleyin.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-background px-3 py-2">
              <div className="text-muted-foreground">Metin</div>
              <div className="mt-1 text-lg font-semibold text-foreground">{documents.length}</div>
            </div>
            <div className="rounded-xl border border-border bg-background px-3 py-2">
              <div className="text-muted-foreground">Yayinda</div>
              <div className="mt-1 text-lg font-semibold text-foreground">
                {documents.reduce((count, document) => count + (document.versions?.some((version) => version.is_published) ? 1 : 0), 0)}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background px-3 py-2">
              <div className="text-muted-foreground">Envanter</div>
              <div className="mt-1 text-lg font-semibold text-foreground">{inventory.length}</div>
            </div>
            <div className="rounded-xl border border-border bg-background px-3 py-2">
              <div className="text-muted-foreground">Yurt Disi</div>
              <div className="mt-1 text-lg font-semibold text-foreground">
                {inventory.filter((item) => item.international_transfer).length}
              </div>
            </div>
          </div>
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
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Onay Metinleri ve Surumler</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Her belge tipi icin aktif surumu yayina alabilir, yeni versiyon acabilirsiniz.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedDocumentId(null);
                setDocumentForm({
                  id: "",
                  title: "",
                  description: "",
                  consentType: "aydinlatma",
                  scopeContext: "platform",
                  isRequired: true,
                  isActive: true,
                  displayOrder: 100,
                });
                setVersionForm({
                  version: "v1.0",
                  summary: "",
                  contentMarkdown: "",
                });
              }}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
            >
              Yeni belge
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                KVKK dokumanlari yukleniyor...
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                Henuz bir consent dokumani yok.
              </div>
            ) : (
              documents.map((document) => {
                const publishedVersion = document.versions?.find((version) => version.is_published) ?? null;

                return (
                  <article
                    key={document.id}
                    className={`rounded-2xl border p-4 transition ${
                      selectedDocumentId === document.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background/70"
                    }`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="text-sm font-semibold text-foreground">{document.title}</h5>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                            {consentTypeOptions.find((item) => item.value === document.consent_type)?.label}
                          </span>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                            {scopeOptions.find((item) => item.value === document.scope_context)?.label}
                          </span>
                          {!document.is_active && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              Pasif
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {document.description || "Aciklama eklenmedi."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                          <span>{document.is_required ? "Zorunlu" : "Istege bagli"}</span>
                          <span>{document.versions?.length ?? 0} versiyon</span>
                          {publishedVersion && <span>Aktif: {publishedVersion.version}</span>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => fillDocumentForm(document)}
                        className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
                      >
                        Duzenle
                      </button>
                    </div>

                    {!!document.versions?.length && (
                      <div className="mt-4 grid gap-2">
                        {document.versions.map((version) => (
                          <div key={version.id} className="rounded-xl border border-border bg-card px-3 py-3">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground">{version.version}</span>
                                  {version.is_published && (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                      Yayinda
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {version.summary || "Ozet yok"}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => void handlePublish(version.id)}
                                disabled={publishingVersionId === version.id || version.is_published}
                                className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {version.is_published
                                  ? "Aktif surum"
                                  : publishingVersionId === version.id
                                    ? "Yayina aliniyor..."
                                    : "Yayina al"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h4 className="text-sm font-semibold text-foreground">Belge ve Envanter Editoru</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Sol listedeki belgeyi secin veya yeni belge olusturun. Asagidan yeni surum ve veri isleme envanteri
            kayitlari tanimlayabilirsiniz.
          </p>

          <div className="mt-5 grid gap-4">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-foreground">Baslik</span>
                  <input
                    value={documentForm.title}
                    onChange={(event) => setDocumentForm((current) => ({ ...current, title: event.target.value }))}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                    placeholder="Aydinlatma Metni"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-foreground">Consent tipi</span>
                  <select
                    value={documentForm.consentType}
                    onChange={(event) =>
                      setDocumentForm((current) => ({
                        ...current,
                        consentType: event.target.value as ConsentType,
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                  >
                    {consentTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-foreground">Kapsam</span>
                  <select
                    value={documentForm.scopeContext}
                    onChange={(event) =>
                      setDocumentForm((current) => ({
                        ...current,
                        scopeContext: event.target.value as ConsentScopeContext,
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                  >
                    {scopeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-foreground">Siralama</span>
                  <input
                    type="number"
                    min={1}
                    value={documentForm.displayOrder}
                    onChange={(event) =>
                      setDocumentForm((current) => ({
                        ...current,
                        displayOrder: Number(event.target.value) || 100,
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                </label>
              </div>

              <label className="mt-3 block space-y-1.5">
                <span className="text-xs font-medium text-foreground">Aciklama</span>
                <textarea
                  rows={3}
                  value={documentForm.description}
                  onChange={(event) => setDocumentForm((current) => ({ ...current, description: event.target.value }))}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                  placeholder="Metnin ne zaman, hangi akis icin ve neden istendigini kisaca yazin."
                />
              </label>

              <div className="mt-3 flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={documentForm.isRequired}
                    onChange={(event) =>
                      setDocumentForm((current) => ({ ...current, isRequired: event.target.checked }))
                    }
                  />
                  Zorunlu onay
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={documentForm.isActive}
                    onChange={(event) =>
                      setDocumentForm((current) => ({ ...current, isActive: event.target.checked }))
                    }
                  />
                  Aktif
                </label>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleDocumentSave()}
                  disabled={saving || !documentForm.title.trim()}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Kaydediliyor..." : documentForm.id ? "Belgeyi guncelle" : "Belge olustur"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">Yeni versiyon</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {selectedDocument ? `${selectedDocument.title} icin yeni taslak` : "Bir belge secerek yeni versiyon ekleyin."}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-3">
                <input
                  value={versionForm.version}
                  onChange={(event) => setVersionForm((current) => ({ ...current, version: event.target.value }))}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                  placeholder="v1.1"
                />
                <input
                  value={versionForm.summary}
                  onChange={(event) => setVersionForm((current) => ({ ...current, summary: event.target.value }))}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                  placeholder="Bu surumde hangi degisiklikler var?"
                />
                <textarea
                  rows={8}
                  value={versionForm.contentMarkdown}
                  onChange={(event) => setVersionForm((current) => ({ ...current, contentMarkdown: event.target.value }))}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                  placeholder="# Metin basligi"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleVersionCreate()}
                  disabled={saving || !selectedDocumentId || !versionForm.version.trim() || !versionForm.contentMarkdown.trim()}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Versiyon olusturuluyor..." : "Taslak versiyon ekle"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Veri Isleme Envanteri</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Hangi veri hangi amacla, hangi yasal dayanakla ve hangi roller tarafindan erisilebilir oldugunu canli
              olarak kaydedin.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setInventoryForm({
                id: "",
                title: "",
                dataCategory: "",
                processingPurpose: "",
                legalBasis: "",
                retentionSummary: "",
                dataSubjects: "",
                accessRoles: "",
                transferRegions: "",
                notes: "",
                displayOrder: 100,
                internationalTransfer: false,
                isActive: true,
              })
            }
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
          >
            Yeni kayit
          </button>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="space-y-3">
            {inventory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                Envanter kaydi bulunmuyor.
              </div>
            ) : (
              inventory.map((item) => (
                <article key={item.id} className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h5 className="text-sm font-semibold text-foreground">{item.title}</h5>
                      <p className="mt-1 text-xs text-muted-foreground">{item.data_category}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fillInventoryForm(item)}
                      className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
                    >
                      Duzenle
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                    <div>Yasal dayanak: {item.legal_basis}</div>
                    <div>Saklama: {item.retention_summary}</div>
                    <div>Erisen roller: {item.access_roles.join(", ") || "Belirtilmedi"}</div>
                    <div>Yurt disi aktarim: {item.international_transfer ? "Var" : "Yok"}</div>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="grid gap-3">
              <input
                value={inventoryForm.title}
                onChange={(event) => setInventoryForm((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                placeholder="Kayit basligi"
              />
              <input
                value={inventoryForm.dataCategory}
                onChange={(event) => setInventoryForm((current) => ({ ...current, dataCategory: event.target.value }))}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                placeholder="Veri kategorisi"
              />
              <textarea
                rows={3}
                value={inventoryForm.processingPurpose}
                onChange={(event) =>
                  setInventoryForm((current) => ({ ...current, processingPurpose: event.target.value }))
                }
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                placeholder="Veri isleme amaci"
              />
              <input
                value={inventoryForm.legalBasis}
                onChange={(event) => setInventoryForm((current) => ({ ...current, legalBasis: event.target.value }))}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                placeholder="Yasal dayanak"
              />
              <input
                value={inventoryForm.retentionSummary}
                onChange={(event) =>
                  setInventoryForm((current) => ({ ...current, retentionSummary: event.target.value }))
                }
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                placeholder="Saklama suresi veya ozeti"
              />
              <input
                value={inventoryForm.dataSubjects}
                onChange={(event) => setInventoryForm((current) => ({ ...current, dataSubjects: event.target.value }))}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                placeholder="Veri sahibi gruplari (virgulle)"
              />
              <input
                value={inventoryForm.accessRoles}
                onChange={(event) => setInventoryForm((current) => ({ ...current, accessRoles: event.target.value }))}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                placeholder="Erisen roller (virgulle)"
              />
              <input
                value={inventoryForm.transferRegions}
                onChange={(event) =>
                  setInventoryForm((current) => ({ ...current, transferRegions: event.target.value }))
                }
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                placeholder="Aktarim bolgeleri (virgulle)"
              />
              <textarea
                rows={3}
                value={inventoryForm.notes}
                onChange={(event) => setInventoryForm((current) => ({ ...current, notes: event.target.value }))}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                placeholder="Ek notlar"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={inventoryForm.internationalTransfer}
                    onChange={(event) =>
                      setInventoryForm((current) => ({
                        ...current,
                        internationalTransfer: event.target.checked,
                      }))
                    }
                  />
                  Yurt disi aktarim var
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={inventoryForm.isActive}
                    onChange={(event) => setInventoryForm((current) => ({ ...current, isActive: event.target.checked }))}
                  />
                  Aktif kayit
                </label>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void handleInventorySave()}
                disabled={
                  saving ||
                  !inventoryForm.title.trim() ||
                  !inventoryForm.dataCategory.trim() ||
                  !inventoryForm.processingPurpose.trim() ||
                  !inventoryForm.legalBasis.trim() ||
                  !inventoryForm.retentionSummary.trim()
                }
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Kaydediliyor..." : inventoryForm.id ? "Kaydi guncelle" : "Kayit olustur"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <KvkkDataRightsPanel />
      <KvkkTransferAndBreachPanel />
    </div>
  );
}
