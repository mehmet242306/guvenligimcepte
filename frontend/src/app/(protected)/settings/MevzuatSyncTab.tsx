"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Link2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
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
  catalog_metadata?: Record<string, unknown> | null;
}

type FilterType = "all" | OfficialLegalDocType;
type AddMode = "url" | "pdf";
type SyncResult = { id: string; success: boolean; message: string };
type SyncProgress = { id: string; progress: number; label: string };

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: "all", label: "Tümü" },
  ...OFFICIAL_LEGAL_DOC_TYPES.map((t) => ({ key: t, label: DOC_TYPE_LABELS[t] })),
];

const CATALOG_SECTIONS: Array<{ key: OfficialLegalDocType; title: string; description: string }> = [
  { key: "law", title: "Kanunlar", description: "6331, 4857, 5510 gibi temel kanun kaynakları" },
  { key: "regulation", title: "Yönetmelikler", description: "İSG uygulama ve usul yönetmelikleri" },
  { key: "circular", title: "Genelgeler", description: "Bakanlık genelgeleri ve uygulama duyuruları" },
  { key: "communique", title: "Tebliğler", description: "Resmi tebliğ ve teknik ekler" },
  { key: "guide", title: "Rehberler / Kılavuzlar", description: "Bakanlık, İSGGM ve sektör rehberleri" },
  { key: "standard", title: "Standartlar", description: "Ulusal ve uluslararası standart referansları" },
  { key: "announcement", title: "Diğer içerikler", description: "Tablolar, duyurular ve tamamlayıcı kaynaklar" },
];

