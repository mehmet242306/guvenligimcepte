// ── Legacy module-level permission system (kept for backward compat) ──────────
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
  { key: "company.general_info", label: "Firma temel bilgileri", description: "Firma adı, tür, sektör, iletişim ve temel profil verileri", group: "Genel", defaultLevel: "read", order: 10 },
  { key: "company.locations_departments", label: "Lokasyon ve bölüm bilgileri", description: "Lokasyonlar, bölümler ve organizasyon yapısı", group: "Genel", defaultLevel: "none", order: 20 },
  { key: "company.risk_analysis", label: "Risk analizi", description: "Risk analizi kayıtları ve değerlendirme alanları", group: "Operasyon", defaultLevel: "none", order: 30 },
  { key: "company.field_findings", label: "Saha bulguları", description: "Saha tespitleri ve gözlem çıktıları", group: "Operasyon", defaultLevel: "none", order: 40 },
  { key: "company.actions_tasks", label: "Aksiyonlar ve görevler", description: "Açık aksiyonlar, görevler ve takip kayıtları", group: "Operasyon", defaultLevel: "none", order: 50 },
  { key: "company.documents", label: "Dokümanlar", description: "Firma ile ilişkili doküman ve kayıt alanları", group: "Kayıtlar", defaultLevel: "none", order: 60 },
  { key: "company.training", label: "Eğitim kayıtları", description: "Eğitim ve yenileme takip bilgileri", group: "Kayıtlar", defaultLevel: "none", order: 70 },
  { key: "company.periodic_controls", label: "Periyodik kontroller", description: "Periyodik kontrol ve bakım takip alanları", group: "Kayıtlar", defaultLevel: "none", order: 80 },
  { key: "company.emergency_drills", label: "Acil durum ve tatbikat", description: "Acil durum planları ve tatbikat kayıtları", group: "Kayıtlar", defaultLevel: "none", order: 90 },
  { key: "company.reports", label: "Raporlar", description: "Şirketle ilişkili raporlama alanları", group: "Raporlama", defaultLevel: "none", order: 100 },
  { key: "company.digital_twin", label: "Dijital ikiz verileri", description: "Gelecekteki dijital ikiz ve gelişmiş saha verileri", group: "Gelişmiş", defaultLevel: "none", order: 110 },
];

export function createDefaultCompanySharePermissions(): Record<string, CompanyPermissionLevel> {
  return Object.fromEntries(COMPANY_SHARE_MODULES.map((m) => [m.key, m.defaultLevel]));
}

// ── Granular checkbox permission system ───────────────────────────────────────
export type PermissionKey = string;
export type Permissions = Record<PermissionKey, boolean>;

export type PermissionDef = {
  key: PermissionKey;
  label: string;
  sensitive?: boolean;
};

export type PermissionCategory = {
  icon: string;
  title: string;
  permissions: PermissionDef[];
};

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    icon: "📊",
    title: "Risk Yönetimi",
    permissions: [
      { key: "risk.view_analyses", label: "Risk Analizlerini Görüntüleme" },
      { key: "risk.edit_analyses", label: "Risk Analizlerini Oluşturma/Düzenleme" },
      { key: "risk.view_scores", label: "Risk Skorlarını Görüntüleme" },
      { key: "risk.manage_dof", label: "DÖF (Düzeltici Önleyici Faaliyet) Yönetimi" },
    ],
  },
  {
    icon: "📅",
    title: "Planlama & Takip",
    permissions: [
      { key: "planner.view", label: "Planlayıcıyı Görüntüleme" },
      { key: "planner.create_edit", label: "Görev Oluşturma/Düzenleme" },
      { key: "planner.complete_tasks", label: "Görev Tamamlama" },
      { key: "planner.calendar", label: "Takvim Erişimi" },
    ],
  },
  {
    icon: "👥",
    title: "Personel & Ekip",
    permissions: [
      { key: "personnel.view_list", label: "Personel Listesini Görüntüleme" },
      { key: "personnel.edit", label: "Personel Bilgilerini Düzenleme" },
      { key: "personnel.add_delete", label: "Personel Ekleme/Silme" },
      { key: "team.view_members", label: "Ekip Üyelerini Görüntüleme" },
      { key: "team.edit_members", label: "Ekip Üyelerini Düzenleme" },
      { key: "health.view_records", label: "Sağlık Kayıtlarını Görüntüleme", sensitive: true },
      { key: "training.view_records", label: "Eğitim Kayıtlarını Görüntüleme" },
    ],
  },
  {
    icon: "📁",
    title: "Dökümanlar",
    permissions: [
      { key: "docs.view", label: "Dökümanları Görüntüleme" },
      { key: "docs.upload", label: "Döküman Yükleme" },
      { key: "docs.delete", label: "Döküman Silme" },
      { key: "docs.view_confidential", label: "Gizli Dökümanları Görüntüleme", sensitive: true },
    ],
  },
  {
    icon: "📈",
    title: "Raporlar & Analiz",
    permissions: [
      { key: "reports.view", label: "Raporları Görüntüleme" },
      { key: "reports.download", label: "Rapor İndirme" },
      { key: "reports.create", label: "Rapor Oluşturma" },
      { key: "reports.view_stats", label: "İstatistikleri Görüntüleme" },
    ],
  },
  {
    icon: "🏢",
    title: "Firma Bilgileri",
    permissions: [
      { key: "company.view_info", label: "Firma Bilgilerini Görüntüleme" },
      { key: "company.edit_info", label: "Firma Bilgilerini Düzenleme" },
      { key: "company.manage_locations", label: "Lokasyon/Şube Yönetimi" },
      { key: "company.view_org_chart", label: "Organizasyon Şemasını Görüntüleme" },
    ],
  },
  {
    icon: "⚙️",
    title: "Yönetim",
    permissions: [
      { key: "admin.invite_users", label: "Kullanıcı Davet Etme" },
      { key: "admin.edit_permissions", label: "Yetkileri Düzenleme" },
      { key: "admin.view_audit_logs", label: "Denetim Loglarını Görüntüleme" },
      { key: "admin.change_settings", label: "Ayarları Değiştirme" },
    ],
  },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_CATEGORIES.flatMap(
  (cat) => cat.permissions.map((p) => p.key),
);

export function emptyPermissions(): Permissions {
  return Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, false]));
}

export function countGranted(perms: Permissions): number {
  return Object.values(perms).filter(Boolean).length;
}
