"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchDeckById,
  fetchSlides,
  createSlide,
  updateSlide,
  deleteSlide,
  reorderSlides,
  updateDeck,
  type SlideDeck,
  type Slide,
  type SlideLayout,
  type SlideContent,
} from "@/lib/supabase/slide-deck-api";
import { DecorationLayer } from "@/components/slides/DecorationLayer";
import { MediaPickerModal } from "@/components/slides/MediaPickerModal";

const LAYOUTS: { key: SlideLayout; label: string; icon: string }[] = [
  { key: "cover", label: "Kapak", icon: "🎯" },
  { key: "title_content", label: "Başlık + İçerik", icon: "📝" },
  { key: "bullet_list", label: "Madde Listesi", icon: "📋" },
  { key: "two_column", label: "2 Kolon", icon: "⚌" },
  { key: "image_text", label: "Görsel + Metin", icon: "🖼️" },
  { key: "image_full", label: "Tam Görsel", icon: "🖼" },
  { key: "quote", label: "Alıntı", icon: "💬" },
  { key: "section_header", label: "Bölüm Başlığı", icon: "📑" },
  { key: "video", label: "Video", icon: "🎥" },
  { key: "summary", label: "Özet", icon: "✅" },
];

const THEMES: Record<string, { bg: string; text: string; accent: string; fontStack: string }> = {
  modern: { bg: "#FFFFFF", text: "#0F172A", accent: "#F97316", fontStack: "ui-sans-serif, system-ui" },
  classic: { bg: "#FDFBF7", text: "#1F2937", accent: "#8B5A2B", fontStack: "Georgia, serif" },
  dark: { bg: "#0F172A", text: "#F8FAFC", accent: "#FBBF24", fontStack: "ui-sans-serif, system-ui" },
  corporate: { bg: "#F8FAFC", text: "#0F172A", accent: "#2563EB", fontStack: "ui-sans-serif, system-ui" },
};

