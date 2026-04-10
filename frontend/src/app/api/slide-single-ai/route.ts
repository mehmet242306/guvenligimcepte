import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 45;

const CATEGORY_LABELS: Record<string, string> = {
  yangin: "Yangın Güvenliği",
  kkd: "Kişisel Koruyucu Donanım",
  yuksekte_calisma: "Yüksekte Çalışma",
  elektrik: "Elektrik Güvenliği",
  kimyasal: "Kimyasal Güvenlik",
  ilkyardim: "İlk Yardım",
  ergonomi: "Ergonomi",
  makine: "Makine Güvenliği",
  genel: "Genel İSG",
};

export async function POST(req: NextRequest) {
  try {
    const { deckId, prompt: userPrompt, layout, insertAfter } = await req.json();

    if (!deckId || !userPrompt) {
      return NextResponse.json({ error: "deckId ve prompt gerekli" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Oturum yok" }, { status: 401 });

    // Deck bilgisi
    const { data: deck } = await supabase
      .from("slide_decks")
      .select("*")
      .eq("id", deckId)
      .maybeSingle();
    if (!deck) return NextResponse.json({ error: "Deck bulunamadı" }, { status: 404 });

    // Mevcut slaytların başlıkları (bağlam için)
    const { data: existing } = await supabase
      .from("slides")
      .select("sort_order, layout, content")
      .eq("deck_id", deckId)
      .order("sort_order", { ascending: true });

    const contextTitles = (existing || [])
      .map((s: any, i: number) => `${i + 1}. [${s.layout}] ${s.content?.title || "—"}`)
      .join("\n");

    const categoryLabel = CATEGORY_LABELS[deck.category] || "Genel İSG";

    const systemPrompt = `Sen uzman bir İSG eğitmenisin ve profesyonel slayt tasarımcısısın. Bir eğitim deckine tek bir slayt eklemem için yardım edeceksin.

DECK BİLGİSİ:
- Başlık: ${deck.title}
- Kategori: ${categoryLabel}
- Açıklama: ${deck.description || "yok"}

MEVCUT SLAYTLAR (bağlam için):
${contextTitles || "(henüz slayt yok)"}

KULLANICI İSTEĞİ:
${userPrompt}

${layout ? `İSTENEN LAYOUT: ${layout}` : "Uygun layout'u sen seç."}

KURALLAR:
1. Mevcut slaytlarla TEKRARA düşme — özgün içerik üret
2. İSG mevzuatı ve gerçek uygulamalara uygun ol
3. Metinler kısa, net, öğretici olmalı
4. Madde listelerinde 3-6 öz madde
5. Konuşmacı notu ekle (speaker_notes)
6. Slayta uygun dekoratif şekiller ekle (decorations array)

MEVCUT LAYOUTLAR:
- "cover": { title, subtitle }
- "section_header": { title }
- "title_content": { title, body }
- "bullet_list": { title, bullets: string[] }
- "two_column": { title, left: { title, body }, right: { title, body } }
- "quote": { body, caption }
- "summary": { title, bullets: string[] }
- "image_text": { title, body, image_url? }
- "video": { title, video_url? }

DEKORATİF ŞEKİLLER (decorations array, x/y/w/h yüzde 0-100):
- { "type": "circle", "x": 75, "y": 10, "w": 20, "h": 20, "color": "accent-soft", "opacity": 0.3 }
- { "type": "blob", "x": 60, "y": 55, "w": 50, "h": 50, "color": "accent-soft", "color2": "accent", "opacity": 0.3 }
- { "type": "triangle", "x": 80, "y": 0, "w": 20, "h": 30, "color": "accent", "opacity": 0.15 }
- { "type": "ring", "x": 5, "y": 15, "w": 15, "h": 15, "color": "accent", "stroke_width": 3, "opacity": 0.25 }
- { "type": "accent_bar", "x": 8, "y": 85, "w": 20, "h": 0.8, "color": "accent" }
- { "type": "dots_grid", "x": 70, "y": 75, "w": 30, "h": 25, "color": "accent", "opacity": 0.25 }
- { "type": "wave", "x": 0, "y": 75, "w": 100, "h": 25, "color": "accent-soft", "opacity": 0.4 }
- { "type": "icon", "x": 10, "y": 15, "w": 12, "h": 12, "icon": "🔥", "font_size": 4.5 }
- { "type": "diagonal_stripe", "x": 0, "y": 0, "w": 100, "h": 100, "color": "accent", "opacity": 0.05 }

Her slayta minimum 2, kapak slaytlarına minimum 4 dekorasyon ekle.

ÇIKTI FORMATI — SADECE JSON, başka hiç bir şey yazma:
{
  "layout": "...",
  "content": {
    "title": "...",
    ...diğer alanlar...,
    "decorations": [...]
  },
  "speaker_notes": "Bu slaytta anlatılacaklar..."
}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: systemPrompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI yanıtı işlenemedi" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Sıra hesapla
    let sortOrder: number;
    if (typeof insertAfter === "number") {
      // insertAfter'dan sonraki tüm slaytları 1 kaydır
      const targetOrder = insertAfter + 1;
      if (existing && existing.length > 0) {
        for (const s of existing as any[]) {
          if (s.sort_order >= targetOrder) {
            await supabase
              .from("slides")
              .update({ sort_order: s.sort_order + 1 })
              .eq("deck_id", deckId)
              .eq("sort_order", s.sort_order);
          }
        }
      }
      sortOrder = targetOrder;
    } else {
      sortOrder = (existing?.length || 0);
    }

    const { data: newSlide, error: insertErr } = await supabase
      .from("slides")
      .insert({
        deck_id: deckId,
        sort_order: sortOrder,
        layout: parsed.layout || layout || "title_content",
        content: parsed.content || {},
        speaker_notes: parsed.speaker_notes || null,
      })
      .select()
      .single();

    if (insertErr || !newSlide) {
      console.error("slide insert error:", insertErr);
      return NextResponse.json({ error: "Slayt eklenemedi" }, { status: 500 });
    }

    return NextResponse.json({ slide: newSlide });
  } catch (err: any) {
    console.error("slide-single-ai error:", err);
    return NextResponse.json({ error: err?.message || "Hata" }, { status: 500 });
  }
}
