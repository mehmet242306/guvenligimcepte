/**
 * ISG Library — categories, starter templates, custom-category persistence.
 *
 * Purpose:
 *  - Single source of truth for the "new" library architecture.
 *  - Removes redundant categories (Eğitim / Sınav-Anket / Form-Checklist / Mevzuat)
 *    because they live in their own modules now.
 *  - Treats the library as: central content bank + operation template hub +
 *    institutional memory + AI-assisted starter area.
 *
 * Localized strings here use TR (primary) + EN (fallback). Other locales fall
 * through to EN. This keeps the redesign self-contained without forcing a sweep
 * across all 13 message JSONs.
 */

import type {
  Boxes,
  Briefcase,
  ClipboardCheck,
  FileText,
  LucideIcon,
  ScrollText,
  ShieldAlert,
  Siren,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";

export type LibraryLocale = "tr" | "en";

export type LocalizedText = {
  tr: string;
  en: string;
};

/**
 * Built-in category keys. `"all"` is a synthetic view selector.
 * Removed (intentionally): "education", "assessment", "forms", "legal".
 *  - education / assessment  → live in `/training`
 *  - forms                   → folded into `audit-flows`
 *  - legal                   → lives in `/settings?tab=mevzuat`
 */
export const BUILTIN_CATEGORY_KEYS = [
  "documentation",
  "emergency",
  "instructions",
  "corporate-templates",
  "operation-templates",
  "risk-templates",
  "audit-flows",
  "process-packs",
  "ai-drafts",
  "user-templates",
] as const;

export type BuiltinCategoryKey = (typeof BUILTIN_CATEGORY_KEYS)[number];
export type CategoryKey = "all" | BuiltinCategoryKey | `custom:${string}`;

export type CategoryIconKey =
  | "FileText"
  | "Siren"
  | "ScrollText"
  | "Briefcase"
  | "Workflow"
  | "ShieldAlert"
  | "ClipboardCheck"
  | "Boxes"
  | "Sparkles"
  | "Users";

/**
 * Subcategory inside a main category. Recreates the original 3-level
 * Main → Sub → Document hierarchy users expect (e.g. Talimatlar → "Çalışan
 * Talimatları" → "Bakım Elemanı Talimat ve Taahhütnamesi"). The library's
 * starter templates and (optionally) Supabase catalog rows pin themselves to
 * one of these via `subcategoryKey`.
 */
export type LibrarySubcategoryDefinition = {
  /** Stable slug used in URL (e.g. "calisan-talimatlari"). */
  key: string;
  label: LocalizedText;
  /** Short helper line shown under the subcategory header. */
  description?: LocalizedText;
};

export type LibraryCategoryDefinition = {
  key: CategoryKey;
  iconKey: CategoryIconKey;
  label: LocalizedText;
  description: LocalizedText;
  /** Visual accent (used for chip / card hairline). */
  tone:
    | "amber"
    | "rose"
    | "indigo"
    | "slate"
    | "teal"
    | "red"
    | "emerald"
    | "violet"
    | "fuchsia"
    | "sky";
  /** Hidden from the chip strip (e.g. ai-drafts when empty). False by default. */
  hiddenWhenEmpty?: boolean;
  /**
   * Optional list of subcategories. When present, the page renders a left-side
   * subcategory list once the main category is selected, and content is
   * filtered by the active subcategory. When absent, the category behaves like
   * a flat bucket (e.g. "ai-drafts", "user-templates").
   */
  subcategories?: LibrarySubcategoryDefinition[];
};

/** Synthetic "show every subcategory" view inside a main category. */
export const ALL_SUBCATEGORIES_KEY = "all" as const;
export const ALL_SUBCATEGORIES_LABEL: LocalizedText = {
  tr: "Tüm alt başlıklar",
  en: "All subcategories",
};

export const BUILTIN_CATEGORIES: LibraryCategoryDefinition[] = [
  {
    key: "documentation",
    iconKey: "FileText",
    tone: "amber",
    label: { tr: "Dokümantasyon", en: "Documentation" },
    description: {
      tr: "İşyeri dosyası, kurul kayıtları ve resmi yazışmalar için hazır şablonlar.",
      en: "Ready-to-use templates for site files, committees and official paperwork.",
    },
    subcategories: [
      {
        key: "isyeri-dosyasi",
        label: { tr: "İşyeri Dosyası", en: "Workplace File" },
        description: {
          tr: "Ana dosya bileşenleri: çalışma belgeleri, görev tanımları, atamalar.",
          en: "Core workplace file: working papers, role definitions, assignments.",
        },
      },
      {
        key: "kurul-kayitlari",
        label: { tr: "Kurul Kayıtları", en: "Committee Records" },
        description: {
          tr: "İSG kurul gündemi, tutanak ve karar defteri şablonları.",
          en: "OHS committee agenda, minutes and decision book templates.",
        },
      },
      {
        key: "resmi-yazismalar",
        label: { tr: "Resmi Yazışmalar", en: "Official Correspondence" },
        description: {
          tr: "Tebligat, uygunsuzluk yazısı ve müfettiş cevap yazısı şablonları.",
          en: "Notice, nonconformity letter and inspector response templates.",
        },
      },
      {
        key: "raporlar",
        label: { tr: "Raporlar", en: "Reports" },
        description: {
          tr: "Aylık, yıllık değerlendirme ve faaliyet raporları için iskeletler.",
          en: "Skeletons for monthly, annual evaluation and activity reports.",
        },
      },
    ],
  },
  {
    key: "emergency",
    iconKey: "Siren",
    tone: "rose",
    label: { tr: "Acil Durum", en: "Emergency" },
    description: {
      tr: "Tahliye, toplanma, yangın ve senaryo planları için başlangıç paketleri.",
      en: "Starter kits for evacuation, assembly, fire and scenario planning.",
    },
    subcategories: [
      {
        key: "acil-durum-planlari",
        label: { tr: "Acil Durum Planları", en: "Emergency Plans" },
        description: {
          tr: "Tahliye, toplanma, yangın ve müdahale planları için ana şablonlar.",
          en: "Master templates for evacuation, assembly, fire and response plans.",
        },
      },
      {
        key: "senaryolar-tatbikatlar",
        label: { tr: "Senaryolar & Tatbikatlar", en: "Scenarios & Drills" },
        description: {
          tr: "Deprem, yangın ve kimyasal sızıntı tatbikat senaryoları.",
          en: "Earthquake, fire and chemical spill drill scenarios.",
        },
      },
      {
        key: "acil-durum-ekipleri",
        label: { tr: "Acil Durum Ekipleri", en: "Emergency Teams" },
        description: {
          tr: "Söndürme, ilk yardım ve tahliye ekibi görev talimatları.",
          en: "Firefighting, first aid and evacuation team assignment forms.",
        },
      },
      {
        key: "iletisim-bildirim",
        label: { tr: "İletişim & Bildirim", en: "Communication & Notification" },
        description: {
          tr: "Acil iletişim listesi ve resmi bildirim akış şablonları.",
          en: "Emergency contact list and official notification flow templates.",
        },
      },
    ],
  },
  {
    key: "instructions",
    iconKey: "ScrollText",
    tone: "indigo",
    label: { tr: "Talimatlar", en: "Instructions" },
    description: {
      tr: "PPE, makine, elektrik ve saha çalışmaları için talimat şablonları.",
      en: "Instruction templates for PPE, machinery, electrical and field work.",
    },
    subcategories: [
      {
        key: "makine-emniyet-talimatlari",
        label: { tr: "Makine Emniyet Talimatları", en: "Machinery Safety Instructions" },
        description: {
          tr: "Forklift, vinç, pres ve atölye tezgâhları için kullanım talimatları.",
          en: "Use instructions for forklifts, cranes, presses and workshop machines.",
        },
      },
      {
        key: "ppe-talimatlari",
        label: { tr: "PPE / KKD Talimatları", en: "PPE Instructions" },
        description: {
          tr: "Baret, kulak koruyucu, solunum ve yüksekte çalışma KKD talimatları.",
          en: "Helmet, hearing, respiratory and fall-arrest PPE instructions.",
        },
      },
      {
        key: "calisan-talimatlari",
        label: { tr: "Çalışan Talimatları", en: "Employee Instructions" },
        description: {
          tr: "Bakım, güvenlik, temizlik ve operatör rolleri için talimat & taahhütnameler.",
          en: "Instructions & undertakings for maintenance, security, cleaning and operator roles.",
        },
      },
      {
        key: "isg-talimatlari",
        label: { tr: "İSG Genel Talimatları", en: "General OHS Instructions" },
        description: {
          tr: "Yangın, elektrik, yüksekte çalışma ve genel işyeri kuralları.",
          en: "Fire, electrical, work-at-height and general workplace rule instructions.",
        },
      },
    ],
  },
  {
    key: "corporate-templates",
    iconKey: "Briefcase",
    tone: "slate",
    label: { tr: "Kurumsal Şablonlar", en: "Corporate Templates" },
    description: {
      tr: "İSG politikası, el kitabı ve organizasyonel akışlar için kurumsal şablonlar.",
      en: "Corporate templates for OHS policy, handbook and organisational flows.",
    },
    subcategories: [
      {
        key: "personel-belgeleri",
        label: { tr: "Personel Belgeleri", en: "Personnel Documents" },
        description: {
          tr: "İş sözleşmesi, gizlilik, görev tanımı ve özlük dosya şablonları.",
          en: "Employment, confidentiality, role definition and HR file templates.",
        },
      },
      {
        key: "politika-yonergeler",
        label: { tr: "Politika & Yönergeler", en: "Policies & Guidelines" },
        description: {
          tr: "İSG politikası, etik kuralları ve kurum içi yönergeler.",
          en: "OHS policy, code of conduct and internal guidelines.",
        },
      },
      {
        key: "prosedurler",
        label: { tr: "Prosedürler", en: "Procedures" },
        description: {
          tr: "Doküman yönetimi, eğitim yönetimi ve değişiklik prosedürleri.",
          en: "Document management, training management and change procedures.",
        },
      },
      {
        key: "organizasyon-yetki",
        label: { tr: "Organizasyon & Yetki", en: "Organization & Authority" },
        description: {
          tr: "Organizasyon şeması ve RACI yetki matrisi şablonları.",
          en: "Org chart and RACI authority matrix templates.",
        },
      },
    ],
  },
  {
    key: "operation-templates",
    iconKey: "Workflow",
    tone: "teal",
    label: { tr: "Operasyon Şablonları", en: "Operation Templates" },
    description: {
      tr: "Vardiya, bakım ve operasyonel süreçler için tekrarlanabilir şablonlar.",
      en: "Reusable templates for shift, maintenance and operational processes.",
    },
    subcategories: [
      {
        key: "saha-operasyonu",
        label: { tr: "Saha Operasyonu", en: "Field Operation" },
        description: {
          tr: "Saha açılış kontrolü, vardiya devri ve günlük saha akışı.",
          en: "Site opening, shift handover and daily field flow.",
        },
      },
      {
        key: "bakim-operasyonu",
        label: { tr: "Bakım Operasyonu", en: "Maintenance Operation" },
        description: {
          tr: "Periyodik bakım planı, bakım talep ve onay akışları.",
          en: "Periodic maintenance plan, maintenance request and approval flows.",
        },
      },
      {
        key: "uretim-operasyonu",
        label: { tr: "Üretim Operasyonu", en: "Production Operation" },
        description: {
          tr: "Hat başlatma, üretim güvenlik kontrolü ve KPI takibi.",
          en: "Line startup, production safety check and KPI tracking.",
        },
      },
      {
        key: "lojistik-depo",
        label: { tr: "Lojistik & Depo", en: "Logistics & Warehouse" },
        description: {
          tr: "Forklift trafiği, raf güvenliği ve giriş-çıkış kontrolü.",
          en: "Forklift traffic, rack safety and inbound/outbound control.",
        },
      },
    ],
  },
  {
    key: "risk-templates",
    iconKey: "ShieldAlert",
    tone: "red",
    label: { tr: "Risk Analizi Şablonları", en: "Risk Analysis Templates" },
    description: {
      tr: "Sektör bazlı risk değerlendirme şablonları ve örnek raporlar.",
      en: "Sector-specific risk assessment templates and example reports.",
    },
    subcategories: [
      {
        key: "genel-risk-degerlendirme",
        label: { tr: "Genel Risk Değerlendirme", en: "General Risk Assessment" },
        description: {
          tr: "5x5 / L-tipi matris ve HAZOP gibi yöntem temelli şablonlar.",
          en: "Method-based templates such as 5x5 / L-type matrix and HAZOP.",
        },
      },
      {
        key: "sektorel-ornekler",
        label: { tr: "Sektörel Örnekler", en: "Sector Examples" },
        description: {
          tr: "Hastane, imalat, inşaat ve ofis için hazır risk taslakları.",
          en: "Pre-built risk drafts for hospital, manufacturing, construction and office.",
        },
      },
      {
        key: "tehlike-bazli",
        label: { tr: "Tehlike Bazlı", en: "Hazard-Based" },
        description: {
          tr: "Kimyasal, yüksekte çalışma, sıcak çalışma odaklı risk şablonları.",
          en: "Risk templates focused on chemicals, work-at-height and hot work.",
        },
      },
    ],
  },
  {
    key: "audit-flows",
    iconKey: "ClipboardCheck",
    tone: "emerald",
    label: { tr: "Denetim Akışları", en: "Audit Flows" },
    description: {
      tr: "Forklift, elektrik panosu ve saha denetimleri için checklist akışları.",
      en: "Checklist flows for forklift, electrical panel and field audits.",
    },
    subcategories: [
      {
        key: "saha-denetim-formlari",
        label: { tr: "Saha Denetim Formları", en: "Field Audit Forms" },
        description: {
          tr: "Forklift, elektrik panosu, yangın tüpü gibi saha kontrol checklistleri.",
          en: "Field checklists for forklifts, electrical panels, fire extinguishers.",
        },
      },
      {
        key: "periyodik-denetimler",
        label: { tr: "Periyodik Denetimler", en: "Periodic Audits" },
        description: {
          tr: "Aylık, 3 aylık ve yıllık iç denetim formları.",
          en: "Monthly, quarterly and annual internal audit forms.",
        },
      },
      {
        key: "mevzuat-denetimleri",
        label: { tr: "Mevzuat Denetimleri", en: "Regulatory Audits" },
        description: {
          tr: "6331 uyum kontrol listesi ve KKD denetim formları.",
          en: "OHS Law 6331 compliance checklist and PPE audit forms.",
        },
      },
    ],
  },
  {
    key: "process-packs",
    iconKey: "Boxes",
    tone: "violet",
    label: { tr: "Firma Süreç Paketleri", en: "Company Process Packs" },
    description: {
      tr: "İşe giriş, yıllık yenileme ve OSGB başlatma gibi paketlenmiş süreçler.",
      en: "Bundled processes such as onboarding, annual renewal, OSGB kickoff.",
    },
    subcategories: [
      {
        key: "hizli-baslangic",
        label: { tr: "Hızlı Başlangıç Paketleri", en: "Quick-Start Packs" },
        description: {
          tr: "Yeni firma açılışı, ilk denetim ve hızlı oryantasyon paketleri.",
          en: "Packs for new company opening, first audit and quick orientation.",
        },
      },
      {
        key: "sektorel-paketler",
        label: { tr: "Sektörel Paketler", en: "Sector Packs" },
        description: {
          tr: "İnşaat, hastane, OSGB ve ofis için hazır süreç paketleri.",
          en: "Ready-made process packs for construction, hospital, OSGB and office.",
        },
      },
      {
        key: "yenileme-takibi",
        label: { tr: "Yenileme & Takip", en: "Renewal & Tracking" },
        description: {
          tr: "Yıllık yenileme, OSGB sözleşme yenileme ve takip akışları.",
          en: "Annual renewal, OSGB contract renewal and tracking flows.",
        },
      },
    ],
  },
  {
    key: "ai-drafts",
    iconKey: "Sparkles",
    tone: "fuchsia",
    label: { tr: "AI Taslakları", en: "AI Drafts" },
    description: {
      tr: "Nova AI'nın sektör ve operasyon bağlamına göre ürettiği taslaklar.",
      en: "Drafts produced by Nova AI based on sector and operation context.",
    },
    subcategories: [
      {
        key: "hizli-ai-sablonlari",
        label: { tr: "Hızlı AI Şablonları", en: "Quick AI Templates" },
        description: {
          tr: "Hazır AI prompt'larıyla risk, talimat ve checklist taslakları.",
          en: "Risk, instruction and checklist drafts via prepared AI prompts.",
        },
      },
      {
        key: "ozel-ai-taslagi",
        label: { tr: "Özel AI Taslağı", en: "Custom AI Draft" },
        description: {
          tr: "Kendi promptunuzu yazıp Nova ile özgün taslak üretin.",
          en: "Write your own prompt and produce a tailored draft with Nova.",
        },
      },
    ],
  },
  {
    key: "user-templates",
    iconKey: "Users",
    tone: "sky",
    label: { tr: "Kullanıcı Şablonları", en: "User Templates" },
    description: {
      tr: "Kendi şablonlarınızı kaydedin, ekibinizle ve firmalarınızla paylaşın.",
      en: "Save your own templates and share them across your team and companies.",
    },
    // user-templates is a flat bucket — no subcategory layer.
  },
];

export const ALL_CATEGORY_LABEL: LocalizedText = { tr: "Tümü", en: "All" };

/**
 * Starter / sample content for each category. These render even when the
 * Supabase library is empty so users never face a blank state.
 *
 * Action types:
 *  - "template" : opens an existing TipTap document template
 *  - "group"    : opens the document editor preselected to a group
 *  - "ai"       : opens the editor in AI-assisted mode with the prompt prefilled
 *  - "module"   : navigates to a different module (e.g. /training)
 */
export type StarterAction =
  | { kind: "template"; templateId: string; groupKey?: string }
  | { kind: "group"; groupKey: string }
  | { kind: "ai"; prompt: LocalizedText }
  | { kind: "module"; href: string };

export type StarterTemplate = {
  id: string;
  category: BuiltinCategoryKey;
  /**
   * Optional subcategory slug — must match one of the subcategory keys on the
   * parent category. When omitted the card shows under the "All subcategories"
   * view but doesn't anchor to any specific subcategory.
   */
  subcategoryKey?: string;
  title: LocalizedText;
  description: LocalizedText;
  /** Display tags for the card meta line. */
  sectorTags?: string[];
  /** Origin/role flags used by the badge ribbon. */
  flags?: {
    ai?: boolean;
    corporate?: boolean;
    operation?: boolean;
    risk?: boolean;
    audit?: boolean;
    process?: boolean;
  };
  action: StarterAction;
};

export const STARTER_TEMPLATES: StarterTemplate[] = [
  // ---------- Risk Templates ----------
  {
    id: "starter:risk-rapor",
    category: "risk-templates",
    subcategoryKey: "genel-risk-degerlendirme",
    title: { tr: "Örnek Risk Değerlendirme Raporu", en: "Sample Risk Assessment Report" },
    description: {
      tr: "6331 kapsamında temel risk raporu — firma bilgileri ile otomatik dolar.",
      en: "Baseline risk report under OHS Law 6331 — auto-fills with company info.",
    },
    sectorTags: ["Genel", "İmalat"],
    flags: { risk: true, corporate: true },
    action: { kind: "template", templateId: "risk-raporu", groupKey: "risk-degerlendirme" },
  },
  {
    id: "starter:risk-l-tipi",
    category: "risk-templates",
    subcategoryKey: "genel-risk-degerlendirme",
    title: { tr: "L Tipi Matris Şablonu", en: "L-Type Matrix Template" },
    description: {
      tr: "Olasılık × şiddet ile çalışan L-tipi matris değerlendirme şablonu.",
      en: "Probability × severity L-type matrix assessment template.",
    },
    sectorTags: ["Genel"],
    flags: { risk: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "L tipi matris yöntemi ile çalışan örnek bir risk değerlendirme şablonu oluştur. Olasılık 1-5, şiddet 1-5 olmak üzere matrisi açıkla ve örnek tehlike puanlamaları ver.",
        en: "Create a sample risk assessment template using the L-type matrix method (probability 1-5, severity 1-5) with hazard scoring examples.",
      },
    },
  },
  {
    id: "starter:risk-makine",
    category: "risk-templates",
    subcategoryKey: "sektorel-ornekler",
    title: { tr: "Makine Risk Örneği", en: "Machinery Risk Example" },
    description: {
      tr: "Üretim hattı ve CNC tipi makineler için örnek risk değerlendirme taslağı.",
      en: "Example risk assessment draft for production lines and CNC-type machines.",
    },
    sectorTags: ["İmalat", "Atölye"],
    flags: { risk: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Bir makine atölyesindeki CNC tezgâhı, pres ve forklift kullanımı için sektörel risk değerlendirmesi taslağı oluştur. Tehlikeleri 5x5 matris ile puanla.",
        en: "Draft a sector-specific risk assessment for a machine shop with CNC lathes, presses and forklifts. Score hazards on a 5x5 matrix.",
      },
    },
  },
  {
    id: "starter:risk-hastane",
    category: "risk-templates",
    subcategoryKey: "sektorel-ornekler",
    title: { tr: "Hastane Risk Örneği", en: "Hospital Risk Example" },
    description: {
      tr: "Klinik, mutfak ve kimyasal alanlar için sağlık tesisi risk taslağı.",
      en: "Risk draft for clinics, kitchens and chemical zones in healthcare facilities.",
    },
    sectorTags: ["Sağlık", "Hastane"],
    flags: { risk: true, ai: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Bir hastane için klinik, ameliyathane, mutfak, çamaşırhane, atık alanı ve kimyasal odası dahil 5x5 matris ile risk değerlendirmesi taslağı oluştur.",
        en: "Generate a 5x5 risk assessment draft for a hospital covering clinic, OR, kitchen, laundry, waste zone and chemical storage.",
      },
    },
  },
  {
    id: "starter:risk-saha",
    category: "risk-templates",
    subcategoryKey: "sektorel-ornekler",
    title: { tr: "Saha Risk Örneği", en: "Field Risk Example" },
    description: {
      tr: "İnşaat ve saha çalışmaları için yüksekte çalışma + ekipman riski taslağı.",
      en: "Risk draft for construction & field work covering working-at-height and equipment.",
    },
    sectorTags: ["İnşaat", "Saha"],
    flags: { risk: true, ai: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Bir inşaat sahası için yüksekte çalışma, kazı, vinç operasyonu, kalıp ve iskele faaliyetlerini kapsayan 5x5 risk değerlendirme taslağı oluştur.",
        en: "Draft a 5x5 risk assessment for a construction site including working-at-height, excavation, crane operations, formwork and scaffolding.",
      },
    },
  },
  {
    id: "starter:risk-kimyasal",
    category: "risk-templates",
    subcategoryKey: "tehlike-bazli",
    title: { tr: "Kimyasal Tehlike Şablonu", en: "Chemical Hazard Template" },
    description: {
      tr: "GHS sınıflandırma, MSDS bağlantısı ve kontrol önlemleri ile kimyasal risk şablonu.",
      en: "Chemical risk template with GHS classification, MSDS link and control measures.",
    },
    sectorTags: ["Kimyasal", "Laboratuvar"],
    flags: { risk: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Kimyasal madde kullanılan bir alan için GHS sınıflandırması, MSDS referansı, maruziyet sınırı ve kontrol önlemleri içeren risk değerlendirme şablonu oluştur.",
        en: "Create a chemical hazard risk assessment template with GHS classification, MSDS reference, exposure limit and control measures.",
      },
    },
  },
  {
    id: "starter:risk-yuksekte",
    category: "risk-templates",
    subcategoryKey: "tehlike-bazli",
    title: { tr: "Yüksekte Çalışma Şablonu", en: "Work-at-Height Template" },
    description: {
      tr: "Düşme önleme, EPI seçimi ve kurtarma planı içeren yüksekte çalışma risk şablonu.",
      en: "Work-at-height risk template covering fall prevention, EPI selection and rescue plan.",
    },
    sectorTags: ["İnşaat", "Bakım"],
    flags: { risk: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Yüksekte çalışma faaliyetleri için düşme önleme tedbirleri, paraşüt tipi emniyet kemeri seçimi, ankraj noktaları ve kurtarma planını kapsayan risk değerlendirme şablonu oluştur.",
        en: "Create a work-at-height risk assessment template covering fall prevention, full-body harness selection, anchorage points and rescue plan.",
      },
    },
  },

  // ---------- Instructions ----------
  {
    id: "starter:instr-forklift",
    category: "instructions",
    subcategoryKey: "makine-emniyet-talimatlari",
    title: { tr: "Forklift Kullanım Talimatı", en: "Forklift Use Instruction" },
    description: {
      tr: "Operatör ehliyeti, ön kontrol, manevra ve yük taşıma kuralları talimatı.",
      en: "Operator license, pre-check, maneuvering and load-handling rules.",
    },
    sectorTags: ["Lojistik", "İmalat"],
    flags: { operation: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Forklift kullanımı için operatör ehliyeti, ön kontroller, manevra kuralları, yük taşıma sınırları ve sahada koordinasyonu kapsayan İSG talimatı oluştur.",
        en: "Draft a forklift OHS instruction covering operator license, pre-checks, maneuvering rules, load limits and site coordination.",
      },
    },
  },
  {
    id: "starter:instr-vinc",
    category: "instructions",
    subcategoryKey: "makine-emniyet-talimatlari",
    title: { tr: "Vinç / Kaldırma Talimatı", en: "Crane / Lifting Instruction" },
    description: {
      tr: "Yük tahmini, sapan seçimi, signalman ve manevra rotası kuralları.",
      en: "Load estimation, sling selection, signalman and lift-path rules.",
    },
    flags: { operation: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Vinç ve kaldırma operasyonları için yük tahmini, sapan seçimi, işaretçi (signalman) görevi ve manevra rotası planlaması içeren İSG talimatı hazırla.",
        en: "Create a crane lifting OHS instruction covering load estimation, sling selection, signalman duties and lift-path planning.",
      },
    },
  },
  {
    id: "starter:instr-pres",
    category: "instructions",
    subcategoryKey: "makine-emniyet-talimatlari",
    title: { tr: "Pres / Şekillendirme Tezgâhı Talimatı", en: "Press Machine Instruction" },
    description: {
      tr: "Çift el kontrolü, koruyucu, parça besleme ve LOTO temelli kullanım talimatı.",
      en: "Two-hand control, guards, part feeding and LOTO-based use instruction.",
    },
    flags: { operation: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Pres tezgâhı kullanımı için çift el kontrolü, koruyucular, parça besleme yöntemi ve LOTO uygulamalarını içeren detaylı İSG talimatı oluştur.",
        en: "Draft a press machine OHS instruction covering two-hand control, guards, part feeding and LOTO procedures.",
      },
    },
  },
  {
    id: "starter:instr-ppe",
    category: "instructions",
    subcategoryKey: "ppe-talimatlari",
    title: { tr: "PPE Kullanım Talimatı", en: "PPE Use Instruction" },
    description: {
      tr: "Kişisel koruyucu donanım için zimmet, kullanım ve denetim talimatı.",
      en: "Custody, usage and inspection instruction for personal protective equipment.",
    },
    sectorTags: ["Genel"],
    flags: { corporate: true },
    action: { kind: "template", templateId: "kkd-kullanim-talimati", groupKey: "talimatlar" },
  },
  {
    id: "starter:instr-baret",
    category: "instructions",
    subcategoryKey: "ppe-talimatlari",
    title: { tr: "Baret Kullanım Talimatı", en: "Hard-Hat Use Instruction" },
    description: {
      tr: "Baret seçimi, ayar, kontrol ve kullanım ömrü hakkında kullanım talimatı.",
      en: "Selection, adjustment, inspection and lifespan instruction for hard hats.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Baret kullanımı için seçim kriterleri, ayar, günlük kontrol, kullanım ömrü ve uygunsuzluk durumunda yapılacaklar ile ilgili kısa bir kullanım talimatı oluştur.",
        en: "Create a short hard-hat usage instruction covering selection, adjustment, daily inspection, lifespan and nonconformity actions.",
      },
    },
  },
  {
    id: "starter:instr-solunum",
    category: "instructions",
    subcategoryKey: "ppe-talimatlari",
    title: { tr: "Solunum Koruyucu Talimatı", en: "Respiratory PPE Instruction" },
    description: {
      tr: "Maske/filtre seçimi, fit-test ve kullanım sonrası temizlik kuralları.",
      en: "Mask/filter selection, fit-test and post-use cleaning rules.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Solunum koruyucu donanım için maske ve filtre seçimi, fit-test prosedürü, kullanım sırasında dikkat edilecekler ve temizlik kurallarını içeren talimat oluştur.",
        en: "Draft a respiratory PPE instruction covering mask/filter selection, fit-test procedure, in-use considerations and cleaning rules.",
      },
    },
  },
  {
    id: "starter:instr-bakim-elemani",
    category: "instructions",
    subcategoryKey: "calisan-talimatlari",
    title: { tr: "Bakım Elemanı Talimat ve Taahhütnamesi", en: "Maintenance Worker Instruction & Undertaking" },
    description: {
      tr: "Bakım personeli için görev, sorumluluk, KKD ve taahhüt maddelerini içeren belge.",
      en: "Document for maintenance staff covering duties, responsibilities, PPE and undertakings.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Bakım elemanı için görev ve sorumluluklar, kullanılacak KKD listesi, çalışma kuralları ve taahhüt maddelerini içeren talimat ve taahhütname şablonu oluştur. Sonunda imza bölümü olsun.",
        en: "Create an instruction & undertaking template for maintenance workers covering duties, PPE list, work rules and undertaking clauses with a signature section.",
      },
    },
  },
  {
    id: "starter:instr-guvenlik-elemani",
    category: "instructions",
    subcategoryKey: "calisan-talimatlari",
    title: { tr: "Güvenlik Elemanı Talimat ve Taahhütnamesi", en: "Security Officer Instruction & Undertaking" },
    description: {
      tr: "Özel güvenlik personeli için görev tanımı, devir-teslim ve taahhüt maddeleri.",
      en: "Duty definition, handover and undertaking clauses for security personnel.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Özel güvenlik personeli için görev tanımı, vardiya devir-teslim, ziyaretçi kontrolü, acil durumda davranış ve taahhüt maddelerini içeren talimat ve taahhütname şablonu oluştur.",
        en: "Create an instruction & undertaking for security personnel covering duty definition, shift handover, visitor control, emergency behaviour and undertaking clauses.",
      },
    },
  },
  {
    id: "starter:instr-temizlik",
    category: "instructions",
    subcategoryKey: "calisan-talimatlari",
    title: { tr: "Temizlik Personeli Talimatı", en: "Cleaning Staff Instruction" },
    description: {
      tr: "Kimyasal kullanımı, atık ayrıştırma ve KKD kuralları içeren talimat.",
      en: "Instruction covering chemical use, waste segregation and PPE rules.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Temizlik personeli için kimyasal madde kullanımı (MSDS bilgisi dahil), atık ayrıştırma kuralları, KKD listesi ve günlük çalışma adımlarını içeren talimat oluştur.",
        en: "Create a cleaning-staff instruction covering chemical use (with MSDS info), waste segregation rules, PPE list and daily work steps.",
      },
    },
  },
  {
    id: "starter:instr-fire",
    category: "instructions",
    subcategoryKey: "isg-talimatlari",
    title: { tr: "Yangın Müdahale Talimatı", en: "Fire Response Instruction" },
    description: {
      tr: "Yangın söndürme cihazı, tahliye ve müdahale ekibi rolleri için talimat.",
      en: "Instruction for extinguishers, evacuation and response team responsibilities.",
    },
    flags: { corporate: true, operation: true },
    action: { kind: "group", groupKey: "talimatlar" },
  },
  {
    id: "starter:instr-electric",
    category: "instructions",
    subcategoryKey: "isg-talimatlari",
    title: { tr: "Elektrik Çalışma Talimatı", en: "Electrical Work Instruction" },
    description: {
      tr: "Elektrik panosu ve enerjili ekipmanlarda LOTO temelli çalışma talimatı.",
      en: "LOTO-based work instruction for electrical panels and energised equipment.",
    },
    flags: { operation: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Elektrik panolarında ve enerjili ekipmanlarda çalışma için LOTO (Lockout-Tagout) tabanlı kapsamlı bir İSG talimatı oluştur.",
        en: "Create a comprehensive LOTO-based OHS instruction for working on electrical panels and energised equipment.",
      },
    },
  },
  {
    id: "starter:instr-yuksekte",
    category: "instructions",
    subcategoryKey: "isg-talimatlari",
    title: { tr: "Yüksekte Çalışma Talimatı", en: "Work-at-Height Instruction" },
    description: {
      tr: "Ankraj, EPI, çalışma izni ve kurtarma akışını kapsayan talimat.",
      en: "Instruction covering anchorage, EPI, work permit and rescue flow.",
    },
    flags: { operation: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Yüksekte çalışma için ankraj noktası seçimi, EPI kullanımı, çalışma izni süreci ve kurtarma akışını içeren İSG talimatı oluştur.",
        en: "Draft a work-at-height OHS instruction covering anchorage, EPI, work permit process and rescue flow.",
      },
    },
  },

  // ---------- Emergency ----------
  {
    id: "starter:emerg-plan",
    category: "emergency",
    subcategoryKey: "acil-durum-planlari",
    title: { tr: "Acil Durum Planı", en: "Emergency Plan" },
    description: {
      tr: "İşyeri için kapsamlı acil durum planı şablonu (yangın, deprem, kimyasal).",
      en: "Comprehensive emergency plan template for fire, earthquake and chemical events.",
    },
    flags: { corporate: true },
    action: { kind: "template", templateId: "acil-durum-plani", groupKey: "acil-durum" },
  },
  {
    id: "starter:emerg-evac",
    category: "emergency",
    subcategoryKey: "acil-durum-planlari",
    title: { tr: "Tahliye Planı Şablonu", en: "Evacuation Plan Template" },
    description: {
      tr: "Bina tahliye akışı, çıkış yolları ve sorumlu rolleri için temel plan.",
      en: "Baseline plan for building evacuation flow, exit routes and responsible roles.",
    },
    flags: { corporate: true },
    action: { kind: "template", templateId: "tahliye-plani", groupKey: "acil-durum" },
  },
  {
    id: "starter:emerg-assembly",
    category: "emergency",
    subcategoryKey: "acil-durum-planlari",
    title: { tr: "Toplanma Alanı Planı", en: "Assembly Area Plan" },
    description: {
      tr: "Toplanma noktası kroki ve sayım/eksik tespit prosedür şablonu.",
      en: "Assembly point sketch and headcount / missing-person procedure template.",
    },
    flags: { operation: true },
    action: { kind: "group", groupKey: "acil-durum" },
  },
  {
    id: "starter:emerg-earthquake",
    category: "emergency",
    subcategoryKey: "senaryolar-tatbikatlar",
    title: { tr: "Deprem Senaryosu Taslağı", en: "Earthquake Scenario Draft" },
    description: {
      tr: "Deprem öncesi/sonrası eylem akışı, müdahale ekibi ve iletişim listesi.",
      en: "Pre/post earthquake action flow, response team and communications list.",
    },
    flags: { ai: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Bir ofis ve depo karması bina için deprem öncesi, anı ve sonrası eylemleri kapsayan acil durum senaryosu taslağı oluştur. Müdahale ekiplerini, telefon listesini ve toplanma planını ekle.",
        en: "Draft an earthquake scenario for a mixed office/warehouse building covering pre, during and post actions, including response teams, contact list and assembly plan.",
      },
    },
  },
  {
    id: "starter:emerg-fire-drill",
    category: "emergency",
    subcategoryKey: "senaryolar-tatbikatlar",
    title: { tr: "Yangın Tatbikatı Senaryosu", en: "Fire Drill Scenario" },
    description: {
      tr: "Senaryo, gözlemci görevleri ve değerlendirme formu içeren yangın tatbikatı.",
      en: "Fire drill with scenario, observer duties and evaluation form.",
    },
    flags: { ai: true, operation: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "İşyeri için yangın tatbikatı senaryosu hazırla. Senaryo, gözlemci görevleri, kullanılacak ekipmanlar, sayım yöntemi ve tatbikat sonrası değerlendirme formunu içersin.",
        en: "Prepare a workplace fire drill scenario with observer duties, equipment list, headcount method and post-drill evaluation form.",
      },
    },
  },
  {
    id: "starter:emerg-chem-spill",
    category: "emergency",
    subcategoryKey: "senaryolar-tatbikatlar",
    title: { tr: "Kimyasal Sızıntı Senaryosu", en: "Chemical Spill Scenario" },
    description: {
      tr: "Sızıntı tespit, izolasyon, müdahale ve bildirim adımlarını içeren senaryo.",
      en: "Scenario covering detection, isolation, response and notification steps.",
    },
    flags: { ai: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Bir laboratuvar veya kimyasal depolama alanı için sızıntı tespit, alanı izole etme, müdahale ekibi görevleri, KKD seçimi ve resmi bildirim adımlarını içeren tatbikat senaryosu oluştur.",
        en: "Create a chemical spill drill scenario for a lab/storage area covering detection, area isolation, response duties, PPE selection and official notification steps.",
      },
    },
  },
  {
    id: "starter:emerg-firefight-team",
    category: "emergency",
    subcategoryKey: "acil-durum-ekipleri",
    title: { tr: "Yangın Söndürme Ekibi Görev Talimatı", en: "Firefighting Team Duty Form" },
    description: {
      tr: "Ekip üyesi görev dağılımı, müdahale akışı ve raporlama şablonu.",
      en: "Member duty assignment, response flow and reporting template.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "İşyeri yangın söndürme ekibi için ekip üyesi görev tanımları, müdahale akışı, kullanılacak ekipman listesi ve müdahale sonrası raporlama formu içeren görev talimatı oluştur.",
        en: "Create a workplace firefighting team duty form with role assignments, response flow, equipment list and post-response reporting form.",
      },
    },
  },
  {
    id: "starter:emerg-firstaid-team",
    category: "emergency",
    subcategoryKey: "acil-durum-ekipleri",
    title: { tr: "İlk Yardım Ekibi Görev Talimatı", en: "First Aid Team Duty Form" },
    description: {
      tr: "Sertifikalı ilk yardımcı listesi, müdahale akışı ve sevk prosedürü.",
      en: "Certified first-aider list, response flow and referral procedure.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "İşyeri ilk yardım ekibi için sertifikalı kişi listesi, vardiya kapsama planı, müdahale akışı, sevk prosedürü ve kayıt formu içeren görev talimatı oluştur.",
        en: "Create a workplace first-aid team duty form with certified-aider list, shift coverage plan, response flow, referral procedure and record form.",
      },
    },
  },
  {
    id: "starter:emerg-contact-list",
    category: "emergency",
    subcategoryKey: "iletisim-bildirim",
    title: { tr: "Acil İletişim Listesi", en: "Emergency Contact List" },
    description: {
      tr: "İç ve dış paydaşlar için 7/24 acil iletişim listesi şablonu.",
      en: "24/7 emergency contact list template for internal and external parties.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "İşyeri için acil durum iletişim listesi şablonu oluştur. İç paydaşlar (yönetim, ekipler), dış paydaşlar (itfaiye, AFAD, hastane) ve 7/24 ulaşılabilir kişiler kategorize edilsin.",
        en: "Create a workplace emergency contact list template with internal stakeholders (management, teams), external (fire, civil defense, hospital) and 24/7 on-call.",
      },
    },
  },

  // ---------- Audit Flows ----------
  {
    id: "starter:audit-forklift",
    category: "audit-flows",
    subcategoryKey: "saha-denetim-formlari",
    title: { tr: "Forklift Günlük Kontrol Checklist", en: "Forklift Daily Inspection Checklist" },
    description: {
      tr: "Operatör ön kontrol akışı: lastik, fren, sinyal, hidrolik ve yangın söndürücü.",
      en: "Operator pre-shift flow: tyres, brakes, signals, hydraulics and extinguisher.",
    },
    flags: { audit: true, operation: true },
    action: { kind: "group", groupKey: "arac-makine" },
  },
  {
    id: "starter:audit-electric",
    category: "audit-flows",
    subcategoryKey: "saha-denetim-formlari",
    title: { tr: "Elektrik Panosu Checklist", en: "Electrical Panel Checklist" },
    description: {
      tr: "Pano güvenliği: topraklama, etiketleme, koruyucu ve müdahale donanımı.",
      en: "Panel safety: grounding, labelling, protective equipment and access tools.",
    },
    flags: { audit: true },
    action: { kind: "group", groupKey: "periyodik-kontrol" },
  },
  {
    id: "starter:audit-extinguisher",
    category: "audit-flows",
    subcategoryKey: "saha-denetim-formlari",
    title: { tr: "Yangın Tüpü Kontrol Formu", en: "Fire Extinguisher Inspection Form" },
    description: {
      tr: "Aylık tüp kontrolü: basınç, mühür, etiket ve kullanım süresi takibi.",
      en: "Monthly extinguisher check: pressure, seal, tag and lifetime tracking.",
    },
    flags: { audit: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "İşyeri yangın tüpleri için aylık kontrol formu oluştur. Tüp kimliği, basınç durumu, mühür kontrolü, etiket geçerliliği ve kullanım süresi alanları olsun. Sonunda kontrol eden kişi imzası bulunsun.",
        en: "Create a monthly fire extinguisher inspection form with extinguisher ID, pressure, seal check, tag validity, lifetime fields and inspector signature.",
      },
    },
  },
  {
    id: "starter:audit-site",
    category: "audit-flows",
    subcategoryKey: "periyodik-denetimler",
    title: { tr: "3 Aylık Saha Denetimi", en: "Quarterly Field Audit" },
    description: {
      tr: "Genel saha denetimi: 5S, KKD kullanımı, tehlike noktaları ve düzeltici aksiyon.",
      en: "General field audit: 5S, PPE use, hazard hotspots and corrective actions.",
    },
    flags: { audit: true, operation: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "İşyeri için 3 aylık saha denetim formu oluştur. 5S, KKD kullanımı, tehlikeli alanlar, eksiklikler, düzeltici aksiyon planı ve takip tarihi alanları olsun.",
        en: "Create a quarterly field audit form covering 5S, PPE usage, hazardous areas, deficiencies, corrective action plan and follow-up date.",
      },
    },
  },
  {
    id: "starter:audit-yearly",
    category: "audit-flows",
    subcategoryKey: "periyodik-denetimler",
    title: { tr: "Yıllık İSG Denetim Formu", en: "Annual OHS Audit Form" },
    description: {
      tr: "Mevzuat uyumu, eğitim takibi ve risk değerlendirme güncelliği için yıllık form.",
      en: "Annual form for legal compliance, training tracking and risk assessment currency.",
    },
    flags: { audit: true, corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Yıllık İSG iç denetim formu oluştur. Mevzuat uyumu, risk değerlendirme güncelliği, eğitim katılımı, kurul toplantı sayısı ve sahaya yönelik kontrol başlıkları olsun.",
        en: "Create an annual OHS internal audit form covering legal compliance, risk assessment currency, training attendance, committee meeting count and field controls.",
      },
    },
  },
  {
    id: "starter:audit-6331",
    category: "audit-flows",
    subcategoryKey: "mevzuat-denetimleri",
    title: { tr: "6331 Uyum Kontrol Listesi", en: "OHS Law 6331 Compliance Checklist" },
    description: {
      tr: "6331 sayılı Kanun ve ilgili yönetmelikler için ayrıntılı uyum listesi.",
      en: "Detailed compliance checklist for OHS Law 6331 and related regulations.",
    },
    flags: { audit: true, corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "6331 sayılı İSG Kanunu ve bağlı yönetmeliklere göre işyeri uyum kontrol listesi oluştur. Risk değerlendirme, eğitim, sağlık gözetimi, acil durum, kurul ve süreler için ayrı bölümler olsun.",
        en: "Create a workplace compliance checklist for OHS Law 6331 and related regulations with sections for risk assessment, training, health surveillance, emergency, committee and deadlines.",
      },
    },
  },
  {
    id: "starter:audit-ppe",
    category: "audit-flows",
    subcategoryKey: "mevzuat-denetimleri",
    title: { tr: "KKD Denetim Formu", en: "PPE Audit Form" },
    description: {
      tr: "Çalışan başına PPE durumu, eksik kontrolü ve uygunsuzluk takibi.",
      en: "Per-employee PPE status, missing items and nonconformity follow-up.",
    },
    flags: { audit: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Çalışan başına KKD denetim formu oluştur. Çalışan adı, departman, zimmetli KKD listesi, durum, eksiklikler, sebep ve düzeltici aksiyon alanları olsun.",
        en: "Create a per-employee PPE audit form with employee name, department, assigned PPE list, status, missing items, reason and corrective action fields.",
      },
    },
  },

  // ---------- Corporate Templates ----------
  {
    id: "starter:corp-employment",
    category: "corporate-templates",
    subcategoryKey: "personel-belgeleri",
    title: { tr: "İş Sözleşmesi", en: "Employment Contract" },
    description: {
      tr: "Belirsiz süreli iş sözleşmesi şablonu — özlük dosyası için temel belge.",
      en: "Indefinite-term employment contract template — base document for HR file.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Belirsiz süreli iş sözleşmesi taslağı hazırla. Taraflar, görev tanımı, çalışma süresi, ücret, ek haklar, gizlilik, fesih şartları ve İSG yükümlülüklerini kapsasın.",
        en: "Draft an indefinite-term employment contract covering parties, role definition, working hours, salary, benefits, confidentiality, termination and OHS duties.",
      },
    },
  },
  {
    id: "starter:corp-nda",
    category: "corporate-templates",
    subcategoryKey: "personel-belgeleri",
    title: { tr: "Gizlilik Sözleşmesi", en: "Confidentiality Agreement" },
    description: {
      tr: "Personel ve danışman için NDA şablonu — KVKK ile uyumlu.",
      en: "NDA template for staff and consultants — KVKK aligned.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Personel ve dış danışman için kullanılabilecek bir gizlilik (NDA) sözleşme şablonu oluştur. KVKK uyumu, ticari sır tanımı, ihlal yaptırımları ve süre maddeleri olsun.",
        en: "Create an NDA template suitable for staff and external consultants with KVKK alignment, trade secret definition, breach penalties and duration clauses.",
      },
    },
  },
  {
    id: "starter:corp-role",
    category: "corporate-templates",
    subcategoryKey: "personel-belgeleri",
    title: { tr: "Görev Tanımı Belgesi", en: "Role Description" },
    description: {
      tr: "Pozisyon görev, yetki, sorumluluk ve yetkinlik tanım şablonu.",
      en: "Position duty, authority, responsibility and competency definition template.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Bir pozisyon için görev tanımı belgesi şablonu oluştur. Bağlı olduğu birim, görev ve sorumluluklar, yetkiler, gerekli yetkinlik/eğitimler ve performans göstergeleri içersin.",
        en: "Create a role description template covering reporting line, duties & responsibilities, authority, required competencies/training and performance indicators.",
      },
    },
  },
  {
    id: "starter:corp-policy",
    category: "corporate-templates",
    subcategoryKey: "politika-yonergeler",
    title: { tr: "İSG Politikası", en: "OHS Policy" },
    description: {
      tr: "Üst yönetim taahhüdü, hedefler ve iletişim ilkelerini kapsayan politika belgesi.",
      en: "Policy document covering top-management commitment, targets and communication.",
    },
    flags: { corporate: true },
    action: { kind: "group", groupKey: "prosedurler" },
  },
  {
    id: "starter:corp-ethics",
    category: "corporate-templates",
    subcategoryKey: "politika-yonergeler",
    title: { tr: "Etik Kuralları", en: "Code of Conduct" },
    description: {
      tr: "Çalışan davranış, çıkar çatışması ve raporlama ilkelerini kapsayan etik belgesi.",
      en: "Conduct, conflict of interest and reporting principles for employees.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Bir kurumsal etik kuralları belgesi taslağı oluştur. Çalışan davranışları, çıkar çatışması, hediye kabulü, gizli bilgi koruması ve ihlal raporlama mekanizması içersin.",
        en: "Create a code of conduct draft covering employee behaviour, conflict of interest, gifts, confidential information protection and breach reporting mechanism.",
      },
    },
  },
  {
    id: "starter:corp-handbook",
    category: "corporate-templates",
    subcategoryKey: "politika-yonergeler",
    title: { tr: "Çalışan El Kitabı (İSG)", en: "Employee Handbook (OHS)" },
    description: {
      tr: "Yeni başlayanlar için temel İSG kuralları, haklar ve sorumluluklar.",
      en: "Baseline OHS rules, rights and responsibilities for new joiners.",
    },
    flags: { corporate: true, ai: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Yeni çalışanlar için kurumsal bir İSG el kitabı taslağı oluştur. Kurallar, hak/sorumluluklar, KKD politikası ve acil durum davranışlarını içersin.",
        en: "Draft a corporate OHS employee handbook covering rules, rights & responsibilities, PPE policy and emergency behaviour.",
      },
    },
  },
  {
    id: "starter:corp-doc-procedure",
    category: "corporate-templates",
    subcategoryKey: "prosedurler",
    title: { tr: "Doküman Yönetim Prosedürü", en: "Document Management Procedure" },
    description: {
      tr: "Doküman oluşturma, onay, dağıtım, revizyon ve arşiv kurallarını içeren prosedür.",
      en: "Procedure covering document creation, approval, distribution, revision and archive.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Doküman yönetim prosedürü oluştur. Doküman oluşturma, onay, dağıtım, revizyon, dış kaynaklı doküman ve arşiv kurallarını içersin.",
        en: "Create a document management procedure covering creation, approval, distribution, revision, externally sourced documents and archive rules.",
      },
    },
  },
  {
    id: "starter:corp-training-procedure",
    category: "corporate-templates",
    subcategoryKey: "prosedurler",
    title: { tr: "Eğitim Yönetim Prosedürü", en: "Training Management Procedure" },
    description: {
      tr: "İhtiyaç analizi, planlama, gerçekleştirme ve etkinlik ölçümü için prosedür.",
      en: "Procedure for needs analysis, planning, execution and effectiveness measurement.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Eğitim yönetim prosedürü oluştur. Eğitim ihtiyaç analizi, yıllık plan, gerçekleştirme, kayıt, sertifikalandırma ve etkinlik ölçümü adımları olsun.",
        en: "Create a training management procedure with needs analysis, annual plan, execution, recording, certification and effectiveness measurement steps.",
      },
    },
  },
  {
    id: "starter:corp-orgchart",
    category: "corporate-templates",
    subcategoryKey: "organizasyon-yetki",
    title: { tr: "Organizasyon Şeması Şablonu", en: "Org Chart Template" },
    description: {
      tr: "Departman, unvan ve raporlama hiyerarşisi için organizasyon şeması.",
      en: "Org chart for departments, titles and reporting hierarchy.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Bir orta ölçekli işyeri için organizasyon şeması şablonu oluştur. Üst yönetim, departman müdürleri, ekip lideri ve operasyon seviyesi rolleri içersin. Markdown tablosu/listesi formatında ver.",
        en: "Create an org chart template for a mid-sized workplace covering top management, department managers, team leads and operational roles. Provide as a markdown table/list.",
      },
    },
  },
  {
    id: "starter:corp-matrix",
    category: "corporate-templates",
    subcategoryKey: "organizasyon-yetki",
    title: { tr: "Yetki Onay Matrisi", en: "Authority Approval Matrix" },
    description: {
      tr: "Karar sahipleri, onaylayıcılar ve danışılacak roller için RACI tablosu.",
      en: "RACI table for decision makers, approvers and consulted roles.",
    },
    flags: { corporate: true },
    action: { kind: "group", groupKey: "personel-ozluk" },
  },

  // ---------- Operation Templates ----------
  {
    id: "starter:op-shift",
    category: "operation-templates",
    subcategoryKey: "saha-operasyonu",
    title: { tr: "Vardiya Devir Tutanağı", en: "Shift Handover Record" },
    description: {
      tr: "Vardiya değişimlerinde sahanın durumunu, açık aksiyonları ve riskleri aktarın.",
      en: "Hand over the field status, open actions and risks at shift change.",
    },
    flags: { operation: true },
    action: { kind: "group", groupKey: "diger-kayitlar" },
  },
  {
    id: "starter:op-site-open",
    category: "operation-templates",
    subcategoryKey: "saha-operasyonu",
    title: { tr: "Saha Açılış Kontrol Listesi", en: "Site Opening Checklist" },
    description: {
      tr: "Vardiya başında saha hazırlığı, ekipman ve güvenlik kontrolleri.",
      en: "Start-of-shift site readiness, equipment and safety checks.",
    },
    flags: { operation: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Vardiya başında saha açılışı için kontrol listesi oluştur. Aydınlatma, koruyucular, KKD durumu, acil çıkış erişimi, ekipman ön kontrolü ve onaylayan operatör imzası alanları olsun.",
        en: "Create a site opening checklist for shift start with lighting, guards, PPE, emergency exit access, equipment pre-check and signing operator fields.",
      },
    },
  },
  {
    id: "starter:op-maintenance",
    category: "operation-templates",
    subcategoryKey: "bakim-operasyonu",
    title: { tr: "Bakım Talimatı", en: "Maintenance Instruction" },
    description: {
      tr: "Periyodik bakım planı, sorumlu, kontrol noktaları ve onay akışı.",
      en: "Periodic maintenance plan, responsible, check points and approval flow.",
    },
    flags: { operation: true },
    action: { kind: "group", groupKey: "arac-makine" },
  },
  {
    id: "starter:op-maintenance-request",
    category: "operation-templates",
    subcategoryKey: "bakim-operasyonu",
    title: { tr: "Bakım Talep Formu", en: "Maintenance Request Form" },
    description: {
      tr: "Arıza tarifi, öncelik, tahmini süre ve müdahale eden ekip bilgileri.",
      en: "Fault description, priority, estimated time and responding team info.",
    },
    flags: { operation: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "İşyeri bakım talep formu oluştur. Talep eden, ekipman/lokasyon, arıza tarifi, öncelik, müdahale eden ekip, başlangıç-bitiş zamanı ve onay alanları olsun.",
        en: "Create a workplace maintenance request form with requester, equipment/location, fault description, priority, responding team, start-end time and approval fields.",
      },
    },
  },
  {
    id: "starter:op-flow",
    category: "operation-templates",
    subcategoryKey: "uretim-operasyonu",
    title: { tr: "Operasyon Süreç Akışı", en: "Operation Process Flow" },
    description: {
      tr: "Standart süreç adımları, sorumlu rol ve doğrulama noktaları.",
      en: "Standard process steps, responsible role and verification points.",
    },
    flags: { operation: true, ai: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Üretim hattı için bir operasyon süreç akışı taslağı oluştur. Adımlar, sorumlu roller ve İSG kontrol noktaları içersin.",
        en: "Draft a production-line operation process flow with steps, responsible roles and OHS checkpoints.",
      },
    },
  },
  {
    id: "starter:op-line-safety",
    category: "operation-templates",
    subcategoryKey: "uretim-operasyonu",
    title: { tr: "Hat Güvenlik Kontrolü", en: "Line Safety Check" },
    description: {
      tr: "Üretim hattı başlangıç ve sonu güvenlik kontrol formu.",
      en: "Start and end safety check form for the production line.",
    },
    flags: { operation: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Üretim hattı başlangıcı ve sonu için güvenlik kontrol formu oluştur. Acil stop testleri, koruyucu durumu, sensör testleri ve operatör onayı alanları içersin.",
        en: "Create a production-line safety check form for start and end with emergency stop tests, guard status, sensor tests and operator approval.",
      },
    },
  },
  {
    id: "starter:op-warehouse",
    category: "operation-templates",
    subcategoryKey: "lojistik-depo",
    title: { tr: "Depo Giriş-Çıkış Kontrol Formu", en: "Warehouse Inbound/Outbound Form" },
    description: {
      tr: "Yük tartım, paketleme, sevk irsaliyesi ve denetim alanları içeren form.",
      en: "Form covering load weighing, packaging, dispatch note and audit fields.",
    },
    flags: { operation: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Depo giriş ve çıkış işlemleri için kontrol formu oluştur. Yük tartımı, paketleme kontrolü, sevk irsaliyesi numarası, plaka, sürücü ve sorumlu kişi alanları olsun.",
        en: "Create a warehouse inbound/outbound control form with load weighing, packaging check, dispatch note number, plate, driver and responsible-person fields.",
      },
    },
  },

  // ---------- Process Packs ----------
  {
    id: "starter:pack-onboarding",
    category: "process-packs",
    subcategoryKey: "hizli-baslangic",
    title: { tr: "Yeni İşe Giriş Paketi", en: "New Joiner Pack" },
    description: {
      tr: "İşe giriş İSG eğitim formu, KKD zimmet ve oryantasyon kontrol listesi.",
      en: "Onboarding OHS training form, PPE issue and orientation checklist.",
    },
    flags: { process: true, corporate: true },
    action: { kind: "group", groupKey: "is-giris-oryantasyon" },
  },
  {
    id: "starter:pack-new-company",
    category: "process-packs",
    subcategoryKey: "hizli-baslangic",
    title: { tr: "Yeni Firma Açılış Paketi", en: "New Company Setup Pack" },
    description: {
      tr: "Yeni firma için ilk 30 gün İSG kurulum kontrol listesi.",
      en: "First-30-days OHS setup checklist for a new company.",
    },
    flags: { process: true, corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Yeni bir firma için ilk 30 günde tamamlanması gereken İSG kurulum kontrol listesi oluştur. Risk değerlendirme, kurul, uzman ataması, eğitim, KKD, acil durum planı ve dokümantasyon başlıklarını içersin.",
        en: "Create a first-30-days OHS setup checklist for a new company covering risk assessment, committee, specialist assignment, training, PPE, emergency plan and documentation.",
      },
    },
  },
  {
    id: "starter:pack-construction",
    category: "process-packs",
    subcategoryKey: "sektorel-paketler",
    title: { tr: "İnşaat Saha Paketi", en: "Construction Site Pack" },
    description: {
      tr: "İnşaat sahası açılışı için risk, talimat, kontrol ve eğitim paketi.",
      en: "Site opening pack with risk, instructions, audits and training.",
    },
    flags: { process: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Yeni bir inşaat sahası için açılış İSG paketi oluştur. Saha risk değerlendirmesi, yüksekte çalışma talimatı, vinç operasyon talimatı, günlük kontrol formu, eğitim planı ve acil durum tahliye planı başlıklarını içersin.",
        en: "Create a construction site opening OHS pack covering site risk assessment, work-at-height instruction, crane operation instruction, daily check form, training plan and emergency evacuation plan.",
      },
    },
  },
  {
    id: "starter:pack-hospital",
    category: "process-packs",
    subcategoryKey: "sektorel-paketler",
    title: { tr: "Hastane Paketi", en: "Hospital Pack" },
    description: {
      tr: "Hastane operasyonu için klinik, mutfak, atık ve kimyasal alan paketi.",
      en: "Pack for clinic, kitchen, waste and chemical zones in hospitals.",
    },
    flags: { process: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Bir hastane operasyonu için İSG paketi oluştur. Klinik, ameliyathane, mutfak, çamaşırhane, atık alanı ve kimyasal odası için risk değerlendirme, talimat, denetim formu ve eğitim başlıklarını içersin.",
        en: "Create a hospital OHS pack covering risk assessments, instructions, audit forms and training for clinic, OR, kitchen, laundry, waste zone and chemical room.",
      },
    },
  },
  {
    id: "starter:pack-renewal",
    category: "process-packs",
    subcategoryKey: "yenileme-takibi",
    title: { tr: "Yıllık Yenileme Paketi", en: "Annual Renewal Pack" },
    description: {
      tr: "Yıllık değerlendirme, plan ve faaliyet raporu için süreç paketi.",
      en: "Process pack for annual review, plan and activity report.",
    },
    flags: { process: true },
    action: { kind: "group", groupKey: "yillik-degerlendirme" },
  },
  {
    id: "starter:pack-osgb",
    category: "process-packs",
    subcategoryKey: "yenileme-takibi",
    title: { tr: "OSGB Hizmet Başlatma Paketi", en: "OSGB Service Kickoff Pack" },
    description: {
      tr: "Sözleşme, atama, ekip iletişim ve ilk denetim akışı.",
      en: "Contract, assignment, team contact and first audit flow.",
    },
    flags: { process: true, corporate: true },
    action: { kind: "module", href: "/osgb" },
  },

  // ---------- AI Drafts ----------
  {
    id: "starter:ai-hospital-kitchen",
    category: "ai-drafts",
    subcategoryKey: "hizli-ai-sablonlari",
    title: { tr: "Hastane Mutfağı Hijyen Checklisti", en: "Hospital Kitchen Hygiene Checklist" },
    description: {
      tr: "“Kullanıcı: hastane mutfağı için hijyen checklisti oluştur” — Nova bu girişten taslak üretir.",
      en: "“Create a hygiene checklist for a hospital kitchen” — Nova drafts from this brief.",
    },
    flags: { ai: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Hastane mutfağı için günlük, haftalık ve aylık adımları içeren hijyen checklisti oluştur. HACCP ilkelerini ve İSG kontrollerini de ekle.",
        en: "Create a hygiene checklist for a hospital kitchen with daily, weekly and monthly tasks. Include HACCP and OHS controls.",
      },
    },
  },
  {
    id: "starter:ai-sector-instruction",
    category: "ai-drafts",
    subcategoryKey: "hizli-ai-sablonlari",
    title: { tr: "Sektöre Özel Talimat Taslağı", en: "Sector-Specific Instruction Draft" },
    description: {
      tr: "Sektör ve operasyon bilgisini girin, Nova size özel talimat taslağı çıkarsın.",
      en: "Enter your sector and operation; Nova will produce a tailored instruction draft.",
    },
    flags: { ai: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Belirtilen sektör ve operasyon için kapsamlı bir İSG talimatı taslağı hazırla. Riskler, KKD, prosedür adımları ve sorumlu roller olsun.",
        en: "Draft a comprehensive OHS instruction for the given sector and operation, covering risks, PPE, procedure steps and responsibilities.",
      },
    },
  },
  {
    id: "starter:ai-department-risk",
    category: "ai-drafts",
    subcategoryKey: "hizli-ai-sablonlari",
    title: { tr: "Departman Risk Taslağı", en: "Department Risk Draft" },
    description: {
      tr: "Departman ve işin kapsamını paylaşın, Nova 5x5 risk taslağını çıkarsın.",
      en: "Share the department and scope; Nova drafts a 5x5 risk assessment.",
    },
    flags: { ai: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "Belirtilen departman için tehlikeleri, mevcut kontrolleri ve 5x5 matrisle puanlanmış risk değerlendirmesini içeren taslak oluştur.",
        en: "Produce a draft for the given department covering hazards, existing controls and 5x5 scored risk assessment.",
      },
    },
  },

  // ---------- Documentation (seed templates so subcategories are never empty) ----------
  {
    id: "starter:doc-workplace-file",
    category: "documentation",
    subcategoryKey: "isyeri-dosyasi",
    title: { tr: "İşyeri Dosyası Kapak Sayfası", en: "Workplace File Cover" },
    description: {
      tr: "İşyeri dosyasının ana kapak ve içindekiler kısmı için şablon.",
      en: "Cover and table-of-contents template for the workplace file.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "İşyeri dosyası için kapak sayfası ve detaylı içindekiler bölümü oluştur. Risk değerlendirmesi, eğitimler, denetimler, kurul kararları, acil durum planı, kaza-olay kayıtları ve mevzuat başlıklarını içersin.",
        en: "Create a workplace file cover page and detailed table of contents covering risk assessment, training, audits, committee decisions, emergency plan, incident records and regulations.",
      },
    },
  },
  {
    id: "starter:doc-committee",
    category: "documentation",
    subcategoryKey: "kurul-kayitlari",
    title: { tr: "İSG Kurul Toplantı Tutanağı", en: "OHS Committee Meeting Minutes" },
    description: {
      tr: "Kurul gündemi, kararlar ve katılım takibi için tutanak şablonu.",
      en: "Minutes template covering agenda, decisions and attendance.",
    },
    flags: { corporate: true },
    action: { kind: "template", templateId: "kurul-tutanagi", groupKey: "kurul-kayitlari" },
  },
  {
    id: "starter:doc-decision-book",
    category: "documentation",
    subcategoryKey: "kurul-kayitlari",
    title: { tr: "Karar Defteri Şablonu", en: "Decision Book Template" },
    description: {
      tr: "Kurul ve yönetim kararlarının kronolojik kaydı için defter şablonu.",
      en: "Chronological record book template for committee and management decisions.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "İSG kurul kararları için karar defteri şablonu oluştur. Karar numarası, tarih, konu, karar metni, sorumlu kişi, son tarih, durum ve imza alanları olsun.",
        en: "Create a decision book template for OHS committee with decision number, date, subject, decision text, responsible, deadline, status and signature fields.",
      },
    },
  },
  {
    id: "starter:doc-notification",
    category: "documentation",
    subcategoryKey: "resmi-yazismalar",
    title: { tr: "Çalışana Tebliğ Yazısı", en: "Employee Notification Letter" },
    description: {
      tr: "İşyeri kuralları, eğitim, görev değişikliği gibi konular için tebliğ.",
      en: "Notification template for workplace rules, training, role changes.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "İşyeri çalışanına resmi tebliğ yazısı şablonu oluştur. Konu, ilgili mevzuat referansı, tebliğ edilen içerik, çalışan beyanı, tarih ve imza alanları olsun.",
        en: "Create an official notification letter template for employees with subject, legal reference, content, employee declaration, date and signature.",
      },
    },
  },
  {
    id: "starter:doc-inspector-response",
    category: "documentation",
    subcategoryKey: "resmi-yazismalar",
    title: { tr: "Müfettişe Cevap Yazısı", en: "Inspector Response Letter" },
    description: {
      tr: "İş müfettişi tespitlerine resmi cevap için yazı şablonu.",
      en: "Letter template for formal response to labor inspector findings.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "İş müfettişi tespitlerine cevap yazısı şablonu oluştur. Tespit özeti, alınan aksiyonlar, kanıt dokümanları, sorumlu kişiler ve takvim alanları olsun.",
        en: "Create a labor-inspector response letter template with finding summary, actions taken, evidence documents, responsible persons and timeline.",
      },
    },
  },
  {
    id: "starter:doc-risk-report",
    category: "documentation",
    subcategoryKey: "raporlar",
    title: { tr: "Risk Değerlendirme Raporu", en: "Risk Assessment Report" },
    description: {
      tr: "Hazır TipTap şablonu — firma değişkenleriyle otomatik dolar.",
      en: "Ready TipTap template — auto-fills with company variables.",
    },
    flags: { corporate: true },
    action: { kind: "template", templateId: "risk-raporu", groupKey: "risk-degerlendirme" },
  },
  {
    id: "starter:doc-monthly-report",
    category: "documentation",
    subcategoryKey: "raporlar",
    title: { tr: "Aylık Faaliyet Raporu", en: "Monthly Activity Report" },
    description: {
      tr: "Eğitim, denetim, kaza, DOF ve kurul başlıklı aylık özet raporu.",
      en: "Monthly summary report on training, audits, incidents, CAPA and committee.",
    },
    flags: { corporate: true },
    action: {
      kind: "ai",
      prompt: {
        tr: "İSG aylık faaliyet raporu şablonu oluştur. Eğitimler, denetimler, kaza-olay sayıları, DOF takibi, kurul kararları ve gelecek ay planı bölümleri olsun.",
        en: "Create a monthly OHS activity report template with sections for training, audits, incident counts, CAPA tracking, committee decisions and next-month plan.",
      },
    },
  },
];

