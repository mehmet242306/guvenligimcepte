import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 90;

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
    const { topic, slideCount, category, language } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Konu gereklidir" }, { status: 400 });
    }

    const count = Math.min(Math.max(Number(slideCount) || 10, 5), 30);
    const categoryLabel = CATEGORY_LABELS[category] || "Genel İSG";

    const prompt = `Sen uzman bir İSG eğitmenisin ve profesyonel slayt tasarımcısısın. Aşağıdaki konu için ${count} slaytlık profesyonel, görsel açıdan zengin bir eğitim sunumu hazırla.

KONU: ${topic}
KATEGORİ: ${categoryLabel}
DİL: ${language === "en" ? "English" : "Türkçe"}

SUNU KURALLARI:
- İlk slayt "cover" layout ile kapak olsun
- İkinci slayt "section_header" ile konuya giriş
- Orta slaytlarda "title_content", "bullet_list", "two_column", "quote" çeşitleri kullan
- Madde listelerinde 3-6 öz ve net madde
- Her slaytın konuşmacı notu olmalı
- Son slayt "summary" layout ile özet
- İSG mevzuatına ve gerçek risk senaryolarına referans ver

GÖRSEL TASARIM (ÖNEMLİ):
- Her slayta DEKORATİF ŞEKİLLER ekle (decorations array)
- Özellikle kapak (cover) slaytında en az 4 dekorasyon olmalı
- Kategori rengi "accent" olarak kullanılır (sistemde tanımlı)
- Kapaklarda emoji icon kullan (kategoriyle uyumlu)

KULLANILABILIR DEKORATİF ŞEKİLLER (decorations array elemanları):
- { "type": "circle", "x": 75, "y": 10, "w": 20, "h": 20, "color": "accent-soft", "opacity": 0.3 }
- { "type": "blob", "x": 60, "y": 55, "w": 50, "h": 50, "color": "accent-soft", "color2": "accent", "opacity": 0.3 }
- { "type": "triangle", "x": 80, "y": 0, "w": 20, "h": 30, "color": "accent", "opacity": 0.15 }
- { "type": "ring", "x": 5, "y": 15, "w": 15, "h": 15, "color": "accent", "stroke_width": 3, "opacity": 0.25 }
- { "type": "accent_bar", "x": 8, "y": 85, "w": 20, "h": 0.8, "color": "accent" }
- { "type": "dots_grid", "x": 70, "y": 75, "w": 30, "h": 25, "color": "accent", "opacity": 0.25 }
- { "type": "wave", "x": 0, "y": 75, "w": 100, "h": 25, "color": "accent-soft", "opacity": 0.4 }
- { "type": "icon", "x": 10, "y": 15, "w": 12, "h": 12, "icon": "🔥", "font_size": 4.5 }
- { "type": "gradient_bg", "color": "#FFF7ED", "color2": "#FFFFFF" }
- { "type": "diagonal_stripe", "x": 0, "y": 0, "w": 100, "h": 100, "color": "accent", "opacity": 0.05 }

RENK DEĞERLERİ:
- "accent" = kategori ana rengi (otomatik)
- "accent-soft" = yumuşak versiyonu
- "accent-fade" = çok yumuşak
- Veya doğrudan hex kodu: "#EF4444"

KOORDİNATLAR: x, y, w, h değerleri YÜZDE cinsinden (0-100). x=0 sol, x=100 sağ.

MEVCUT LAYOUT'LAR:
- "cover": { title, subtitle, decorations }
- "section_header": { title, decorations }
- "title_content": { title, body, decorations }
- "bullet_list": { title, bullets: string[], decorations }
- "two_column": { title, left: { title, body }, right: { title, body }, decorations }
- "quote": { body, caption, decorations }
- "summary": { title, bullets: string[], decorations }

ÇIKTI FORMATI — SADECE JSON, başka hiç bir şey yazma:
{
  "title": "Deck başlığı (40 karakter altı)",
  "description": "Kısa açıklama",
  "estimated_duration_minutes": sayı,
  "slides": [
    {
      "layout": "cover",
      "content": {
        "title": "...",
        "subtitle": "...",
        "decorations": [
          {"type":"circle","x":-10,"y":-15,"w":50,"h":50,"color":"accent-soft","opacity":0.6},
          {"type":"blob","x":65,"y":55,"w":55,"h":55,"color":"accent-soft","color2":"accent","opacity":0.3},
          {"type":"icon","x":10,"y":15,"w":15,"h":15,"icon":"🔥","font_size":4.5},
          {"type":"accent_bar","x":8,"y":85,"w":20,"h":0.8,"color":"accent"}
        ]
      },
      "speaker_notes": "Açılış..."
    }
  ]
}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI yanıtı işlenemedi" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const slides = Array.isArray(parsed.slides) ? parsed.slides : [];
    if (slides.length === 0) {
      return NextResponse.json({ error: "Slaytlar oluşturulamadı" }, { status: 500 });
    }

    // Supabase bağlan ve deck + slides insert et
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: "Supabase bağlantısı yok" }, { status: 500 });

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
        title: parsed.title || topic.slice(0, 40),
        description: parsed.description || null,
        category: category || "genel",
        theme: "modern",
        language: language || "tr",
        visibility: "private",
        source: "ai_generated",
        estimated_duration_minutes: parsed.estimated_duration_minutes || null,
      })
      .select()
      .single();

    if (deckErr || !deck) {
      console.error("Deck insert error:", deckErr);
      return NextResponse.json({ error: "Deck oluşturulamadı: " + (deckErr?.message || "") }, { status: 500 });
    }

    const slideRows = slides.map((s: any, idx: number) => ({
      deck_id: deck.id,
      sort_order: idx,
      layout: s.layout || "title_content",
      content: s.content || {},
      speaker_notes: s.speaker_notes || null,
    }));

    const { error: slidesErr } = await supabase.from("slides").insert(slideRows);
    if (slidesErr) {
      console.error("Slides insert error:", slidesErr);
      // Deck'i de sil (tutarlılık)
      await supabase.from("slide_decks").delete().eq("id", deck.id);
      return NextResponse.json({ error: "Slaytlar kaydedilemedi: " + slidesErr.message }, { status: 500 });
    }

    return NextResponse.json({
      deckId: deck.id,
      slideCount: slideRows.length,
      title: deck.title,
    });
  } catch (err: any) {
    console.error("training-slides-ai error:", err);
    return NextResponse.json({ error: err?.message || "AI hatası" }, { status: 500 });
  }
}
