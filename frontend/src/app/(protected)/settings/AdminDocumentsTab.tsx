"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "./admin-monitoring-utils";

type AdminDocumentRow = {
  id: string;
  document_key: string;
  title: string;
  category: string;
  summary: string | null;
  current_version: string | null;
  effective_at: string | null;
  is_active: boolean;
  updated_at: string;
};

type AdminDocumentVersionRow = {
  id: string;
  document_id: string;
  version: string;
  status: "draft" | "published" | "archived";
  summary: string | null;
  content_markdown: string;
  effective_at: string | null;
  created_at: string;
  published_at: string | null;
};

function suggestNextVersion(currentVersion: string | null) {
  if (!currentVersion) return "v1.0";
  const match = currentVersion.match(/^v(\d+)(?:\.(\d+))?$/i);
  if (!match) return `draft-${new Date().toISOString().slice(0, 10)}`;
  const major = Number(match[1] ?? 1);
  const minor = Number(match[2] ?? 0) + 1;
  return `v${major}.${minor}`;
}

export function AdminDocumentsTab() {
  const [documents, setDocuments] = useState<AdminDocumentRow[]>([]);
  const [versions, setVersions] = useState<AdminDocumentVersionRow[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [versionValue, setVersionValue] = useState("");
  const [content, setContent] = useState("");
  const [effectiveAt, setEffectiveAt] = useState("");

  const selectedDocument = useMemo(
    () => documents.find((row) => row.id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId],
  );

  const selectedVersion = useMemo(
    () => versions.find((row) => row.id === selectedVersionId) ?? null,
    [versions, selectedVersionId],
  );

  async function load(documentId?: string | null) {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase baglantisi kurulamadi.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: documentRows, error: documentError } = await supabase
      .from("admin_documents")
      .select("*")
      .order("category")
      .order("title");

    if (documentError) {
      setDocuments([]);
      setVersions([]);
      setError(documentError.message);
      setLoading(false);
      return;
    }

    const docs = (documentRows ?? []) as AdminDocumentRow[];
    setDocuments(docs);

    const nextDocumentId = documentId ?? selectedDocumentId ?? docs[0]?.id ?? null;
    setSelectedDocumentId(nextDocumentId);

    if (!nextDocumentId) {
      setVersions([]);
      setSelectedVersionId(null);
      setLoading(false);
      return;
    }

    const { data: versionRows, error: versionError } = await supabase
      .from("admin_document_versions")
      .select("*")
      .eq("document_id", nextDocumentId)
      .order("created_at", { ascending: false });

    if (versionError) {
      setVersions([]);
      setError(versionError.message);
      setLoading(false);
      return;
    }

    const items = (versionRows ?? []) as AdminDocumentVersionRow[];
    setVersions(items);

    const nextVersion =
      items.find((row) => row.status === "draft") ??
      items.find((row) => row.status === "published") ??
      items[0] ??
      null;

    setSelectedVersionId(nextVersion?.id ?? null);
    setSummary(nextVersion?.summary ?? docs.find((row) => row.id === nextDocumentId)?.summary ?? "");
    setVersionValue(nextVersion?.version ?? suggestNextVersion(docs.find((row) => row.id === nextDocumentId)?.current_version ?? null));
    setContent(nextVersion?.content_markdown ?? "");
    setEffectiveAt(
      nextVersion?.effective_at
        ? new Date(nextVersion.effective_at).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    );
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDocumentVersions(documentId: string) {
    await load(documentId);
  }

  async function saveDraft() {
    if (!selectedDocument) return;
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase baglantisi kurulamadi.");
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      document_id: selectedDocument.id,
      version: versionValue.trim(),
      status: "draft" as const,
      summary: summary.trim() || null,
      content_markdown: content,
      effective_at: effectiveAt ? new Date(`${effectiveAt}T00:00:00.000Z`).toISOString() : null,
      created_by: user?.id ?? null,
    };

    let saveError: string | null = null;

    if (selectedVersion && selectedVersion.status === "draft") {
      const { error: updateError } = await supabase
        .from("admin_document_versions")
        .update({
          version: payload.version,
          summary: payload.summary,
          content_markdown: payload.content_markdown,
          effective_at: payload.effective_at,
        })
        .eq("id", selectedVersion.id);
      saveError = updateError?.message ?? null;
    } else {
      const { error: insertError } = await supabase.from("admin_document_versions").insert(payload);
      saveError = insertError?.message ?? null;
    }

    if (saveError) {
      setError(saveError);
    } else {
      setFeedback("Taslak kaydedildi.");
      await load(selectedDocument.id);
    }

    setSaving(false);
  }

  async function publishVersion() {
    if (!selectedDocument) return;
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase baglantisi kurulamadi.");
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const publishAt = effectiveAt ? new Date(`${effectiveAt}T00:00:00.000Z`).toISOString() : new Date().toISOString();
    let versionId = selectedVersion?.id ?? null;

    if (!versionId || selectedVersion?.status !== "draft") {
      const { data, error: insertError } = await supabase
        .from("admin_document_versions")
        .insert({
          document_id: selectedDocument.id,
          version: versionValue.trim(),
          status: "draft",
          summary: summary.trim() || null,
          content_markdown: content,
          effective_at: publishAt,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      versionId = data?.id ?? null;
    }

    const { error: publishError } = await supabase
      .from("admin_document_versions")
      .update({
        version: versionValue.trim(),
        status: "published",
        summary: summary.trim() || null,
        content_markdown: content,
        effective_at: publishAt,
        published_at: new Date().toISOString(),
      })
      .eq("id", versionId);

    if (publishError) {
      setError(publishError.message);
      setSaving(false);
      return;
    }

    await supabase
      .from("admin_document_versions")
      .update({ status: "archived" })
      .eq("document_id", selectedDocument.id)
      .eq("status", "published")
      .neq("id", versionId);

    const { error: documentUpdateError } = await supabase
      .from("admin_documents")
      .update({
        summary: summary.trim() || null,
        current_version: versionValue.trim(),
        effective_at: publishAt,
      })
      .eq("id", selectedDocument.id);

    if (documentUpdateError) {
      setError(documentUpdateError.message);
    } else {
      setFeedback("Belge yeni versiyonla yayina alindi.");
      await load(selectedDocument.id);
    }

    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Belgeler</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Hukuki ve operasyonel belgeleri versiyonlu olarak yonetin, taslak olusturun ve yayina alin.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(selectedDocumentId)}
            className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
          >
            Yenile
          </button>
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

        <div className="mt-5 grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                Belgeler yukleniyor...
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                Belge tanimi bulunmuyor.
              </div>
            ) : (
              documents.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => void loadDocumentVersions(document.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedDocumentId === document.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-foreground">{document.title}</div>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground">
                      {document.category}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {document.current_version || "Versiyon yok"} | {formatDateTime(document.effective_at)}
                  </div>
                  {document.summary && <p className="mt-2 text-xs text-muted-foreground">{document.summary}</p>}
                </button>
              ))
            )}
          </aside>

          <section className="rounded-2xl border border-border bg-background p-4">
            {!selectedDocument ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                Duzenlemek icin soldan bir belge secin.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
                  <input
                    value={summary}
                    onChange={(event) => setSummary(event.target.value)}
                    placeholder="Kisa ozet"
                    className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                  <input
                    value={versionValue}
                    onChange={(event) => setVersionValue(event.target.value)}
                    placeholder="Versiyon"
                    className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                  <input
                    type="date"
                    value={effectiveAt}
                    onChange={(event) => setEffectiveAt(event.target.value)}
                    className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="space-y-3">
                    <textarea
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      rows={22}
                      placeholder="Belge markdown icerigi"
                      className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
                    />
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void saveDraft()}
                        disabled={saving || !versionValue.trim()}
                        className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving ? "Kaydediliyor..." : "Taslak kaydet"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void publishVersion()}
                        disabled={saving || !versionValue.trim()}
                        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving ? "Yayina aliniyor..." : "Yayina al"}
                      </button>
                    </div>
                  </div>

                  <aside className="rounded-2xl border border-border bg-card p-4">
                    <h4 className="text-sm font-semibold text-foreground">Versiyonlar</h4>
                    <div className="mt-3 space-y-2">
                      {versions.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Bu belge icin versiyon kaydi yok.</div>
                      ) : (
                        versions.map((version) => (
                          <button
                            key={version.id}
                            type="button"
                            onClick={() => {
                              setSelectedVersionId(version.id);
                              setSummary(version.summary ?? "");
                              setVersionValue(version.version);
                              setContent(version.content_markdown);
                              setEffectiveAt(
                                version.effective_at
                                  ? new Date(version.effective_at).toISOString().slice(0, 10)
                                  : new Date().toISOString().slice(0, 10),
                              );
                            }}
                            className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                              selectedVersionId === version.id
                                ? "border-primary bg-primary/5"
                                : "border-border bg-background hover:border-primary/40"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-medium text-foreground">{version.version}</div>
                              <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground">
                                {version.status}
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              {formatDateTime(version.published_at || version.created_at)}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </aside>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
