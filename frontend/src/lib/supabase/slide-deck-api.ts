/**
 * slide-deck-api — Slayt deck ve slayt CRUD
 *
 * Tablolar: slide_decks, slides, question_bank
 */

import { createClient } from "./client";

export type SlideLayout =
  | "title"
  | "title_content"
  | "two_column"
  | "image_full"
  | "image_text"
  | "bullet_list"
  | "quote"
  | "section_header"
  | "video"
  | "table"
  | "cover"
  | "summary";

/**
 * Dekoratif şekil — arka planda veya kenarlarda render edilir.
 * x,y,w,h değerleri 0-100 arası yüzde (slaytın kendisine göre).
 */
export type SlideDecoration = {
  type:
    | "circle"           // çember (opak veya çerçeve)
    | "rect"             // dikdörtgen
    | "triangle"         // üçgen
    | "blob"             // organic gradient blob
    | "wave"             // alt/üst dalga SVG
    | "dots_grid"        // noktalı grid pattern
    | "diagonal_stripe"  // çapraz şerit
    | "icon"             // emoji/ikon
    | "gradient_bg"      // tam ekran gradient
    | "ring"             // ince halka
    | "accent_bar";      // vurgu çubuğu
  x?: number;           // 0-100 (sol)
  y?: number;           // 0-100 (üst)
  w?: number;           // 0-100 (genişlik)
  h?: number;           // 0-100 (yükseklik)
  color?: string;       // rgb/hex veya 'accent' / 'accent-soft' / 'bg-soft'
  color2?: string;      // gradient ikinci renk
  opacity?: number;     // 0-1
  rotation?: number;    // derece
  stroke_width?: number;
  stroke_color?: string;
  icon?: string;        // emoji / lucide name
  font_size?: number;   // rem
  z?: "back" | "front"; // z-index (default: back)
};

export type SlideContent = {
  title?: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  image_url?: string;
  video_url?: string;
  caption?: string;
  background_color?: string;
  text_color?: string;
  notes?: string;
  // two_column layout için
  left?: { title?: string; body?: string; bullets?: string[] };
  right?: { title?: string; body?: string; bullets?: string[]; image_url?: string };
  // table layout için
  rows?: string[][];
  headers?: string[];
  // dekoratif şekiller (arka plan veya kenar süslemeleri)
  decorations?: SlideDecoration[];
};

export type Slide = {
  id: string;
  deck_id: string;
  sort_order: number;
  layout: SlideLayout;
  content: SlideContent;
  background_color: string | null;
  background_image_url: string | null;
  speaker_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SlideDeck = {
  id: string;
  organization_id: string;
  created_by: string;
  title: string;
  description: string | null;
  category: string | null;
  cover_image_url: string | null;
  theme: string;
  language: string;
  visibility: "private" | "organization" | "public_template";
  is_template: boolean;
  is_system_template: boolean;
  slide_count: number;
  estimated_duration_minutes: number | null;
  tags: string[] | null;
  source: "manual" | "ai_generated" | "pptx_import" | "cloned_from_template";
  source_deck_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
};

/* ================================================================== */
/* DECK CRUD                                                            */
/* ================================================================== */

export async function fetchMyDecks(): Promise<SlideDeck[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("slide_decks")
    .select("*")
    .eq("created_by", user.id)
    .is("deleted_at", null)
    .eq("is_system_template", false)
    .order("updated_at", { ascending: false });

  if (error) {
    console.warn("fetchMyDecks error:", error.message);
    return [];
  }
  return (data || []) as SlideDeck[];
}

export async function fetchOrgDecks(): Promise<SlideDeck[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("slide_decks")
    .select("*")
    .eq("visibility", "organization")
    .is("deleted_at", null)
    .eq("is_system_template", false)
    .order("updated_at", { ascending: false });

  if (error) {
    console.warn("fetchOrgDecks error:", error.message);
    return [];
  }
  return (data || []) as SlideDeck[];
}

export async function fetchSystemTemplates(): Promise<SlideDeck[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("slide_decks")
    .select("*")
    .eq("is_system_template", true)
    .is("deleted_at", null)
    .order("category", { ascending: true });

  if (error) {
    console.warn("fetchSystemTemplates error:", error.message);
    return [];
  }
  return (data || []) as SlideDeck[];
}

export async function fetchDeckById(id: string): Promise<SlideDeck | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("slide_decks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.warn("fetchDeckById error:", error.message);
    return null;
  }
  return data as SlideDeck | null;
}

