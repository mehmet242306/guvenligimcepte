"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Pencil, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DOC_TYPE_LABELS,
  OFFICIAL_LEGAL_DOC_TYPES,
  docTypeLabel,
  type OfficialLegalDocType,
} from "@/lib/legal-corpus/doc-types";
import { useIsSuperAdmin } from "@/lib/hooks/use-is-super-admin";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface LegalDoc {
  id: string;
  title: string;
  doc_type: string;
  doc_number: string;
  source_url: string | null;
  last_synced_at: string | null;
  chunk_count: number;
  is_active?: boolean;
}

type FilterType = "all" | OfficialLegalDocType;

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: "all", label: "Tümü" },
  ...OFFICIAL_LEGAL_DOC_TYPES.map((t) => ({ key: t, label: DOC_TYPE_LABELS[t] })),
];

export function MevzuatSyncTab() {
  const isSuperAdmin = useIsSuperAdmin();
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newDoc, setNewDoc] = useState({
    title: "",
    doc_number: "",
    doc_type: "regulation" as OfficialLegalDocType,
    source_url: "",
  });

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("docType", filter);
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/admin/official-legal-catalog?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        console.error("[MevzuatSync] list:", data.error);
        return;
      }
      setDocs(data.documents ?? []);
    } catch (err) {
      console.error("[MevzuatSync] load error:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    if (isSuperAdmin !== true) return;
    const timer = setTimeout(() => {
      void loadDocs();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [isSuperAdmin, loadDocs, search]);

  async function syncSingle(docId: string) {
    setSyncing(docId);
    setSyncResult(null);
    try {
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase.functions.invoke("sync-mevzuat", {
        body: { action: "sync_single", document_id: docId },
      });

      if (error) {
        let msg = error.message || "Hata";
        try {
          if (error.context?.body) {
            const text = await new Response(error.context.body).text();
            const parsed = JSON.parse(text);
            msg = parsed.error || msg;
          }
        } catch {
          /* ignore */
        }
        setSyncResult({ id: docId, success: false, message: msg });
        return;
      }

      if (data?.error) {
        setSyncResult({ id: docId, success: false, message: data.error });
        return;
      }

      setSyncResult({
        id: docId,
        success: true,
        message: `${data.articles_added ?? 0} madde eklendi`,
      });
      await loadDocs();
    } catch (err) {
      setSyncResult({
        id: docId,
        success: false,
        message: err instanceof Error ? err.message : "Bilinmeyen hata",
      });
    } finally {
      setSyncing(null);
    }
  }

  async function syncCriticalLaws() {
    setSyncing("critical-laws");
    setSyncResult(null);
    try {
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase.functions.invoke("sync-mevzuat", {
        body: { action: "sync_by_doc_numbers", doc_numbers: ["6331", "4857", "5510"] },
      });

      if (error) {
        setSyncResult({ id: "critical-laws", success: false, message: error.message });
        return;
      }
      if (data?.error) {
        setSyncResult({ id: "critical-laws", success: false, message: data.error });
        return;
      }

      const failed = (data?.results ?? []).filter((r: { success?: boolean }) => !r.success);
      setSyncResult({
        id: "critical-laws",
        success: failed.length === 0,
        message:
          failed.length === 0
            ? `${data.synced} kanun senkronize`
            : `Kısmi: ${data.synced} ok, ${data.failed} hata`,
      });
      await loadDocs();
    } catch (err) {
      setSyncResult({
        id: "critical-laws",
        success: false,
        message: err instanceof Error ? err.message : "Bilinmeyen hata",
      });
    } finally {
      setSyncing(null);
    }
  }

  async function testConnection() {
    setTestResult(null);
    try {
      const supabase = createClient();
      if (!supabase) return;
      const { data, error } = await supabase.functions.invoke("sync-mevzuat", {
        body: { action: "test" },
      });
      if (error) {
        setTestResult(`Hata: ${error.message}`);
        return;
      }
      setTestResult(`Başarılı: ${data.message}`);
    } catch (err) {
      setTestResult(`Hata: ${err instanceof Error ? err.message : "Bilinmeyen"}`);
    }
  }

  async function createDocument(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/admin/official-legal-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newDoc.title,
          doc_number: newDoc.doc_number,
          doc_type: newDoc.doc_type,
          source_url: newDoc.source_url.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Kayıt eklenemedi");
        return;
      }
      setShowAddForm(false);
      setNewDoc({ title: "", doc_number: "", doc_type: "regulation", source_url: "" });
      await loadDocs();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Kayıt eklenemedi");
    } finally {
      setSaving(false);
    }
  }

  async function updateDocument(
    id: string,
    patch: Partial<Pick<LegalDoc, "title" | "doc_number" | "doc_type" | "source_url">>,
  ) {
    const res = await fetch(`/api/admin/official-legal-catalog/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Güncellenemedi");
    await loadDocs();
  }

  async function deleteDocument(id: string, title: string) {
    if (!window.confirm(`"${title}" katalogdan silinsin mi? İlişkili chunk'lar da kaldırılır.`)) {
      return;
    }
    const res = await fetch(`/api/admin/official-legal-catalog/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Silinemedi");
      return;
    }
    await loadDocs();
  }

  const grouped = useMemo(() => {
    const synced = docs.filter((d) => d.chunk_count > 0);
    const unsynced = docs.filter((d) => d.chunk_count === 0);
    return { synced, unsynced };
  }, [docs]);

  const totalChunks = docs.reduce((sum, d) => sum + d.chunk_count, 0);

  if (isSuperAdmin === null) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (isSuperAdmin === false) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Bu ekran yalnızca süper admin kullanıcılar içindir.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 text-sm text-muted-foreground">
          Resmi mevzuat kataloğunu buradan yönetirsiniz: tür (kanun, yönetmelik, tebliğ…), mevzuat.gov.tr
          bağlantısı, ekleme ve silme. Senkronizasyon madde/chunk içeriğini mevzuat.gov.tr üzerinden çeker.
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard value={docs.length} label="Katalog kaydı" />
        <StatCard value={grouped.synced.length} label="Senkronize" valueClass="text-emerald-500" />
        <StatCard value={grouped.unsynced.length} label="Bekleyen" valueClass="text-amber-500" />
        <StatCard value={totalChunks.toLocaleString("tr-TR")} label="Toplam chunk" valueClass="text-primary" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setShowAddForm((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" />
          Yeni mevzuat ekle
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={syncing === "critical-laws"}
          onClick={() => void syncCriticalLaws()}
        >
          {syncing === "critical-laws" ? "Senkronize…" : "6331 / 4857 / 5510"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => void testConnection()}>
          Bağlantı testi
        </Button>
        <Button size="sm" variant="outline" onClick={() => void loadDocs()}>
          Yenile
        </Button>
        {testResult && (
          <span className={cn("text-xs", testResult.startsWith("Başarılı") ? "text-emerald-500" : "text-red-500")}>
            {testResult}
          </span>
        )}
        {syncResult?.id === "critical-laws" && (
          <span className={cn("text-xs", syncResult.success ? "text-emerald-500" : "text-red-500")}>
            {syncResult.message}
          </span>
        )}
      </div>

      {showAddForm && (
        <Card>
          <CardContent className="pt-4">
            <form className="space-y-3" onSubmit={(e) => void createDocument(e)}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Yeni katalog kaydı</h3>
                <button type="button" onClick={() => setShowAddForm(false)} aria-label="Kapat">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Başlık"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc((p) => ({ ...p, title: e.target.value }))}
                  required
                />
                <Input
                  label="Kayıt no / slug"
                  hint="Örn. 6331 veya reg-yapi-islerinde-isg"
                  value={newDoc.doc_number}
                  onChange={(e) => setNewDoc((p) => ({ ...p, doc_number: e.target.value }))}
                  required
                />
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-foreground">Belge türü</span>
                  <select
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={newDoc.doc_type}
                    onChange={(e) =>
                      setNewDoc((p) => ({ ...p, doc_type: e.target.value as OfficialLegalDocType }))
                    }
                  >
                    {OFFICIAL_LEGAL_DOC_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {DOC_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Kaynak bağlantısı (mevzuat.gov.tr)"
                  hint="MevzuatNo içeren tam URL"
                  value={newDoc.source_url}
                  onChange={(e) => setNewDoc((p) => ({ ...p, source_url: e.target.value }))}
                  placeholder="https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=..."
                />
              </div>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Kaydediliyor…" : "Kataloğa ekle"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <Input
          label="Ara"
          placeholder="Başlık, numara veya URL…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                filter === opt.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <DocSection
          title={`Senkronize (${grouped.synced.length})`}
          docs={grouped.synced}
          syncing={syncing}
          syncResult={syncResult}
          onSync={syncSingle}
          onUpdate={updateDocument}
          onDelete={deleteDocument}
        />
      )}

      {!loading && grouped.unsynced.length > 0 && (
        <DocSection
          title={`Bekleyen / bağlantı eksik (${grouped.unsynced.length})`}
          docs={grouped.unsynced}
          syncing={syncing}
          syncResult={syncResult}
          onSync={syncSingle}
          onUpdate={updateDocument}
          onDelete={deleteDocument}
        />
      )}
    </div>
  );
}

function StatCard({
  value,
  label,
  valueClass,
}: {
  value: string | number;
  label: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className={cn("text-2xl font-bold text-foreground", valueClass)}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function DocSection({
  title,
  docs,
  syncing,
  syncResult,
  onSync,
  onUpdate,
  onDelete,
}: {
  title: string;
  docs: LegalDoc[];
  syncing: string | null;
  syncResult: { id: string; success: boolean; message: string } | null;
  onSync: (id: string) => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<LegalDoc, "title" | "doc_number" | "doc_type" | "source_url">>,
  ) => Promise<void>;
  onDelete: (id: string, title: string) => Promise<void>;
}) {
  if (docs.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {docs.map((doc) => (
        <DocRow
          key={doc.id}
          doc={doc}
          syncing={syncing === doc.id}
          syncResult={syncResult?.id === doc.id ? syncResult : null}
          onSync={() => onSync(doc.id)}
          onUpdate={onUpdate}
          onDelete={() => onDelete(doc.id, doc.title)}
        />
      ))}
    </div>
  );
}

function DocRow({
  doc,
  syncing,
  syncResult,
  onSync,
  onUpdate,
  onDelete,
}: {
  doc: LegalDoc;
  syncing: boolean;
  syncResult: { success: boolean; message: string } | null;
  onSync: () => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<LegalDoc, "title" | "doc_number" | "doc_type" | "source_url">>,
  ) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editingLink, setEditingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState(doc.source_url ?? "");
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaDraft, setMetaDraft] = useState({
    title: doc.title,
    doc_number: doc.doc_number,
    doc_type: doc.doc_type as OfficialLegalDocType,
  });
  const [rowError, setRowError] = useState<string | null>(null);
  const [rowSaving, setRowSaving] = useState(false);

  const hasSynced = doc.chunk_count > 0;
  const canSync = Boolean(doc.source_url?.includes("MevzuatNo="));

  async function saveLink() {
    setRowSaving(true);
    setRowError(null);
    try {
      await onUpdate(doc.id, { source_url: linkDraft.trim() || null });
      setEditingLink(false);
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setRowSaving(false);
    }
  }

  async function saveMeta() {
    setRowSaving(true);
    setRowError(null);
    try {
      await onUpdate(doc.id, metaDraft);
      setEditingMeta(false);
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setRowSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-start gap-3">
        <Badge variant={doc.doc_type === "law" ? "accent" : "default"} className="shrink-0">
          {docTypeLabel(doc.doc_type)}
        </Badge>

        <div className="min-w-0 flex-1 space-y-1">
          {editingMeta ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={metaDraft.title}
                onChange={(e) => setMetaDraft((p) => ({ ...p, title: e.target.value }))}
              />
              <Input
                value={metaDraft.doc_number}
                onChange={(e) => setMetaDraft((p) => ({ ...p, doc_number: e.target.value }))}
              />
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
                value={metaDraft.doc_type}
                onChange={(e) =>
                  setMetaDraft((p) => ({ ...p, doc_type: e.target.value as OfficialLegalDocType }))
                }
              >
                {OFFICIAL_LEGAL_DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DOC_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 sm:col-span-2">
                <Button size="sm" disabled={rowSaving} onClick={() => void saveMeta()}>
                  Kaydet
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingMeta(false)}>
                  İptal
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">{doc.title}</p>
              <p className="text-[11px] text-muted-foreground">No: {doc.doc_number}</p>
            </>
          )}

          {hasSynced && (
            <p className="text-[11px] text-emerald-500">
              {doc.chunk_count} chunk
              {doc.last_synced_at
                ? ` · ${new Date(doc.last_synced_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}`
                : ""}
            </p>
          )}

          {!canSync && !editingLink && (
            <p className="text-[11px] text-red-500">
              MevzuatNo bulunamadı; önce mevzuat.gov.tr bağlantısını ekleyin veya düzenleyin.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditingMeta((v) => !v)} title="Başlık ve tür">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 hover:text-red-600"
            onClick={() => void onDelete()}
            title="Katalogdan sil"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button onClick={onSync} disabled={syncing || !canSync} size="sm" variant={hasSynced ? "outline" : "primary"}>
            {syncing ? "…" : hasSynced ? "Tekrar senkron" : "Senkronize et"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
        <span className="text-[11px] font-medium text-muted-foreground">Bağlantı:</span>
        {editingLink ? (
          <>
            <Input
              className="min-w-[200px] flex-1 text-xs"
              value={linkDraft}
              onChange={(e) => setLinkDraft(e.target.value)}
              placeholder="https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=..."
            />
            <Button size="sm" disabled={rowSaving} onClick={() => void saveLink()}>
              Kaydet
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setLinkDraft(doc.source_url ?? "");
                setEditingLink(false);
              }}
            >
              İptal
            </Button>
          </>
        ) : doc.source_url ? (
          <>
            <a
              href={doc.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-md items-center gap-1 truncate text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{doc.source_url}</span>
            </a>
            <Button size="sm" variant="ghost" onClick={() => setEditingLink(true)}>
              Düzenle
            </Button>
          </>
        ) : (
          <>
            <span className="text-xs text-muted-foreground">Bağlantı yok</span>
            <Button size="sm" variant="outline" onClick={() => setEditingLink(true)}>
              Bağlantı ekle
            </Button>
          </>
        )}
      </div>

      {syncResult && (
        <p className={cn("text-xs", syncResult.success ? "text-emerald-500" : "text-red-500")}>
          {syncResult.message}
        </p>
      )}
      {rowError && <p className="text-xs text-red-500">{rowError}</p>}
    </div>
  );
}

