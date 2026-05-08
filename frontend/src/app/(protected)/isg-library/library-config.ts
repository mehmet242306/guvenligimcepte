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
    id: "starter:risk-makine",
    category: "risk-templates",
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

  // ---------- Instructions ----------
  {
    id: "starter:instr-ppe",
    category: "instructions",
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
    id: "starter:instr-fire",
    category: "instructions",
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

  // ---------- Emergency ----------
  {
    id: "starter:emerg-evac",
    category: "emergency",
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
    id: "starter:emerg-plan",
    category: "emergency",
    title: { tr: "Acil Durum Planı", en: "Emergency Plan" },
    description: {
      tr: "İşyeri için kapsamlı acil durum planı şablonu (yangın, deprem, kimyasal).",
      en: "Comprehensive emergency plan template for fire, earthquake and chemical events.",
    },
    flags: { corporate: true },
    action: { kind: "template", templateId: "acil-durum-plani", groupKey: "acil-durum" },
  },

  // ---------- Audit Flows ----------
  {
    id: "starter:audit-forklift",
    category: "audit-flows",
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
    title: { tr: "Elektrik Panosu Checklist", en: "Electrical Panel Checklist" },
    description: {
      tr: "Pano güvenliği: topraklama, etiketleme, koruyucu ve müdahale donanımı.",
      en: "Panel safety: grounding, labelling, protective equipment and access tools.",
    },
    flags: { audit: true },
    action: { kind: "group", groupKey: "periyodik-kontrol" },
  },
  {
    id: "starter:audit-site",
    category: "audit-flows",
    title: { tr: "Saha Denetim Formu", en: "Field Audit Form" },
    description: {
      tr: "Genel saha denetimi: 5S, KKD kullanımı, tehlike noktaları ve düzeltici aksiyon.",
      en: "General field audit: 5S, PPE use, hazard hotspots and corrective actions.",
    },
    flags: { audit: true, operation: true },
    action: { kind: "module", href: "/score-history" },
  },
  {
    id: "starter:audit-ppe",
    category: "audit-flows",
    title: { tr: "PPE Denetim Akışı", en: "PPE Audit Flow" },
    description: {
      tr: "Çalışan başına PPE durumu, eksik kontrolü ve uygunsuzluk takibi.",
      en: "Per-employee PPE status, missing items and nonconformity follow-up.",
    },
    flags: { audit: true },
    action: { kind: "module", href: "/score-history" },
  },

  // ---------- Corporate Templates ----------
  {
    id: "starter:corp-policy",
    category: "corporate-templates",
    title: { tr: "İSG Politikası", en: "OHS Policy" },
    description: {
      tr: "Üst yönetim taahhüdü, hedefler ve iletişim ilkelerini kapsayan politika belgesi.",
      en: "Policy document covering top-management commitment, targets and communication.",
    },
    flags: { corporate: true },
    action: { kind: "group", groupKey: "prosedurler" },
  },
  {
    id: "starter:corp-handbook",
    category: "corporate-templates",
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
    id: "starter:corp-matrix",
    category: "corporate-templates",
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
    title: { tr: "Vardiya Devir Tutanağı", en: "Shift Handover Record" },
    description: {
      tr: "Vardiya değişimlerinde sahanın durumunu, açık aksiyonları ve riskleri aktarın.",
      en: "Hand over the field status, open actions and risks at shift change.",
    },
    flags: { operation: true },
    action: { kind: "group", groupKey: "diger-kayitlar" },
  },
  {
    id: "starter:op-maintenance",
    category: "operation-templates",
    title: { tr: "Bakım Talimatı", en: "Maintenance Instruction" },
    description: {
      tr: "Periyodik bakım planı, sorumlu, kontrol noktaları ve onay akışı.",
      en: "Periodic maintenance plan, responsible, check points and approval flow.",
    },
    flags: { operation: true },
    action: { kind: "group", groupKey: "arac-makine" },
  },
  {
    id: "starter:op-flow",
    category: "operation-templates",
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

  // ---------- Process Packs ----------
  {
    id: "starter:pack-onboarding",
    category: "process-packs",
    title: { tr: "Yeni İşe Giriş Paketi", en: "New Joiner Pack" },
    description: {
      tr: "İşe giriş İSG eğitim formu, KKD zimmet ve oryantasyon kontrol listesi.",
      en: "Onboarding OHS training form, PPE issue and orientation checklist.",
    },
    flags: { process: true, corporate: true },
    action: { kind: "group", groupKey: "is-giris-oryantasyon" },
  },
  {
    id: "starter:pack-renewal",
    category: "process-packs",
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

  // ---------- Documentation (a couple of seed cards so the chip is never empty) ----------
  {
    id: "starter:doc-risk-report",
    category: "documentation",
    title: { tr: "Risk Değerlendirme Raporu", en: "Risk Assessment Report" },
    description: {
      tr: "Hazır TipTap şablonu — firma değişkenleriyle otomatik dolar.",
      en: "Ready TipTap template — auto-fills with company variables.",
    },
    flags: { corporate: true },
    action: { kind: "template", templateId: "risk-raporu", groupKey: "risk-degerlendirme" },
  },
  {
    id: "starter:doc-committee",
    category: "documentation",
    title: { tr: "İSG Kurul Toplantı Tutanağı", en: "OHS Committee Meeting Minutes" },
    description: {
      tr: "Kurul gündemi, kararlar ve katılım takibi için tutanak şablonu.",
      en: "Minutes template covering agenda, decisions and attendance.",
    },
    flags: { corporate: true },
    action: { kind: "template", templateId: "kurul-tutanagi", groupKey: "kurul-kayitlari" },
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

export const CUSTOM_CATEGORY_STORAGE_KEY = "risknova:isg-library:custom-main-categories:v1";

export function pickLocalized(text: LocalizedText | undefined, locale: string): string {
  if (!text) return "";
  if (locale.startsWith("tr")) return text.tr;
  return text.en || text.tr;
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