export function SlideEditorClient({ deckId }: { deckId: string }) {
  const router = useRouter();
  const [deck, setDeck] = useState<SlideDeck | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDeck, setSavingDeck] = useState(false);
  const [dirtySlideId, setDirtySlideId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Media picker
  const [mediaPicker, setMediaPicker] = useState<{ open: boolean; accept: "image" | "video"; field: "image_url" | "video_url" | "background_image_url" }>({
    open: false,
    accept: "image",
    field: "image_url",
  });

  // Add slide menu / AI modal
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLayout, setAiLayout] = useState<SlideLayout | "">("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, s] = await Promise.all([fetchDeckById(deckId), fetchSlides(deckId)]);
    setDeck(d);
    setSlides(s);
    if (!activeId && s.length > 0) setActiveId(s[0].id);
    setLoading(false);
  }, [deckId, activeId]);

  useEffect(() => { load(); }, [load]);

  const active = slides.find((s) => s.id === activeId) || null;

  async function addSlide(layout: SlideLayout = "title_content") {
    const defaultContent: SlideContent = layout === "cover"
      ? { title: "Kapak Başlığı", subtitle: "Alt başlık" }
      : layout === "section_header"
      ? { title: "Yeni Bölüm" }
      : layout === "bullet_list"
      ? { title: "Madde Listesi", bullets: ["Birinci madde", "İkinci madde", "Üçüncü madde"] }
      : layout === "two_column"
      ? { title: "İki Kolon Başlığı", left: { title: "Sol", body: "Sol içerik" }, right: { title: "Sağ", body: "Sağ içerik" } }
      : layout === "quote"
      ? { body: "Alıntı metni buraya...", caption: "— Yazar" }
      : layout === "summary"
      ? { title: "Özet", bullets: ["Ana nokta 1", "Ana nokta 2", "Ana nokta 3"] }
      : layout === "video"
      ? { title: "Video", video_url: "" }
      : layout === "image_full"
      ? { image_url: "", caption: "" }
      : layout === "image_text"
      ? { title: "Başlık", body: "Metin içeriği", image_url: "" }
      : { title: "Yeni Slayt", body: "İçerik buraya yazın..." };

    const newSlide = await createSlide(deckId, { layout, content: defaultContent });
    if (newSlide) {
      const updated = await fetchSlides(deckId);
      setSlides(updated);
      setActiveId(newSlide.id);
    }
  }

  async function removeSlide(id: string) {
    if (!confirm("Bu slaytı silmek istediğinize emin misiniz?")) return;
    const ok = await deleteSlide(id);
    if (ok) {
      const updated = await fetchSlides(deckId);
      setSlides(updated);
      if (activeId === id) setActiveId(updated[0]?.id || null);
    }
  }

  async function duplicateSlide(slide: Slide) {
    const copy = await createSlide(deckId, {
      layout: slide.layout,
      content: slide.content,
      speaker_notes: slide.speaker_notes || undefined,
    });
    if (copy) {
      const updated = await fetchSlides(deckId);
      setSlides(updated);
      setActiveId(copy.id);
    }
  }

  function updateActiveContent(patch: Partial<SlideContent>) {
    if (!active) return;
    const next = { ...active, content: { ...active.content, ...patch } };
    setSlides((prev) => prev.map((s) => (s.id === active.id ? next : s)));
    setDirtySlideId(active.id);
    scheduleAutosave(next);
  }

  function updateActiveLayout(layout: SlideLayout) {
    if (!active) return;
    const next = { ...active, layout };
    setSlides((prev) => prev.map((s) => (s.id === active.id ? next : s)));
    setDirtySlideId(active.id);
    scheduleAutosave(next);
  }

  function updateActiveNotes(notes: string) {
    if (!active) return;
    const next = { ...active, speaker_notes: notes };
    setSlides((prev) => prev.map((s) => (s.id === active.id ? next : s)));
    setDirtySlideId(active.id);
    scheduleAutosave(next);
  }

  function scheduleAutosave(slide: Slide) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await updateSlide(slide.id, {
        content: slide.content,
        layout: slide.layout,
        speaker_notes: slide.speaker_notes,
      });
      setDirtySlideId(null);
    }, 800);
  }

  async function handleAIGenerate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const activeIdx = activeId ? slides.findIndex((s) => s.id === activeId) : -1;
      const res = await fetch("/api/slide-single-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deckId,
          prompt: aiPrompt,
          layout: aiLayout || undefined,
          insertAfter: activeIdx >= 0 ? activeIdx : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "AI hatası");
      }
      const { slide: newSlide } = await res.json();
      const updated = await fetchSlides(deckId);
      setSlides(updated);
      setActiveId(newSlide.id);
      setShowAIModal(false);
      setAiPrompt("");
      setAiLayout("");
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function moveSlide(id: string, dir: -1 | 1) {
    const idx = slides.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= slides.length) return;
    const reordered = [...slides];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    setSlides(reordered);
    await reorderSlides(deckId, reordered.map((s) => s.id));
  }

  async function saveDeckMeta() {
    if (!deck) return;
    setSavingDeck(true);
    await updateDeck(deck.id, {
      title: deck.title,
      description: deck.description,
      category: deck.category,
      theme: deck.theme,
      visibility: deck.visibility,
    });
    setSavingDeck(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-[var(--muted-foreground)]">Yükleniyor...</div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-[var(--muted-foreground)]">Deck bulunamadı</div>
      </div>
    );
  }

  const theme = THEMES[deck.theme] || THEMES.modern;

  return (
    <div className="flex h-[calc(100vh-100px)] flex-col bg-[var(--background)]">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link
            href="/training/slides"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--accent)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <input
            type="text"
            value={deck.title}
            onChange={(e) => setDeck({ ...deck, title: e.target.value })}
            onBlur={saveDeckMeta}
            className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-[var(--foreground)] hover:border-[var(--border)] focus:border-[var(--gold)] focus:outline-none"
          />
          {dirtySlideId && (
            <span className="text-xs text-amber-500">• Kaydediliyor...</span>
          )}
          {savingDeck && <span className="text-xs text-amber-500">Kaydediliyor...</span>}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={deck.theme}
            onChange={(e) => {
              setDeck({ ...deck, theme: e.target.value });
              updateDeck(deck.id, { theme: e.target.value });
            }}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs"
          >
            <option value="modern">Modern</option>
            <option value="classic">Klasik</option>
            <option value="dark">Koyu</option>
            <option value="corporate">Kurumsal</option>
          </select>
          <select
            value={deck.visibility}
            onChange={(e) => {
              const v = e.target.value as "private" | "organization";
              setDeck({ ...deck, visibility: v });
              updateDeck(deck.id, { visibility: v });
            }}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs"
          >
            <option value="private">🔒 Özel</option>
            <option value="organization">🏢 Organizasyon</option>
          </select>
          <Link
            href={`/training/slides/${deckId}/analytics`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--accent)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Analitik
          </Link>
          <button
            onClick={async () => {
              const res = await fetch("/api/slide-deck-export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deckId }),
              });
              if (!res.ok) {
                alert("Export hatası");
                return;
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${deck.title}.pptx`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--accent)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            PPTX
          </button>
          <Link
            href={`/training/slides/${deckId}/present`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Sun
          </Link>
        </div>
      </div>

      {/* Main layout: sidebar | editor | inspector */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: slide thumbnails */}
        <div className="w-56 overflow-y-auto border-r border-[var(--border)] bg-[var(--card)]">
          <div className="p-3 space-y-2">
            <button
              onClick={() => setShowAIModal(true)}
              className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 py-2 text-xs font-bold text-white hover:brightness-110 shadow flex items-center justify-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
              AI ile Slayt Ekle
            </button>
            <div className="relative">
              <button
                onClick={() => setShowAddMenu((x) => !x)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--accent)] flex items-center justify-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Boş Slayt
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {showAddMenu && (
                <>
                  <div className="fixed inset-0 z-[55]" onClick={() => setShowAddMenu(false)} />
                  <div className="absolute left-0 right-0 top-full z-[56] mt-1 max-h-96 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-xl">
                    {LAYOUTS.map((l) => (
                      <button
                        key={l.key}
                        onClick={() => {
                          addSlide(l.key);
                          setShowAddMenu(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--foreground)] hover:bg-[var(--accent)]"
                      >
                        <span className="text-base">{l.icon}</span>
                        <span>{l.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="px-2 pb-3 space-y-2">
            {slides.map((s, i) => (
              <div
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`group relative cursor-pointer rounded-lg border p-2 text-xs transition-all ${
                  activeId === s.id
                    ? "border-[var(--gold)] bg-[var(--gold)]/5"
                    : "border-[var(--border)] hover:border-[var(--gold)]/40"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-[var(--muted-foreground)]">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-semibold text-[var(--foreground)]">
                      {s.content.title || `Slayt ${i + 1}`}
                    </div>
                    <div className="text-[10px] text-[var(--muted-foreground)]">{LAYOUTS.find((l) => l.key === s.layout)?.label}</div>
                  </div>
                </div>
                <div className="absolute top-1 right-1 hidden gap-0.5 group-hover:flex">
                  <button onClick={(e) => { e.stopPropagation(); moveSlide(s.id, -1); }} className="rounded bg-white/90 dark:bg-black/90 p-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"/></svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); moveSlide(s.id, 1); }} className="rounded bg-white/90 dark:bg-black/90 p-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); duplicateSlide(s); }} className="rounded bg-white/90 dark:bg-black/90 p-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); removeSlide(s.id); }} className="rounded bg-white/90 dark:bg-black/90 p-0.5 text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main editor canvas */}
        <div className="flex flex-1 items-center justify-center overflow-auto bg-gray-100 dark:bg-gray-900 p-6">
          {active ? (
            <div
              className="relative aspect-video w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden flex items-center justify-center"
              style={{
                background: active.background_color || theme.bg,
                color: theme.text,
                fontFamily: theme.fontStack,
              }}
            >
              <DecorationLayer decorations={active.content?.decorations} theme={theme} z="back" />
              <div className="relative z-[5] w-full h-full flex items-center justify-center">
                <SlideCanvas
                  slide={active}
                  theme={theme}
                  onChange={updateActiveContent}
                  onPickMedia={(field) => {
                    const accept = field === "video_url" ? "video" : "image";
                    setMediaPicker({ open: true, accept: accept as any, field });
                  }}
                />
              </div>
              <DecorationLayer decorations={active.content?.decorations} theme={theme} z="front" />
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center text-[var(--muted-foreground)]">
              <p className="mb-4">Henüz slayt yok</p>
              <button onClick={() => addSlide("cover")} className="rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-white">
                İlk Slaytı Ekle
              </button>
            </div>
          )}
        </div>

        {/* AI Slide Modal */}
        {showAIModal && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
            onClick={() => !aiLoading && setShowAIModal(false)}
          >
            <div
              className="w-full max-w-lg rounded-2xl bg-[var(--card)] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-2xl">✨</span>
                <h2 className="text-xl font-bold text-[var(--foreground)]">AI ile Slayt Oluştur</h2>
              </div>
              <p className="mb-4 text-xs text-[var(--muted-foreground)]">
                Nova AI mevcut deck'inin başlığını ve slaytlarını bağlam olarak kullanıp yeni bir slayt hazırlar
              </p>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--muted-foreground)]">
                    Ne hakkında bir slayt olsun? *
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={4}
                    autoFocus
                    placeholder="Örn: Yangın söndürücü türleri ve doğru kullanım tekniği. ABC tozlu, CO2, köpük ve su esaslı söndürücülerin farkları."
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--muted-foreground)]">
                    Layout (opsiyonel — AI otomatik seçer)
                  </label>
                  <select
                    value={aiLayout}
                    onChange={(e) => setAiLayout(e.target.value as SlideLayout | "")}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                  >
                    <option value="">🤖 Otomatik seç</option>
                    {LAYOUTS.map((l) => (
                      <option key={l.key} value={l.key}>
                        {l.icon} {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                {active && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3 text-[11px] text-[var(--muted-foreground)]">
                    💡 Yeni slayt <b>{activeId ? `"${active.content?.title || `Slayt ${slides.findIndex(s => s.id === activeId) + 1}`}"` : "son slaytın"}</b> ardına eklenecek
                  </div>
                )}

                {aiError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-500">
                    {aiError}
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setShowAIModal(false)}
                  disabled={aiLoading}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
                >
                  İptal
                </button>
                <button
                  onClick={handleAIGenerate}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="flex-1 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50 shadow"
                >
                  {aiLoading ? "Üretiliyor..." : "✨ Oluştur"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Media Picker Modal */}
        <MediaPickerModal
          open={mediaPicker.open}
          accept={mediaPicker.accept}
          onClose={() => setMediaPicker((p) => ({ ...p, open: false }))}
          onSelect={(url) => {
            if (mediaPicker.field === "background_image_url") {
              if (!active) return;
              updateSlide(active.id, { background_image_url: url });
              setSlides((prev) => prev.map((s) => (s.id === active.id ? { ...s, background_image_url: url } : s)));
            } else {
              updateActiveContent({ [mediaPicker.field]: url } as any);
            }
          }}
        />

        {/* Inspector */}
        <div className="w-72 overflow-y-auto border-l border-[var(--border)] bg-[var(--card)] p-4">
          <h3 className="mb-3 text-xs font-bold uppercase text-[var(--muted-foreground)]">Düzen</h3>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {LAYOUTS.map((l) => (
              <button
                key={l.key}
                onClick={() => updateActiveLayout(l.key)}
                className={`rounded-lg border p-2 text-center transition-all ${
                  active?.layout === l.key
                    ? "border-[var(--gold)] bg-[var(--gold)]/10"
                    : "border-[var(--border)] hover:border-[var(--gold)]/40"
                }`}
              >
                <div className="text-lg">{l.icon}</div>
                <div className="text-[10px] font-semibold text-[var(--foreground)]">{l.label}</div>
              </button>
            ))}
          </div>

          {active && (
            <>
              <h3 className="mb-2 text-xs font-bold uppercase text-[var(--muted-foreground)]">Konuşmacı Notları</h3>
              <textarea
                value={active.speaker_notes || ""}
                onChange={(e) => updateActiveNotes(e.target.value)}
                rows={6}
                placeholder="Bu slayt için notlar..."
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 text-xs text-[var(--foreground)]"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* SlideCanvas — editable slide body                                    */
/* ================================================================== */

function SlideCanvas({
  slide,
  theme,
  onChange,
  onPickMedia,
}: {
  slide: Slide;
  theme: { bg: string; text: string; accent: string; fontStack: string };
  onChange: (patch: Partial<SlideContent>) => void;
  onPickMedia: (field: "image_url" | "video_url" | "background_image_url") => void;
}) {
  const c = slide.content;

  const baseInput = "bg-transparent border-2 border-transparent hover:border-dashed hover:border-white/30 focus:border-white/60 focus:bg-white/5 rounded-lg p-2 outline-none resize-none w-full";

  switch (slide.layout) {
    case "cover":
      return (
        <div className="flex h-full w-full flex-col items-center justify-center px-16 text-center">
          <textarea
            value={c.title || ""}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Kapak Başlığı"
            rows={2}
            className={`${baseInput} text-center text-4xl md:text-5xl font-extrabold leading-tight break-words`}
            style={{ color: theme.accent, wordBreak: "break-word" }}
          />
          <textarea
            value={c.subtitle || ""}
            onChange={(e) => onChange({ subtitle: e.target.value })}
            placeholder="Alt başlık"
            rows={2}
            className={`${baseInput} mt-4 text-center text-lg md:text-xl opacity-80 leading-snug`}
          />
        </div>
      );

    case "section_header":
      return (
        <div className="flex h-full w-full items-center justify-center px-16">
          <div className="w-full text-center">
            <div className="mb-4 inline-block h-1 w-20" style={{ background: theme.accent }} />
            <input
              value={c.title || ""}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Bölüm Başlığı"
              className={`${baseInput} text-center text-4xl font-bold`}
            />
          </div>
        </div>
      );

    case "title_content":
      return (
        <div className="h-full w-full p-12">
          <input
            value={c.title || ""}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Başlık"
            className={`${baseInput} text-3xl font-bold`}
            style={{ color: theme.accent }}
          />
          <div className="my-3 h-0.5 w-16" style={{ background: theme.accent }} />
          <textarea
            value={c.body || ""}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder="İçerik metni..."
            rows={10}
            className={`${baseInput} text-lg leading-relaxed`}
          />
        </div>
      );

    case "bullet_list":
      return (
        <div className="h-full w-full p-12">
          <input
            value={c.title || ""}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Başlık"
            className={`${baseInput} text-3xl font-bold`}
            style={{ color: theme.accent }}
          />
          <div className="my-3 h-0.5 w-16" style={{ background: theme.accent }} />
          <div className="space-y-2">
            {(c.bullets || []).map((b, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: theme.accent }} />
                <input
                  value={b}
                  onChange={(e) => {
                    const next = [...(c.bullets || [])];
                    next[i] = e.target.value;
                    onChange({ bullets: next });
                  }}
                  className={`${baseInput} text-lg`}
                />
                <button
                  onClick={() => {
                    const next = (c.bullets || []).filter((_, j) => j !== i);
                    onChange({ bullets: next });
                  }}
                  className="text-xs opacity-40 hover:opacity-100"
                  title="Sil"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => onChange({ bullets: [...(c.bullets || []), "Yeni madde"] })}
              className="mt-3 rounded-lg border border-dashed border-current px-4 py-2 text-sm opacity-60 hover:opacity-100"
            >
              + Madde Ekle
            </button>
          </div>
        </div>
      );

    case "two_column":
      return (
        <div className="h-full w-full p-12">
          <input
            value={c.title || ""}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Başlık"
            className={`${baseInput} text-3xl font-bold`}
            style={{ color: theme.accent }}
          />
          <div className="my-3 h-0.5 w-16" style={{ background: theme.accent }} />
          <div className="grid grid-cols-2 gap-6">
            <div>
              <input
                value={c.left?.title || ""}
                onChange={(e) => onChange({ left: { ...(c.left || {}), title: e.target.value } })}
                placeholder="Sol başlık"
                className={`${baseInput} text-xl font-semibold`}
              />
              <textarea
                value={c.left?.body || ""}
                onChange={(e) => onChange({ left: { ...(c.left || {}), body: e.target.value } })}
                placeholder="Sol içerik"
                rows={8}
                className={`${baseInput} text-base`}
              />
            </div>
            <div>
              <input
                value={c.right?.title || ""}
                onChange={(e) => onChange({ right: { ...(c.right || {}), title: e.target.value } })}
                placeholder="Sağ başlık"
                className={`${baseInput} text-xl font-semibold`}
              />
              <textarea
                value={c.right?.body || ""}
                onChange={(e) => onChange({ right: { ...(c.right || {}), body: e.target.value } })}
                placeholder="Sağ içerik"
                rows={8}
                className={`${baseInput} text-base`}
              />
            </div>
          </div>
        </div>
      );

    case "image_text":
      return (
        <div className="h-full w-full p-12">
          <input
            value={c.title || ""}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Başlık"
            className={`${baseInput} text-3xl font-bold`}
            style={{ color: theme.accent }}
          />
          <div className="my-3 h-0.5 w-16" style={{ background: theme.accent }} />
          <div className="grid grid-cols-2 gap-6">
            <button
              type="button"
              onClick={() => onPickMedia("image_url")}
              className="relative flex h-60 items-center justify-center rounded-lg border-2 border-dashed border-white/30 hover:border-white/60 transition-colors group overflow-hidden"
            >
              {c.image_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.image_url} alt="" className="max-h-full max-w-full rounded" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                    <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-semibold">🖼️ Değiştir</span>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="text-3xl mb-2">🖼️</div>
                  <span className="text-sm opacity-60">Görsel ekle</span>
                </div>
              )}
            </button>
            <textarea
              value={c.body || ""}
              onChange={(e) => onChange({ body: e.target.value })}
              placeholder="Metin..."
              rows={10}
              className={`${baseInput} text-lg`}
            />
          </div>
        </div>
      );

    case "image_full":
      return (
        <div className="h-full w-full flex flex-col">
          <button
            type="button"
            onClick={() => onPickMedia("image_url")}
            className="relative flex-1 flex items-center justify-center bg-black/5 hover:bg-black/10 group overflow-hidden"
          >
            {c.image_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image_url} alt="" className="max-h-full max-w-full object-contain" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                  <span className="opacity-0 group-hover:opacity-100 text-white text-base font-semibold">🖼️ Görseli Değiştir</span>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="text-5xl mb-3">🖼️</div>
                <div className="text-sm opacity-60">Tıkla ve görsel seç</div>
              </div>
            )}
          </button>
          <div className="p-4">
            <input
              value={c.caption || ""}
              onChange={(e) => onChange({ caption: e.target.value })}
              placeholder="Açıklama (opsiyonel)"
              className={`${baseInput} text-sm`}
            />
          </div>
        </div>
      );

    case "quote":
      return (
        <div className="flex h-full w-full items-center justify-center px-20">
          <div className="w-full text-center">
            <div className="text-6xl opacity-20">"</div>
            <textarea
              value={c.body || ""}
              onChange={(e) => onChange({ body: e.target.value })}
              placeholder="Alıntı metni..."
              rows={4}
              className={`${baseInput} text-center text-2xl italic`}
            />
            <input
              value={c.caption || ""}
              onChange={(e) => onChange({ caption: e.target.value })}
              placeholder="— Yazar"
              className={`${baseInput} mt-4 text-center text-lg opacity-70`}
              style={{ color: theme.accent }}
            />
          </div>
        </div>
      );

    case "video":
      return (
        <div className="h-full w-full p-12">
          <input
            value={c.title || ""}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Başlık"
            className={`${baseInput} text-3xl font-bold`}
            style={{ color: theme.accent }}
          />
          {c.video_url ? (
            <div className="relative my-4 aspect-video w-full rounded-lg overflow-hidden group">
              <iframe
                src={getEmbedUrl(c.video_url)}
                className="h-full w-full"
                allowFullScreen
              />
              <button
                type="button"
                onClick={() => onPickMedia("video_url")}
                className="absolute top-2 right-2 rounded-lg bg-black/70 px-3 py-1.5 text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                🎥 Değiştir
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onPickMedia("video_url")}
              className="my-4 aspect-video w-full rounded-lg border-2 border-dashed border-white/30 hover:border-white/60 flex flex-col items-center justify-center transition-colors"
            >
              <div className="text-5xl mb-3">🎥</div>
              <span className="text-sm opacity-60">Tıkla ve video ekle</span>
              <span className="text-xs opacity-40 mt-1">YouTube, Vimeo veya URL</span>
            </button>
          )}
        </div>
      );

    case "summary":
      return (
        <div className="h-full w-full p-12">
          <input
            value={c.title || "Özet"}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Özet"
            className={`${baseInput} text-3xl font-bold`}
            style={{ color: theme.accent }}
          />
          <div className="my-3 h-0.5 w-16" style={{ background: theme.accent }} />
          <div className="space-y-3">
            {(c.bullets || []).map((b, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-current/10 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: theme.accent, color: theme.bg }}>
                  {i + 1}
                </span>
                <input
                  value={b}
                  onChange={(e) => {
                    const next = [...(c.bullets || [])];
                    next[i] = e.target.value;
                    onChange({ bullets: next });
                  }}
                  className={`${baseInput} text-base`}
                />
              </div>
            ))}
            <button
              onClick={() => onChange({ bullets: [...(c.bullets || []), "Yeni madde"] })}
              className="w-full rounded-lg border border-dashed border-current px-4 py-2 text-sm opacity-60 hover:opacity-100"
            >
              + Madde Ekle
            </button>
          </div>
        </div>
      );

    default:
      return null;
  }
}

function getEmbedUrl(url: string): string {
  if (!url) return "";
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:.*v=|embed\/|v\/)|youtu\.be\/)([^&?\s]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}
