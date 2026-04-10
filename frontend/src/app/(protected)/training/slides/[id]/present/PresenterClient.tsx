"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  fetchDeckById,
  fetchSlides,
  type SlideDeck,
  type Slide,
  type SlideContent,
} from "@/lib/supabase/slide-deck-api";
import { createClient } from "@/lib/supabase/client";
import { DecorationLayer } from "@/components/slides/DecorationLayer";

const THEMES: Record<string, { bg: string; text: string; accent: string; fontStack: string }> = {
  modern: { bg: "#FFFFFF", text: "#0F172A", accent: "#F97316", fontStack: "ui-sans-serif, system-ui" },
  classic: { bg: "#FDFBF7", text: "#1F2937", accent: "#8B5A2B", fontStack: "Georgia, serif" },
  dark: { bg: "#0F172A", text: "#F8FAFC", accent: "#FBBF24", fontStack: "ui-sans-serif, system-ui" },
  corporate: { bg: "#F8FAFC", text: "#0F172A", accent: "#2563EB", fontStack: "ui-sans-serif, system-ui" },
};

export function PresenterClient({ deckId }: { deckId: string }) {
  const router = useRouter();
  const [deck, setDeck] = useState<SlideDeck | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [idx, setIdx] = useState(0);
  const [showNotes, setShowNotes] = useState(false);

  // Analytics tracking
  const sessionIdRef = useRef<string | null>(null);
  const slideStartRef = useRef<number>(Date.now());
  const prevIdxRef = useRef<number>(0);

  useEffect(() => {
    (async () => {
      const [d, s] = await Promise.all([fetchDeckById(deckId), fetchSlides(deckId)]);
      setDeck(d);
      setSlides(s);

      // Session başlat
      try {
        const supabase = createClient();
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        const { data } = await supabase
          .from("slide_deck_sessions")
          .insert({
            deck_id: deckId,
            organization_id: d?.organization_id,
            viewer_id: user?.id || null,
            viewer_name: user?.email || null,
            user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
          })
          .select()
          .single();
        sessionIdRef.current = data?.id || null;
      } catch (e) {
        console.warn("session start failed", e);
      }
    })();
  }, [deckId]);

  // Slayt değiştiğinde önceki slayt için view_event kaydet
  useEffect(() => {
    if (!sessionIdRef.current || slides.length === 0) return;
    const now = Date.now();
    const elapsed = Math.round((now - slideStartRef.current) / 1000);
    const prevSlide = slides[prevIdxRef.current];
    if (prevSlide && elapsed > 0) {
      const supabase = createClient();
      if (supabase) {
        supabase
          .from("slide_view_events")
          .insert({
            session_id: sessionIdRef.current,
            slide_id: prevSlide.id,
            slide_order: prevIdxRef.current,
            time_spent_seconds: Math.min(elapsed, 3600),
          })
          .then(() => {});
      }
    }
    prevIdxRef.current = idx;
    slideStartRef.current = now;
  }, [idx, slides]);

  // Session sonlandır
  useEffect(() => {
    return () => {
      if (!sessionIdRef.current) return;
      const now = Date.now();
      const elapsed = Math.round((now - slideStartRef.current) / 1000);
      const supabase = createClient();
      if (supabase) {
        // Son slayt event'i
        const lastSlide = slides[prevIdxRef.current];
        if (lastSlide && elapsed > 0) {
          supabase
            .from("slide_view_events")
            .insert({
              session_id: sessionIdRef.current,
              slide_id: lastSlide.id,
              slide_order: prevIdxRef.current,
              time_spent_seconds: Math.min(elapsed, 3600),
            })
            .then(() => {});
        }
        // Session'ı kapat
        supabase
          .from("slide_deck_sessions")
          .update({
            ended_at: new Date().toISOString(),
            slides_viewed: prevIdxRef.current + 1,
            completed: prevIdxRef.current >= slides.length - 1,
          })
          .eq("id", sessionIdRef.current)
          .then(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = useCallback(() => setIdx((i) => Math.min(slides.length - 1, i + 1)), [slides.length]);
  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      } else if (e.key === "Escape") {
        router.push(`/training/slides/${deckId}/edit`);
      } else if (e.key === "n" || e.key === "N") {
        setShowNotes((x) => !x);
      } else if (e.key === "Home") {
        setIdx(0);
      } else if (e.key === "End") {
        setIdx(slides.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, deckId, router, slides.length]);

  if (!deck || slides.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
        <div>Yükleniyor...</div>
      </div>
    );
  }

  const active = slides[idx];
  const theme = THEMES[deck.theme] || THEMES.modern;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Top bar (only on hover) */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 text-white opacity-0 hover:opacity-100 transition-opacity">
        <button
          onClick={() => router.push(`/training/slides/${deckId}/edit`)}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs backdrop-blur hover:bg-white/20"
        >
          ← Çıkış (Esc)
        </button>
        <div className="text-xs opacity-70">
          {idx + 1} / {slides.length} • {deck.title}
        </div>
        <button
          onClick={() => setShowNotes((x) => !x)}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs backdrop-blur hover:bg-white/20"
        >
          {showNotes ? "Notları Gizle" : "Notlar (N)"}
        </button>
      </div>

      {/* Slide */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div
          className="relative aspect-video w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden"
          style={{
            background: active.background_color || theme.bg,
            color: theme.text,
            fontFamily: theme.fontStack,
          }}
        >
          <DecorationLayer decorations={active.content?.decorations} theme={theme} z="back" />
          <div className="relative z-[5] h-full w-full">
            <SlideRenderer slide={active} theme={theme} />
          </div>
          <DecorationLayer decorations={active.content?.decorations} theme={theme} z="front" />
        </div>
      </div>

      {/* Speaker notes overlay */}
      {showNotes && active.speaker_notes && (
        <div className="border-t border-white/10 bg-black p-4 text-sm text-white max-h-40 overflow-y-auto">
          <div className="text-xs font-bold uppercase opacity-60 mb-2">Konuşmacı Notları</div>
          <div className="whitespace-pre-wrap">{active.speaker_notes}</div>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1 bg-white/10">
        <div
          className="h-full transition-all"
          style={{ width: `${((idx + 1) / slides.length) * 100}%`, background: theme.accent }}
        />
      </div>

      {/* Click zones */}
      <button
        onClick={prev}
        className="absolute left-0 top-0 bottom-1 w-1/4 cursor-w-resize"
        aria-label="Önceki"
      />
      <button
        onClick={next}
        className="absolute right-0 top-0 bottom-1 w-1/4 cursor-e-resize"
        aria-label="Sonraki"
      />
    </div>
  );
}

function SlideRenderer({
  slide,
  theme,
}: {
  slide: Slide;
  theme: { bg: string; text: string; accent: string; fontStack: string };
}) {
  const c: SlideContent = slide.content || {};

  switch (slide.layout) {
    case "cover":
      return (
        <div className="flex h-full w-full flex-col items-center justify-center px-20 text-center">
          <h1 className="text-6xl font-extrabold" style={{ color: theme.accent }}>{c.title}</h1>
          {c.subtitle && <p className="mt-6 text-2xl opacity-80">{c.subtitle}</p>}
        </div>
      );

    case "section_header":
      return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-block h-1 w-24" style={{ background: theme.accent }} />
            <h2 className="text-5xl font-bold">{c.title}</h2>
          </div>
        </div>
      );

    case "title_content":
      return (
        <div className="h-full w-full p-16">
          <h2 className="text-4xl font-bold" style={{ color: theme.accent }}>{c.title}</h2>
          <div className="my-5 h-0.5 w-20" style={{ background: theme.accent }} />
          <p className="text-xl leading-relaxed whitespace-pre-wrap">{c.body}</p>
        </div>
      );

    case "bullet_list":
      return (
        <div className="h-full w-full p-16">
          <h2 className="text-4xl font-bold" style={{ color: theme.accent }}>{c.title}</h2>
          <div className="my-5 h-0.5 w-20" style={{ background: theme.accent }} />
          <ul className="space-y-4">
            {(c.bullets || []).map((b, i) => (
              <li key={i} className="flex items-start gap-4 text-xl">
                <span className="mt-2.5 h-3 w-3 shrink-0 rounded-full" style={{ background: theme.accent }} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "two_column":
      return (
        <div className="h-full w-full p-16">
          <h2 className="text-4xl font-bold" style={{ color: theme.accent }}>{c.title}</h2>
          <div className="my-5 h-0.5 w-20" style={{ background: theme.accent }} />
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="mb-3 text-2xl font-semibold">{c.left?.title}</h3>
              <p className="text-lg whitespace-pre-wrap">{c.left?.body}</p>
            </div>
            <div>
              <h3 className="mb-3 text-2xl font-semibold">{c.right?.title}</h3>
              <p className="text-lg whitespace-pre-wrap">{c.right?.body}</p>
            </div>
          </div>
        </div>
      );

    case "image_text":
      return (
        <div className="h-full w-full p-16">
          <h2 className="text-4xl font-bold" style={{ color: theme.accent }}>{c.title}</h2>
          <div className="my-5 h-0.5 w-20" style={{ background: theme.accent }} />
          <div className="grid grid-cols-2 gap-8">
            {c.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.image_url} alt="" className="max-h-96 w-full rounded-lg object-contain" />
            ) : (
              <div className="h-64 rounded-lg border-2 border-dashed border-current/30" />
            )}
            <p className="text-lg whitespace-pre-wrap">{c.body}</p>
          </div>
        </div>
      );

    case "image_full":
      return (
        <div className="relative h-full w-full">
          {c.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.image_url} alt="" className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center opacity-40">Görsel</div>
          )}
          {c.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4 text-center text-white">
              {c.caption}
            </div>
          )}
        </div>
      );

    case "quote":
      return (
        <div className="flex h-full w-full items-center justify-center px-20">
          <div className="text-center">
            <div className="text-9xl opacity-10">"</div>
            <p className="text-3xl italic leading-relaxed">{c.body}</p>
            {c.caption && (
              <p className="mt-6 text-xl" style={{ color: theme.accent }}>{c.caption}</p>
            )}
          </div>
        </div>
      );

    case "video":
      const embed = getEmbedUrl(c.video_url || "");
      return (
        <div className="h-full w-full p-12">
          {c.title && <h2 className="mb-4 text-3xl font-bold" style={{ color: theme.accent }}>{c.title}</h2>}
          {embed ? (
            <iframe src={embed} className="h-[80%] w-full rounded-lg" allowFullScreen />
          ) : (
            <div className="flex h-[80%] items-center justify-center rounded-lg border-2 border-dashed border-current/30 opacity-40">Video URL yok</div>
          )}
        </div>
      );

    case "summary":
      return (
        <div className="h-full w-full p-16">
          <h2 className="text-4xl font-bold" style={{ color: theme.accent }}>{c.title}</h2>
          <div className="my-5 h-0.5 w-20" style={{ background: theme.accent }} />
          <div className="space-y-4">
            {(c.bullets || []).map((b, i) => (
              <div key={i} className="flex items-start gap-4 rounded-lg border border-current/10 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold" style={{ background: theme.accent, color: theme.bg }}>
                  {i + 1}
                </span>
                <span className="text-xl">{b}</span>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}

function getEmbedUrl(url: string): string {
  if (!url) return "";
  const ytMatch = url.match(/(?:youtube\.com\/(?:.*v=|embed\/|v\/)|youtu\.be\/)([^&?\s]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}
