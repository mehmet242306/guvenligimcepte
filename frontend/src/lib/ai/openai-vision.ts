/**
 * OpenAI gpt-4o Vision — Object Detection Stage
 * ----------------------------------------------
 * Hybrid AI pipeline'ın 1. aşaması. Bir İSG saha fotoğrafında:
 *   - Kaç kişi var, pozisyonları (bounding box)
 *   - Her kişinin KKD durumu (baret, maske, gözlük, eldiven, tulum, yelek, ayakkabı)
 *   - Görünen tehlike objeleri (açık elektrik, devrilmeye hazır malzeme, yangın, vs.)
 *   - Çalışma mahiyeti (kaynak, taşlama, yüksekte çalışma, ofis, depo, vs.)
 *   - Görselin sahicilik durumu (gerçek fotoğraf vs çizim/AI üretimi)
 *
 * strict JSON mode ile deterministik structured output döndürüyor.
 * Bu tespitler sonra Claude Sonnet 4'e ground truth olarak enjekte edilir —
 * Claude'un KKD halüsinasyonu yapmasını önler ("maske eksik" derken aslında
 * maske takılı).
 */
import OpenAI from "openai";
import { getOpenAIKey } from "@/lib/ai/provider-keys";

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  const apiKey = getOpenAIKey();
  if (!apiKey) return null;
  openaiClient ??= new OpenAI({ apiKey });
  return openaiClient;
}

export function isOpenAIVisionConfigured() {
  return Boolean(getOpenAIKey());
}

export type PpeState = "present" | "absent" | "unclear";

export type DetectedPerson = {
  personIndex: number; // 1-based
  role?: string; // "kaynakçı", "torna operatörü", "ofis çalışanı" — eğer çıkarılabiliyorsa
  boxX: number; // 0-100%
  boxY: number;
  boxW: number;
  boxH: number;
  ppe: {
    helmet: PpeState; // baret
    faceProtection: PpeState; // kaynak maskesi / siperlik / yüz koruması
    respirator: PpeState; // toz maskesi / gaz maskesi / solunum
    eyewear: PpeState; // koruyucu gözlük
    gloves: PpeState; // eldiven
    coverall: PpeState; // tulum / önlük / iş kıyafeti
    highVisVest: PpeState; // reflektörlü yelek
    safetyShoes: PpeState; // çelik burunlu ayakkabı / iş ayakkabısı
    hearingProtection: PpeState; // kulaklık / kulak tıkacı
    fallProtection: PpeState; // emniyet kemeri (yüksekte çalışıyorsa)
  };
  activity?: string; // "kaynak yapıyor", "taşlama yapıyor", "ekran başında", "malzeme taşıyor"
};

export type DetectedHazardObject = {
  label: string; // "açık elektrik kablosu", "istiflenmemiş malzeme", "yağ lekesi", vs.
  description: string; // 1 cümle Türkçe açıklama
  boxX?: number; // varsa konum
  boxY?: number;
  boxW?: number;
  boxH?: number;
  severity: "critical" | "high" | "medium" | "low";
};

export type VisionDetection = {
  imageType: "real_photo" | "illustration" | "ai_generated" | "3d_render" | "screenshot" | "unknown";
  sceneCategory: string; // "fabrika atölyesi", "şantiye", "ofis", "depo", "laboratuvar", vs.
  workActivity: string; // sahada gözlenen temel faaliyet
  personCount: number;
  people: DetectedPerson[];
  hazardObjects: DetectedHazardObject[];
  environmentalNotes: string[]; // ortam gözlemleri: "aydınlatma yeterli", "zemin ıslak", "alan dağınık", vs.
  overallDescription: string; // 2-3 cümle Türkçe özet
  visionModel: string;
  visionDurationMs: number;
  visionTokens: { input: number; output: number };
};

