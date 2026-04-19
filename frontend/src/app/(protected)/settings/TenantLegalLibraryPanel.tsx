"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TenantLegalDocument {
  id: string;
  title: string;
  doc_type: string;
  doc_number: string | null;
  source_url: string | null;
  updated_at: string | null;
  jurisdiction_code: string | null;
  corpus_scope: "official" | "tenant_private";
  workspace_id: string | null;
}

type LoadState = {
  workspaceId: string | null;
  workspaceName: string | null;
  jurisdictionCode: string;
  items: TenantLegalDocument[];
};

const DOC_TYPES = [
  { value: "law", label: "Kanun" },
  { value: "regulation", label: "Yonetmelik" },
  { value: "communique", label: "Teblig" },
  { value: "guide", label: "Rehber" },
  { value: "announcement", label: "Duyuru" },
  { value: "circular", label: "Genelge" },
] as const;

export function TenantLegalLibraryPanel() {
  const [state, setState] = useState<LoadState>({
    workspaceId: null,
    workspaceName: null,
    jurisdictionCode: "TR",
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<(typeof DOC_TYPES)[number]["value"]>("guide");
  const [docNumber, setDocNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/legal-library-upload?scope=tenant_private", {
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        throw new Error(data?.error || "Tenant-private hukuk kutuphanesi yuklenemedi.");
      }
      setState({
        workspaceId: data.workspaceId ?? null,
        workspaceName: data.workspaceName ?? null,
        jurisdictionCode: data.jurisdictionCode ?? "TR",
        items: Array.isArray(data.items) ? data.items : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const canUpload = Boolean(state.workspaceId);

  const stats = useMemo(() => {
    return {
      total: state.items.length,
      docsWithFile: state.items.filter((item) => item.source_url).length,
    };
  }, [state.items]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Yuklemek icin bir dosya secin.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("docType", docType);
      formData.set("docNumber", docNumber);
      formData.set("file", file);

      const response = await fetch("/api/legal-library-upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        throw new Error(data?.error || "Belge yuklenemedi.");
      }

      setTitle("");
      setDocNumber("");
      setFile(null);
      setMessage("Tenant-private belge basariyla eklendi.");
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/legal-library-upload?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        throw new Error(data?.error || "Belge silinemedi.");
      }
      setMessage("Tenant-private belge kaldirildi.");
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Tenant-private belge</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-primary">{state.jurisdictionCode}</p>
            <p className="text-xs text-muted-foreground">Aktif jurisdiction</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="truncate text-lg font-bold text-foreground">{state.workspaceName ?? "Secili degil"}</p>
            <p className="text-xs text-muted-foreground">Aktif workspace</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-emerald-500">{stats.docsWithFile}</p>
            <p className="text-xs text-muted-foreground">Kaynak dosyali</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">Tenant Private</Badge>
            <Badge variant="neutral">{state.jurisdictionCode}</Badge>
            {state.workspaceName ? <Badge variant="success">{state.workspaceName}</Badge> : null}
          </div>
          <h3 className="text-base font-semibold text-foreground">Workspace'e ozel hukuk kutuphanesi</h3>
          <p className="text-sm leading-6 text-muted-foreground">
            Buraya yuklenen belgeler sadece aktif workspace icin ikinci katman RAG kaynagi olur.
            Resmi mevzuatin yerine gecmez; onu tamamlar.
          </p>
        </div>

        {!canUpload ? (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
            Yukleme icin once aktif bir workspace secilmeli.
          </div>
        ) : (
          <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Baslik</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none ring-0 transition focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Belge tipi</span>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as (typeof DOC_TYPES)[number]["value"])}
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
              >
                {DOC_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Belge numarasi</span>
              <input
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Dosya</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
                className="h-11 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-primary"
              />
            </label>
            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={submitting || !canUpload}>
                {submitting ? "Yukleniyor..." : "Tenant-private belge ekle"}
              </Button>
              <Button type="button" variant="outline" onClick={() => void loadItems()}>
                Listeyi yenile
              </Button>
              {message ? <span className="text-xs text-emerald-600">{message}</span> : null}
              {error ? <span className="text-xs text-rose-600">{error}</span> : null}
            </div>
          </form>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Yuklu tenant-private belgeler</h3>
          <Badge variant="neutral">{state.items.length} kayit</Badge>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-20 w-full" />
            ))}
          </div>
        ) : state.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground">
            Bu workspace icin henuz tenant-private hukuk belgesi yuklenmedi.
          </div>
        ) : (
          state.items.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                  <Badge variant="warning">Private</Badge>
                  <Badge variant="neutral">{item.jurisdiction_code || state.jurisdictionCode}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>Tip: {item.doc_type}</span>
                  {item.doc_number ? <span>No: {item.doc_number}</span> : null}
                  {item.updated_at ? (
                    <span>
                      Guncelleme: {new Date(item.updated_at).toLocaleDateString("tr-TR")}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {item.source_url ? (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "inline-flex items-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition",
                      "hover:border-primary/30 hover:text-primary",
                    )}
                  >
                    Kaynagi ac
                  </a>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={deletingId === item.id}
                  onClick={() => void handleDelete(item.id)}
                >
                  {deletingId === item.id ? "Siliniyor..." : "Kaldir"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