export type CustomCategoryRecord = {
  /** Slug-form id, e.g. `kimyasal-guvenlik`. */
  id: string;
  label: string;
  /** Optional description shown in the chip tooltip / panel header. */
  description?: string;
  createdAt: string;
};

/**
 * User-created subcategory inside a parent category. Persisted in local
 * storage keyed by parent category id (built-in `key` or `custom:<id>`). Slug
 * is unique within the parent only.
 */
export type CustomSubcategoryRecord = {
  /** Parent category key — e.g. "instructions" or "custom:hastane-operasyonlari". */
  parentCategoryKey: string;
  /** Slug-form id, unique within the parent (e.g. `kimyasal-talimatlari`). */
  id: string;
  label: string;
  description?: string;
  createdAt: string;
};

export const CUSTOM_CATEGORY_STORAGE_KEY = "risknova:isg-library:custom-main-categories:v1";
export const CUSTOM_SUBCATEGORY_STORAGE_KEY = "risknova:isg-library:custom-subcategories:v1";

/**
 * Local-only "hide list" for built-in subcategories. We can't delete the
 * built-in catalog (it ships with the app) but the user can hide entries they
 * don't want to see. Stored as `<parentCategoryKey>::<subcategoryKey>` strings.
 */
export const HIDDEN_SUBCATEGORY_STORAGE_KEY = "risknova:isg-library:hidden-subcategories:v1";

