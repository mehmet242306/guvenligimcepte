export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "converted"
  | "rejected";

export type LeadRow = {
  id: string;
  contact_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  message: string | null;
  status: LeadStatus;
  requested_account_type: string | null;
  source_page: string | null;
  estimated_employee_count: number | null;
  estimated_location_count: number | null;
  estimated_company_count: number | null;
  estimated_professional_count: number | null;
  admin_notes: string | null;
  created_at: string;
};

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Yeni",
  contacted: "İletişim kuruldu",
  qualified: "Nitelikli",
  converted: "Dönüşen",
  rejected: "Reddedildi",
};

export const STATUS_OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  { value: "new", label: "Yeni" },
  { value: "contacted", label: "İletişim kuruldu" },
  { value: "qualified", label: "Nitelikli" },
  { value: "converted", label: "Dönüşen" },
  { value: "rejected", label: "Reddedildi" },
];
