"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type CompanySharedOpsPanelProps = {
  company: {
    id: string;
    name: string;
    shortName?: string;
    sector?: string;
    naceCode?: string;
    hazardClass?: string;
    address?: string;
    sharedCompanyCode?: string;
    sharedCompanyIdentityId?: string;
    sharedWorkspaceId?: string;
  };
  onSharedLinkChange: (payload: {
    sharedCompanyCode?: string;
    sharedCompanyIdentityId?: string;
    sharedWorkspaceId?: string;
  }) => void;
};

type SharedCompanyIdentity = {
  id: string;
  company_code: string;
  official_name: string;
  sector: string | null;
  nace_code: string | null;
  hazard_class: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  approval_mode: string;
  is_active: boolean;
};

type SharedMembershipRow = {
  id: string;
  user_id: string;
  membership_role: string;
  employment_type: string;
  status: string;
  can_approve_join_requests: boolean;
  is_primary_contact: boolean;
  approved_at: string | null;
  notes: string | null;
};

type SharedProfileRow = {
  auth_user_id: string;
  full_name: string | null;
  title: string | null;
  email: string | null;
};

type SharedMembershipView = SharedMembershipRow & {
  full_name: string | null;
  title: string | null;
  email: string | null;
};

type PendingJoinRequest = {
  id: string;
  request_code: string;
  requesting_user_id: string;
  requested_role: string;
  requested_employment_type: string;
  status: string;
  note: string | null;
  created_at: string;
};

function roleLabel(role: string, isTr: boolean) {
  switch (role) {
    case "owner": return isTr ? "Firma Sahibi / Ana Yetkili" : "Company owner / Main admin";
    case "ohs_specialist": return isTr ? "Is Guvenligi Uzmani" : "OHS specialist";
    case "workplace_physician": return isTr ? "Isyeri Hekimi" : "Workplace physician";
    case "other_health_personnel": return isTr ? "Diger Saglik Personeli" : "Other health personnel";
    case "employee_representative": return isTr ? "Calisan Temsilcisi" : "Employee representative";
    case "support_staff": return isTr ? "Destek Elemani" : "Support staff";
    case "employer_representative": return isTr ? "Isveren Vekili" : "Employer representative";
    case "viewer": return isTr ? "Goruntuleyici" : "Viewer";
    default: return role;
  }
}

function employmentTypeLabel(value: string, isTr: boolean) {
  switch (value) {
    case "direct": return isTr ? "Dogrudan" : "Direct";
    case "osgb": return "OSGB";
    case "external": return isTr ? "Harici" : "External";
    case "internal": return isTr ? "Ic Kaynak" : "Internal";
    default: return value;
  }
}

function statusVariant(status: string): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "active": case "approved": return "success";
    case "pending": return "warning";
    case "rejected": case "inactive": return "danger";
    default: return "neutral";
  }
}

function statusLabel(status: string, isTr: boolean) {
  switch (status) {
    case "active": return isTr ? "Aktif" : "Active";
    case "approved": return isTr ? "Onaylandi" : "Approved";
    case "pending": return isTr ? "Bekliyor" : "Pending";
    case "rejected": return isTr ? "Reddedildi" : "Rejected";
    case "inactive": return isTr ? "Pasif" : "Inactive";
    default: return status;
  }
}

function shortUserId(value: string) {
  if (!value) return "-";
  if (value.length <= 10) return value;
  return `${value.slice(0, 8)}...`;
}