/** Same idea but for built-in main categories the user wants to dismiss. */
export const HIDDEN_CATEGORY_STORAGE_KEY = "risknova:isg-library:hidden-categories:v1";

export function pickLocalized(text: LocalizedText | undefined, locale: string): string {
  if (!text) return "";
  if (locale.startsWith("tr")) return text.tr;
  return text.en || text.tr;
}

/**
 * Returns the subcategory list for a category, or [] when the category has no
 * subcategories or is the synthetic "all"/"custom:*" key. Use this from the UI
 * to decide whether to render the left subcategory rail.
 *
 * Combines:
 *  1. built-in subcategories from `BUILTIN_CATEGORIES`
 *  2. user-added custom subcategories under this category
 *  3. minus any built-in or custom subcategories the user has hidden
 */
export function getSubcategoriesForCategory(
  categoryKey: CategoryKey,
  customCategoryDefinitions: LibraryCategoryDefinition[] = [],
  customSubcategories: CustomSubcategoryRecord[] = [],
  hiddenSubcategoryKeys: string[] = [],
): LibrarySubcategoryDefinition[] {
  if (categoryKey === "all") return [];
  const all = [...BUILTIN_CATEGORIES, ...customCategoryDefinitions];
  const def = all.find((entry) => entry.key === categoryKey);
  const builtIns = def?.subcategories ?? [];
  const customs: LibrarySubcategoryDefinition[] = customSubcategories
    .filter((entry) => entry.parentCategoryKey === categoryKey)
    .map((entry) => ({
      key: entry.id,
      label: { tr: entry.label, en: entry.label },
      description: entry.description
        ? { tr: entry.description, en: entry.description }
        : undefined,
    }));
  const merged = [...builtIns, ...customs];
  if (hiddenSubcategoryKeys.length === 0) return merged;
  const hidden = new Set(hiddenSubcategoryKeys);
  return merged.filter((entry) => !hidden.has(`${categoryKey}::${entry.key}`));
}

