// ============================================================================
// ohs-archive-worker
// ----------------------------------------------------------------------------
// Picks a single ohs_archive_jobs row in status='pending', collects OHS data
// for the requested (company_workspace_id, year), zips it, uploads to
// Supabase Storage and flips the row to status='completed' (or 'failed').
//
// Trigger model (PR B1 — sync fire-and-forget):
//   - The `/api/ohs-archive/create` API route inserts the job row and then
//     POSTs `{ jobId }` to this function with the internal secret header.
//   - This function runs the whole pipeline in one invocation. Typical jobs
//     finish in <60s; large ones (hundreds of MB) may need a longer timeout.
//
// Scope (PR B1):
//   - Pilot collector: `incidents` (+ witnesses / DÖF / Ishikawa children).
//   - Other categories from ohs_archive_scope_presets are acknowledged in
//     the manifest but skipped with a `"pending_collector"` note. Each
//     remaining collector is a standalone function added in later PRs —
//     drop-in pattern, no worker changes required.
//
// Auth:
//   - Must be called with `x-internal-auth: $INTERNAL_WORKER_KEY` header.
//     Direct browser calls are rejected.
//
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import JSZip from 'https://deno.land/x/jszip@0.11.0/mod.ts'

// ---------------------------------------------------------------------------
// Types (minimal, just what the worker needs)
// ---------------------------------------------------------------------------

type ScopeCategory = string

type ArchiveJob = {
  id: string
  organization_id: string
  company_workspace_id: string
  company_identity_id: string
  jurisdiction_code: string
  year: number
  requested_by: string
  status: string
  scope: { version: number; categories: ScopeCategory[] }
  storage_bucket: string
}

type Manifest = {
  version: number
  job_id: string
  year: number
  jurisdiction: string
  generated_at: string
  categories: Array<{
    key: string
    count: number
    status: 'ok' | 'pending_collector' | 'error'
    note?: string
  }>
}

// ---------------------------------------------------------------------------
// Env + auth
// ---------------------------------------------------------------------------

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const INTERNAL_KEY = Deno.env.get('INTERNAL_WORKER_KEY') ?? ''

function makeClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

