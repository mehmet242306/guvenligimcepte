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

/** UI select options use translations (`platformAdmin.leads.status*`). */
export const LEAD_STATUS_VALUES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "rejected",
];
