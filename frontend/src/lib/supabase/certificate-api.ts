import { createClient } from './client';

// ============================================================
// Certificate API — Templates & issued certificates
// ============================================================

export interface CertificateTemplateRecord {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  templateHtml: string;
  variables: string[];
  style: Record<string, unknown>;
  isSystem: boolean;
  createdAt: string;
}

export interface CertificateRecord {
  id: string;
  templateId: string | null;
  organizationId: string;
  companyId: string;
  personnelId: string | null;
  surveyId: string | null;
  tokenId: string | null;
  certificateNo: string;
  personName: string;
  trainingName: string;
  trainingDate: string | null;
  trainingDuration: string;
  trainerName: string;
  companyName: string;
  score: number | null;
  qrCode: string;
  issuedAt: string;
  validUntil: string | null;
  metadata: Record<string, unknown>;
}

// ---- Row types ----
type TemplateRow = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  template_html: string | null;
  variables: string[];
  style: Record<string, unknown>;
  is_system: boolean;
  created_at: string;
};

type CertRow = {
  id: string;
  template_id: string | null;
  organization_id: string;
  company_id: string;
  personnel_id: string | null;
  survey_id: string | null;
  token_id: string | null;
  certificate_no: string;
  person_name: string;
  training_name: string | null;
  training_date: string | null;
  training_duration: string | null;
  trainer_name: string | null;
  company_name: string | null;
  score: number | null;
  qr_code: string | null;
  issued_at: string;
  valid_until: string | null;
  metadata: Record<string, unknown>;
};

// ---- Mappers ----
function dbToTemplate(r: TemplateRow): CertificateTemplateRecord {
  return {
    id: r.id,
    organizationId: r.organization_id,
    name: r.name,
    description: r.description || '',
    templateHtml: r.template_html || '',
    variables: r.variables || [],
    style: r.style || {},
    isSystem: r.is_system,
    createdAt: r.created_at,
  };
}

function dbToCert(r: CertRow): CertificateRecord {
  return {
    id: r.id,
    templateId: r.template_id,
    organizationId: r.organization_id,
    companyId: r.company_id,
    personnelId: r.personnel_id,
    surveyId: r.survey_id,
    tokenId: r.token_id,
    certificateNo: r.certificate_no || '',
    personName: r.person_name,
    trainingName: r.training_name || '',
    trainingDate: r.training_date,
    trainingDuration: r.training_duration || '',
    trainerName: r.trainer_name || '',
    companyName: r.company_name || '',
    score: r.score,
    qrCode: r.qr_code || '',
    issuedAt: r.issued_at,
    validUntil: r.valid_until,
    metadata: r.metadata || {},
  };
}

// ============================================================
// TEMPLATES
// ============================================================

export async function fetchCertificateTemplates(orgId: string): Promise<CertificateTemplateRecord[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('certificate_templates')
    .select('*')
    .or(`organization_id.eq.${orgId},is_system.eq.true`)
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchCertificateTemplates error:', error); return []; }
  return (data as TemplateRow[]).map(dbToTemplate);
}

export async function createCertificateTemplate(template: Partial<CertificateTemplateRecord>): Promise<CertificateTemplateRecord | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const row = {
    organization_id: template.organizationId,
    name: template.name,
    description: template.description || null,
    template_html: template.templateHtml || '',
    variables: template.variables || [],
    style: template.style || {},
    is_system: false,
  };
  // Insert first, then fetch separately (avoids RLS read-back issues)
  const { error: insertError } = await supabase.from('certificate_templates').insert(row);
  if (insertError) {
    console.error('createCertificateTemplate insert error:', insertError.message, insertError.code, insertError.details);
    return null;
  }
  // Fetch the most recently created template for this org
  const { data, error: fetchError } = await supabase
    .from('certificate_templates')
    .select('*')
    .eq('organization_id', template.organizationId)
    .eq('name', template.name!)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (fetchError || !data) {
    console.error('createCertificateTemplate fetch error:', fetchError?.message);
    // Return a minimal record even if fetch fails — the insert succeeded
    return {
      id: '',
      organizationId: template.organizationId || '',
      name: template.name || '',
      description: template.description || '',
      templateHtml: template.templateHtml || '',
      variables: template.variables || [],
      style: template.style || {},
      isSystem: false,
      createdAt: new Date().toISOString(),
    };
  }
  return dbToTemplate(data as TemplateRow);
}

