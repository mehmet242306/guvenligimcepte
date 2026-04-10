import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 90;

/**
 * PPTX dosyası = ZIP içinde ppt/slides/slideN.xml dosyaları.
 * Metin içeriği <a:t> tag'leri içinde.
 *
 * Bu basit parser:
 * - Her slaytı ayrı bir "slides" kaydına çevirir
 * - İlk metin bloğunu başlık, sonrakileri bullet/body olarak kullanır
 * - Layout otomatik seçilir (ilk slayt cover, sonrakiler content)
 */

function extractTextNodes(xml: string): string[] {
  const result: string[] = [];
  // <a:t ...>...</a:t> içini al
  const regex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const text = decodeXmlEntities(match[1].trim());
    if (text) result.push(text);
  }
  return result;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
}

/**
 * Slaytın metin bloklarını yapılandırılmış içeriğe dönüştür.
 */
function buildSlideContent(texts: string[], isFirst: boolean): {
  layout: string;
  content: any;
} {
  if (texts.length === 0) {
    return { layout: "title_content", content: { title: "Boş Slayt", body: "" } };
  }

  const first = texts[0];
  const rest = texts.slice(1);

  // İlk slayt kapak — başlık + varsa alt başlık
  if (isFirst) {
    return {
      layout: "cover",
      content: {
        title: first,
        subtitle: rest.join(" ") || undefined,
        decorations: [
          { type: "circle", x: -10, y: -15, w: 50, h: 50, color: "accent-soft", opacity: 0.6 },
          { type: "blob", x: 65, y: 55, w: 50, h: 50, color: "accent-soft", color2: "accent", opacity: 0.4 },
          { type: "accent_bar", x: 40, y: 85, w: 20, h: 0.7, color: "accent" },
        ],
      },
    };
  }

  // Çok kısa ise section header
  if (texts.length === 1 && first.length < 60) {
    return {
      layout: "section_header",
      content: { title: first },
    };
  }

  // 2+ metin varsa: ilki başlık, geri kalanı bullet
  if (rest.length >= 2 && rest.every((t) => t.length < 200)) {
    return {
      layout: "bullet_list",
      content: {
        title: first,
        bullets: rest,
      },
    };
  }

  // Uzun tek blok: title_content
  return {
    layout: "title_content",
    content: {
      title: first,
      body: rest.join("\n\n"),
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || null;
    const category = (formData.get("category") as string) || "genel";

    if (!file) {
      return NextResponse.json({ error: "Dosya yok" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pptx")) {
      return NextResponse.json({ error: "Sadece .pptx dosyaları destekleniyor" }, { status: 400 });
    }

    // Dosyayı ZIP olarak aç
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);

    // ppt/slides/slideN.xml dosyalarını bul
    const slideFiles: { order: number; name: string }[] = [];
    zip.forEach((path) => {
      const m = path.match(/^ppt\/slides\/slide(\d+)\.xml$/);
      if (m) {
        slideFiles.push({ order: parseInt(m[1], 10), name: path });
      }
    });
    slideFiles.sort((a, b) => a.order - b.order);

    if (slideFiles.length === 0) {
      return NextResponse.json({ error: "PPTX içinde slayt bulunamadı" }, { status: 400 });
    }

    // Her slaytı parse et
    const slides: Array<{ layout: string; content: any; notes: string | null }> = [];
    for (let i = 0; i < slideFiles.length; i++) {
      const xml = await zip.file(slideFiles[i].name)!.async("text");
      const texts = extractTextNodes(xml);

      // Notları da çek (ppt/notesSlides/notesSlideN.xml)
      const notesPath = `ppt/notesSlides/notesSlide${slideFiles[i].order}.xml`;
      let notes: string | null = null;
      const notesFile = zip.file(notesPath);
      if (notesFile) {
        const notesXml = await notesFile.async("text");
        const notesTexts = extractTextNodes(notesXml);
        // Notlar metninden placeholder başlıklarını filtrele
        const cleaned = notesTexts.filter((t) => !/^\d+$/.test(t) && t.length > 3);
        notes = cleaned.join("\n") || null;
      }

      const { layout, content } = buildSlideContent(texts, i === 0);
      slides.push({ layout, content, notes });
    }

    // Deck title — user-provided veya ilk slaytın başlığı
    const deckTitle = title || slides[0]?.content?.title || file.name.replace(/\.pptx$/i, "");

    // Supabase'e yaz
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Oturum yok" }, { status: 401 });

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organizasyon bulunamadı" }, { status: 400 });
    }

    const { data: deck, error: deckErr } = await supabase
      .from("slide_decks")
      .insert({
        organization_id: profile.organization_id,
        created_by: user.id,
        title: deckTitle.slice(0, 200),
        description: `${file.name} dosyasından içe aktarıldı`,
        category,
        theme: "modern",
        language: "tr",
        visibility: "private",
        source: "pptx_import",
      })
      .select()
      .single();

    if (deckErr || !deck) {
      console.error("Deck insert error:", deckErr);
      return NextResponse.json({ error: "Deck oluşturulamadı: " + (deckErr?.message || "") }, { status: 500 });
    }

    const rows = slides.map((s, idx) => ({
      deck_id: deck.id,
      sort_order: idx,
      layout: s.layout,
      content: s.content,
      speaker_notes: s.notes,
    }));

    const { error: slidesErr } = await supabase.from("slides").insert(rows);
    if (slidesErr) {
      console.error("Slides insert error:", slidesErr);
      await supabase.from("slide_decks").delete().eq("id", deck.id);
      return NextResponse.json({ error: "Slaytlar kaydedilemedi: " + slidesErr.message }, { status: 500 });
    }

    return NextResponse.json({
      deckId: deck.id,
      slideCount: rows.length,
      title: deck.title,
    });
  } catch (err: any) {
    console.error("slide-deck-import error:", err);
    return NextResponse.json({ error: err?.message || "Import hatası" }, { status: 500 });
  }
}
