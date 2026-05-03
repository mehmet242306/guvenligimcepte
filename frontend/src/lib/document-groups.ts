// ============================================================
// ISG Document Groups — minimal catalog (5 core templates)
// ============================================================

export interface DocumentGroupItem {
  id: string;
  title: string;
  description?: string;
  isP1?: boolean; // priority 1 — has active template
  isP2?: boolean;
}

export interface DocumentGroup {
  key: string;
  title: string;
  icon: string; // lucide icon name
  color: string; // tailwind color class
  items: DocumentGroupItem[];
}

/** Five built-in TipTap templates (see `P1_TEMPLATES` in document-templates-p1.ts). */
export const DOCUMENT_GROUPS: DocumentGroup[] = [
  {
    key: 'risk-degerlendirme',
    title: 'Risk Değerlendirme ve Tespit Öneri',
    icon: 'ShieldAlert',
    color: 'text-red-600',
    items: [
      { id: 'risk-raporu', title: 'Risk Değerlendirme Raporu', isP1: true },
      { id: 'tespit-oneri-defteri', title: 'Tespit ve Öneri Defteri', isP1: true },
    ],
  },
  {
    key: 'kurul-kayitlari',
    title: 'İSG Kurul Kayıtları',
    icon: 'Users',
    color: 'text-purple-600',
    items: [{ id: 'kurul-tutanagi', title: 'İSG Kurul Toplantı Tutanağı', isP1: true }],
  },
  {
    key: 'egitim-dosyasi',
    title: 'Eğitim Dosyası',
    icon: 'GraduationCap',
    color: 'text-green-600',
    items: [{ id: 'egitim-katilim-formu', title: 'Eğitim Katılım Formu', isP1: true }],
  },
  {
    key: 'acil-durum',
    title: 'Acil Durum Faaliyetleri',
    icon: 'Siren',
    color: 'text-orange-600',
    items: [{ id: 'acil-durum-plani', title: 'Acil Durum Planı', isP1: true }],
  },
];

// Helper: get group by key
export function getGroupByKey(key: string): DocumentGroup | undefined {
  return DOCUMENT_GROUPS.find((g) => g.key === key);
}

// Helper: get all P1 items
export function getP1Items(): { group: DocumentGroup; item: DocumentGroupItem }[] {
  const result: { group: DocumentGroup; item: DocumentGroupItem }[] = [];
  for (const group of DOCUMENT_GROUPS) {
    for (const item of group.items) {
      if (item.isP1) result.push({ group, item });
    }
  }
  return result;
}

// Helper: total document count
export function getTotalDocumentCount(): number {
  return DOCUMENT_GROUPS.reduce((sum, g) => sum + g.items.length, 0);
}
