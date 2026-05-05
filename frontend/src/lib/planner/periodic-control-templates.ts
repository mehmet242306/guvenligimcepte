/**
 * Periyodik kontrol şablonları — İş Ekipmanlarının Kullanımında Sağlık ve Güvenlik Şartları Yönetmeliği
 * kapsamındaki tablolardan türetilmiş özet liste. Sektör / özel-kamu seçimine göre öneri kümesi üretilir.
 * Resmî metin ve süreler işyerindeki ekipman varlığına göre değişir; liste yol gösterici niteliktedir.
 */

export type OwnershipScope = "private" | "public";

/** Sektör profili — tipik ekipman envanterine göre öneri genişletilir */
export type SectorProfile =
  | "manufacturing"
  | "construction"
  | "logistics"
  | "food"
  | "chemical"
  | "healthcare"
  | "energy"
  | "mining"
  | "retail"
  | "hospitality"
  | "office_service"
  | "education"
  | "agriculture"
  | "transport"
  | "other";

export type PeriodicControlTemplate = {
  id: string;
  /** Yönetmelikteki tablo referansı (izlenebilirlik) */
  tableRef: string;
  title: { tr: string; en: string };
  regulation: { tr: string; en: string };
  /** Tipik azami periyot ifadesi (yönetmelik özet) */
  period: { tr: string; en: string };
  /** Kamu kurumlarına özgü idari ek öneriler */
  ownerFilter: "all" | "public_only";
  /** company_periodic_controls.control_type ile hizalama */
  controlType:
    | "elektrik"
    | "asansor"
    | "yangin"
    | "basinc"
    | "vinc"
    | "kompressor"
    | "forklift"
    | "diger";
};

const T = {
  ieky: {
    tr: "6331 sayılı Kanun kapsamında İş Ekipmanlarının Kullanımında Sağlık ve Güvenlik Şartları Yönetmeliği ve ilgili TS/EN standartları",
    en: "Turkish Regulation on Health and Safety Requirements for Use of Work Equipment (6331 scope) and referenced TS/EN standards",
  },
  yanginY: {
    tr: "Binaların Yangından Korunması Hakkında Yönetmelik ve ilgili standartlar",
    en: "Turkish Regulation on Fire Protection of Buildings and related standards",
  },
} as const;