/* Reusable card wrapper */
function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] ${className}`}>{children}</div>;
}
function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function CompanySharedOpsPanel({ company, onSharedLinkChange }: CompanySharedOpsPanelProps) {
  const locale = useLocale();
  const isTr = locale === "tr";
  const supabase = useMemo(() => createClient(), []);
  const supabaseUnavailable = !supabase;
  const [identity, setIdentity] = useState<SharedCompanyIdentity | null>(null);
  const [memberships, setMemberships] = useState<SharedMembershipView[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingJoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingIdentity, setIsCreatingIdentity] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const hasSharedReference = Boolean(
    company.sharedCompanyIdentityId || company.sharedCompanyCode || company.sharedWorkspaceId,
  );

  const loadSharedSnapshot = useCallback(async () => {
    if (!supabase) { setIdentity(null); setMemberships([]); setPendingRequests([]); return; }
    if (!hasSharedReference) { setIdentity(null); setMemberships([]); setPendingRequests([]); return; }
    setIsLoading(true); setMessage(""); setMessageType("");

    try {
      let resolvedIdentityId = company.sharedCompanyIdentityId ?? "";
      const resolvedWorkspaceId = company.sharedWorkspaceId ?? "";

      if (!resolvedIdentityId && resolvedWorkspaceId) {
        const { data: workspaceRow, error: workspaceError } = await supabase.from("company_workspaces").select("id, company_identity_id").eq("id", resolvedWorkspaceId).single();
        if (workspaceError) throw new Error(workspaceError.message);
        resolvedIdentityId = workspaceRow.company_identity_id;
      }

      if (!resolvedIdentityId && company.sharedCompanyCode) {
        const { data: lookupRows, error: lookupError } = await supabase.rpc("find_company_by_code", { p_company_code: company.sharedCompanyCode });
        if (lookupError) throw new Error(lookupError.message);
        const first = lookupRows?.[0];
        if (!first) throw new Error(isTr ? "Firma kodu bulundu ancak erisilebilir kayit alinamadi." : "Company code was found, but no accessible record could be loaded.");
        resolvedIdentityId = first.company_identity_id;
      }

      if (!resolvedIdentityId) throw new Error(isTr ? "Firma icin ortak kimlik bilgisi cozulemedi." : "The shared company identity could not be resolved.");

      const { data: identityRow, error: identityError } = await supabase.from("company_identities").select("id, company_code, official_name, sector, nace_code, hazard_class, city, district, address, approval_mode, is_active").eq("id", resolvedIdentityId).single();
      if (identityError) throw new Error(identityError.message);

      const { data: membershipRows, error: membershipsError } = await supabase.from("company_memberships").select("id, user_id, membership_role, employment_type, status, can_approve_join_requests, is_primary_contact, approved_at, notes").eq("company_identity_id", resolvedIdentityId).order("created_at", { ascending: true });
      if (membershipsError) throw new Error(membershipsError.message);

      const userIds = (membershipRows ?? []).map((item) => item.user_id);
      let profilesByUserId = new Map<string, SharedProfileRow>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("user_profiles").select("auth_user_id, full_name, title, email").in("auth_user_id", userIds);
        profilesByUserId = new Map((profiles ?? []).map((profile) => [profile.auth_user_id, profile]));
      }

      const membershipView: SharedMembershipView[] = (membershipRows ?? []).map((item) => {
        const profile = profilesByUserId.get(item.user_id);
        return { ...item, full_name: profile?.full_name ?? null, title: profile?.title ?? null, email: profile?.email ?? null };
      });

      const { data: joinRows, error: joinError } = await supabase.from("company_join_requests").select("id, request_code, requesting_user_id, requested_role, requested_employment_type, status, note, created_at").eq("company_identity_id", resolvedIdentityId).eq("status", "pending").order("created_at", { ascending: false });
      if (joinError) throw new Error(joinError.message);

      setIdentity(identityRow);
      setMemberships(membershipView);
      setPendingRequests(joinRows ?? []);
      onSharedLinkChange({ sharedCompanyCode: identityRow.company_code, sharedCompanyIdentityId: identityRow.id, sharedWorkspaceId: company.sharedWorkspaceId });
    } catch (error) {
      const text = error instanceof Error ? error.message : isTr ? "Ortak calisma bilgileri alinamadi." : "Shared workspace information could not be loaded.";
      setMessage(text); setMessageType("error");
    } finally { setIsLoading(false); }
  }, [company.sharedCompanyCode, company.sharedCompanyIdentityId, company.sharedWorkspaceId, hasSharedReference, isTr, onSharedLinkChange, supabase]);

  useEffect(() => { void loadSharedSnapshot(); }, [loadSharedSnapshot]);

  async function handleCreateSharedIdentity() {
    if (!supabase) { setMessage(isTr ? "Supabase baglantisi hazir degil." : "Supabase connection is not ready."); setMessageType("error"); return; }
    setIsCreatingIdentity(true); setMessage(""); setMessageType("");
    try {
      const { data: workspaceId, error } = await supabase.rpc("create_company_identity_with_workspace", { p_official_name: company.name, p_sector: company.sector ?? null, p_nace_code: company.naceCode ?? null, p_hazard_class: company.hazardClass ?? null, p_address: company.address ?? null, p_display_name: company.shortName || company.name, p_notes: isTr ? `${company.name} icin firma calisma alani uzerinden olusturuldu.` : `Created from the company workspace for ${company.name}.` });
      if (error) throw new Error(error.message);
      if (!workspaceId) throw new Error(isTr ? "Ortak firma kimligi olusturuldu ancak calisma alani bilgisi alinamadi." : "Shared company identity was created, but workspace information could not be loaded.");
      const { data: workspaceRow, error: workspaceError } = await supabase.from("company_workspaces").select("id, company_identity_id").eq("id", workspaceId).single();
      if (workspaceError) throw new Error(workspaceError.message);
      const { data: identityRow, error: identityError } = await supabase.from("company_identities").select("id, company_code").eq("id", workspaceRow.company_identity_id).single();
      if (identityError) throw new Error(identityError.message);
      onSharedLinkChange({ sharedWorkspaceId: workspaceRow.id, sharedCompanyIdentityId: identityRow.id, sharedCompanyCode: identityRow.company_code });
      setMessage(isTr ? "Firma icin ortak calisma kimligi olusturuldu." : "Shared company identity was created."); setMessageType("success");
      await loadSharedSnapshot();
    } catch (error) {
      const text = error instanceof Error ? error.message : isTr ? "Firma kimligi olusturulamadi." : "Company identity could not be created.";
      setMessage(text); setMessageType("error");
    } finally { setIsCreatingIdentity(false); }
  }

  async function handleApproveJoinRequest(requestId: string) {
    if (!supabase) { setMessage(isTr ? "Supabase baglantisi hazir degil." : "Supabase connection is not ready."); setMessageType("error"); return; }
    setProcessingRequestId(requestId); setMessage(""); setMessageType("");
    try {
      const { error } = await supabase.rpc("approve_company_join_request", { p_join_request_id: requestId, p_decision_note: null });
      if (error) throw new Error(error.message);
      setMessage(isTr ? "Katilim talebi onaylandi." : "Join request approved."); setMessageType("success");
      await loadSharedSnapshot();
    } catch (error) {
      const text = error instanceof Error ? error.message : isTr ? "Onay islemi basarisiz." : "Approval failed.";
      setMessage(text); setMessageType("error");
    } finally { setProcessingRequestId(null); }
  }

  async function handleRejectJoinRequest(requestId: string) {
    if (!supabase) { setMessage(isTr ? "Supabase baglantisi hazir degil." : "Supabase connection is not ready."); setMessageType("error"); return; }
    setProcessingRequestId(requestId); setMessage(""); setMessageType("");
    try {
      const { error } = await supabase.rpc("reject_company_join_request", { p_join_request_id: requestId, p_decision_note: null });
      if (error) throw new Error(error.message);
      setMessage(isTr ? "Katilim talebi reddedildi." : "Join request rejected."); setMessageType("success");
      await loadSharedSnapshot();
    } catch (error) {
      const text = error instanceof Error ? error.message : isTr ? "Red islemi basarisiz." : "Rejection failed.";
      setMessage(text); setMessageType("error");
    } finally { setProcessingRequestId(null); }
  }

  return (
    <div className="space-y-5">
      {supabaseUnavailable && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <h3 className="text-base font-semibold text-foreground">{isTr ? "Supabase baglantisi hazir degil" : "Supabase connection is not ready"}</h3>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            {isTr
              ? "NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY bulunamadigi icin ortak firma calisma alani paneli yuklenemedi."
              : "The shared company workspace panel could not load because NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing."}
          </p>
        </div>
      )}

      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h3 className="section-title text-base">{isTr ? "Firma kimligi ve ortak calisma alani" : "Company identity and shared workspace"}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {isTr
                  ? "Ayni isyerine bakan uzman, isyeri hekimi ve diger saglik personeli bu ortak firma kimligi uzerinden baglanir."
                  : "Specialists, workplace physicians, and other health personnel serving the same site connect through this shared company identity."}
              </p>
            </div>

            {identity ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">{isTr ? "Firma Kodu" : "Company code"}: {identity.company_code}</Badge>
                <Badge variant="neutral">{isTr ? "Onay Modu" : "Approval mode"}: {identity.approval_mode}</Badge>
                <Badge variant={identity.is_active ? "success" : "danger"}>
                  {identity.is_active ? (isTr ? "Aktif" : "Active") : (isTr ? "Pasif" : "Inactive")}
                </Badge>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-3 text-sm leading-6 text-muted-foreground">
                {isTr
                  ? "Bu firma icin henuz ortak calisma kimligi olusturulmamis. Olusturduktan sonra diger kullanicilar firma kodu ile erisim talebi gonderebilir."
                  : "No shared workspace identity has been created for this company yet. After it is created, other users can request access with the company code."}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            {!identity ? (
              <Button type="button" size="sm" onClick={handleCreateSharedIdentity} disabled={isCreatingIdentity}>
                {isCreatingIdentity ? (isTr ? "Olusturuluyor..." : "Creating...") : (isTr ? "Ortak Firma Kimligi Olustur" : "Create shared company identity")}
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" onClick={() => void loadSharedSnapshot()} disabled={isLoading}>
                {isLoading ? (isTr ? "Yenileniyor..." : "Refreshing...") : (isTr ? "Bilgileri Yenile" : "Refresh information")}
              </Button>
            )}
          </div>
        </div>

        {message && (
          <div className={`mt-3 rounded-lg px-3 py-2.5 text-sm font-medium ${messageType === "success" ? "border border-success/30 bg-success/5 text-success" : "border border-danger/30 bg-danger/5 text-danger"}`}>
            {message}
          </div>
        )}
      </Panel>

      {identity && (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel>
              <h3 className="section-title text-sm">{isTr ? "Firma kimligi ozeti" : "Company identity summary"}</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <InfoCard label={isTr ? "Resmi Ad" : "Official name"} value={identity.official_name} />
                <InfoCard label={isTr ? "Firma Kodu" : "Company code"} value={identity.company_code} />
                <InfoCard label={isTr ? "Sektor" : "Sector"} value={identity.sector || "-"} />
                <InfoCard label="NACE" value={identity.nace_code || "-"} />
                <InfoCard label={isTr ? "Tehlike Sinifi" : "Hazard class"} value={identity.hazard_class || "-"} />
                <InfoCard label={isTr ? "Sehir / Ilce" : "City / District"} value={[identity.city, identity.district].filter(Boolean).join(" / ") || "-"} />
              </div>
            </Panel>

            <Panel>
              <h3 className="section-title text-sm">{isTr ? "Ortak ekip ozeti" : "Shared team summary"}</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                  <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">{isTr ? "Toplam Bagli Kisi" : "Total members"}</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{memberships.length}</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                  <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">{isTr ? "Bekleyen Talep" : "Pending requests"}</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{pendingRequests.length}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {isTr
                  ? "Bu kodu paylasarak baska uzmanlar, hekimler veya diger saglik personeli ayni firmaya erisim talebi gonderebilir."
                  : "Share this code so other specialists, physicians, or health personnel can request access to the same company."}
              </p>
            </Panel>
          </div>

          <Panel>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="section-title text-sm">{isTr ? "Bagli kisiler" : "Connected people"}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{isTr ? "Bu firmaya bagli uzman, hekim ve diger kullanicilar." : "Specialists, physicians, and other users connected to this company."}</p>
              </div>
            </div>

            {memberships.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed border-border bg-secondary/30 p-3 text-sm leading-6 text-muted-foreground">
                {isTr ? "Henuz bagli kullanici kaydi gorunmuyor." : "No connected users yet."}
              </div>
            ) : (
              <div className="mt-3 grid gap-2">
                {memberships.map((member) => (
                  <div key={member.id} className="rounded-lg border border-border bg-secondary/20 p-3">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="text-sm font-semibold text-foreground">
                          {member.full_name || shortUserId(member.user_id)}
                        </p>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {roleLabel(member.membership_role, isTr)}
                          {member.title ? ` · ${member.title}` : ""}
                          {member.email ? ` · ${member.email}` : ""}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="neutral">{employmentTypeLabel(member.employment_type, isTr)}</Badge>
                          <Badge variant={statusVariant(member.status)}>{statusLabel(member.status, isTr)}</Badge>
                          {member.is_primary_contact && <Badge variant="default">{isTr ? "Ana Iletisim" : "Primary contact"}</Badge>}
                          {member.can_approve_join_requests && <Badge variant="success">{isTr ? "Onay Yetkisi" : "Approval access"}</Badge>}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground">
                        {member.approved_at ? new Date(member.approved_at).toLocaleDateString(isTr ? "tr-TR" : "en-US") : "-"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <h3 className="section-title text-sm">{isTr ? "Bekleyen erisim talepleri" : "Pending access requests"}</h3>

            {pendingRequests.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed border-border bg-secondary/30 p-3 text-sm leading-6 text-muted-foreground">
                {isTr ? "Bekleyen erisim talebi yok." : "No pending access requests."}
              </div>
            ) : (
              <div className="mt-3 grid gap-2">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="rounded-lg border border-border bg-secondary/20 p-3">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="text-sm font-semibold text-foreground">{isTr ? "Talep Kodu" : "Request code"}: {request.request_code}</p>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {isTr ? "Rol" : "Role"}: {roleLabel(request.requested_role, isTr)} - {isTr ? "Calisma Turu" : "Employment type"}: {employmentTypeLabel(request.requested_employment_type, isTr)}
                        </p>
                        <p className="text-xs leading-5 text-muted-foreground">{isTr ? "Talep Eden" : "Requester"}: {shortUserId(request.requesting_user_id)}</p>
                        <p className="text-xs leading-5 text-muted-foreground">{isTr ? "Not" : "Note"}: {request.note || "-"}</p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        <Button type="button" variant="outline" size="sm" disabled={processingRequestId === request.id} onClick={() => void handleRejectJoinRequest(request.id)}>
                          {processingRequestId === request.id ? (isTr ? "Isleniyor..." : "Processing...") : (isTr ? "Reddet" : "Reject")}
                        </Button>
                        <Button type="button" size="sm" disabled={processingRequestId === request.id} onClick={() => void handleApproveJoinRequest(request.id)}>
                          {processingRequestId === request.id ? (isTr ? "Isleniyor..." : "Processing...") : (isTr ? "Onayla" : "Approve")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
