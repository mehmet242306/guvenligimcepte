"use client";
import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/* ── Types ── */
type TeamCategory = {
  id: string;
  name: string;
  color: string;
  icon: string;
  is_default: boolean;
  sort_order: number;
};

type TeamMember = {
  id: string;
  organization_id: string;
  company_workspace_id: string;
  category_id: string | null;
  full_name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  cert_number: string | null;
  cert_expiry: string | null;
  notes: string | null;
  is_active: boolean;
};

const EMPTY_FORM = {
  full_name: "",
  title: "",
  phone: "",
  email: "",
  cert_number: "",
  cert_expiry: "",
  notes: "",
  is_active: true,
  category_id: "",
};
type MemberForm = typeof EMPTY_FORM;

/* ── Cert expiry helpers ── */
function certStatus(expiry: string | null): "none" | "valid" | "expiring" | "expired" {
  if (!expiry) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiry);
  const days = Math.floor((exp.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "valid";
}

function certDaysLeft(expiry: string | null): number | null {
  if (!expiry) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((new Date(expiry).getTime() - today.getTime()) / 86400000);
}

function CertBadge({ expiry }: { expiry: string | null }) {
  const status = certStatus(expiry);
  const days = certDaysLeft(expiry);
  if (status === "none") return null;
  if (status === "expired")
    return <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Süresi Doldu</span>;
  if (status === "expiring")
    return <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{days} gün kaldı</span>;
  return <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Geçerli</span>;
}

/* ── Member form (inline or modal) ── */
function MemberFormFields({
  form,
  onChange,
  categories,
  showCategory,
}: {
  form: MemberForm;
  onChange: (patch: Partial<MemberForm>) => void;
  categories: TeamCategory[];
  showCategory: boolean;
}) {
  const inp = "h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-neutral-900 dark:text-white dark:border-neutral-700";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Ad Soyad *</label>
        <input className={inp} value={form.full_name} onChange={(e) => onChange({ full_name: e.target.value })} placeholder="Ad Soyad" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Ünvan / Görev</label>
        <input className={inp} value={form.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="İSG Uzmanı" />
      </div>
      {showCategory && (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Kategori</label>
          <select
            className={`${inp} [&>option]:dark:bg-neutral-900 [&>option]:dark:text-white`}
            value={form.category_id}
            onChange={(e) => onChange({ category_id: e.target.value })}
          >
            <option value="">Seçiniz</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Telefon</label>
        <input className={inp} value={form.phone} onChange={(e) => onChange({ phone: e.target.value })} placeholder="0500 000 00 00" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">E-posta</label>
        <input className={inp} type="email" value={form.email} onChange={(e) => onChange({ email: e.target.value })} placeholder="ad@sirket.com" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Sertifika / Belge No</label>
        <input className={inp} value={form.cert_number} onChange={(e) => onChange({ cert_number: e.target.value })} placeholder="ISG-2024-001" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Sertifika Bitiş</label>
        <input className={inp} type="date" value={form.cert_expiry} onChange={(e) => onChange({ cert_expiry: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Notlar</label>
        <textarea
          className="h-16 w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-neutral-900 dark:text-white dark:border-neutral-700"
          value={form.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Ek bilgi..."
        />
      </div>
      <div className="sm:col-span-2 flex items-center gap-2">
        <input
          id="member-active"
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => onChange({ is_active: e.target.checked })}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        <label htmlFor="member-active" className="text-sm text-foreground">Aktif üye</label>
      </div>
    </div>
  );
}

/* ── Member card ── */
function MemberCard({
  member,
  category,
  onEdit,
  onDelete,
}: {
  member: TeamMember;
  category: TeamCategory | undefined;
  onEdit: (m: TeamMember) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const status = certStatus(member.cert_expiry);
  const initials = member.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div
      className={`group rounded-xl border bg-card overflow-hidden transition-all hover:shadow-[var(--shadow-card)] ${
        !member.is_active ? "opacity-50" : ""
      } ${
        status === "expired"
          ? "border-red-400/50 dark:border-red-800/50"
          : status === "expiring"
          ? "border-amber-400/50 dark:border-amber-800/50"
          : "border-border"
      }`}
    >
      {/* Üst renk şerit */}
      {category && <div className="h-1" style={{ backgroundColor: category.color }} />}

      <div className="p-4">
        {/* Üst: Avatar + İsim + Aksiyonlar */}
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: category?.color || "#6B7280" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{member.full_name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {member.title && <p className="text-xs text-muted-foreground truncate">{member.title}</p>}
              {category && (
                <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[9px] font-medium bg-secondary text-muted-foreground">
                  {category.icon} {category.name}
                </span>
              )}
            </div>
          </div>
          {/* Aksiyonlar */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button type="button" onClick={() => onEdit(member)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title="Düzenle">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => onDelete(member.id)} className="rounded-lg px-2 py-1 text-[10px] font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors">Sil</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">İptal</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors" title="Sil">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* İletişim bilgileri */}
        {(member.phone || member.email) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/50 pt-3">
            {member.phone && (
              <a href={`tel:${member.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                <span>{member.phone}</span>
              </a>
            )}
            {member.email && (
              <a href={`mailto:${member.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors truncate">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                <span className="truncate">{member.email}</span>
              </a>
            )}
          </div>
        )}

        {/* Sertifika + Durum */}
        {(member.cert_expiry || !member.is_active) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {member.cert_number && (
              <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded">{member.cert_number}</span>
            )}
            {member.cert_expiry && <CertBadge expiry={member.cert_expiry} />}
            {!member.is_active && (
              <span className="inline-flex items-center rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Pasif</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Modal backdrop ── */
function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">{footer}</div>
      </div>
    </div>
  );
}

/* ── Main component ── */
export function TeamManagementTab({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName?: string;
}) {
  const [categories, setCategories] = useState<TeamCategory[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | "all">("all");
  const [orgId, setOrgId] = useState<string | null>(null);

  // Add member modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<MemberForm>({ ...EMPTY_FORM });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit member modal
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editForm, setEditForm] = useState<MemberForm>({ ...EMPTY_FORM });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Personnel quick-add (from company personnel)
  type PersonnelQuick = { id: string; name: string; title: string; phone: string; email: string };
  const [personnel, setPersonnel] = useState<PersonnelQuick[]>([]);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  // New category modal
  const [catOpen, setCatOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#6B7280");
  const [catIcon, setCatIcon] = useState("👤");
  const [catSaving, setCatSaving] = useState(false);

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }

    // Get organization_id from user_profiles
    const { data: { user } } = await supabase.auth.getUser();
    let resolvedOrgId = orgId;
    if (!resolvedOrgId && user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("auth_user_id", user.id)
        .single();
      if (profile?.organization_id) {
        resolvedOrgId = profile.organization_id as string;
        setOrgId(resolvedOrgId);
      }
    }

    const qCats = supabase
      .from("team_categories")
      .select("id, name, color, icon, is_default, sort_order")
      .order("sort_order");

    const qMembers = supabase
      .from("team_members")
      .select("id, organization_id, company_workspace_id, category_id, full_name, title, phone, email, cert_number, cert_expiry, notes, is_active")
      .eq("company_workspace_id", companyId)
      .order("full_name");

    const [{ data: cats }, { data: mems }] = await Promise.all([qCats, qMembers]);

    let loadedCats = (cats as TeamCategory[]) ?? [];

    // Varsayılan kategorileri otomatik oluştur (yoksa)
    const defaultCats = [
      { name: "Risk Değerlendirme Ekibi", color: "#DC2626", icon: "🎯", sort_order: 1 },
      { name: "İSG Uzmanı", color: "#3B82F6", icon: "🛡️", sort_order: 2 },
      { name: "İşyeri Hekimi", color: "#10B981", icon: "⚕️", sort_order: 3 },
      { name: "Acil Durum Ekip Lideri", color: "#F97316", icon: "🚨", sort_order: 4 },
    ];
    const missingDefaults = defaultCats.filter((d) => !loadedCats.some((c) => c.name === d.name));
    if (missingDefaults.length > 0) {
      const inserts = missingDefaults.map((d) => ({
        ...d,
        is_default: true,
        organization_id: resolvedOrgId || orgId,
      }));
      const { data: newCats } = await supabase.from("team_categories").insert(inserts).select("id, name, color, icon, is_default, sort_order");
      if (newCats) loadedCats = [...loadedCats, ...(newCats as TeamCategory[])].sort((a, b) => a.sort_order - b.sort_order);
    }

    setCategories(loadedCats);
    setMembers((mems as TeamMember[]) ?? []);
    setLoading(false);
  }, [companyId, orgId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadData(); }, [loadData]);

  // Firma personelini yukle (ekip uyesi olarak eklemek icin)
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      if (!supabase) return;

      // companyId = workspace id, personnel company_identity_id ile bagli
      const { data: ws } = await supabase
        .from("company_workspaces")
        .select("company_identity_id")
        .eq("id", companyId)
        .single();

      if (!ws?.company_identity_id) return;

      const { data } = await supabase
        .from("personnel")
        .select("id, first_name, last_name, position_title, phone, email")
        .eq("company_identity_id", ws.company_identity_id)
        .order("first_name");

      if (data) {
        setPersonnel(data.map((p: { id: string; first_name: string; last_name: string; position_title: string; phone: string; email: string }) => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`.trim(),
          title: p.position_title || "",
          phone: p.phone || "",
          email: p.email || "",
        })));
      }
    })();
  }, [companyId]);

  /* ── Filtered members ── */
  const filteredMembers =
    selectedCategoryId === "all"
      ? members
      : members.filter((m) => m.category_id === selectedCategoryId);

  const uncategorized = filteredMembers.filter((m) => !m.category_id);

  // Members grouped by category
  const grouped = categories
    .filter((c) => selectedCategoryId === "all" || selectedCategoryId === c.id)
    .map((c) => ({
      category: c,
      members: filteredMembers.filter((m) => m.category_id === c.id),
    }))
    .filter((g) => g.members.length > 0);

  /* ── Add member ── */
  const openAdd = useCallback((categoryId?: string) => {
    setAddForm({
      ...EMPTY_FORM,
      category_id: categoryId ?? (selectedCategoryId === "all" ? "" : selectedCategoryId),
    });
    setAddError(null);
    setAddOpen(true);
  }, [selectedCategoryId]);

  // Toplu personelden ekle
  const handleBulkAdd = useCallback(async () => {
    if (bulkSelected.size === 0 || !orgId) return;
    const supabase = createClient();
    if (!supabase) return;
    setBulkSaving(true);

    const existingNames = new Set(members.map((m) => m.full_name.toLowerCase()));
    const toAdd = personnel.filter((p) => bulkSelected.has(p.id) && !existingNames.has(p.name.toLowerCase()));

    const catId = selectedCategoryId === "all" ? null : selectedCategoryId;

    for (const p of toAdd) {
      await supabase.from("team_members").insert({
        organization_id: orgId,
        company_workspace_id: companyId,
        category_id: catId,
        full_name: p.name,
        title: p.title || null,
        phone: p.phone || null,
        email: p.email || null,
        is_active: true,
      });
    }

    setBulkSaving(false);
    setBulkSelected(new Set());
    setBulkMode(false);
    void loadData();
  }, [bulkSelected, orgId, personnel, members, selectedCategoryId, companyId, loadData]);

  const handleAdd = useCallback(async () => {
    if (!addForm.full_name.trim()) { setAddError("Ad Soyad zorunludur."); return; }
    if (!orgId) { setAddError("Organizasyon bilgisi alınamadı."); return; }
    const supabase = createClient();
    if (!supabase) { setAddError("Bağlantı hatası."); return; }
    setAddSaving(true);
    setAddError(null);
    const { error } = await supabase.from("team_members").insert({
      organization_id: orgId,
      company_workspace_id: companyId,
      category_id: addForm.category_id || null,
      full_name: addForm.full_name.trim(),
      title: addForm.title.trim() || null,
      phone: addForm.phone.trim() || null,
      email: addForm.email.trim() || null,
      cert_number: addForm.cert_number.trim() || null,
      cert_expiry: addForm.cert_expiry || null,
      notes: addForm.notes.trim() || null,
      is_active: addForm.is_active,
    });
    if (error) { setAddError(error.message); setAddSaving(false); return; }
    setAddOpen(false);
    setAddSaving(false);
    void loadData();
  }, [addForm, companyId, orgId, loadData]);

  /* ── Edit member ── */
  const openEdit = useCallback((m: TeamMember) => {
    setEditMember(m);
    setEditForm({
      full_name: m.full_name,
      title: m.title ?? "",
      phone: m.phone ?? "",
      email: m.email ?? "",
      cert_number: m.cert_number ?? "",
      cert_expiry: m.cert_expiry ?? "",
      notes: m.notes ?? "",
      is_active: m.is_active,
      category_id: m.category_id ?? "",
    });
    setEditError(null);
  }, []);

  const handleEdit = useCallback(async () => {
    if (!editMember) return;
    if (!editForm.full_name.trim()) { setEditError("Ad Soyad zorunludur."); return; }
    const supabase = createClient();
    if (!supabase) { setEditError("Bağlantı hatası."); return; }
    setEditSaving(true);
    setEditError(null);
    const { error } = await supabase.from("team_members").update({
      category_id: editForm.category_id || null,
      full_name: editForm.full_name.trim(),
      title: editForm.title.trim() || null,
      phone: editForm.phone.trim() || null,
      email: editForm.email.trim() || null,
      cert_number: editForm.cert_number.trim() || null,
      cert_expiry: editForm.cert_expiry || null,
      notes: editForm.notes.trim() || null,
      is_active: editForm.is_active,
    }).eq("id", editMember.id);
    if (error) { setEditError(error.message); setEditSaving(false); return; }
    setEditMember(null);
    setEditSaving(false);
    void loadData();
  }, [editMember, editForm, loadData]);

  /* ── Delete member ── */
  const handleDelete = useCallback(async (id: string) => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from("team_members").delete().eq("id", id);
    void loadData();
  }, [loadData]);

  /* ── Add category ── */
  const handleAddCategory = useCallback(async () => {
    if (!catName.trim() || !orgId) return;
    const supabase = createClient();
    if (!supabase) return;
    setCatSaving(true);
    const { data } = await supabase.from("team_categories").insert({
      organization_id: orgId,
      name: catName.trim(),
      color: catColor,
      icon: catIcon,
      is_default: false,
    }).select("id").single();
    if (data?.id) setSelectedCategoryId(data.id);
    setCatOpen(false);
    setCatName(""); setCatColor("#6B7280"); setCatIcon("👤");
    setCatSaving(false);
    void loadData();
  }, [catName, catColor, catIcon, orgId, loadData]);

  /* ── Cert warning summary ── */
  const expiredCount = members.filter((m) => certStatus(m.cert_expiry) === "expired").length;
  const expiringCount = members.filter((m) => certStatus(m.cert_expiry) === "expiring").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.is_active).length;

  return (
    <div className="space-y-5">
      {/* ── Header bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-[var(--shadow-soft)]">
        <div>
          <h2 className="section-title text-base">Ekip Yönetimi</h2>
          {companyName && <p className="mt-0.5 text-xs text-muted-foreground">{companyName}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Stats */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-1.5 text-xs">
            <span className="text-muted-foreground">Toplam: <strong className="text-foreground">{totalMembers}</strong></span>
            <span className="text-muted-foreground">Aktif: <strong className="text-foreground">{activeMembers}</strong></span>
          </div>
          {expiredCount > 0 && (
            <span className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
              ⚠ {expiredCount} sertifika süresi dolmuş
            </span>
          )}
          {expiringCount > 0 && (
            <span className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              ⏰ {expiringCount} sertifika yakında dolacak
            </span>
          )}
          {personnel.length > 0 && (
            <button
              type="button"
              onClick={() => { setBulkMode(true); setBulkSelected(new Set()); }}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
            >
              Personelden Ekle
            </button>
          )}
          <button
            type="button"
            onClick={() => openAdd()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Üye Ekle
          </button>
        </div>
      </div>

      {/* ── Yatay kategori filtreleri ── */}
      <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-border bg-card px-3 py-2.5 shadow-[var(--shadow-soft)]">
        <button
          type="button"
          onClick={() => setSelectedCategoryId("all")}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            selectedCategoryId === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-foreground hover:bg-secondary/80"
          }`}
        >
          Tümü
          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{members.length}</span>
        </button>

        {categories.map((cat) => {
          const count = members.filter((m) => m.category_id === cat.id).length;
          const active = selectedCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryId(active ? "all" : cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "text-white"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
              style={active ? { backgroundColor: cat.color } : undefined}
            >
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: active ? "#fff" : cat.color }} />
              {cat.name}
              {count > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-muted"}`}>{count}</span>}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => { setCatOpen(true); }}
          className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary transition-colors"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Kategori Ekle
        </button>
      </div>

      {/* ── Üye listesi ── */}
      <div className="space-y-6">
        {members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center shadow-[var(--shadow-soft)]">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl">👥</div>
            <p className="text-sm font-medium text-foreground">Henüz ekip üyesi yok</p>
            <p className="mt-1 text-xs text-muted-foreground">İSG ekibini oluşturmak için üye ekleyin.</p>
            <button
              type="button"
              onClick={() => openAdd()}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              İlk Üyeyi Ekle
            </button>
          </div>
        ) : (
          <>
            {grouped.map(({ category, members: catMembers }) => (
              <div key={category.id}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                    <h3 className="text-sm font-semibold text-foreground">
                      {category.icon} {category.name}
                    </h3>
                    <span className="text-xs text-muted-foreground">({catMembers.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAdd(category.id)}
                    className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Ekle
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {catMembers.map((m) => (
                    <MemberCard
                      key={m.id}
                      member={m}
                      category={category}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))}

            {uncategorized.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-border" />
                  <h3 className="text-sm font-semibold text-foreground">Kategorisiz</h3>
                  <span className="text-xs text-muted-foreground">({uncategorized.length})</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {uncategorized.map((m) => (
                    <MemberCard
                      key={m.id}
                      member={m}
                      category={undefined}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add member modal ── */}
      {addOpen && (
        <Modal
          title="Ekip Üyesi Ekle"
          onClose={() => setAddOpen(false)}
          footer={
            <>
              <button type="button" onClick={() => setAddOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary">İptal</button>
              <button type="button" onClick={() => void handleAdd()} disabled={addSaving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
                {addSaving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </>
          }
        >
          {addError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">{addError}</p>}

          {/* Personelden hizli doldurma */}
          {personnel.length > 0 && (
            <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Personelden Doldur</p>
              <select
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground [&>option]:dark:bg-neutral-900 [&>option]:dark:text-white"
                value=""
                onChange={(e) => {
                  const p = personnel.find((pp) => pp.id === e.target.value);
                  if (p) {
                    setAddForm((f) => ({
                      ...f,
                      full_name: p.name,
                      title: p.title || f.title,
                      phone: p.phone || f.phone,
                      email: p.email || f.email,
                    }));
                  }
                }}
              >
                <option value="">Personel seç (bilgileri otomatik doldurur)</option>
                {personnel.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.title ? ` — ${p.title}` : ""}</option>
                ))}
              </select>
            </div>
          )}

          <MemberFormFields
            form={addForm}
            onChange={(p) => setAddForm((f) => ({ ...f, ...p }))}
            categories={categories}
            showCategory
          />
        </Modal>
      )}

      {/* ── Edit member modal ── */}
      {editMember && (
        <Modal
          title="Üyeyi Düzenle"
          onClose={() => setEditMember(null)}
          footer={
            <>
              <button type="button" onClick={() => setEditMember(null)} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary">İptal</button>
              <button type="button" onClick={() => void handleEdit()} disabled={editSaving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
                {editSaving ? "Kaydediliyor..." : "Güncelle"}
              </button>
            </>
          }
        >
          {editError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">{editError}</p>}
          <MemberFormFields
            form={editForm}
            onChange={(p) => setEditForm((f) => ({ ...f, ...p }))}
            categories={categories}
            showCategory
          />
        </Modal>
      )}

      {/* ── Bulk add from personnel modal ── */}
      {bulkMode && (
        <Modal
          title="Personelden Ekip Üyesi Ekle"
          onClose={() => setBulkMode(false)}
          footer={
            <>
              <button type="button" onClick={() => setBulkMode(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary">İptal</button>
              <button
                type="button"
                onClick={() => void handleBulkAdd()}
                disabled={bulkSaving || bulkSelected.size === 0}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
              >
                {bulkSaving ? "Ekleniyor..." : `${bulkSelected.size} Kişiyi Ekle`}
              </button>
            </>
          }
        >
          <p className="mb-3 text-xs text-muted-foreground">
            Firma personelinden ekip üyesi olarak eklemek istediklerinizi seçin. Zaten ekipte olan kişiler işaretlenmiştir.
          </p>

          {/* Tümünü seç */}
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const existingNames = new Set(members.map((m) => m.full_name.toLowerCase()));
                const available = personnel.filter((p) => !existingNames.has(p.name.toLowerCase()));
                if (bulkSelected.size === available.length) {
                  setBulkSelected(new Set());
                } else {
                  setBulkSelected(new Set(available.map((p) => p.id)));
                }
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
            >
              {bulkSelected.size > 0 ? "Seçimi Kaldır" : "Tümünü Seç"}
            </button>
            <span className="text-xs text-muted-foreground">{bulkSelected.size} seçili</span>
          </div>

          <div className="max-h-[400px] space-y-1 overflow-y-auto">
            {personnel.map((p) => {
              const alreadyInTeam = members.some((m) => m.full_name.toLowerCase() === p.name.toLowerCase());
              const isSelected = bulkSelected.has(p.id);

              return (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                    alreadyInTeam
                      ? "bg-emerald-50 opacity-60 dark:bg-emerald-950"
                      : isSelected
                        ? "bg-primary/10 border border-primary/30 dark:bg-primary/20"
                        : "hover:bg-secondary"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected || alreadyInTeam}
                    disabled={alreadyInTeam}
                    onChange={() => {
                      if (alreadyInTeam) return;
                      setBulkSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(p.id)) next.delete(p.id);
                        else next.add(p.id);
                        return next;
                      });
                    }}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.title || "Görev belirtilmemiş"}
                      {p.phone && ` · ${p.phone}`}
                    </p>
                  </div>
                  {alreadyInTeam && (
                    <span className="flex-shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">Ekipte</span>
                  )}
                </label>
              );
            })}
          </div>
        </Modal>
      )}

      {/* ── Add category modal ── */}
      {catOpen && (
        <Modal
          title="Yeni Kategori"
          onClose={() => setCatOpen(false)}
          footer={
            <>
              <button type="button" onClick={() => setCatOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary">İptal</button>
              <button type="button" onClick={() => void handleAddCategory()} disabled={catSaving || !catName.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
                {catSaving ? "Kaydediliyor..." : "Oluştur"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Kategori Adı *</label>
              <input
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-neutral-900 dark:text-white dark:border-neutral-700"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="ör. Yangın Söndürme Ekibi"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Renk</label>
                <input type="color" value={catColor} onChange={(e) => setCatColor(e.target.value)} className="h-9 w-full cursor-pointer rounded-lg border border-border p-1" />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">İkon (emoji)</label>
                <input
                  className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-neutral-900 dark:text-white dark:border-neutral-700"
                  value={catIcon}
                  onChange={(e) => setCatIcon(e.target.value)}
                  placeholder="👤"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-3">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: catColor }} />
              <span className="text-sm">{catIcon} {catName || "Kategori Adı"}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