export async function createDeck(input: {
  title: string;
  description?: string;
  category?: string;
  theme?: string;
  language?: string;
  visibility?: "private" | "organization";
  source?: "manual" | "ai_generated" | "cloned_from_template";
  source_deck_id?: string;
  tags?: string[];
}): Promise<SlideDeck | null> {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase bağlantısı yok");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum yok");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile?.organization_id) throw new Error("Organizasyon bulunamadı");

  const payload = {
    organization_id: profile.organization_id,
    created_by: user.id,
    title: input.title,
    description: input.description || null,
    category: input.category || null,
    theme: input.theme || "modern",
    language: input.language || "tr",
    visibility: input.visibility || "private",
    source: input.source || "manual",
    source_deck_id: input.source_deck_id || null,
    tags: input.tags || null,
  };

  const { data, error } = await supabase
    .from("slide_decks")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as SlideDeck;
}

export async function updateDeck(id: string, patch: Partial<SlideDeck>): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const { error } = await supabase.from("slide_decks").update(patch).eq("id", id);
  if (error) {
    console.warn("updateDeck error:", error.message);
    return false;
  }
  return true;
}

export async function deleteDeck(id: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("slide_decks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.warn("deleteDeck error:", error.message);
    return false;
  }
  return true;
}

export async function cloneDeckFromTemplate(templateId: string, newTitle?: string): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const template = await fetchDeckById(templateId);
  if (!template) throw new Error("Şablon bulunamadı");

  const newDeck = await createDeck({
    title: newTitle || `${template.title} (Kopya)`,
    description: template.description || undefined,
    category: template.category || undefined,
    theme: template.theme,
    language: template.language,
    visibility: "private",
    source: "cloned_from_template",
    source_deck_id: templateId,
    tags: template.tags || undefined,
  });
  if (!newDeck) return null;

  // Slaytları kopyala
  const slides = await fetchSlides(templateId);
  if (slides.length > 0) {
    const copies = slides.map((s) => ({
      deck_id: newDeck.id,
      sort_order: s.sort_order,
      layout: s.layout,
      content: s.content,
      background_color: s.background_color,
      background_image_url: s.background_image_url,
      speaker_notes: s.speaker_notes,
    }));
    await supabase.from("slides").insert(copies);
  }

  return newDeck.id;
}

/* ================================================================== */
/* SLIDE CRUD                                                           */
/* ================================================================== */

export async function fetchSlides(deckId: string): Promise<Slide[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("slides")
    .select("*")
    .eq("deck_id", deckId)
    .order("sort_order", { ascending: true });
  if (error) {
    console.warn("fetchSlides error:", error.message);
    return [];
  }
  return (data || []) as Slide[];
}

export async function createSlide(
  deckId: string,
  input: {
    layout?: SlideLayout;
    content?: SlideContent;
    sort_order?: number;
    background_color?: string;
    speaker_notes?: string;
  }
): Promise<Slide | null> {
  const supabase = createClient();
  if (!supabase) return null;

  // Auto-order: en sonuna ekle
  let sort_order = input.sort_order;
  if (sort_order === undefined) {
    const { data } = await supabase
      .from("slides")
      .select("sort_order")
      .eq("deck_id", deckId)
      .order("sort_order", { ascending: false })
      .limit(1);
    sort_order = (data?.[0]?.sort_order ?? -1) + 1;
  }

  const payload = {
    deck_id: deckId,
    sort_order,
    layout: input.layout || "title_content",
    content: input.content || {},
    background_color: input.background_color || null,
    speaker_notes: input.speaker_notes || null,
  };

  const { data, error } = await supabase
    .from("slides")
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.warn("createSlide error:", error.message);
    return null;
  }
  return data as Slide;
}

export async function updateSlide(id: string, patch: Partial<Slide>): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const { error } = await supabase.from("slides").update(patch).eq("id", id);
  if (error) {
    console.warn("updateSlide error:", error.message);
    return false;
  }
  return true;
}

export async function deleteSlide(id: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const { error } = await supabase.from("slides").delete().eq("id", id);
  if (error) {
    console.warn("deleteSlide error:", error.message);
    return false;
  }
  return true;
}

export async function reorderSlides(deckId: string, orderedIds: string[]): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const updates = orderedIds.map((id, idx) =>
    supabase.from("slides").update({ sort_order: idx }).eq("id", id).eq("deck_id", deckId)
  );
  const results = await Promise.all(updates);
  return results.every((r) => !r.error);
}

/* ================================================================== */
/* BULK INSERT (AI/import için)                                         */
/* ================================================================== */

export async function bulkInsertSlides(
  deckId: string,
  slides: Array<{ layout?: SlideLayout; content: SlideContent; speaker_notes?: string }>
): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const rows = slides.map((s, idx) => ({
    deck_id: deckId,
    sort_order: idx,
    layout: s.layout || "title_content",
    content: s.content,
    speaker_notes: s.speaker_notes || null,
  }));
  const { error } = await supabase.from("slides").insert(rows);
  if (error) {
    console.warn("bulkInsertSlides error:", error.message);
    return false;
  }
  return true;
}
