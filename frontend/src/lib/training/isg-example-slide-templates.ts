import {
  bulkInsertSlides,
  createDeck,
  deleteDeck,
  updateDeck,
  type SlideContent,
  type SlideDecoration,
  type SlideLayout,
} from "@/lib/supabase/slide-deck-api";

/** Kapak ve bölüm slaytlarında hafif görsel düzen */
const coverDecor: SlideDecoration[] = [
  { type: "blob", x: 72, y: 8, w: 32, h: 38, color: "accent", opacity: 0.18, z: "back" },
  { type: "accent_bar", x: 0, y: 92, w: 100, h: 2.5, color: "accent", z: "front" },
];

export type IsgExampleSlideRow = {
  layout: SlideLayout;
  content: SlideContent;
  speaker_notes?: string;
};

export type IsgExampleSlideDeckDefinition = {
  id: string;
  deck: {
    title: string;
    description: string;
    category: string;
    theme?: string;
    language?: string;
    estimated_duration_minutes?: number | null;
    tags?: string[];
  };
  slides: IsgExampleSlideRow[];
};

export const ISG_EXAMPLE_SLIDE_DECKS: IsgExampleSlideDeckDefinition[] = [
  {
    id: "deck-genel-isg-temel",
    deck: {
      title: "Temel İSG Bilinci — Örnek Sunum",
      description:
        "İSG’nin amacı, işveren ve çalışan rolleri, risk bildirimi ve güvenli davranış için örnek slayt akışı. İşyerinize göre güncelleyin.",
      category: "genel",
      theme: "modern",
      language: "tr",
      estimated_duration_minutes: 35,
      tags: ["platform_isg_example", "genel_isg"],
    },
    slides: [
      {
        layout: "cover",
        content: {
          title: "Temel İş Sağlığı ve Güvenliği",
          subtitle: "Farkındalık ve güvenli çalışma",
          decorations: coverDecor,
        },
        speaker_notes:
          "Katılımcılara eğitimin amacını ve süreyi belirtin. Yerel mevzuat ve işyeri kurallarına atıf yapın.",
      },
      {
        layout: "section_header",
        content: { title: "İSG neden önemli?", decorations: coverDecor },
        speaker_notes: "Kaza ve meslek hastalıklarının işletme ve çalışan maliyetlerine kısa örnekler verin.",
      },
      {
        layout: "bullet_list",
        content: {
          title: "Temel kavramlar",
          bullets: [
            "İSG: iş kazalarını ve meslek hastalıklarını önlemeye yönelik düzenli faaliyetler",
            "Risk: zarar verme olasılığı ve şiddetinin birlikte değerlendirilmesi",
            "Önlem: riski ortadan kaldırma veya makul düzeye indirgeme",
            "Ramak kala olaylar: gerçekleşmeden önce bildirilen tehlikeli durumlar",
          ],
          decorations: [{ type: "dots_grid", x: 0, y: 0, w: 100, h: 100, opacity: 0.06, z: "back" }],
        },
        speaker_notes: "6331 ve ilgili yönetmeliklere işyeri politikasıyla bağlayın.",
      },
      {
        layout: "two_column",
        content: {
          title: "İşveren ve çalışan",
          left: {
            title: "İşveren",
            body:
              "• Risk değerlendirmesi ve önlemler\n• Eğitim ve bilgilendirme\n• KKD ve güvenli ekipman temini",
          },
          right: {
            title: "Çalışan",
            body:
              "• Verilen talimatlara uymak\n• KKD’yi doğru kullanmak\n• Tehlikeleri ve ramak kala olayları bildirmek",
          },
        },
        speaker_notes: "İşyerinizdeki gerçek roller ve iletişim kanallarını örnekle somutlaştırın.",
      },
      {
        layout: "title_content",
        content: {
          title: "Güvenli davranış alışkanlıkları",
          body:
            "Temiz ve düzenli çalışma alanı, doğru ergonomi, güvenlik işaretlerine uyum ve prosedürlerin güncel tutulması günlük İSG’nin parçasıdır. Kısa molalar ve uygun aydınlatma da riskleri azaltır.",
        },
        speaker_notes: "Sektöre özgü örnekler (üretim, depo, ofis) ekleyin.",
      },
      {
        layout: "quote",
        content: {
          body: "Güvenlik, bir kişinin değil; ekibin ve yönetimin ortak sorumluluğudur.",
          caption: "İSG kültürü",
        },
        speaker_notes: "Çalışan katılımı ve öneri sistemlerinden bahsedin.",
      },
      {
        layout: "summary",
        content: {
          title: "Özet",
          bullets: [
            "İSG herkesin işidir; bildirim ve iletişim kritiktir",
            "Riskleri tanıyın, kontrolleri uygulayın",
            "Eğitimi sürekli kılın ve kayıt altına alın",
          ],
        },
        speaker_notes: "Sonraki adımlar: sınav/anket veya saha uygulaması.",
      },
    ],
  },
  {
    id: "deck-kkd-dogru-kullanim",
    deck: {
      title: "KKD — Seçim, Kullanım ve Bakım",
      description:
        "Kişisel koruyucu donanım risk hiyerarşisi içindeki yeri, doğru seçim ve bakım için örnek eğitim slaytları.",
      category: "kkd",
      theme: "modern",
      language: "tr",
      estimated_duration_minutes: 30,
      tags: ["platform_isg_example", "kkd"],
    },
    slides: [
      {
        layout: "cover",
        content: {
          title: "Kişisel Koruyucu Donanım (KKD)",
          subtitle: "Son savunma hattı — doğru kullanım",
          decorations: coverDecor,
        },
        speaker_notes: "KKD’nin riski ortadan kaldırmadığını; mühendislik ve idari kontrollerle birlikte düşünüldüğünü vurgulayın.",
      },
      {
        layout: "bullet_list",
        content: {
          title: "Risk hiyerarşisi (hatırlatma)",
          bullets: [
            "Kaynağı ortadan kaldırma / ikame",
            "Mühendislik kontrolleri (koruyucu tertibatlar)",
            "İdari kontroller (iş izinleri, eğitim)",
            "KKD — uygun seçildiğinde ve kullanıldığında tamamlayıcı koruma",
          ],
        },
        speaker_notes: "İşyerinizde hangi basamakların önce geldiğini örnekle anlatın.",
      },
      {
        layout: "two_column",
        content: {
          title: "Doğru KKD seçimi",
          left: {
            title: "Dikkat edilecekler",
            body:
              "• Tehdit edici etken (kimyasal, gürültü, düşme…)\n• Standart ve üretici talimatları\n• Konfor ve uyum — kullanılmayan KKD koruma sağlamaz",
          },
          right: {
            title: "Yaygın hatalar",
            body:
              "• Standart dışı veya hasarlı ekipman\n• Beden ölçüsüne uymayan beden\n• Sadece görünürlük için takmak",
          },
        },
        speaker_notes: "İşyerinizde kullanılan KKD türlerini gösterin.",
      },
      {
        layout: "bullet_list",
        content: {
          title: "Bakım, depolama ve değişim",
          bullets: [
            "Günlük görsel kontrol (çatlak, yıpranma, kayış)",
            "Temizlik ve hijyen (özellikle solunum ve işitme koruyucuları)",
            "Üreticinin önerdiği saklama koşulları",
            "Hasarlı veya süresi dolan parçaların kullanımdan çekilmesi",
          ],
        },
        speaker_notes: "Sorumlu birim ve kayıt sisteminden bahsedin.",
      },
      {
        layout: "title_content",
        content: {
          title: "Yüksekte ve düşme riskinde",
          body:
            "Emniyet kemeri, bağlantı elemanları ve ankraj noktaları üretici talimatına uygun seçilmeli ve birbirleriyle uyumlu olmalıdır. Serbest düşme mesafesi ve şok emici hesapları uzmanlık gerektirebilir.",
        },
        speaker_notes: "Yüksekte çalışma yönergenize ve ekipman muayenelerine atıf yapın.",
      },
      {
        layout: "summary",
        content: {
          title: "Özet",
          bullets: [
            "KKD, risk analizine uygun ve standartlara uygun seçilmeli",
            "Sürekli kullanım ve doğru bakım şart",
            "Şüpheli ekipman kullanılmamalı — raporlayın",
          ],
        },
        speaker_notes: "Pratik tatbikat veya kontrol listesi ile pekiştirin.",
      },
    ],
  },
  {
    id: "deck-yangin-tahliye",
    deck: {
      title: "Yangın Güvenliği ve Tahliye",
      description:
        "Yangın sınıflarına kısa giriş, söndürücü seçimi bilinci, tahliye ve toplanma alanı için örnek sunum.",
      category: "yangin",
      theme: "modern",
      language: "tr",
      estimated_duration_minutes: 25,
      tags: ["platform_isg_example", "yangin"],
    },
    slides: [
      {
        layout: "cover",
        content: {
          title: "Yangın Güvenliği",
          subtitle: "Önleme · Erken müdahale · Tahliye",
          decorations: coverDecor,
        },
        speaker_notes: "İşyeri yangın ekipleri ve alarm prosedürünü tanıtın.",
      },
      {
        layout: "bullet_list",
        content: {
          title: "Yangın üçgeni",
          bullets: [
            "Yanıcı madde — yakıt",
            "Oksijen — hava",
            "İsı kaynağı — kıvılcım, elektrik, sıcak yüzey",
          ],
        },
        speaker_notes: "Üç elemandan birini uzaklaştırarak yangının büyümesini durdurma ilkesi.",
      },
      {
        layout: "title_content",
        content: {
          title: "Söndürücü kullanımında dikkat",
          body:
            "Yanıcı madde tipine uygun söndürücü seçilmelidir. Yağ ve elektrik yangınlarında yanlış müdahale riski artar. Eğitim almadan ve güvenli mesafe olmadan müdahale etmeyin; önce alarm ve tahliye önceliği.",
        },
        speaker_notes: "İşyerinde hangi sınıf yanıcılar olduğunu ve eğitim durumunu belirtin.",
      },
      {
        layout: "bullet_list",
        content: {
          title: "Tahliye kuralları",
          bullets: [
            "Sakin olun — acil çıkış işaretlerini takip edin",
            "Asansör kullanmayın",
            "Toplanma alanında sayım yapılmasını bekleyin",
            "Engelli veya yardıma ihtiyacı olanlar için planı hatırlatın",
          ],
        },
        speaker_notes: "Gerçek tahliye rotalarını harita veya fotoğrafla gösterin.",
      },
      {
        layout: "two_column",
        content: {
          title: "Alarm sonrası roller",
          left: {
            title: "Çoğu çalışan",
            body: "Derhal güvenli çıkışla tahliye; yöneticinin talimatını bekleyin.",
          },
          right: {
            title: "Yangın ekibi / ilk müdahale",
            body: "Yetki verilmiş kişiler ilk kontrol ve söndürme adımlarını prosedüre göre uygular.",
          },
        },
        speaker_notes: "İşyeri özel görev dağılımını netleştirin.",
      },
      {
        layout: "summary",
        content: {
          title: "Özet",
          bullets: [
            "Önleme: düzen, elektrik ve sıcak iş kontrolleri",
            "Alarm ve tahliye her zaman öncelikli olabilir",
            "Tatbikatlar ile prosedürleri pekiştirin",
          ],
        },
        speaker_notes: "Yıllık yangın tatbikatı tarihlerini duyurun.",
      },
    ],
  },
];

/**
 * Örnek deck’i kullanıcının organizasyonunda taslak oluşturur; slayt sayısı tetik ile güncellenir.
 */
export async function importIsgExampleSlideDeck(def: IsgExampleSlideDeckDefinition): Promise<string | null> {
  let deckId: string | null = null;
  try {
    const deck = await createDeck({
      title: def.deck.title,
      description: def.deck.description,
      category: def.deck.category,
      theme: def.deck.theme ?? "modern",
      language: def.deck.language ?? "tr",
      visibility: "private",
      source: "manual",
      tags: def.deck.tags ?? ["platform_isg_example", def.id],
    });
    if (!deck) {
      return null;
    }
    deckId = deck.id;

    const inserted = await bulkInsertSlides(
      deck.id,
      def.slides.map(s => ({
        layout: s.layout,
        content: s.content,
        speaker_notes: s.speaker_notes,
      }))
    );
    if (!inserted) {
      await deleteDeck(deck.id);
      return null;
    }
  } catch {
    if (deckId) await deleteDeck(deckId);
    return null;
  }

  if (def.deck.estimated_duration_minutes != null && deckId) {
    await updateDeck(deckId, { estimated_duration_minutes: def.deck.estimated_duration_minutes });
  }
  return deckId;
}
