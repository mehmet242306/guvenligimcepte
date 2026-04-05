// ============================================================
// Document Variable System — auto-fill from company data
// ============================================================

export interface DocumentVariable {
  key: string;
  label: string;
  group: string;
  example: string;
}

export const VARIABLE_GROUPS = [
  { key: 'firma', label: 'Firma Bilgileri', icon: 'Building2' },
  { key: 'personel', label: 'Personel Bilgileri', icon: 'Users' },
  { key: 'tarih', label: 'Tarih Bilgileri', icon: 'Calendar' },
  { key: 'risk', label: 'Risk Bilgileri', icon: 'ShieldAlert' },
  { key: 'uzman', label: 'İSG Uzmanı', icon: 'UserCog' },
] as const;

export const DOCUMENT_VARIABLES: DocumentVariable[] = [
  // Firma
  { key: 'firma_adi', label: 'Firma Adı', group: 'firma', example: 'ABC Sanayi A.Ş.' },
  { key: 'firma_adresi', label: 'Firma Adresi', group: 'firma', example: 'Organize Sanayi Bölgesi 5. Cadde No:12' },
  { key: 'firma_sehir', label: 'Şehir', group: 'firma', example: 'İstanbul' },
  { key: 'firma_ilce', label: 'İlçe', group: 'firma', example: 'Tuzla' },
  { key: 'vergi_no', label: 'Vergi Numarası', group: 'firma', example: '1234567890' },
  { key: 'mersis_no', label: 'MERSİS Numarası', group: 'firma', example: '0123456789012345' },
  { key: 'sektor', label: 'Sektör', group: 'firma', example: 'İmalat' },
  { key: 'nace_kodu', label: 'NACE Kodu', group: 'firma', example: '25.11' },
  { key: 'tehlike_sinifi', label: 'Tehlike Sınıfı', group: 'firma', example: 'Çok Tehlikeli' },
  { key: 'sgk_sicil_no', label: 'SGK Sicil No', group: 'firma', example: '12345678' },

  // Personel
  { key: 'personel_sayisi', label: 'Toplam Personel Sayısı', group: 'personel', example: '150' },
  { key: 'erkek_personel', label: 'Erkek Personel Sayısı', group: 'personel', example: '120' },
  { key: 'kadin_personel', label: 'Kadın Personel Sayısı', group: 'personel', example: '30' },
  { key: 'departman_sayisi', label: 'Departman Sayısı', group: 'personel', example: '8' },
  { key: 'isveren_adi', label: 'İşveren / Yönetici Adı', group: 'personel', example: 'Ahmet Yılmaz' },
  { key: 'isveren_vekili', label: 'İşveren Vekili', group: 'personel', example: 'Mehmet Demir' },

  // Tarih
  { key: 'bugun', label: 'Bugünün Tarihi', group: 'tarih', example: '05.04.2026' },
  { key: 'ay_yil', label: 'Ay / Yıl', group: 'tarih', example: 'Nisan 2026' },
  { key: 'yil', label: 'Yıl', group: 'tarih', example: '2026' },
  { key: 'bir_yil_sonra', label: 'Bir Yıl Sonra', group: 'tarih', example: '05.04.2027' },
  { key: 'rapor_tarihi', label: 'Rapor Tarihi', group: 'tarih', example: '05.04.2026' },

  // Risk
  { key: 'toplam_risk_sayisi', label: 'Toplam Risk Sayısı', group: 'risk', example: '45' },
  { key: 'yuksek_risk_sayisi', label: 'Yüksek Risk Sayısı', group: 'risk', example: '5' },
  { key: 'orta_risk_sayisi', label: 'Orta Risk Sayısı', group: 'risk', example: '18' },
  { key: 'dusuk_risk_sayisi', label: 'Düşük Risk Sayısı', group: 'risk', example: '22' },
  { key: 'genel_risk_skoru', label: 'Genel Risk Skoru', group: 'risk', example: '3.2' },

  // Uzman
  { key: 'uzman_adi', label: 'İSG Uzmanı Adı', group: 'uzman', example: 'Dr. Ayşe Kaya' },
  { key: 'uzman_sinifi', label: 'Uzman Sınıfı', group: 'uzman', example: 'A Sınıfı' },
  { key: 'uzman_belge_no', label: 'Uzman Belge No', group: 'uzman', example: 'ISG-2026-12345' },
  { key: 'isyeri_hekimi', label: 'İşyeri Hekimi', group: 'uzman', example: 'Dr. Ali Yıldız' },
  { key: 'hekim_diploma_no', label: 'Hekim Diploma No', group: 'uzman', example: 'DIP-2020-6789' },
];

export interface CompanyVariableData {
  // from company_identities
  official_name?: string;
  address?: string;
  city?: string;
  district?: string;
  tax_number?: string;
  mersis_number?: string;
  sector?: string;
  nace_code?: string;
  hazard_class?: string;
  // from workspace metadata
  employee_count?: number;
  male_count?: number;
  female_count?: number;
  department_count?: number;
  employer_name?: string;
  employer_rep?: string;
  // from user_profiles
  specialist_name?: string;
  specialist_class?: string;
  specialist_cert_no?: string;
  physician_name?: string;
  physician_cert_no?: string;
  // risk stats
  total_risks?: number;
  high_risks?: number;
  medium_risks?: number;
  low_risks?: number;
  overall_score?: number;
}

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export function resolveVariables(
  content: string,
  data: CompanyVariableData
): string {
  const now = new Date();
  const oneYearLater = new Date(now);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  const map: Record<string, string> = {
    firma_adi: data.official_name || '',
    firma_adresi: data.address || '',
    firma_sehir: data.city || '',
    firma_ilce: data.district || '',
    vergi_no: data.tax_number || '',
    mersis_no: data.mersis_number || '',
    sektor: data.sector || '',
    nace_kodu: data.nace_code || '',
    tehlike_sinifi: data.hazard_class || '',
    sgk_sicil_no: '',
    personel_sayisi: data.employee_count?.toString() || '',
    erkek_personel: data.male_count?.toString() || '',
    kadin_personel: data.female_count?.toString() || '',
    departman_sayisi: data.department_count?.toString() || '',
    isveren_adi: data.employer_name || '',
    isveren_vekili: data.employer_rep || '',
    bugun: formatDate(now),
    ay_yil: `${MONTHS_TR[now.getMonth()]} ${now.getFullYear()}`,
    yil: now.getFullYear().toString(),
    bir_yil_sonra: formatDate(oneYearLater),
    rapor_tarihi: formatDate(now),
    toplam_risk_sayisi: data.total_risks?.toString() || '',
    yuksek_risk_sayisi: data.high_risks?.toString() || '',
    orta_risk_sayisi: data.medium_risks?.toString() || '',
    dusuk_risk_sayisi: data.low_risks?.toString() || '',
    genel_risk_skoru: data.overall_score?.toString() || '',
    uzman_adi: data.specialist_name || '',
    uzman_sinifi: data.specialist_class || '',
    uzman_belge_no: data.specialist_cert_no || '',
    isyeri_hekimi: data.physician_name || '',
    hekim_diploma_no: data.physician_cert_no || '',
  };

  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return map[key] !== undefined ? (map[key] || match) : match;
  });
}

// Get variable by key
export function getVariable(key: string): DocumentVariable | undefined {
  return DOCUMENT_VARIABLES.find((v) => v.key === key);
}
