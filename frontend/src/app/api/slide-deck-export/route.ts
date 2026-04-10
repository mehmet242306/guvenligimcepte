import { NextRequest, NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const THEMES: Record<string, { bg: string; title: string; text: string; accent: string }> = {
  modern: { bg: "FFFFFF", title: "0F172A", text: "334155", accent: "F97316" },
  classic: { bg: "FDFBF7", title: "1F2937", text: "4B5563", accent: "8B5A2B" },
  dark: { bg: "0F172A", title: "F8FAFC", text: "CBD5E1", accent: "FBBF24" },
  corporate: { bg: "F8FAFC", title: "0F172A", text: "475569", accent: "2563EB" },
};

export async function POST(req: NextRequest) {
  try {
    const { deckId } = await req.json();
    if (!deckId) return NextResponse.json({ error: "deckId gerekli" }, { status: 400 });

    const supabase = await createClient();
    const { data: deck, error: deckErr } = await supabase
      .from("slide_decks")
      .select("*")
      .eq("id", deckId)
      .maybeSingle();
    if (deckErr || !deck) return NextResponse.json({ error: "Deck bulunamadı" }, { status: 404 });

    const { data: slides, error: slidesErr } = await supabase
      .from("slides")
      .select("*")
      .eq("deck_id", deckId)
      .order("sort_order", { ascending: true });
    if (slidesErr) return NextResponse.json({ error: "Slaytlar yüklenemedi" }, { status: 500 });

    const theme = THEMES[deck.theme] || THEMES.modern;
    const pres = new PptxGenJS();
    pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
    pres.defineLayout({ name: "RISKNOVA", width: 13.33, height: 7.5 });
    pres.layout = "RISKNOVA";

    pres.title = deck.title;
    pres.subject = deck.description || "";
    pres.company = "RiskNova";

    for (const s of slides || []) {
      const slide = pres.addSlide();
      slide.background = { color: s.background_color?.replace("#", "") || theme.bg };
      const c: any = s.content || {};

      switch (s.layout) {
        case "cover":
          slide.addText(c.title || "", {
            x: 0.5, y: 2.5, w: 12.3, h: 1.5,
            fontSize: 54, bold: true, color: theme.accent, align: "center",
            fontFace: "Calibri",
          });
          if (c.subtitle) {
            slide.addText(c.subtitle, {
              x: 0.5, y: 4.2, w: 12.3, h: 0.8,
              fontSize: 24, color: theme.text, align: "center",
            });
          }
          break;

        case "section_header":
          slide.addShape(pres.ShapeType.rect, {
            x: 6.16, y: 3.0, w: 1, h: 0.08, fill: { color: theme.accent },
          });
          slide.addText(c.title || "", {
            x: 0.5, y: 3.2, w: 12.3, h: 1.5,
            fontSize: 44, bold: true, color: theme.title, align: "center",
          });
          break;

        case "title_content":
          slide.addText(c.title || "", {
            x: 0.7, y: 0.5, w: 12, h: 0.8,
            fontSize: 32, bold: true, color: theme.accent,
          });
          slide.addShape(pres.ShapeType.rect, {
            x: 0.7, y: 1.35, w: 0.8, h: 0.05, fill: { color: theme.accent },
          });
          slide.addText(c.body || "", {
            x: 0.7, y: 1.6, w: 12, h: 5.5,
            fontSize: 18, color: theme.text, valign: "top",
          });
          break;

        case "bullet_list":
          slide.addText(c.title || "", {
            x: 0.7, y: 0.5, w: 12, h: 0.8,
            fontSize: 32, bold: true, color: theme.accent,
          });
          slide.addShape(pres.ShapeType.rect, {
            x: 0.7, y: 1.35, w: 0.8, h: 0.05, fill: { color: theme.accent },
          });
          slide.addText(
            (c.bullets || []).map((b: string) => ({ text: b, options: { bullet: { code: "25CF" } } })),
            { x: 0.9, y: 1.7, w: 11.5, h: 5.5, fontSize: 20, color: theme.text, valign: "top", paraSpaceAfter: 12 }
          );
          break;

        case "two_column":
          slide.addText(c.title || "", {
            x: 0.7, y: 0.5, w: 12, h: 0.8,
            fontSize: 30, bold: true, color: theme.accent,
          });
          slide.addText(c.left?.title || "", {
            x: 0.7, y: 1.6, w: 5.8, h: 0.6, fontSize: 22, bold: true, color: theme.title,
          });
          slide.addText(c.left?.body || "", {
            x: 0.7, y: 2.3, w: 5.8, h: 4.5, fontSize: 16, color: theme.text, valign: "top",
          });
          slide.addText(c.right?.title || "", {
            x: 6.8, y: 1.6, w: 5.8, h: 0.6, fontSize: 22, bold: true, color: theme.title,
          });
          slide.addText(c.right?.body || "", {
            x: 6.8, y: 2.3, w: 5.8, h: 4.5, fontSize: 16, color: theme.text, valign: "top",
          });
          break;

        case "quote":
          slide.addText("\u201C", { x: 0.5, y: 1, w: 12.3, h: 1.5, fontSize: 120, color: theme.accent, align: "center" });
          slide.addText(c.body || "", {
            x: 1.5, y: 3, w: 10.3, h: 2.5, fontSize: 28, italic: true, color: theme.title, align: "center",
          });
          if (c.caption) {
            slide.addText(c.caption, {
              x: 1.5, y: 5.8, w: 10.3, h: 0.6, fontSize: 18, color: theme.accent, align: "center",
            });
          }
          break;

        case "image_text":
          slide.addText(c.title || "", {
            x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 32, bold: true, color: theme.accent,
          });
          if (c.image_url) {
            try {
              slide.addImage({ path: c.image_url, x: 0.7, y: 1.7, w: 5.8, h: 4.5, sizing: { type: "contain", w: 5.8, h: 4.5 } });
            } catch {}
          }
          slide.addText(c.body || "", {
            x: 6.8, y: 1.7, w: 5.8, h: 5.0, fontSize: 18, color: theme.text, valign: "top",
          });
          break;

        case "image_full":
          if (c.image_url) {
            try {
              slide.addImage({ path: c.image_url, x: 0.5, y: 0.5, w: 12.3, h: 6.5, sizing: { type: "contain", w: 12.3, h: 6.5 } });
            } catch {}
          }
          if (c.caption) {
            slide.addText(c.caption, {
              x: 0.5, y: 7.0, w: 12.3, h: 0.4, fontSize: 14, color: theme.text, align: "center",
            });
          }
          break;

        case "summary":
          slide.addText(c.title || "Özet", {
            x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 32, bold: true, color: theme.accent,
          });
          (c.bullets || []).forEach((b: string, i: number) => {
            const y = 1.6 + i * 0.9;
            slide.addShape(pres.ShapeType.ellipse, {
              x: 0.7, y, w: 0.6, h: 0.6, fill: { color: theme.accent },
            });
            slide.addText(String(i + 1), {
              x: 0.7, y, w: 0.6, h: 0.6, fontSize: 18, bold: true, color: "FFFFFF", align: "center", valign: "middle",
            });
            slide.addText(b, {
              x: 1.5, y, w: 11, h: 0.6, fontSize: 18, color: theme.text, valign: "middle",
            });
          });
          break;

        case "video":
          slide.addText(c.title || "Video", {
            x: 0.7, y: 0.5, w: 12, h: 0.8, fontSize: 32, bold: true, color: theme.accent,
          });
          slide.addText("🎥 " + (c.video_url || ""), {
            x: 0.7, y: 3.5, w: 12, h: 0.6, fontSize: 16, color: theme.accent, align: "center",
            hyperlink: c.video_url ? { url: c.video_url } : undefined,
          });
          break;

        default:
          slide.addText(c.title || "", { x: 0.7, y: 1, w: 12, h: 0.8, fontSize: 32, bold: true, color: theme.title });
          slide.addText(c.body || "", { x: 0.7, y: 2, w: 12, h: 5, fontSize: 18, color: theme.text });
      }

      if (s.speaker_notes) {
        slide.addNotes(s.speaker_notes);
      }
    }

    const buffer = (await pres.write({ outputType: "nodebuffer" })) as Buffer;
    const fileName = `${deck.title.replace(/[^a-z0-9\s-]/gi, "_")}.pptx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (err: any) {
    console.error("slide-deck-export error:", err);
    return NextResponse.json({ error: err?.message || "Export hatası" }, { status: 500 });
  }
}
