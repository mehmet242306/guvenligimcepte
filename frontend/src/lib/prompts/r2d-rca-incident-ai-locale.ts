/**
 * Locale-aware prompts for R₂D-RCA incident flows:
 * - POST /api/ai/analysis (method r2d_rca)
 * - POST /api/rca/narrative
 */

export type R2dIncidentAiLocale = "en" | "tr" | "ru";

export function normalizeR2dIncidentAiLocale(raw: string | undefined): R2dIncidentAiLocale {
  const base = (raw ?? "en").toLowerCase().split("-")[0];
  if (base === "tr") return "tr";
  if (base === "ru") return "ru";
  return "en";
}

const C_META_LINES = {
  tr: [
    "C1 Tehlike Yoğunluğu (Görsel/YOLO) w=0.120",
    "C2 KKD Uygunsuzluğu (Görsel+Kayıt) w=0.085",
    "C3 Davranış Riski (Görsel+Bölge) w=0.145",
    "C4 Çevresel Stres (Sensör) w=0.085",
    "C5 Kimyasal/Atmosferik (Sensör+SCADA) w=0.145",
    "C6 Erişim/Engel (Görsel+Sensör) w=0.075",
    "C7 Makine/Proses (Sensör+CMMS) w=0.165",
    "C8 Araç-Trafik (Görsel+RTLS) w=0.105",
    "C9 Örgütsel Yük/Yorgunluk (Kayıt+Sensör) w=0.075",
  ],
  en: [
    "C1 Hazard intensity (visual/YOLO) w=0.120",
    "C2 PPE non-conformance (visual+records) w=0.085",
    "C3 Behavioural risk (visual+zone) w=0.145",
    "C4 Environmental stress (sensor) w=0.085",
    "C5 Chemical/atmospheric (sensor+SCADA) w=0.145",
    "C6 Access/barrier risk (visual+sensor) w=0.075",
    "C7 Machine/process risk (sensor+CMMS) w=0.165",
    "C8 Vehicle/traffic risk (visual+RTLS) w=0.105",
    "C9 Organisational load/fatigue (records+sensor) w=0.075",
  ],
  ru: [
    "C1 Интенсивность опасности (визуально/YOLO) w=0.120",
    "C2 Несоответствие СИЗ (визуально+записи) w=0.085",
    "C3 Поведенческий риск (визуально+зона) w=0.145",
    "C4 Экологический стресс (датчик) w=0.085",
    "C5 Химическая/атмосферная опасность (датчик+SCADA) w=0.145",
    "C6 Риск доступа/барьеров (визуально+датчик) w=0.075",
    "C7 Риск оборудования/процесса (датчик+CMMS) w=0.165",
    "C8 Риск транспорта/движения (визуально+RTLS) w=0.105",
    "C9 Организационная нагрузка/усталость (записи+датчик) w=0.075",
  ],
} as const;

const ANALYSIS_BASE = {
  tr: `Sen 20+ yıl deneyimli, Türkiye'de İSG uzmanısın. 6331 Sayılı Kanun, ISO 45001 ve Türkiye İSG mevzuatına hakimsin. SADECE geçerli JSON dön, açıklama YAZMA.`,
  en: `You are a senior occupational health and safety (OHS) professional with 20+ years of experience. You are fluent in ISO 45001 and common EU / international OHS practice. Return ONLY valid JSON — no markdown, no commentary outside JSON.`,
  ru: `Вы — ведущий специалист по охране труда и промышленной безопасности с опытом более 20 лет. Ориентируетесь в ISO 45001 и практике предприятий. Возвращайте ТОЛЬКО корректный JSON — без пояснительного текста вне JSON.`,
} as const;