const DETECTION_SYSTEM_PROMPT = `Sen bir iş sağlığı ve güvenliği saha fotoğrafı için TARAFSIZ bir görüntü analiz uzmanısın. Görsel üzerinde RISK YORUMU yapmıyorsun — sadece **NE GÖRÜYORSUN**u raporluyorsun.

Görevin:
1) Görseldeki her kişiyi tespit et (bounding box yüzde değerleriyle: 0-100).
2) Her kişinin üzerindeki KKD'leri objektif olarak listele:
   - helmet (baret): başta sert koruyucu varsa "present"
   - faceProtection: yüzü kapayan kaynak maskesi/siperlik varsa "present"
   - respirator: ağız-burnu kapayan toz/gaz maskesi varsa "present"
   - eyewear: gözlerin önünde şeffaf plastik varsa "present"
   - gloves: ellerde iş eldiveni varsa "present"
   - coverall: tulum/iş önlüğü/iş kıyafeti varsa "present"
   - highVisVest: reflektörlü yelek varsa "present"
   - safetyShoes: çelik burunlu/iş ayakkabısı görünüyorsa "present" (ayak kadrajda değilse "unclear")
   - hearingProtection: kulaklık/kulak tıkacı varsa "present"
   - fallProtection: yüksekte çalışıyorsa ve emniyet kemeri varsa "present" (yükseklik yoksa "unclear")
3) Görünür tehlike objeleri: devrilmeye hazır yığın, açık elektrik, yağ/sıvı lekesi, dağınık kablo, paslı/hasarlı ekipman, korkuluksuz yükseklik, yanıcı madde yakınında kıvılcım kaynağı, vs.
4) Görsel türü (gerçek foto / çizim / AI üretimi).

**MUTLAK KURALLAR:**
- "present" dediysen o KKD gerçekten GÖRÜNÜYOR olmalı. Varsayıma dayanma.
- "absent" dediysen o KKD'nin olmadığı NET. Görmediğin (kadraj dışı) kısım için "unclear" yaz.
- Risk skoru, tedbir, "tavsiye ederim" gibi ÇIKARIMSAL dil YASAK — sadece gözlem.
- KKD için ön yargılı olma: kaynak yapan herkes eldivensiz değildir, torna operatörünün gözlüğü olabilir.
- Şüphedeysen "unclear" yaz.

Yanıtını SADECE geçerli JSON olarak ver, başka metin ekleme.`;

const DETECTION_USER_PROMPT = `Bu görseli analiz et ve aşağıdaki JSON şemasıyla tam uyumlu bir çıktı üret:

{
  "imageType": "real_photo" | "illustration" | "ai_generated" | "3d_render" | "screenshot" | "unknown",
  "sceneCategory": "Kısa Türkçe ortam adı (ör: fabrika atölyesi, şantiye, ofis, depo)",
  "workActivity": "Görülen temel faaliyet (ör: kaynak işi, torna operasyonu, malzeme taşıma, ekran başında çalışma)",
  "personCount": 0,
  "people": [
    {
      "personIndex": 1,
      "role": "Türkçe rol tanımı (opsiyonel)",
      "boxX": 0, "boxY": 0, "boxW": 0, "boxH": 0,
      "ppe": {
        "helmet": "present|absent|unclear",
        "faceProtection": "present|absent|unclear",
        "respirator": "present|absent|unclear",
        "eyewear": "present|absent|unclear",
        "gloves": "present|absent|unclear",
        "coverall": "present|absent|unclear",
        "highVisVest": "present|absent|unclear",
        "safetyShoes": "present|absent|unclear",
        "hearingProtection": "present|absent|unclear",
        "fallProtection": "present|absent|unclear"
      },
      "activity": "Kişinin anlık eylemi (opsiyonel)"
    }
  ],
  "hazardObjects": [
    {
      "label": "Kısa etiket",
      "description": "1 cümle açıklama",
      "boxX": 0, "boxY": 0, "boxW": 0, "boxH": 0,
      "severity": "critical|high|medium|low"
    }
  ],
  "environmentalNotes": ["Kısa gözlem 1", "Kısa gözlem 2"],
  "overallDescription": "2-3 cümle Türkçe genel özet"
}

Koordinatlar 0-100 arası yüzde değeri olmalı. Kişi yoksa personCount=0 ve people=[]. Tehlike objesi yoksa hazardObjects=[].`;

/**
 * OpenAI gpt-4o ile görseldeki KKD + tehlike nesnelerini tespit et.
 * Hata durumunda `null` döner — çağıran tarafta graceful fallback yapılır
 * (Claude tek başına devam eder, hibrit 2. aşamasız).
 */