export function MevzuatSyncTab() {
  const isSuperAdmin = useIsSuperAdmin();
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<AddMode>("url");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
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
    setSyncProgress({ id: docId, progress: 12, label: "Senkron isteği hazırlanıyor" });
    const progressTimer = window.setInterval(() => {
      setSyncProgress((current) => {
        if (!current || current.id !== docId || current.progress >= 88) return current;
        return { ...current, progress: Math.min(current.progress + 8, 88), label: "Mevzuat kaynağı işleniyor" };
      });
    }, 900);
    try {
      const supabase = createClient();
      if (!supabase) return;
      setSyncProgress({ id: docId, progress: 25, label: "Supabase fonksiyonu çağrılıyor" });

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
        setSyncProgress({ id: docId, progress: 100, label: `Başarısız: ${msg}` });
        setSyncResult({ id: docId, success: false, message: msg });
        return;
      }

      if (data?.error) {
        setSyncProgress({ id: docId, progress: 100, label: `Başarısız: ${data.error}` });
        setSyncResult({ id: docId, success: false, message: data.error });
        return;
      }

      setSyncProgress({ id: docId, progress: 100, label: "Senkron tamamlandı" });
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
      setSyncProgress({
        id: docId,
        progress: 100,
        label: `Başarısız: ${err instanceof Error ? err.message : "Bilinmeyen hata"}`,
      });
    } finally {
      window.clearInterval(progressTimer);
      setSyncing(null);
    }
  }

  async function syncCriticalLaws() {
    setSyncing("critical-laws");
    setSyncResult(null);
    setSyncProgress({ id: "critical-laws", progress: 10, label: "Temel kanunlar hazırlanıyor" });
    const progressTimer = window.setInterval(() => {
      setSyncProgress((current) => {
        if (!current || current.id !== "critical-laws" || current.progress >= 88) return current;
        return { ...current, progress: Math.min(current.progress + 7, 88), label: "6331 / 4857 / 5510 işleniyor" };
      });
    }, 900);
    try {
      const supabase = createClient();
      if (!supabase) return;
      setSyncProgress({ id: "critical-laws", progress: 25, label: "Senkron fonksiyonu çağrılıyor" });

      const { data, error } = await supabase.functions.invoke("sync-mevzuat", {
        body: { action: "sync_by_doc_numbers", doc_numbers: ["6331", "4857", "5510"] },
      });

      if (error) {
        setSyncProgress({ id: "critical-laws", progress: 100, label: `Başarısız: ${error.message}` });
        setSyncResult({ id: "critical-laws", success: false, message: error.message });
        return;
      }
      if (data?.error) {
        setSyncProgress({ id: "critical-laws", progress: 100, label: `Başarısız: ${data.error}` });
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
      setSyncProgress({
        id: "critical-laws",
        progress: 100,
        label: failed.length === 0 ? "Temel kanunlar senkronize edildi" : "Kısmi tamamlandı; hata detayını kontrol edin",
      });
      await loadDocs();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bilinmeyen hata";
      setSyncResult({
        id: "critical-laws",
        success: false,
        message,
      });
      setSyncProgress({ id: "critical-laws", progress: 100, label: `Başarısız: ${message}` });
    } finally {
      window.clearInterval(progressTimer);
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
      let res: Response;
      if (addMode === "pdf") {
        if (!pdfFile) {
          setFormError("PDF dosyası seçmelisiniz.");
          return;
        }
        const formData = new FormData();
        formData.append("title", newDoc.title);
        formData.append("doc_number", newDoc.doc_number);
        formData.append("doc_type", newDoc.doc_type);
        formData.append("source_url", newDoc.source_url.trim());
        formData.append("file", pdfFile);
        res = await fetch("/api/admin/official-legal-catalog/upload", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/admin/official-legal-catalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newDoc.title,
            doc_number: newDoc.doc_number,
            doc_type: newDoc.doc_type,
            source_url: newDoc.source_url.trim() || null,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Kayıt eklenemedi");
        return;
      }
      setShowAddForm(false);
      setNewDoc({ title: "", doc_number: "", doc_type: "regulation", source_url: "" });
      setPdfFile(null);
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

  async function uploadPdfForDocument(doc: LegalDoc, file: File) {
    setSyncing(doc.id);
    setSyncResult(null);
    setSyncProgress({ id: doc.id, progress: 10, label: "PDF yükleniyor" });
    const progressTimer = window.setInterval(() => {
      setSyncProgress((current) => {
        if (!current || current.id !== doc.id || current.progress >= 88) return current;
        const label = current.progress < 45 ? "PDF storage alanına alınıyor" : "PDF metni çıkarılıp chunk oluşturuluyor";
        return { ...current, progress: Math.min(current.progress + 6, 88), label };
      });
    }, 1000);
    try {
      const formData = new FormData();
      formData.append("document_id", doc.id);
      formData.append("title", doc.title);
      formData.append("doc_number", doc.doc_number);
      formData.append("doc_type", doc.doc_type);
      formData.append("source_url", doc.source_url ?? "");
      formData.append("file", file);

      const res = await fetch("/api/admin/official-legal-catalog/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data.error ?? "PDF yüklenemedi";
        setSyncProgress({ id: doc.id, progress: 100, label: `Başarısız: ${message}` });
        setSyncResult({ id: doc.id, success: false, message });
        return;
      }

      const chunkCount = data.document?.chunk_count ?? 0;
      const message =
        chunkCount > 0
          ? `PDF yüklendi ve ${chunkCount} chunk oluşturuldu`
          : "PDF yüklendi ancak metin çıkarılamadı; dosya okunabilir PDF olmayabilir";
      setSyncProgress({ id: doc.id, progress: 100, label: chunkCount > 0 ? "PDF indekslendi" : "PDF yüklendi, metin çıkarılamadı" });
      setSyncResult({ id: doc.id, success: chunkCount > 0, message });
      await loadDocs();
    } catch (err) {
      const message = err instanceof Error ? err.message : "PDF yüklenemedi";
      setSyncProgress({ id: doc.id, progress: 100, label: `Başarısız: ${message}` });
      setSyncResult({ id: doc.id, success: false, message });
    } finally {
      window.clearInterval(progressTimer);
      setSyncing(null);
    }
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

  const sectionedDocs = useMemo(
    () =>
      CATALOG_SECTIONS.map((section) => ({
        ...section,
        docs: docs.filter((doc) => doc.doc_type === section.key),
      })).filter((section) => (filter === "all" ? section.docs.length > 0 : section.key === filter)),
    [docs, filter],
  );
  const syncedCount = docs.filter((d) => d.chunk_count > 0).length;
  const pendingCount = docs.filter((d) => d.chunk_count === 0).length;
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
          Resmi mevzuat kataloğunu türüne göre düzenleyin: kanunlar, yönetmelikler, genelgeler ve diğer kaynaklar
          ayrı bölümlerde görünür. Mevzuat.gov.tr bağlantısı olan kayıtları bağlantıdan çekebilir, PDF kaynaklarını
          manuel yükleyip arama belleğine ekleyebilirsiniz.
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard value={docs.length} label="Katalog kaydı" />
        <StatCard value={syncedCount} label="İndeksli kaynak" valueClass="text-emerald-500" />
        <StatCard value={pendingCount} label="İşlem bekleyen" valueClass="text-amber-500" />
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
      {syncProgress?.id === "critical-laws" && (
        <SyncProgressBar
          progress={syncProgress.progress}
          label={syncProgress.label}
          tone={syncResult?.id === "critical-laws" && !syncResult.success ? "error" : "default"}
        />
      )}

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
              <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
                <button
                  type="button"
                  onClick={() => setAddMode("url")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition",
                    addMode === "url" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Bağlantıdan ekle
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode("pdf")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition",
                    addMode === "pdf" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  <Upload className="h-3.5 w-3.5" />
                  PDF yükle
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
                  label={addMode === "pdf" ? "Resmi kaynak bağlantısı (opsiyonel)" : "Kaynak bağlantısı (mevzuat.gov.tr)"}
                  hint={addMode === "pdf" ? "PDF için varsa resmi sayfa bağlantısı" : "MevzuatNo içeren tam URL"}
                  value={newDoc.source_url}
                  onChange={(e) => setNewDoc((p) => ({ ...p, source_url: e.target.value }))}
                  placeholder="https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=..."
                />
                {addMode === "pdf" && (
                  <label className="flex flex-col gap-2 text-sm sm:col-span-2">
                    <span className="font-medium text-foreground">PDF dosyası</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      required
                      onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary"
                    />
                    {pdfFile && <span className="text-xs text-muted-foreground">{pdfFile.name}</span>}
                  </label>
                )}
              </div>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Kaydediliyor…" : addMode === "pdf" ? "PDF ile kataloğa ekle" : "Bağlantı kaydı ekle"}
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
        <div className="space-y-5">
          {sectionedDocs.map((section) => (
            <CatalogTypeSection
              key={section.key}
              title={section.title}
              description={section.description}
              docs={section.docs}
              syncing={syncing}
              syncResult={syncResult}
              syncProgress={syncProgress}
              onSync={syncSingle}
              onUploadPdf={uploadPdfForDocument}
              onUpdate={updateDocument}
              onDelete={deleteDocument}
            />
          ))}
          {docs.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Bu filtrede katalog kaydı bulunamadı. Yeni bağlantı veya PDF ekleyerek başlayabilirsiniz.
              </CardContent>
            </Card>
          )}
        </div>
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

function SyncProgressBar({
  progress,
  label,
  tone = "default",
}: {
  progress: number;
  label: string;
  tone?: "default" | "success" | "error";
}) {
  const barClass =
    tone === "error" ? "bg-red-500" : tone === "success" ? "bg-emerald-500" : "bg-primary";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span className={cn(tone === "error" && "text-red-500", tone === "success" && "text-emerald-500")}>
          {label}
        </span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all duration-500", barClass)} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function CatalogTypeSection({
  title,
  description,
  docs,
  syncing,
  syncResult,
  syncProgress,
  onSync,
  onUploadPdf,
  onUpdate,
  onDelete,
}: {
  title: string;
  description: string;
  docs: LegalDoc[];
  syncing: string | null;
  syncResult: SyncResult | null;
  syncProgress: SyncProgress | null;
  onSync: (id: string) => void;
  onUploadPdf: (doc: LegalDoc, file: File) => Promise<void>;
  onUpdate: (
    id: string,
    patch: Partial<Pick<LegalDoc, "title" | "doc_number" | "doc_type" | "source_url">>,
  ) => Promise<void>;
  onDelete: (id: string, title: string) => Promise<void>;
}) {
  if (docs.length === 0) return null;
  const synced = docs.filter((doc) => doc.chunk_count > 0).length;
  const needsSource = docs.filter((doc) => !doc.source_url).length;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span>{docs.length} kayıt</span>
          <span>{synced} indeksli</span>
          {needsSource > 0 && <span className="text-amber-500">{needsSource} bağlantısız</span>}
        </div>
      </div>
      <div className="space-y-2">
        {docs.map((doc) => (
          <DocRow
            key={doc.id}
            doc={doc}
            syncing={syncing === doc.id}
            syncResult={syncResult?.id === doc.id ? syncResult : null}
            syncProgress={syncProgress?.id === doc.id ? syncProgress : null}
            onSync={() => onSync(doc.id)}
            onUploadPdf={(file) => onUploadPdf(doc, file)}
            onUpdate={onUpdate}
            onDelete={() => onDelete(doc.id, doc.title)}
          />
        ))}
      </div>
    </div>
  );
}

function DocRow({
  doc,
  syncing,
  syncResult,
  syncProgress,
  onSync,
  onUploadPdf,
  onUpdate,
  onDelete,
}: {
  doc: LegalDoc;
  syncing: boolean;
  syncResult: SyncResult | null;
  syncProgress: SyncProgress | null;
  onSync: () => void;
  onUploadPdf: (file: File) => Promise<void>;
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
  const [showPdfUpload, setShowPdfUpload] = useState(false);
  const [pdfDraft, setPdfDraft] = useState<File | null>(null);

  const hasSynced = doc.chunk_count > 0;
  const metadata = doc.catalog_metadata ?? {};
  const sourceType = typeof metadata.source_type === "string" ? metadata.source_type : "";
  const pdfUrl = typeof metadata.pdf_url === "string" ? metadata.pdf_url : "";
  const isManualPdf = sourceType === "manual_pdf_upload" || Boolean(pdfUrl);
  const canSync = Boolean(doc.source_url?.includes("MevzuatNo="));
  const cannotSync = Boolean(syncResult && !syncResult.success) || (!canSync && !isManualPdf) || (isManualPdf && !hasSynced);
  const rowTone = hasSynced && !cannotSync ? "success" : cannotSync ? "error" : "pending";
  const statusLabel =
    rowTone === "success" ? "Senkronize edildi" : rowTone === "error" ? "Senkronize edilemiyor" : "Beklemede";
  const syncButtonLabel = syncing
    ? "…"
    : canSync
      ? hasSynced
        ? "Tekrar senkron"
        : "Bağlantıdan çek"
      : isManualPdf
        ? "PDF yüklendi"
        : "Bağlantı gerekli";

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

  async function submitPdfUpload() {
    if (!pdfDraft) {
      setRowError("PDF dosyası seçmelisiniz.");
      return;
    }
    setRowError(null);
    await onUploadPdf(pdfDraft);
    setPdfDraft(null);
    setShowPdfUpload(false);
  }

  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border px-4 py-3 transition-colors",
        rowTone === "success" && "border-emerald-500/35 bg-emerald-500/5",
        rowTone === "error" && "border-red-500/40 bg-red-500/5",
        rowTone === "pending" && "border-border bg-card",
      )}
    >
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
              <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                {isManualPdf ? <FileText className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                {isManualPdf ? "PDF kaynağı" : canSync ? "Mevzuat.gov bağlantısı" : "Bağlantı gerekli"}
              </p>
              <p
                className={cn(
                  "text-[11px] font-medium",
                  rowTone === "success" && "text-emerald-600",
                  rowTone === "error" && "text-red-500",
                  rowTone === "pending" && "text-muted-foreground",
                )}
              >
                {statusLabel}
              </p>
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

          {!canSync && !editingLink && !isManualPdf && (
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
            onClick={() => setShowPdfUpload((v) => !v)}
            title="Bu mevzuata PDF yükle"
          >
            <Upload className="h-4 w-4" />
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
            {syncButtonLabel}
          </Button>
        </div>
      </div>

      {showPdfUpload && (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <input
              type="file"
              accept="application/pdf"
              disabled={syncing}
              onChange={(e) => setPdfDraft(e.target.files?.[0] ?? null)}
              className="min-w-[220px] flex-1 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary"
            />
            <Button size="sm" disabled={syncing || !pdfDraft} onClick={() => void submitPdfUpload()}>
              {syncing ? "Yükleniyor…" : "PDF ile güncelle"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={syncing}
              onClick={() => {
                setPdfDraft(null);
                setShowPdfUpload(false);
              }}
            >
              İptal
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Bu PDF mevcut kayda bağlanır; metin çıkarılabilirse eski chunk içerikleri yenilenir.
          </p>
        </div>
      )}

      {syncProgress && (
        <SyncProgressBar
          progress={syncProgress.progress}
          label={syncProgress.label}
          tone={syncResult ? (syncResult.success ? "success" : "error") : "default"}
        />
      )}

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
            {pdfUrl && pdfUrl !== doc.source_url && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <FileText className="h-3 w-3" />
                PDF
              </a>
            )}
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