const R2D_SYSTEM_SUFFIX = {
  tr: `

Sen bir R₂D-RCA (C1-C9) uzmanısın. 9 boyutlu R₂D risk metrik vektörü: C1 Tehlike Yoğunluğu, C2 KKD Uygunsuzluğu, C3 Davranış Riski, C4 Çevresel Stres, C5 Kimyasal/Atmosferik, C6 Erişim/Engel, C7 Makine/Proses, C8 Araç-Trafik, C9 Örgütsel Yük. Skorlar [0,1] aralığında SÜREKLİ (yüksek = yüksek risk). Verilen olaya göre olay öncesi (t0) ve olay ANI (t1) skorları üret. Risk bir boyutta artmışsa t1 > t0 olmalı. Ayrıca kısa Türkçe narrative (2-3 cümle).`,
  en: `

You are an R₂D-RCA (C1–C9) specialist. Nine-dimensional R₂D risk metric: C1 Hazard intensity, C2 PPE non-conformance, C3 Behavioural risk, C4 Environmental stress, C5 Chemical/atmospheric, C6 Access/barrier, C7 Machine/process, C8 Vehicle/traffic, C9 Organisational load/fatigue. Scores are CONTINUOUS in [0,1] (higher = higher risk). From the incident description, produce pre-incident (t0) and at-incident (t1) scores. Where risk worsens in a dimension, t1 > t0. Also a short narrative in English (2–3 sentences).`,
  ru: `

Вы — специалист по R₂D-RCA (C1–C9). Девятимерный вектор метрики R₂D: C1 интенсивность опасности, C2 несоответствие СИЗ, C3 поведенческий риск, C4 экологический стресс, C5 химическая/атмосферная опасность, C6 доступ/барьеры, C7 машина/процесс, C8 транспорт/движение, C9 организационная нагрузка/усталость. Оценки непрерывные в [0,1] (выше = выше риск). По описанию инцидента сформируйте t0 (до) и t1 (в момент). Если риск в измерении растёт, t1 > t0. Также краткий narrative на русском (2–3 предложения).`,
} as const;

const R2D_USER_SUFFIX = {
  tr: `

Olay açıklamasını analiz et ve 9 R₂D boyut için t0 (olay öncesi) + t1 (olay anı) skorları üret. Skorlar [0,1] arası sürekli ondalık. Olay ile ilgili boyutlarda t1 > t0 olmalı.

Boyut sırası (0-indexed array): [C1, C2, C3, C4, C5, C6, C7, C8, C9]
C1=Tehlike Yoğunluğu, C2=KKD Uygunsuzluğu, C3=Davranış Riski, C4=Çevresel Stres, C5=Kimyasal/Atmosferik, C6=Erişim/Engel, C7=Makine/Proses, C8=Araç-Trafik, C9=Örgütsel Yük

SADECE JSON (array'ler 9 elemanlı):
{"t0":[0.2,0.1,0.3,0.2,0.3,0.1,0.2,0.3,0.1],"t1":[0.2,0.1,0.5,0.4,0.7,0.1,0.8,0.3,0.4],"narrative":"Kısa Türkçe yorum"}`,
  en: `

Analyse the incident and produce t0 (pre-incident) and t1 (at-incident) scores for all 9 R₂D dimensions. Scores are continuous decimals in [0,1]. Where the incident implies worsening risk in a dimension, t1 > t0.

Dimension order (0-indexed array): [C1, C2, C3, C4, C5, C6, C7, C8, C9]
C1=Hazard intensity, C2=PPE non-conformance, C3=Behavioural risk, C4=Environmental stress, C5=Chemical/atmospheric, C6=Access/barrier, C7=Machine/process, C8=Vehicle/traffic, C9=Organisational load/fatigue

ONLY JSON (arrays of length 9):
{"t0":[0.2,0.1,0.3,0.2,0.3,0.1,0.2,0.3,0.1],"t1":[0.2,0.1,0.5,0.4,0.7,0.1,0.8,0.3,0.4],"narrative":"Short English comment"}`,
  ru: `

Проанализируйте инцидент и сформируйте оценки t0 (до инцидента) и t1 (в момент инцидента) для всех 9 измерений R₂D. Оценки — непрерывные десятичные в [0,1]. Где риск ухудшается, t1 > t0.

Порядок измерений (массив из 9 элементов): [C1, C2, C3, C4, C5, C6, C7, C8, C9]
C1=интенсивность опасности, C2=несоответствие СИЗ, C3=поведенческий риск, C4=экологический стресс, C5=химическая/атмосферная опасность, C6=доступ/барьеры, C7=машина/процесс, C8=транспорт/движение, C9=организационная нагрузка/усталость

ТОЛЬКО JSON (массивы из 9 элементов):
{"t0":[0.2,0.1,0.3,0.2,0.3,0.1,0.2,0.3,0.1],"t1":[0.2,0.1,0.5,0.4,0.7,0.1,0.8,0.3,0.4],"narrative":"Краткий комментарий на русском"}`,
} as const;