/** True for any built-in subcategory belonging to a built-in category. */
export function isBuiltinSubcategory(
  categoryKey: CategoryKey,
  subcategoryKey: string,
): boolean {
  const def = BUILTIN_CATEGORIES.find((entry) => entry.key === categoryKey);
  return Boolean(def?.subcategories?.some((entry) => entry.key === subcategoryKey));
}

export type CategoryIconMap = Record<CategoryIconKey, LucideIcon>;

/** Build the icon map at the call-site to avoid bundling the entire lucide set. */
export type LucideIconRefs = {
  FileText: typeof FileText;
  Siren: typeof Siren;
  ScrollText: typeof ScrollText;
  Briefcase: typeof Briefcase;
  Workflow: typeof Workflow;
  ShieldAlert: typeof ShieldAlert;
  ClipboardCheck: typeof ClipboardCheck;
  Boxes: typeof Boxes;
  Sparkles: typeof Sparkles;
  Users: typeof Users;
};

/** Maps removed/legacy URL section values to where the user should actually go. */
export const LEGACY_SECTION_REDIRECTS: Record<string, { module?: string; category?: BuiltinCategoryKey }> = {
  education: { module: "/training" },
  egitim: { module: "/training" },
  assessment: { module: "/training" },
  "sinav-ve-anket": { module: "/training" },
  "sinav-anket": { module: "/training" },
  legal: { module: "/settings?tab=mevzuat" },
  "mevzuat-ve-rehberler": { module: "/settings?tab=mevzuat" },
  "mevzuat-rehberler": { module: "/settings?tab=mevzuat" },
  forms: { category: "audit-flows" },
  "form-ve-checklist": { category: "audit-flows" },
  formlar: { category: "audit-flows" },
  // already-current keys, kept for symmetry
  documentation: { category: "documentation" },
  dokumantasyon: { category: "documentation" },
  emergency: { category: "emergency" },
  "acil-durum": { category: "emergency" },
  instructions: { category: "instructions" },
  talimatlar: { category: "instructions" },
};

