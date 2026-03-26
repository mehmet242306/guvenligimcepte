export type CompanyPermissionLevel = "none" | "read" | "write";

export type ShareableCompanyModule = {
  key: string;
  label: string;
  description: string;
  group: string;
  defaultLevel: CompanyPermissionLevel;
  order: number;
};

export const COMPANY_SHARE_MODULES: ShareableCompanyModule[] = [
  {
    key: "company.general_info",
    label: "Firma temel bilgileri",
    description: "Firma adı, tür, sektör, iletişim ve temel profil verileri",
    group: "Genel",
    defaultLevel: "read",
    order: 10,
  },
  {
    key: "company.locations_departments",
    label: "Lokasyon ve bölüm bilgileri",
    description: "Lokasyonlar, bölümler ve organizasyon yapısı",
    group: "Genel",
    defaultLevel: "none",
    order: 20,
  },
  {
    key: "company.risk_analysis",
    label: "Risk analizi",
    description: "Risk analizi kayıtları ve değerlendirme alanları",
    group: "Operasyon",
    defaultLevel: "none",
    order: 30,
  },
  {
    key: "company.field_findings",
    label: "Saha bulguları",
    description: "Saha tespitleri ve gözlem çıktıları",
    group: "Operasyon",
    defaultLevel: "none",
    order: 40,
  },
  {
    key: "company.actions_tasks",
    label: "Aksiyonlar ve görevler",
    description: "Açık aksiyonlar, görevler ve takip kayıtları",
    group: "Operasyon",
    defaultLevel: "none",
    order: 50,
  },
  {
    key: "company.documents",
    label: "Dokümanlar",
    description: "Firma ile ilişkili doküman ve kayıt alanları",
    group: "Kayıtlar",
    defaultLevel: "none",
    order: 60,
  },
  {
    key: "company.training",
    label: "Eğitim kayıtları",
    description: "Eğitim ve yenileme takip bilgileri",
    group: "Kayıtlar",
    defaultLevel: "none",
    order: 70,
  },
  {
    key: "company.periodic_controls",
    label: "Periyodik kontroller",
    description: "Periyodik kontrol ve bakım takip alanları",
    group: "Kayıtlar",
    defaultLevel: "none",
    order: 80,
  },
  {
    key: "company.emergency_drills",
    label: "Acil durum ve tatbikat",
    description: "Acil durum planları ve tatbikat kayıtları",
    group: "Kayıtlar",
    defaultLevel: "none",
    order: 90,
  },
  {
    key: "company.reports",
    label: "Raporlar",
    description: "Şirketle ilişkili raporlama alanları",
    group: "Raporlama",
    defaultLevel: "none",
    order: 100,
  },
  {
    key: "company.digital_twin",
    label: "Dijital ikiz verileri",
    description: "Gelecekteki dijital ikiz ve gelişmiş saha verileri",
    group: "Gelişmiş",
    defaultLevel: "none",
    order: 110,
  },
];

export function createDefaultCompanySharePermissions(): Record<
  string,
  CompanyPermissionLevel
> {
  return Object.fromEntries(
    COMPANY_SHARE_MODULES.map((module) => [module.key, module.defaultLevel]),
  );
}