export function buildR2dRcaAnalysisSystemPrompt(locale: R2dIncidentAiLocale): string {
  return ANALYSIS_BASE[locale] + R2D_SYSTEM_SUFFIX[locale];
}

export function buildR2dRcaAnalysisUserPrompt(
  locale: R2dIncidentAiLocale,
  title: string,
  description?: string,
): string {
  const labels = { tr: "OLAY", en: "INCIDENT", ru: "ИНЦИДЕНТ" } as const;
  const desc =
    description && description.trim().length > 0
      ? locale === "en"
        ? `\nDescription: ${description}`
        : locale === "ru"
          ? `\nОписание: ${description}`
          : `\nAÇIKLAMA: ${description}`
      : "";
  const base = `${labels[locale]}: ${title}${desc}`;
  return base + R2D_USER_SUFFIX[locale];
}

const NARRATIVE_SYSTEM = {
  tr: `Sen RiskNova platformunun R₂D-RCA (C1-C9) uzmanısın. 20+ yıl Türkiye İSG tecrübesine sahipsin. 6331 Sayılı Kanun, ISO 45001 ve TS İSG mevzuatına hakimsin.

R₂D-RCA 9 boyutlu kompozit risk metriğidir:
{META_BLOCK}

Δ̂_i = max(0, t1 - t0) (risk artışı). R_RCA = max_i Δ̂_i (override τ=0.40) veya Σ w_i Δ̂_i (base). Stabilite bozulursa dual reporting gerekir.

Verilen hesaplama sonucuna göre Türkçe narrative + 3-5 key insight + önerilen aksiyonlar üret. 6331 Sayılı Kanun madde referansı ver. Üslup: teknik, profesyonel, eylemsel. SADECE geçerli JSON döndür.`,
  en: `You are RiskNova's R₂D-RCA (C1–C9) specialist — a senior OHS professional (ISO 45001). 

R₂D-RCA is a nine-dimensional composite risk metric:
{META_BLOCK}

Δ̂_i = max(0, t1 − t0) (risk increase). R_RCA = max_i Δ̂_i (override τ=0.40) or Σ w_i Δ̂_i (base). If stability breaks, dual reporting is required.

From the given computation, produce a narrative in English, 3–5 key insights, and recommended actions. Cite relevant OHS / legal context for the jurisdiction when appropriate (e.g. national OHS law). Tone: technical, professional, action-oriented. Return ONLY valid JSON.`,
  ru: `Вы — эксперт RiskNova по R₂D-RCA (C1–C9), ведущий специалист по охране труда (ISO 45001).

R₂D-RCA — девятимерная композитная метрика риска:
{META_BLOCK}

Δ̂_i = max(0, t1 − t0) (рост риска). R_RCA = max_i Δ̂_i (override τ=0,40) или Σ w_i Δ̂_i (база). При нарушении стабильности нужна двойная отчётность.

По данным расчёта сформируйте narrative на русском, 3–5 ключевых выводов и рекомендуемые действия. Укажите при необходимости ссылки на нормы охраны труда. Стиль: технический, профессиональный, ориентированный на действия. Только корректный JSON.`,
} as const;