export async function updateCertificateTemplate(id: string, updates: Partial<CertificateTemplateRecord>): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.templateHtml !== undefined) row.template_html = updates.templateHtml;
  if (updates.variables !== undefined) row.variables = updates.variables;
  if (updates.style !== undefined) row.style = updates.style;
  const { error } = await supabase.from('certificate_templates').update(row).eq('id', id);
  return !error;
}

// ============================================================
// CERTIFICATES
// ============================================================

export async function fetchCertificates(orgId: string, companyId?: string): Promise<CertificateRecord[]> {
  const supabase = createClient();
  if (!supabase) return [];
  let query = supabase.from('certificates').select('*').eq('organization_id', orgId).order('issued_at', { ascending: false });
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) return [];
  return (data as CertRow[]).map(dbToCert);
}

function generateCertificateNo(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const rnd = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RN-${y}${m}-${rnd}`;
}

function generateQrCode(): string {
  return Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('');
}

export async function issueCertificate(cert: Partial<CertificateRecord>): Promise<CertificateRecord | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const row = {
    template_id: cert.templateId || null,
    organization_id: cert.organizationId,
    company_id: cert.companyId,
    personnel_id: cert.personnelId || null,
    survey_id: cert.surveyId || null,
    token_id: cert.tokenId || null,
    certificate_no: cert.certificateNo || generateCertificateNo(),
    person_name: cert.personName,
    training_name: cert.trainingName || null,
    training_date: cert.trainingDate || null,
    training_duration: cert.trainingDuration || null,
    trainer_name: cert.trainerName || null,
    company_name: cert.companyName || null,
    score: cert.score ?? null,
    qr_code: cert.qrCode || generateQrCode(),
    valid_until: cert.validUntil || null,
    metadata: cert.metadata || {},
  };
  const certNo = row.certificate_no;
  const qrCode = row.qr_code;
  const { error: insertError } = await supabase.from('certificates').insert(row);
  if (insertError) { console.error('issueCertificate error:', insertError.message, insertError.code); return null; }
  const { data, error: fetchError } = await supabase.from('certificates').select('*').eq('certificate_no', certNo).single();
  if (fetchError || !data) {
    // Return minimal record since insert succeeded
    return {
      id: '', templateId: cert.templateId || null, organizationId: cert.organizationId || '',
      companyId: cert.companyId || '', personnelId: cert.personnelId || null,
      surveyId: cert.surveyId || null, tokenId: cert.tokenId || null,
      certificateNo: certNo, personName: cert.personName || '',
      trainingName: cert.trainingName || '', trainingDate: cert.trainingDate || null,
      trainingDuration: cert.trainingDuration || '', trainerName: cert.trainerName || '',
      companyName: cert.companyName || '', score: cert.score ?? null,
      qrCode, issuedAt: new Date().toISOString(), validUntil: cert.validUntil || null,
      metadata: cert.metadata || {},
    };
  }
  return dbToCert(data as CertRow);
}

export async function verifyCertificate(certificateNo: string): Promise<CertificateRecord | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('certificates').select('*').eq('certificate_no', certificateNo).single();
  if (error || !data) return null;
  return dbToCert(data as CertRow);
}

export async function verifyCertificateByQr(qrCode: string): Promise<CertificateRecord | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('certificates').select('*').eq('qr_code', qrCode).single();
  if (error || !data) return null;
  return dbToCert(data as CertRow);
}

// ============================================================
// DEFAULT TEMPLATES (System)
// ============================================================

export const DEFAULT_CERTIFICATE_TEMPLATES = [
  {
    name: 'ISG Egitim Sertifikasi',
    description: 'Standart is sagligi ve guvenligi egitim sertifikasi',
    templateHtml: `<div style="width:800px;height:560px;border:3px solid #b8860b;padding:40px;text-align:center;font-family:'Times New Roman',serif;background:linear-gradient(135deg,#fffef5,#fff8e1)">
<div style="border:1px solid #daa520;padding:30px;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center">
<h1 style="color:#b8860b;font-size:32px;margin:0">SERTIFIKA</h1>
<p style="color:#666;font-size:14px;margin:8px 0 20px">Certificate of Completion</p>
<p style="font-size:14px;color:#555">Bu belge,</p>
<h2 style="color:#333;font-size:28px;margin:8px 0;border-bottom:2px solid #daa520;padding-bottom:4px">{person_name}</h2>
<p style="font-size:14px;color:#555">adli kisinin</p>
<h3 style="color:#444;font-size:20px;margin:8px 0">{training_name}</h3>
<p style="font-size:14px;color:#555">egitimini basariyla tamamladigini belgeler.</p>
<div style="display:flex;gap:60px;margin-top:24px;font-size:13px;color:#555">
<div><strong>Tarih:</strong> {training_date}</div>
<div><strong>Sure:</strong> {training_duration}</div>
<div><strong>Puan:</strong> {score}</div>
</div>
<div style="display:flex;gap:80px;margin-top:30px;font-size:13px">
<div style="text-align:center"><div style="border-top:1px solid #999;width:160px;padding-top:4px">{trainer_name}<br/><span style="color:#888">Egitimci</span></div></div>
<div style="text-align:center"><div style="border-top:1px solid #999;width:160px;padding-top:4px">{company_name}<br/><span style="color:#888">Kurum</span></div></div>
</div>
<p style="font-size:10px;color:#aaa;margin-top:16px">Sertifika No: {certificate_no}</p>
</div></div>`,
    variables: ['person_name', 'training_name', 'training_date', 'training_duration', 'score', 'trainer_name', 'company_name', 'certificate_no'],
  },
  {
    name: 'Katilim Belgesi',
    description: 'Etkinlik veya toplanti katilim belgesi',
    templateHtml: `<div style="width:800px;height:560px;border:3px solid #2563eb;padding:40px;text-align:center;font-family:'Segoe UI',sans-serif;background:linear-gradient(135deg,#f0f4ff,#e8efff)">
<div style="border:1px solid #3b82f6;padding:30px;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center">
<h1 style="color:#1d4ed8;font-size:30px;margin:0">KATILIM BELGESİ</h1>
<p style="color:#6b7280;font-size:13px;margin:8px 0 24px">Certificate of Attendance</p>
<p style="font-size:14px;color:#4b5563">{person_name}</p>
<p style="font-size:13px;color:#6b7280;margin:4px 0">adli kisi</p>
<h3 style="color:#1e40af;font-size:20px;margin:12px 0">{training_name}</h3>
<p style="font-size:13px;color:#6b7280">etkinligine katilmistir.</p>
<div style="display:flex;gap:40px;margin-top:20px;font-size:13px;color:#4b5563">
<div><strong>Tarih:</strong> {training_date}</div>
<div><strong>Sure:</strong> {training_duration}</div>
</div>
<div style="margin-top:30px;text-align:center"><div style="border-top:1px solid #93c5fd;width:180px;padding-top:4px;font-size:13px">{company_name}</div></div>
<p style="font-size:10px;color:#9ca3af;margin-top:16px">Belge No: {certificate_no}</p>
</div></div>`,
    variables: ['person_name', 'training_name', 'training_date', 'training_duration', 'company_name', 'certificate_no'],
  },
];
