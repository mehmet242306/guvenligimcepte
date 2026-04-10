"use client";

import { useEffect, useRef, useState } from "react";

type MediaAsset = {
  id: string;
  asset_type: "image" | "video" | "document";
  file_name: string;
  public_url: string;
  file_size_bytes: number;
  mime_type: string;
  created_at: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, assetType: string) => void;
  accept?: "image" | "video" | "all";
};

export function MediaPickerModal({ open, onClose, onSelect, accept = "image" }: Props) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"library" | "upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    loadAssets();
  }, [open]);

  async function loadAssets() {
    setLoading(true);
    try {
      const res = await fetch("/api/slide-media-upload");
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/slide-media-upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Yükleme hatası");
      }
      const data = await res.json();
      onSelect(data.url, data.asset_type);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleUrlSubmit() {
    if (!urlInput.trim()) return;
    onSelect(urlInput.trim(), accept === "video" ? "video" : "image");
    setUrlInput("");
    onClose();
  }

  const filtered = assets.filter((a) => {
    if (accept === "all") return true;
    if (accept === "image") return a.asset_type === "image";
    if (accept === "video") return a.asset_type === "video";
    return true;
  });

  const acceptAttr = accept === "video" ? "video/*" : accept === "image" ? "image/*" : "image/*,video/*,application/pdf";

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl bg-[var(--card)] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            {accept === "video" ? "Video Ekle" : "Görsel Ekle"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--border)] p-2">
          <button
            onClick={() => setTab("upload")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === "upload" ? "bg-[var(--gold)] text-white" : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
            }`}
          >
            ⬆️ Yükle
          </button>
          <button
            onClick={() => setTab("library")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === "library" ? "bg-[var(--gold)] text-white" : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
            }`}
          >
            📚 Kütüphane ({filtered.length})
          </button>
          <button
            onClick={() => setTab("url")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === "url" ? "bg-[var(--gold)] text-white" : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
            }`}
          >
            🔗 URL
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "upload" && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptAttr}
                onChange={handleUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--background)] p-12 text-center transition-colors hover:border-[var(--gold)] hover:bg-[var(--gold)]/5 disabled:opacity-50"
              >
                <div className="mb-3 text-5xl">{uploading ? "⏳" : accept === "video" ? "🎥" : "🖼️"}</div>
                <div className="text-sm font-semibold text-[var(--foreground)]">
                  {uploading ? "Yükleniyor..." : "Dosya seçmek için tıkla"}
                </div>
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {accept === "video" ? "MP4, WebM" : "JPEG, PNG, WebP, GIF, SVG"} — Maks. 50 MB
                </div>
              </button>
              {error && (
                <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500">
                  {error}
                </div>
              )}
            </div>
          )}

          {tab === "library" && (
            <>
              {loading ? (
                <div className="text-center text-sm text-[var(--muted-foreground)] py-12">Yükleniyor...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center text-sm text-[var(--muted-foreground)] py-12">
                  Henüz medya yok. "Yükle" sekmesinden ekleyebilirsin.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {filtered.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        onSelect(a.public_url, a.asset_type);
                        onClose();
                      }}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] hover:border-[var(--gold)]"
                    >
                      {a.asset_type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.public_url} alt={a.file_name} className="h-full w-full object-cover" />
                      ) : a.asset_type === "video" ? (
                        <div className="flex h-full w-full items-center justify-center bg-black/50 text-3xl">🎥</div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl">📄</div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1 text-[9px] text-white truncate">
                        {a.file_name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "url" && (
            <div>
              <label className="mb-2 block text-xs font-semibold text-[var(--muted-foreground)]">
                {accept === "video" ? "Video URL (YouTube, Vimeo, MP4)" : "Görsel URL"}
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={accept === "video" ? "https://youtube.com/watch?v=..." : "https://..."}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUrlSubmit();
                }}
              />
              <button
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim()}
                className="mt-3 w-full rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                URL'yi Kullan
              </button>
              <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                {accept === "video"
                  ? "YouTube ve Vimeo URL'leri otomatik gömülü oynatıcıya dönüşür."
                  : "Harici bir görsel URL'si girebilirsin."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