export async function detectSafetyObjects(
  imageBase64: string,
  mimeType: string,
): Promise<VisionDetection | null> {
  const client = getOpenAIClient();
  if (!client) {
    console.warn("[openai-vision] OpenAI API key tanimli degil, stage atlaniyor");
    return null;
  }

  const t0 = Date.now();
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      max_tokens: 2500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: DETECTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: DETECTION_USER_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const choice = response.choices?.[0];
    const content = choice?.message?.content;
    if (!content) {
      console.warn("[openai-vision] boş yanıt");
      return null;
    }

    const parsed = JSON.parse(content) as Partial<VisionDetection>;
    const duration = Date.now() - t0;

    return {
      imageType: parsed.imageType ?? "unknown",
      sceneCategory: parsed.sceneCategory ?? "",
      workActivity: parsed.workActivity ?? "",
      personCount: typeof parsed.personCount === "number" ? parsed.personCount : (parsed.people?.length ?? 0),
      people: Array.isArray(parsed.people) ? parsed.people : [],
      hazardObjects: Array.isArray(parsed.hazardObjects) ? parsed.hazardObjects : [],
      environmentalNotes: Array.isArray(parsed.environmentalNotes) ? parsed.environmentalNotes : [],
      overallDescription: parsed.overallDescription ?? "",
      visionModel: "gpt-4o",
      visionDurationMs: duration,
      visionTokens: {
        input: response.usage?.prompt_tokens ?? 0,
        output: response.usage?.completion_tokens ?? 0,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[openai-vision] detection failed:", msg);
    return null;
  }
}

/**
 * Vision detection sonucunu Claude prompt'u için kısa, structured metne çevir.
 * Claude bu metni "ground truth" olarak okuyacak.
 */
export function visionToPromptContext(detection: VisionDetection): string {
  const lines: string[] = [];
  lines.push("═══ ÖN TESPİT (OpenAI gpt-4o Vision) ═══");
  lines.push("Bu, görseldeki objelerin TARAFSIZ tespitidir. Risk yorumunu sen yapacaksın");
  lines.push("ama ne görüp ne görmediğin konusunda bu tespitleri referans al.\n");

  lines.push(`Görsel türü: ${detection.imageType}`);
  lines.push(`Ortam: ${detection.sceneCategory || "belirsiz"}`);
  lines.push(`Gözlenen faaliyet: ${detection.workActivity || "belirsiz"}`);
  lines.push(`Kişi sayısı: ${detection.personCount}`);

  if (detection.people.length > 0) {
    lines.push("\nKişilerin KKD durumu:");
    for (const p of detection.people) {
      const ppeLines: string[] = [];
      const presentItems: string[] = [];
      const absentItems: string[] = [];
      const unclearItems: string[] = [];
      const ppeLabels: Record<string, string> = {
        helmet: "baret",
        faceProtection: "yüz koruması (kaynak maskesi/siperlik)",
        respirator: "solunum maskesi",
        eyewear: "koruyucu gözlük",
        gloves: "eldiven",
        coverall: "tulum/önlük",
        highVisVest: "reflektörlü yelek",
        safetyShoes: "iş ayakkabısı",
        hearingProtection: "kulak koruması",
        fallProtection: "emniyet kemeri",
      };
      for (const [key, state] of Object.entries(p.ppe)) {
        const label = ppeLabels[key] ?? key;
        if (state === "present") presentItems.push(label);
        else if (state === "absent") absentItems.push(label);
        else unclearItems.push(label);
      }
      if (presentItems.length) ppeLines.push(`    ✓ TAKIYOR: ${presentItems.join(", ")}`);
      if (absentItems.length) ppeLines.push(`    ✗ EKSİK: ${absentItems.join(", ")}`);
      if (unclearItems.length) ppeLines.push(`    ? BELİRSİZ (kadraj/açı): ${unclearItems.join(", ")}`);
      const roleBits = [p.role, p.activity].filter(Boolean).join(" — ");
      lines.push(`  Kişi ${p.personIndex}${roleBits ? ` (${roleBits})` : ""}:`);
      lines.push(...ppeLines);
    }
  }

  if (detection.hazardObjects.length > 0) {
    lines.push("\nGörünür tehlike objeleri:");
    for (const h of detection.hazardObjects) {
      lines.push(`  • [${h.severity}] ${h.label}: ${h.description}`);
    }
  }

  if (detection.environmentalNotes.length > 0) {
    lines.push("\nOrtam notları:");
    for (const n of detection.environmentalNotes) {
      lines.push(`  • ${n}`);
    }
  }

  if (detection.overallDescription) {
    lines.push(`\nGenel özet: ${detection.overallDescription}`);
  }

  lines.push("\n═══ ÖN TESPİT SONU ═══\n");
  lines.push("ÖNEMLİ: Ön tespitte 'TAKIYOR' olarak işaretli KKD'leri 'eksik' olarak yazmak YASAK.");
  lines.push("Ön tespitte 'EKSİK' olanlar gerçek risk adayıdır — kontrol et ve metoda göre skorla.");
  lines.push("Ön tespitte 'BELİRSİZ' olanlar için 'risk' yazma (yeterli kanıt yok).");

  return lines.join("\n");
}