/** Katalog: Tablo-1 basınçlı / Tablo-2 kaldırma / Tablo-3 tesisat / Tablo-4 tezgâh / Tablo-5 raf-kapı — özet maddeler */
export const PERIODIC_CONTROL_TEMPLATE_BY_ID: Record<string, PeriodicControlTemplate> = {
  "tbl1-steam-boiler": {
    id: "tbl1-steam-boiler",
    tableRef: "Tablo-1",
    title: { tr: "Buhar ve kızgın su kazanları", en: "Steam and hot-water boilers" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "basinc",
  },
  "tbl1-heating-boiler": {
    id: "tbl1-heating-boiler",
    tableRef: "Tablo-1",
    title: { tr: "Isıtma (kalorifer, sıcak su vb.) kazanları", en: "Heating boilers (central / DHW)" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "basinc",
  },
  "tbl1-lpg-tank": {
    id: "tbl1-lpg-tank",
    tableRef: "Tablo-1",
    title: { tr: "Sıvılaştırılmış gaz tankları (LPG vb., yeraltı/yerüstü)", en: "Liquefied gas tanks (LPG, above/below ground)" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Yazılı plandaki süre (muayene); 10 yılda bir yeniden değerlendirme", en: "Per written plan (examination); 10y reassessment" },
    ownerFilter: "all",
    controlType: "basinc",
  },
  "tbl1-compressed-air": {
    id: "tbl1-compressed-air",
    tableRef: "Tablo-1",
    title: { tr: "Basınçlı hava ve gaz tankları (kompresör tesisatı dâhil)", en: "Compressed air/gas receivers (incl. compressor plant)" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "kompressor",
  },
  "tbl1-autoclave": {
    id: "tbl1-autoclave",
    tableRef: "Tablo-1",
    title: { tr: "Otoklav", en: "Autoclave" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "basinc",
  },
  "tbl2-overhead-crane": {
    id: "tbl2-overhead-crane",
    tableRef: "Tablo-2",
    title: { tr: "Gezer köprülü, portal ve monoray vinçler", en: "Overhead, gantry and monorail cranes" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl; yük testi usulleri yönetmelikte", en: "If standard silent: max. 1 year; load test per regulation" },
    ownerFilter: "all",
    controlType: "vinc",
  },
  "tbl2-forklift": {
    id: "tbl2-forklift",
    tableRef: "Tablo-2",
    title: { tr: "Forklift ve benzeri yük kaldırma araçları", en: "Forklifts and similar industrial trucks" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "forklift",
  },
  "tbl2-conveyor": {
    id: "tbl2-conveyor",
    tableRef: "Tablo-2",
    title: { tr: "Sürekli taşıma donanımları (konveyörler)", en: "Conveyors" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "diger",
  },
  "tbl2-scaffold-tower": {
    id: "tbl2-scaffold-tower",
    tableRef: "Tablo-2",
    title: { tr: "Yapı iskeleleri", en: "Scaffolding systems" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa 6 ay", en: "If standard silent: 6 months" },
    ownerFilter: "all",
    controlType: "diger",
  },
  "tbl2-mobile-tower": {
    id: "tbl2-mobile-tower",
    tableRef: "Tablo-2",
    title: { tr: "Mobil erişim ve çalışma kuleleri (seyyar iskeleler)", en: "Mobile access/work towers" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "diger",
  },
  "tbl2-lift-passenger": {
    id: "tbl2-lift-passenger",
    tableRef: "Tablo-2",
    title: { tr: "İnsan ve yük asansörleri (ürün standardına göre)", en: "Passenger/goods lifts (per product standards)" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "asansor",
  },
  "tbl2-escalator": {
    id: "tbl2-escalator",
    tableRef: "Tablo-2",
    title: { tr: "Yürüyen merdiven ve yürüyen yollar", en: "Escalators and moving walks" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "asansor",
  },
  "tbl3-electrical": {
    id: "tbl3-electrical",
    tableRef: "Tablo-3",
    title: { tr: "Elektrik tesisatı ve topraklama tesisatı", en: "Electrical installation and grounding" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "elektrik",
  },
  "tbl3-lightning": {
    id: "tbl3-lightning",
    tableRef: "Tablo-3",
    title: { tr: "Yıldırımdan korunma tesisatı", en: "Lightning protection system" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "elektrik",
  },
  "tbl3-generator": {
    id: "tbl3-generator",
    tableRef: "Tablo-3",
    title: { tr: "Jeneratör", en: "Generator set" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "elektrik",
  },
  "tbl3-transformer": {
    id: "tbl3-transformer",
    tableRef: "Tablo-3",
    title: { tr: "Transformatör", en: "Transformer" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "1 yıl (imalatçı şartları saklı)", en: "1 year (manufacturer rules may apply)" },
    ownerFilter: "all",
    controlType: "elektrik",
  },
  "tbl3-fire-extinguish": {
    id: "tbl3-fire-extinguish",
    tableRef: "Tablo-3",
    title: {
      tr: "Yangın söndürme / otomatik yağmurlama / gazlı söndürme / mutfak davlumbaz sistemleri",
      en: "Fire suppression, sprinklers, gas flooding, kitchen hood suppression",
    },
    regulation: { tr: `${T.ieky.tr}; ${T.yanginY.tr}`, en: `${T.ieky.en}; ${T.yanginY.en}` },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "yangin",
  },
  "tbl3-extinguisher-portable": {
    id: "tbl3-extinguisher-portable",
    tableRef: "Tablo-3",
    title: { tr: "Portatif yangın söndürücüler", en: "Portable fire extinguishers" },
    regulation: { tr: `${T.ieky.tr}; ${T.yanginY.tr}`, en: `${T.ieky.en}; ${T.yanginY.en}` },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "yangin",
  },
  "tbl3-fire-detection": {
    id: "tbl3-fire-detection",
    tableRef: "Tablo-3",
    title: { tr: "Yangın algılama ve uyarı sistemleri", en: "Fire detection and alarm systems" },
    regulation: { tr: `${T.ieky.tr}; ${T.yanginY.tr}`, en: `${T.ieky.en}; ${T.yanginY.en}` },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "yangin",
  },
  "tbl3-hvac": {
    id: "tbl3-hvac",
    tableRef: "Tablo-3",
    title: { tr: "Havalandırma ve klima tesisatı", en: "Ventilation and air-conditioning" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "1 yıl (proje uygunluğu)", en: "1 year (design compliance)" },
    ownerFilter: "all",
    controlType: "diger",
  },
  "tbl4-mechanical-press": {
    id: "tbl4-mechanical-press",
    tableRef: "Tablo-4",
    title: { tr: "Mekanik presler", en: "Mechanical presses" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "diger",
  },
  "tbl4-hydraulic-press": {
    id: "tbl4-hydraulic-press",
    tableRef: "Tablo-4",
    title: { tr: "Hidrolik presler ve abkant presler", en: "Hydraulic presses and press brakes" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "diger",
  },
  "tbl4-lathe-mill": {
    id: "tbl4-lathe-mill",
    tableRef: "Tablo-4",
    title: { tr: "Torna, freze, işleme merkezleri", en: "Lathes, milling machines, machining centres" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "diger",
  },
  "tbl4-grinder": {
    id: "tbl4-grinder",
    tableRef: "Tablo-4",
    title: { tr: "Taşlama ve testere tezgâhları (metal/ağaç)", en: "Grinding and sawing machines" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "diger",
  },
  "tbl5-industrial-rack": {
    id: "tbl5-industrial-rack",
    tableRef: "Tablo-5",
    title: { tr: "Endüstriyel raflar", en: "Industrial racking" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "diger",
  },
  "tbl5-industrial-door": {
    id: "tbl5-industrial-door",
    tableRef: "Tablo-5",
    title: { tr: "Endüstriyel kapılar (sarmal, seksiyonel vb.)", en: "Industrial doors (rapid roll, sectional, etc.)" },
    regulation: { tr: T.ieky.tr, en: T.ieky.en },
    period: { tr: "Standartta süre yoksa en çok 1 yıl", en: "If standard silent: max. 1 year" },
    ownerFilter: "all",
    controlType: "diger",
  },
  "pub-procurement-tech-spec": {
    id: "pub-procurement-tech-spec",
    tableRef: "—",
    title: {
      tr: "Kamu işyeri: periyodik kontrol/bakım hizmet alımlarında teknik şartname ve yetkili kuruluş uygunluğu takibi",
      en: "Public sector: technical specs and authorised body compliance for inspection/maintenance procurements",
    },
    regulation: {
      tr: "Kamu İhale Mevzuatı ve kurum içi teknik onay süreçleri (işyerine göre)",
      en: "Public procurement rules and internal technical approval (context-specific)",
    },
    period: { tr: "Sözleşme / yıllık plan", en: "Contract / annual plan" },
    ownerFilter: "public_only",
    controlType: "diger",
  },
};

const BASE_WORKPLACE_IDS: string[] = [
  "tbl3-electrical",
  "tbl3-lightning",
  "tbl3-extinguisher-portable",
  "tbl3-fire-detection",
  "tbl3-fire-extinguish",
  "tbl3-hvac",
  "tbl2-lift-passenger",
];

/** Sektör seçici sırası (UI) */
export const SECTOR_PROFILE_ORDER: SectorProfile[] = [
  "manufacturing",
  "construction",
  "logistics",
  "food",
  "chemical",
  "healthcare",
  "energy",
  "mining",
  "retail",
  "hospitality",
  "office_service",
  "education",
  "agriculture",
  "transport",
  "other",
];

const SECTOR_EXTRA: Record<SectorProfile, string[]> = {
  manufacturing: [
    "tbl1-compressed-air",
    "tbl1-steam-boiler",
    "tbl1-heating-boiler",
    "tbl2-forklift",
    "tbl2-overhead-crane",
    "tbl2-conveyor",
    "tbl4-mechanical-press",
    "tbl4-hydraulic-press",
    "tbl4-lathe-mill",
    "tbl4-grinder",
    "tbl5-industrial-rack",
    "tbl5-industrial-door",
  ],
  construction: ["tbl2-scaffold-tower", "tbl2-mobile-tower", "tbl2-overhead-crane", "tbl2-lift-passenger"],
  logistics: ["tbl2-forklift", "tbl2-conveyor", "tbl5-industrial-rack", "tbl5-industrial-door", "tbl1-compressed-air"],
  food: [
    "tbl1-steam-boiler",
    "tbl1-heating-boiler",
    "tbl1-autoclave",
    "tbl2-conveyor",
    "tbl4-grinder",
    "tbl1-compressed-air",
    "tbl3-hvac",
  ],
  chemical: [
    "tbl1-lpg-tank",
    "tbl1-compressed-air",
    "tbl1-steam-boiler",
    "tbl2-overhead-crane",
    "tbl3-electrical",
    "tbl3-fire-extinguish",
  ],
  healthcare: ["tbl1-autoclave", "tbl2-lift-passenger", "tbl2-escalator", "tbl3-generator", "tbl3-hvac", "tbl1-compressed-air"],
  energy: ["tbl1-steam-boiler", "tbl1-heating-boiler", "tbl3-transformer", "tbl3-generator", "tbl3-electrical", "tbl1-lpg-tank"],
  mining: ["tbl2-overhead-crane", "tbl1-compressed-air", "tbl2-forklift", "tbl3-generator"],
  retail: ["tbl2-forklift", "tbl2-escalator", "tbl2-lift-passenger", "tbl3-hvac", "tbl5-industrial-rack"],
  hospitality: ["tbl1-heating-boiler", "tbl3-fire-extinguish", "tbl2-lift-passenger", "tbl2-escalator", "tbl3-hvac"],
  office_service: ["tbl2-lift-passenger", "tbl3-hvac"],
  education: ["tbl2-lift-passenger", "tbl3-fire-detection", "tbl3-extinguisher-portable", "tbl3-hvac"],
  agriculture: ["tbl1-compressed-air", "tbl2-forklift", "tbl3-generator"],
  transport: ["tbl2-forklift", "tbl1-compressed-air", "tbl3-generator"],
  other: [],
};

export function getSuggestedTemplateIds(ownership: OwnershipScope, sector: SectorProfile): string[] {
  const extra = SECTOR_EXTRA[sector] ?? [];
  const merged = new Set<string>([...BASE_WORKPLACE_IDS, ...extra]);
  if (ownership === "public") merged.add("pub-procurement-tech-spec");

  const out: string[] = [];
  for (const id of merged) {
    const def = PERIODIC_CONTROL_TEMPLATE_BY_ID[id];
    if (!def) continue;
    if (def.ownerFilter === "public_only" && ownership !== "public") continue;
    out.push(id);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export function templateIdsForPicker(ownership: OwnershipScope): string[] {
  return Object.values(PERIODIC_CONTROL_TEMPLATE_BY_ID)
    .filter((d) => d.ownerFilter !== "public_only" || ownership === "public")
    .map((d) => d.id)
    .sort((a, b) => a.localeCompare(b));
}