/** Tone tokens (Tailwind classes). Tuned for both light and dark modes. */
export const CATEGORY_TONE_CLASSES: Record<
  LibraryCategoryDefinition["tone"],
  {
    chipActive: string;
    chipIdle: string;
    accent: string;
    panelBorder: string;
    badgeBg: string;
  }
> = {
  amber: {
    chipActive:
      "border-amber-300 bg-gradient-to-br from-amber-200 via-yellow-200 to-orange-200 text-amber-950 shadow-[0_14px_32px_rgba(217,119,6,0.18)] dark:border-amber-300/40 dark:from-amber-500/30 dark:via-yellow-500/25 dark:to-orange-500/25 dark:text-amber-50",
    chipIdle:
      "border-amber-200/70 bg-amber-50/70 text-amber-800 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-400/15 dark:bg-amber-400/8 dark:text-amber-100 dark:hover:bg-amber-400/12",
    accent: "bg-gradient-to-b from-amber-400 to-orange-400",
    panelBorder: "border-amber-200/70 dark:border-amber-400/15",
    badgeBg:
      "border-amber-200 bg-amber-100/80 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/15 dark:text-amber-100",
  },
  rose: {
    chipActive:
      "border-rose-300 bg-gradient-to-br from-rose-200 via-orange-200 to-red-200 text-rose-950 shadow-[0_14px_32px_rgba(225,29,72,0.18)] dark:border-rose-300/40 dark:from-rose-500/30 dark:via-orange-500/25 dark:to-red-500/25 dark:text-rose-50",
    chipIdle:
      "border-rose-200/70 bg-rose-50/70 text-rose-800 hover:border-rose-300 hover:bg-rose-100 dark:border-rose-400/15 dark:bg-rose-400/8 dark:text-rose-100 dark:hover:bg-rose-400/12",
    accent: "bg-gradient-to-b from-rose-400 to-red-500",
    panelBorder: "border-rose-200/70 dark:border-rose-400/15",
    badgeBg:
      "border-rose-200 bg-rose-100/80 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/15 dark:text-rose-100",
  },
  indigo: {
    chipActive:
      "border-indigo-300 bg-gradient-to-br from-indigo-200 via-blue-200 to-slate-200 text-indigo-950 shadow-[0_14px_32px_rgba(79,70,229,0.18)] dark:border-indigo-300/40 dark:from-indigo-500/30 dark:via-blue-500/25 dark:to-slate-500/25 dark:text-indigo-50",
    chipIdle:
      "border-indigo-200/70 bg-indigo-50/70 text-indigo-800 hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-400/15 dark:bg-indigo-400/8 dark:text-indigo-100 dark:hover:bg-indigo-400/12",
    accent: "bg-gradient-to-b from-indigo-400 to-blue-500",
    panelBorder: "border-indigo-200/70 dark:border-indigo-400/15",
    badgeBg:
      "border-indigo-200 bg-indigo-100/80 text-indigo-800 dark:border-indigo-400/20 dark:bg-indigo-400/15 dark:text-indigo-100",
  },
  slate: {
    chipActive:
      "border-slate-300 bg-gradient-to-br from-slate-100 via-white to-slate-200 text-slate-950 shadow-[0_14px_32px_rgba(15,23,42,0.14)] dark:border-slate-500/40 dark:from-slate-700/55 dark:via-slate-800 dark:to-slate-900 dark:text-white",
    chipIdle:
      "border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
    accent: "bg-gradient-to-b from-slate-400 to-slate-500",
    panelBorder: "border-slate-200/80 dark:border-white/10",
    badgeBg:
      "border-slate-200 bg-slate-100/80 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200",
  },
  teal: {
    chipActive:
      "border-teal-300 bg-gradient-to-br from-teal-200 via-cyan-200 to-emerald-200 text-teal-950 shadow-[0_14px_32px_rgba(20,184,166,0.18)] dark:border-teal-300/40 dark:from-teal-500/30 dark:via-cyan-500/25 dark:to-emerald-500/25 dark:text-teal-50",
    chipIdle:
      "border-teal-200/70 bg-teal-50/70 text-teal-800 hover:border-teal-300 hover:bg-teal-100 dark:border-teal-400/15 dark:bg-teal-400/8 dark:text-teal-100 dark:hover:bg-teal-400/12",
    accent: "bg-gradient-to-b from-teal-400 to-cyan-500",
    panelBorder: "border-teal-200/70 dark:border-teal-400/15",
    badgeBg:
      "border-teal-200 bg-teal-100/80 text-teal-800 dark:border-teal-400/20 dark:bg-teal-400/15 dark:text-teal-100",
  },
  red: {
    chipActive:
      "border-red-300 bg-gradient-to-br from-red-200 via-rose-200 to-orange-200 text-red-950 shadow-[0_14px_32px_rgba(220,38,38,0.18)] dark:border-red-300/40 dark:from-red-500/30 dark:via-rose-500/25 dark:to-orange-500/25 dark:text-red-50",
    chipIdle:
      "border-red-200/70 bg-red-50/70 text-red-800 hover:border-red-300 hover:bg-red-100 dark:border-red-400/15 dark:bg-red-400/8 dark:text-red-100 dark:hover:bg-red-400/12",
    accent: "bg-gradient-to-b from-red-400 to-rose-500",
    panelBorder: "border-red-200/70 dark:border-red-400/15",
    badgeBg:
      "border-red-200 bg-red-100/80 text-red-800 dark:border-red-400/20 dark:bg-red-400/15 dark:text-red-100",
  },
  emerald: {
    chipActive:
      "border-emerald-300 bg-gradient-to-br from-emerald-200 via-teal-200 to-green-200 text-emerald-950 shadow-[0_14px_32px_rgba(16,185,129,0.18)] dark:border-emerald-300/40 dark:from-emerald-500/30 dark:via-teal-500/25 dark:to-green-500/25 dark:text-emerald-50",
    chipIdle:
      "border-emerald-200/70 bg-emerald-50/70 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-400/15 dark:bg-emerald-400/8 dark:text-emerald-100 dark:hover:bg-emerald-400/12",
    accent: "bg-gradient-to-b from-emerald-400 to-teal-500",
    panelBorder: "border-emerald-200/70 dark:border-emerald-400/15",
    badgeBg:
      "border-emerald-200 bg-emerald-100/80 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/15 dark:text-emerald-100",
  },
  violet: {
    chipActive:
      "border-violet-300 bg-gradient-to-br from-violet-200 via-fuchsia-200 to-purple-200 text-violet-950 shadow-[0_14px_32px_rgba(124,58,237,0.18)] dark:border-violet-300/40 dark:from-violet-500/30 dark:via-fuchsia-500/25 dark:to-purple-500/25 dark:text-violet-50",
    chipIdle:
      "border-violet-200/70 bg-violet-50/70 text-violet-800 hover:border-violet-300 hover:bg-violet-100 dark:border-violet-400/15 dark:bg-violet-400/8 dark:text-violet-100 dark:hover:bg-violet-400/12",
    accent: "bg-gradient-to-b from-violet-400 to-fuchsia-500",
    panelBorder: "border-violet-200/70 dark:border-violet-400/15",
    badgeBg:
      "border-violet-200 bg-violet-100/80 text-violet-800 dark:border-violet-400/20 dark:bg-violet-400/15 dark:text-violet-100",
  },
  fuchsia: {
    chipActive:
      "border-fuchsia-300 bg-gradient-to-br from-fuchsia-200 via-purple-200 to-pink-200 text-fuchsia-950 shadow-[0_14px_32px_rgba(192,38,211,0.18)] dark:border-fuchsia-300/40 dark:from-fuchsia-500/30 dark:via-purple-500/25 dark:to-pink-500/25 dark:text-fuchsia-50",
    chipIdle:
      "border-fuchsia-200/70 bg-fuchsia-50/70 text-fuchsia-800 hover:border-fuchsia-300 hover:bg-fuchsia-100 dark:border-fuchsia-400/15 dark:bg-fuchsia-400/8 dark:text-fuchsia-100 dark:hover:bg-fuchsia-400/12",
    accent: "bg-gradient-to-b from-fuchsia-400 to-purple-500",
    panelBorder: "border-fuchsia-200/70 dark:border-fuchsia-400/15",
    badgeBg:
      "border-fuchsia-200 bg-fuchsia-100/80 text-fuchsia-800 dark:border-fuchsia-400/20 dark:bg-fuchsia-400/15 dark:text-fuchsia-100",
  },
  sky: {
    chipActive:
      "border-sky-300 bg-gradient-to-br from-sky-200 via-cyan-200 to-blue-200 text-sky-950 shadow-[0_14px_32px_rgba(14,165,233,0.18)] dark:border-sky-300/40 dark:from-sky-500/30 dark:via-cyan-500/25 dark:to-blue-500/25 dark:text-sky-50",
    chipIdle:
      "border-sky-200/70 bg-sky-50/70 text-sky-800 hover:border-sky-300 hover:bg-sky-100 dark:border-sky-400/15 dark:bg-sky-400/8 dark:text-sky-100 dark:hover:bg-sky-400/12",
    accent: "bg-gradient-to-b from-sky-400 to-blue-500",
    panelBorder: "border-sky-200/70 dark:border-sky-400/15",
    badgeBg:
      "border-sky-200 bg-sky-100/80 text-sky-800 dark:border-sky-400/20 dark:bg-sky-400/15 dark:text-sky-100",
  },
};

/** Slugify Turkish-friendly labels for category ids and lookups. */
export function librarySlugify(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