const NARRATIVE_USER = {
  tr: `Olay: {TITLE}{DESC}

t0 (olay öncesi) skorlar: [{T0}]
t1 (olay anı) skorlar: [{T1}]
Δ̂ (bozulma): [{DH}]

R_RCA = {RSCORE} ({CMODE})
Override: {OVR}
Max Δ̂ boyutu: C{MAXD}
Max ağırlıklı boyut: C{MAXW}
{DUAL}

SADECE şu JSON şemasına uygun cevap ver:
{
  "narrative": "2-4 cümle Türkçe analiz. Hangi boyut en kritik, neden, 6331 atfı.",
  "key_insights": ["içgörü 1", "içgörü 2", "içgörü 3"],
  "actions": [
    {"title": "Aksiyon başlığı", "priority": "Kritik|Yüksek|Orta|Düşük", "deadline_days": 14, "responsible": "İSG Uzmanı"}
  ]
}`,
  en: `Incident: {TITLE}{DESC}

t0 (pre-incident) scores: [{T0}]
t1 (at-incident) scores: [{T1}]
Δ̂ (deterioration): [{DH}]

R_RCA = {RSCORE} ({CMODE})
Override: {OVR}
Largest Δ̂ dimension: C{MAXD}
Largest weighted dimension: C{MAXW}
{DUAL}

Reply with ONLY JSON matching this schema:
{
  "narrative": "2–4 sentences in English: which dimension is most critical and why.",
  "key_insights": ["insight 1", "insight 2", "insight 3"],
  "actions": [
    {"title": "Action title", "priority": "Critical|High|Medium|Low", "deadline_days": 14, "responsible": "HSE specialist"}
  ]
}`,
  ru: `Инцидент: {TITLE}{DESC}

Оценки t0 (до инцидента): [{T0}]
Оценки t1 (в момент): [{T1}]
Δ̂ (ухудшение): [{DH}]

R_RCA = {RSCORE} ({CMODE})
Override: {OVR}
Измерение с max Δ̂: C{MAXD}
Измерение с max взвешенным вкладом: C{MAXW}
{DUAL}

Ответьте ТОЛЬКО JSON по схеме:
{
  "narrative": "2–4 предложения на русском: какое измерение критично и почему.",
  "key_insights": ["вывод 1", "вывод 2", "вывод 3"],
  "actions": [
    {"title": "Заголовок мероприятия", "priority": "Критический|Высокий|Средний|Низкий", "deadline_days": 14, "responsible": "Специалист по ОТ"}
  ]
}`,
} as const;

export function buildRcaNarrativeSystemPrompt(locale: R2dIncidentAiLocale): string {
  const meta = C_META_LINES[locale].join("\n");
  return NARRATIVE_SYSTEM[locale].replace("{META_BLOCK}", meta);
}

export function buildRcaNarrativeUserPrompt(
  locale: R2dIncidentAiLocale,
  params: {
    incidentTitle: string;
    incidentDescription: string;
    t0: number[];
    t1: number[];
    deltaHat: number[];
    rRcaScore: number;
    calculationMode: string;
    overrideTriggered: boolean;
    dualReportingRequired: boolean;
    maxDeltaHatIndex: number;
    maxWeightedIndex: number;
  },
): string {
  const desc =
    params.incidentDescription.trim().length > 0
      ? locale === "en"
        ? `\nDescription: ${params.incidentDescription}`
        : locale === "ru"
          ? `\nОписание: ${params.incidentDescription}`
          : `\nAçıklama: ${params.incidentDescription}`
      : "";

  const ovr =
    locale === "tr"
      ? params.overrideTriggered
        ? "AKTİF"
        : "pasif"
      : locale === "ru"
        ? params.overrideTriggered
          ? "АКТИВЕН"
          : "неактивен"
        : params.overrideTriggered
          ? "ACTIVE"
          : "inactive";

  const dual = params.dualReportingRequired
    ? locale === "tr"
      ? "⚠ Dual Reporting Protocol gerekli (i* ≠ j*)"
      : locale === "ru"
        ? "⚠ Требуется протокол двойной отчётности (i* ≠ j*)"
        : "⚠ Dual reporting protocol required (i* ≠ j*)"
    : locale === "tr"
      ? "Stabilite: normal"
      : locale === "ru"
        ? "Стабильность: норма"
        : "Stability: normal";

  return NARRATIVE_USER[locale]
    .replace("{TITLE}", params.incidentTitle)
    .replace("{DESC}", desc)
    .replace("{T0}", params.t0.map((v) => v.toFixed(3)).join(", "))
    .replace("{T1}", params.t1.map((v) => v.toFixed(3)).join(", "))
    .replace("{DH}", params.deltaHat.map((v) => v.toFixed(3)).join(", "))
    .replace("{RSCORE}", params.rRcaScore.toFixed(3))
    .replace("{CMODE}", params.calculationMode)
    .replace("{OVR}", ovr)
    .replace("{MAXD}", String(params.maxDeltaHatIndex + 1))
    .replace("{MAXW}", String(params.maxWeightedIndex + 1))
    .replace("{DUAL}", dual);
}