async function markProcessing(sb: SupabaseClient, jobId: string) {
  await sb
    .from('ohs_archive_jobs')
    .update({
      status: 'processing',
      progress: 5,
      started_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}

async function updateProgress(sb: SupabaseClient, jobId: string, progress: number) {
  await sb
    .from('ohs_archive_jobs')
    .update({ progress: Math.min(100, Math.max(0, progress)) })
    .eq('id', jobId)
}

async function markFailed(sb: SupabaseClient, jobId: string, err: unknown, code = 'worker_error') {
  const message = err instanceof Error ? err.message : String(err)
  await sb
    .from('ohs_archive_jobs')
    .update({
      status: 'failed',
      error_message: message.slice(0, 2000),
      error_code: code,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}

async function markCompleted(sb: SupabaseClient, jobId: string, payload: {
  storage_path: string
  download_url: string | null
  expires_at: string | null
  file_size_bytes: number
  file_sha256: string
}) {
  await sb
    .from('ohs_archive_jobs')
    .update({
      status: 'completed',
      progress: 100,
      storage_path: payload.storage_path,
      download_url: payload.download_url,
      download_url_expires_at: payload.expires_at,
      file_size_bytes: payload.file_size_bytes,
      file_sha256: payload.file_sha256,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}

// ---------------------------------------------------------------------------
// Collector: incidents (pilot implementation)
// ---------------------------------------------------------------------------

async function collectIncidents(
  sb: SupabaseClient,
  companyWorkspaceId: string,
  year: number,
) {
  const yearStart = `${year}-01-01`
  const yearEnd = `${year + 1}-01-01`

  const { data, error } = await sb
    .from('incidents')
    .select(`
      id, incident_code, incident_type, status, severity_level,
      description, injury_type, days_lost, incident_date,
      dof_required, ishikawa_required, created_at,
      witnesses:incident_witnesses(full_name, tc_identity, phone),
      dof:incident_dof(root_cause, status, corrective_actions, created_at),
      ishikawa:incident_ishikawa(man, machine, method, material, environment, measurement, created_at)
    `)
    .eq('company_workspace_id', companyWorkspaceId)
    .gte('incident_date', yearStart)
    .lt('incident_date', yearEnd)
    .order('incident_date', { ascending: true })

  if (error) throw new Error(`incidents collector: ${error.message}`)
  return data ?? []
}

function formatIncidentsMarkdown(incidents: Array<Record<string, unknown>>): string {
  if (incidents.length === 0) {
    return '# İş Kazaları ve Ramak Kala Olaylar\n\n_Bu yıl için kayıt bulunmamaktadır._\n'
  }

  const lines: string[] = []
  lines.push('# İş Kazaları ve Ramak Kala Olaylar')
  lines.push('')
  lines.push(`Toplam kayıt: **${incidents.length}**`)
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const inc of incidents) {
    lines.push(`## ${inc.incident_code ?? '(kod yok)'}`)
    lines.push('')
    lines.push(`- **Tür**: ${inc.incident_type ?? '-'}`)
    lines.push(`- **Tarih**: ${inc.incident_date ?? '-'}`)
    lines.push(`- **Durum**: ${inc.status ?? '-'}`)
    lines.push(`- **Şiddet**: ${inc.severity_level ?? '-'}`)
    lines.push(`- **Yaralanma**: ${inc.injury_type ?? '-'}`)
    lines.push(`- **Kayıp iş günü**: ${inc.days_lost ?? 0}`)
    lines.push(`- **Açıklama**: ${inc.description ?? '-'}`)

    const witnesses = (inc.witnesses as Array<Record<string, unknown>> | null) ?? []
    if (witnesses.length > 0) {
      lines.push('')
      lines.push('### Tanıklar')
      for (const w of witnesses) {
        lines.push(`- ${w.full_name ?? '-'} (${w.phone ?? '-'})`)
      }
    }

    const dofs = (inc.dof as Array<Record<string, unknown>> | null) ?? []
    if (dofs.length > 0) {
      lines.push('')
      lines.push('### DÖF Kayıtları')
      for (const d of dofs) {
        lines.push(`- **Kök neden**: ${d.root_cause ?? '-'} — Durum: ${d.status ?? '-'}`)
      }
    }

    const ishikawas = (inc.ishikawa as Array<Record<string, unknown>> | null) ?? []
    if (ishikawas.length > 0) {
      lines.push('')
      lines.push('### Ishikawa Kök Neden Analizi')
      for (const _i of ishikawas) {
        lines.push('- Analiz kaydı mevcut (detaylar JSON dosyasında)')
      }
    }

    lines.push('')
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Collector: corrective_actions (DÖF)
// ---------------------------------------------------------------------------

async function collectCorrectiveActions(
  sb: SupabaseClient,
  companyWorkspaceId: string,
  year: number,
) {
  const start = `${year}-01-01`
  const end = `${year + 1}-01-01`

  const { data, error } = await sb
    .from('corrective_actions')
    .select(`
      id, code, title, root_cause, category, corrective_action, preventive_action,
      status, priority, completion_percentage, deadline, created_at, completed_at,
      incident_id, responsible_role,
      updates:corrective_action_updates(update_type, content, file_url, old_value, new_value, created_at)
    `)
    .eq('company_workspace_id', companyWorkspaceId)
    .gte('created_at', start)
    .lt('created_at', end)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`corrective_actions collector: ${error.message}`)
  return data ?? []
}

function formatCorrectiveActionsMarkdown(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '# DÖF Kayıtları\n\n_Bu yıl için kayıt bulunmamaktadır._\n'

  const lines = ['# DÖF (Düzeltici Önleyici Faaliyet) Kayıtları', '', `Toplam: **${rows.length}**`, '', '---', '']
  for (const r of rows) {
    lines.push(`## ${r.code ?? '(kod yok)'} — ${r.title ?? ''}`)
    lines.push('')
    lines.push(`- **Kategori**: ${r.category ?? '-'}`)
    lines.push(`- **Öncelik**: ${r.priority ?? '-'}`)
    lines.push(`- **Durum**: ${r.status ?? '-'} (%${r.completion_percentage ?? 0})`)
    lines.push(`- **Son tarih**: ${r.deadline ?? '-'}`)
    lines.push(`- **Tamamlandığı tarih**: ${r.completed_at ?? '-'}`)
    lines.push(`- **Kök neden**: ${r.root_cause ?? '-'}`)
    lines.push(`- **Düzeltici**: ${r.corrective_action ?? '-'}`)
    if (r.preventive_action) lines.push(`- **Önleyici**: ${r.preventive_action}`)

    const updates = (r.updates as Array<Record<string, unknown>> | null) ?? []
    if (updates.length > 0) {
      lines.push('')
      lines.push('### Güncellemeler')
      for (const u of updates) {
        lines.push(`- [${u.created_at}] **${u.update_type}**: ${u.content ?? u.new_value ?? '-'}`)
      }
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Collector: training_records
// ---------------------------------------------------------------------------

async function collectTrainingRecords(
  sb: SupabaseClient,
  companyWorkspaceId: string,
  year: number,
) {
  const start = `${year}-01-01`
  const end = `${year + 1}-01-01`

  const { data, error } = await sb
    .from('company_trainings')
    .select(`
      id, title, training_type, trainer_name, duration_hours, location,
      status, notes, training_date, created_at,
      attendees:company_training_attendees(personnel_name, attendance_status, certificate_date, certificate_expiry)
    `)
    .eq('company_workspace_id', companyWorkspaceId)
    .or(`training_date.gte.${start},and(training_date.is.null,created_at.gte.${start})`)
    .lt('created_at', end)
    .order('training_date', { ascending: true, nullsFirst: false })

  if (error) throw new Error(`training_records collector: ${error.message}`)
  return data ?? []
}

function formatTrainingsMarkdown(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '# İSG Eğitim Kayıtları\n\n_Bu yıl için kayıt bulunmamaktadır._\n'

  const lines = ['# İSG Eğitim Kayıtları', '', `Toplam: **${rows.length}**`, '', '---', '']
  for (const r of rows) {
    lines.push(`## ${r.title ?? '(başlıksız)'}`)
    lines.push('')
    lines.push(`- **Tip**: ${r.training_type ?? '-'}`)
    lines.push(`- **Eğitmen**: ${r.trainer_name ?? '-'}`)
    lines.push(`- **Tarih**: ${r.training_date ?? '-'}`)
    lines.push(`- **Süre (saat)**: ${r.duration_hours ?? '-'}`)
    lines.push(`- **Yer**: ${r.location ?? '-'}`)
    lines.push(`- **Durum**: ${r.status ?? '-'}`)
    if (r.notes) lines.push(`- **Notlar**: ${r.notes}`)

    const attendees = (r.attendees as Array<Record<string, unknown>> | null) ?? []
    if (attendees.length > 0) {
      lines.push('')
      lines.push(`### Katılımcılar (${attendees.length})`)
      for (const a of attendees) {
        const cert = a.certificate_date ? ` — Sertifika: ${a.certificate_date}` : ''
        lines.push(`- ${a.personnel_name ?? '-'} — ${a.attendance_status}${cert}`)
      }
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Collector: periodic_inspections (makine/ekipman kontrolü)
// ---------------------------------------------------------------------------

async function collectPeriodicInspections(
  sb: SupabaseClient,
  companyWorkspaceId: string,
  year: number,
) {
  const start = `${year}-01-01`
  const end = `${year + 1}-01-01`

  const { data, error } = await sb
    .from('company_periodic_controls')
    .select(`
      id, title, control_type, inspector_name, inspection_date, next_inspection_date,
      result, report_reference, notes, status, created_at
    `)
    .eq('company_workspace_id', companyWorkspaceId)
    .or(`inspection_date.gte.${start},and(inspection_date.is.null,created_at.gte.${start})`)
    .lt('created_at', end)
    .order('inspection_date', { ascending: true, nullsFirst: false })

  if (error) throw new Error(`periodic_inspections collector: ${error.message}`)
  return data ?? []
}

function formatPeriodicInspectionsMarkdown(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '# Periyodik Kontroller\n\n_Bu yıl için kayıt bulunmamaktadır._\n'

  const lines = ['# Periyodik Kontroller (Makine / Ekipman)', '', `Toplam: **${rows.length}**`, '', '---', '']
  for (const r of rows) {
    lines.push(`## ${r.title ?? '-'} (${r.control_type ?? '-'})`)
    lines.push('')
    lines.push(`- **Denetçi**: ${r.inspector_name ?? '-'}`)
    lines.push(`- **Kontrol tarihi**: ${r.inspection_date ?? '-'}`)
    lines.push(`- **Bir sonraki**: ${r.next_inspection_date ?? '-'}`)
    lines.push(`- **Sonuç**: ${r.result ?? '-'}`)
    lines.push(`- **Durum**: ${r.status ?? '-'}`)
    if (r.report_reference) lines.push(`- **Rapor referansı**: ${r.report_reference}`)
    if (r.notes) lines.push(`- **Notlar**: ${r.notes}`)
    lines.push('')
    lines.push('---')
    lines.push('')
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Collector: committee_minutes (İSG kurul tutanakları)
// ---------------------------------------------------------------------------

async function collectCommitteeMinutes(
  sb: SupabaseClient,
  companyWorkspaceId: string,
  year: number,
) {
  const start = `${year}-01-01`
  const end = `${year + 1}-01-01`

  const { data, error } = await sb
    .from('company_committee_meetings')
    .select(`
      id, meeting_number, meeting_date, next_meeting_date,
      attendees, agenda, decisions, notes, status, created_at
    `)
    .eq('company_workspace_id', companyWorkspaceId)
    .gte('meeting_date', start)
    .lt('meeting_date', end)
    .order('meeting_date', { ascending: true })

  if (error) throw new Error(`committee_minutes collector: ${error.message}`)
  return data ?? []
}

function formatCommitteeMinutesMarkdown(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '# İSG Kurul Tutanakları\n\n_Bu yıl için kayıt bulunmamaktadır._\n'

  const lines = ['# İSG Kurul Tutanakları', '', `Toplam: **${rows.length}** toplantı`, '', '---', '']
  for (const r of rows) {
    lines.push(`## #${r.meeting_number ?? '-'} — ${r.meeting_date ?? '-'}`)
    lines.push('')
    lines.push(`- **Durum**: ${r.status ?? '-'}`)
    lines.push(`- **Bir sonraki toplantı**: ${r.next_meeting_date ?? '-'}`)
    if (r.attendees) lines.push(`- **Katılımcılar**: ${r.attendees}`)
    if (r.agenda) lines.push(`- **Gündem**: ${r.agenda}`)

    const decisions = Array.isArray(r.decisions) ? (r.decisions as unknown[]) : []
    if (decisions.length > 0) {
      lines.push('')
      lines.push('### Kararlar')
      for (const d of decisions) {
        const text = typeof d === 'string' ? d : JSON.stringify(d)
        lines.push(`- ${text}`)
      }
    }
    if (r.notes) {
      lines.push('')
      lines.push(`**Notlar**: ${r.notes}`)
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Collector: planner (yıllık çalışma planı / ajanda görevleri)
// ---------------------------------------------------------------------------

async function collectPlanner(
  sb: SupabaseClient,
  companyWorkspaceId: string,
  year: number,
) {
  const start = `${year}-01-01`
  const end = `${year + 1}-01-01`

  const { data, error } = await sb
    .from('isg_tasks')
    .select(`
      id, title, description, status, recurrence, start_date, end_date,
      location, reminder_days, created_at,
      category:isg_task_categories(name, color, icon)
    `)
    .eq('company_workspace_id', companyWorkspaceId)
    .gte('start_date', start)
    .lt('start_date', end)
    .order('start_date', { ascending: true })

  if (error) throw new Error(`planner collector: ${error.message}`)
  return data ?? []
}

function formatPlannerMarkdown(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '# Yıllık Çalışma Planı\n\n_Bu yıl için görev bulunmamaktadır._\n'

  const lines = ['# Yıllık Çalışma Planı / Ajanda', '', `Toplam: **${rows.length}** görev`, '', '---', '']
  for (const r of rows) {
    const cat = r.category as { name?: string } | null
    lines.push(`## ${r.title ?? '-'}`)
    lines.push('')
    if (cat?.name) lines.push(`- **Kategori**: ${cat.name}`)
    lines.push(`- **Başlangıç**: ${r.start_date ?? '-'}`)
    lines.push(`- **Bitiş**: ${r.end_date ?? '-'}`)
    lines.push(`- **Durum**: ${r.status ?? '-'}`)
    lines.push(`- **Tekrarlılık**: ${r.recurrence ?? '-'}`)
    if (r.location) lines.push(`- **Yer**: ${r.location}`)
    if (r.description) lines.push(`- **Açıklama**: ${r.description}`)
    lines.push('')
    lines.push('---')
    lines.push('')
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Collector: documents (editor_documents TipTap belgeleri + version history)
// ---------------------------------------------------------------------------

async function collectDocuments(
  sb: SupabaseClient,
  companyWorkspaceId: string,
  year: number,
) {
  const start = `${year}-01-01`
  const end = `${year + 1}-01-01`

  const { data, error } = await sb
    .from('editor_documents')
    .select(`
      id, title, group_key, status, version, variables_data,
      approved_at, created_at, updated_at,
      template:document_templates(title, group_key, description)
    `)
    .eq('company_workspace_id', companyWorkspaceId)
    .gte('created_at', start)
    .lt('created_at', end)
    .order('group_key', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new Error(`documents collector: ${error.message}`)
  return data ?? []
}

function formatDocumentsMarkdown(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '# Yüklenen Belgeler ve Sertifikalar\n\n_Bu yıl için kayıt bulunmamaktadır._\n'

  const lines = ['# Yüklenen Belgeler ve Sertifikalar', '', `Toplam: **${rows.length}** belge`, '']

  // Group by group_key for readability
  const groups = new Map<string, Array<Record<string, unknown>>>()
  for (const r of rows) {
    const key = (r.group_key as string) ?? '(diğer)'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }

  for (const [groupKey, docs] of groups) {
    lines.push(`## ${groupKey} (${docs.length})`)
    lines.push('')
    for (const d of docs) {
      lines.push(`- **${d.title ?? '-'}** — Sürüm ${d.version ?? 1} — Durum: ${d.status ?? '-'}`)
      if (d.approved_at) lines.push(`  - Onaylandı: ${d.approved_at}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Integrity helpers
// ---------------------------------------------------------------------------

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function processJob(sb: SupabaseClient, jobId: string) {
  // Load job
  const { data: job, error: loadErr } = await sb
    .from('ohs_archive_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle<ArchiveJob>()

  if (loadErr) throw new Error(`job load: ${loadErr.message}`)
  if (!job) throw new Error('job not found')
  if (job.status !== 'pending') throw new Error(`job not pending (status=${job.status})`)

  await markProcessing(sb, jobId)

  const zip = new JSZip()
  const manifest: Manifest = {
    version: 1,
    job_id: job.id,
    year: job.year,
    jurisdiction: job.jurisdiction_code,
    generated_at: new Date().toISOString(),
    categories: [],
  }

  const categories = job.scope.categories
  const totalSteps = categories.length + 2 // collectors + manifest + upload
  let step = 0

  const folderMap: Record<string, string> = {
    risk_assessments: '01-risk-degerlendirmeleri',
    emergency_plan: '02-acil-durum-plani',
    incidents: '03-is-kazalari',
    corrective_actions: '04-dof-kayitlari',
    training_records: '05-egitim-kayitlari',
    health_examinations: '06-saglik-muayeneleri',
    periodic_inspections: '07-periyodik-kontroller',
    committee_minutes: '08-isg-kurul-tutanaklari',
    rca_analyses: '09-kok-neden-analizleri',
    planner: '10-yillik-plan',
    documents: '11-belgeler',
    notes: '12-notlar-yazismalar',
  }

  // Collector dispatch. Each active collector returns an array of rows and
  // writes two files into its folder: a JSON dump (source of truth) and a
  // Markdown summary (human-readable). Categories without FK-based scoping
  // (risk_assessments, rca_analyses) or without a backing table yet
  // (emergency_plan, health_examinations, notes) stay in pending_collector.
  for (const category of categories) {
    const folder = folderMap[category] ?? `99-${category}`
    try {
      let handled = true
      let count = 0

      switch (category) {
        case 'incidents': {
          const rows = await collectIncidents(sb, job.company_workspace_id, job.year)
          zip.folder(folder)?.file('incidents.json', JSON.stringify(rows, null, 2))
          zip.folder(folder)?.file('incidents.md', formatIncidentsMarkdown(rows))
          count = rows.length
          break
        }
        case 'corrective_actions': {
          const rows = await collectCorrectiveActions(sb, job.company_workspace_id, job.year)
          zip.folder(folder)?.file('corrective-actions.json', JSON.stringify(rows, null, 2))
          zip.folder(folder)?.file('corrective-actions.md', formatCorrectiveActionsMarkdown(rows))
          count = rows.length
          break
        }
        case 'training_records': {
          const rows = await collectTrainingRecords(sb, job.company_workspace_id, job.year)
          zip.folder(folder)?.file('trainings.json', JSON.stringify(rows, null, 2))
          zip.folder(folder)?.file('trainings.md', formatTrainingsMarkdown(rows))
          count = rows.length
          break
        }
        case 'periodic_inspections': {
          const rows = await collectPeriodicInspections(sb, job.company_workspace_id, job.year)
          zip.folder(folder)?.file('inspections.json', JSON.stringify(rows, null, 2))
          zip.folder(folder)?.file('inspections.md', formatPeriodicInspectionsMarkdown(rows))
          count = rows.length
          break
        }
        case 'committee_minutes': {
          const rows = await collectCommitteeMinutes(sb, job.company_workspace_id, job.year)
          zip.folder(folder)?.file('committee.json', JSON.stringify(rows, null, 2))
          zip.folder(folder)?.file('committee.md', formatCommitteeMinutesMarkdown(rows))
          count = rows.length
          break
        }
        case 'planner': {
          const rows = await collectPlanner(sb, job.company_workspace_id, job.year)
          zip.folder(folder)?.file('planner.json', JSON.stringify(rows, null, 2))
          zip.folder(folder)?.file('planner.md', formatPlannerMarkdown(rows))
          count = rows.length
          break
        }
        case 'documents': {
          const rows = await collectDocuments(sb, job.company_workspace_id, job.year)
          zip.folder(folder)?.file('documents.json', JSON.stringify(rows, null, 2))
          zip.folder(folder)?.file('documents.md', formatDocumentsMarkdown(rows))
          count = rows.length
          break
        }
        default:
          handled = false
      }

      if (handled) {
        manifest.categories.push({ key: category, count, status: 'ok' })
      } else {
        // Categories without a ready collector (risk_assessments, rca_analyses,
        // emergency_plan, health_examinations, notes).
        const note =
          category === 'risk_assessments' || category === 'rca_analyses'
            ? 'Bu kategorinin tablosu henüz company_workspace_id ile bağlı değil; company-level arşivlemeye hazır değil.'
            : 'Bu kategori için tablo/veri modeli henüz oluşturulmadı.'
        zip
          .folder(folder)
          ?.file('README.md', `# ${category}\n\n${note}\n\nSonraki sürümde dahil edilecek.\n`)
        manifest.categories.push({ key: category, count: 0, status: 'pending_collector', note })
      }
    } catch (err) {
      manifest.categories.push({
        key: category,
        count: 0,
        status: 'error',
        note: err instanceof Error ? err.message : String(err),
      })
    }

    step++
    await updateProgress(sb, jobId, Math.round((step / totalSteps) * 85))
  }

  // Manifest
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))
  zip.file(
    'OKUYUN.txt',
    [
      'İşyeri İSG Dosyası — RiskNova',
      '',
      `Firma Kimliği: ${job.company_identity_id}`,
      `Yıl: ${job.year}`,
      `Yargı alanı: ${job.jurisdiction_code}`,
      `Oluşturulma: ${manifest.generated_at}`,
      '',
      'İçerik açıklaması için manifest.json dosyasına bakınız.',
      '',
      'Bu arşiv otomatik üretilmiştir. Yasal gerekliliklerin tam',
      'kapsamını sağlamak için uzman denetiminden geçirilmelidir.',
    ].join('\n'),
  )
  step++
  await updateProgress(sb, jobId, Math.round((step / totalSteps) * 90))

  // Build bytes
  const zipBytes = await zip.generateAsync({ type: 'uint8array' })
  if (!(zipBytes instanceof Uint8Array)) {
    throw new Error('zip generation: expected Uint8Array')
  }

  // Upload
  const storagePath = `org-${job.organization_id}/company-${job.company_workspace_id}/${job.year}/${job.id}.zip`
  const { error: upErr } = await sb.storage
    .from(job.storage_bucket)
    .upload(storagePath, zipBytes, {
      contentType: 'application/zip',
      upsert: true,
    })
  if (upErr) throw new Error(`storage upload: ${upErr.message}`)

  // Signed URL (7 days)
  const expiresSec = 60 * 60 * 24 * 7
  const { data: signed, error: signErr } = await sb.storage
    .from(job.storage_bucket)
    .createSignedUrl(storagePath, expiresSec)
  if (signErr) throw new Error(`signed url: ${signErr.message}`)

  const sha = await sha256Hex(zipBytes)

  await markCompleted(sb, jobId, {
    storage_path: storagePath,
    download_url: signed?.signedUrl ?? null,
    expires_at: new Date(Date.now() + expiresSec * 1000).toISOString(),
    file_size_bytes: zipBytes.byteLength,
    file_sha256: sha,
  })

  // Notification (best-effort; ignore failures)
  try {
    await sb.from('notifications').insert({
      user_id: job.requested_by,
      title: 'İşyeri İSG Dosyası hazır',
      message: `${job.year} yılı arşivi hazırlandı, indirebilirsiniz.`,
      link: `/companies/${job.company_workspace_id}?tab=ohs-file&job=${job.id}`,
      level: 'info',
    })
  } catch {
    // swallow — notification is not critical
  }

  return { jobId, size: zipBytes.byteLength, sha256: sha }
}

// ---------------------------------------------------------------------------
// HTTP entry
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }

  // Require internal secret
  const provided = req.headers.get('x-internal-auth') ?? ''
  if (!INTERNAL_KEY || provided !== INTERNAL_KEY) {
    return new Response('unauthorized', { status: 401 })
  }

  let body: { jobId?: string }
  try {
    body = await req.json()
  } catch {
    return new Response('invalid json', { status: 400 })
  }

  if (!body.jobId || typeof body.jobId !== 'string') {
    return new Response('jobId required', { status: 400 })
  }

  const sb = makeClient()

  try {
    const result = await processJob(sb, body.jobId)
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    await markFailed(sb, body.jobId, err).catch(() => {})
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
  }
})
