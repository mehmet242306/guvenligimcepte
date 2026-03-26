"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

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

function roleLabel(role: string) {
  switch (role) {
    case "owner":
      return "Firma Sahibi / Ana Yetkili";
    case "ohs_specialist":
      return "İş Güvenliği Uzmanı";
    case "workplace_physician":
      return "İşyeri Hekimi";
    case "other_health_personnel":
      return "Diğer Sağlık Personeli";
    case "employee_representative":
      return "Çalışan Temsilcisi";
    case "support_staff":
      return "Destek Elemanı";
    case "employer_representative":
      return "İşveren Vekili";
    case "viewer":
      return "Görüntüleyici";
    default:
      return role;
  }
}

function employmentTypeLabel(value: string) {
  switch (value) {
    case "direct":
      return "Doğrudan";
    case "osgb":
      return "OSGB";
    case "external":
      return "Harici";
    case "internal":
      return "İç Kaynak";
    default:
      return value;
  }
}

function statusClass(status: string) {
  switch (status) {
    case "active":
    case "approved":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":
      return "border border-amber-200 bg-amber-50 text-amber-700";
    case "rejected":
    case "inactive":
      return "border border-red-200 bg-red-50 text-red-700";
    default:
      return "border border-slate-200 bg-slate-50 text-slate-700";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "active":
      return "Aktif";
    case "approved":
      return "Onaylandı";
    case "pending":
      return "Bekliyor";
    case "rejected":
      return "Reddedildi";
    case "inactive":
      return "Pasif";
    default:
      return status;
  }
}

function shortUserId(value: string) {
  if (!value) return "-";
  if (value.length <= 10) return value;
  return `${value.slice(0, 8)}...`;
}

export function CompanySharedOpsPanel({
  company,
  onSharedLinkChange,
}: CompanySharedOpsPanelProps) {
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
    if (!supabase) {
      setIdentity(null);
      setMemberships([]);
      setPendingRequests([]);
      return;
    }

    if (!hasSharedReference) {
      setIdentity(null);
      setMemberships([]);
      setPendingRequests([]);
      return;
    }

    setIsLoading(true);
    setMessage("");
    setMessageType("");

    try {
      let resolvedIdentityId = company.sharedCompanyIdentityId ?? "";
      const resolvedWorkspaceId = company.sharedWorkspaceId ?? "";

      if (!resolvedIdentityId && resolvedWorkspaceId) {
        const { data: workspaceRow, error: workspaceError } = await supabase
          .from("company_workspaces")
          .select("id, company_identity_id")
          .eq("id", resolvedWorkspaceId)
          .single();

        if (workspaceError) {
          throw new Error(workspaceError.message);
        }

        resolvedIdentityId = workspaceRow.company_identity_id;
      }

      if (!resolvedIdentityId && company.sharedCompanyCode) {
        const { data: lookupRows, error: lookupError } = await supabase.rpc(
          "find_company_by_code",
          {
            p_company_code: company.sharedCompanyCode,
          },
        );

        if (lookupError) {
          throw new Error(lookupError.message);
        }

        const first = lookupRows?.[0];
        if (!first) {
          throw new Error("Firma kodu bulundu ancak erişilebilir kayıt alınamadı.");
        }

        resolvedIdentityId = first.company_identity_id;
      }

      if (!resolvedIdentityId) {
        throw new Error("Firma için ortak kimlik bilgisi çözümlenemedi.");
      }

      const { data: identityRow, error: identityError } = await supabase
        .from("company_identities")
        .select(
          "id, company_code, official_name, sector, nace_code, hazard_class, city, district, address, approval_mode, is_active",
        )
        .eq("id", resolvedIdentityId)
        .single();

      if (identityError) {
        throw new Error(identityError.message);
      }

      const { data: membershipRows, error: membershipsError } = await supabase
        .from("company_memberships")
        .select(
          "id, user_id, membership_role, employment_type, status, can_approve_join_requests, is_primary_contact, approved_at, notes",
        )
        .eq("company_identity_id", resolvedIdentityId)
        .order("created_at", { ascending: true });

      if (membershipsError) {
        throw new Error(membershipsError.message);
      }

      const userIds = (membershipRows ?? []).map((item) => item.user_id);
      let profilesByUserId = new Map<string, SharedProfileRow>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("auth_user_id, full_name, title, email")
          .in("auth_user_id", userIds);

        profilesByUserId = new Map(
          (profiles ?? []).map((profile) => [profile.auth_user_id, profile]),
        );
      }

      const membershipView: SharedMembershipView[] = (membershipRows ?? []).map((item) => {
        const profile = profilesByUserId.get(item.user_id);

        return {
          ...item,
          full_name: profile?.full_name ?? null,
          title: profile?.title ?? null,
          email: profile?.email ?? null,
        };
      });

      const { data: joinRows, error: joinError } = await supabase
        .from("company_join_requests")
        .select(
          "id, request_code, requesting_user_id, requested_role, requested_employment_type, status, note, created_at",
        )
        .eq("company_identity_id", resolvedIdentityId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (joinError) {
        throw new Error(joinError.message);
      }

      setIdentity(identityRow);
      setMemberships(membershipView);
      setPendingRequests(joinRows ?? []);

      onSharedLinkChange({
        sharedCompanyCode: identityRow.company_code,
        sharedCompanyIdentityId: identityRow.id,
        sharedWorkspaceId: company.sharedWorkspaceId,
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : "Ortak çalışma bilgileri alınamadı.";
      setMessage(text);
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  }, [
    company.sharedCompanyCode,
    company.sharedCompanyIdentityId,
    company.sharedWorkspaceId,
    hasSharedReference,
    onSharedLinkChange,
    supabase,
  ]);

  useEffect(() => {
    void loadSharedSnapshot();
  }, [loadSharedSnapshot]);

  async function handleCreateSharedIdentity() {
    if (!supabase) {
      setMessage("Supabase bağlantısı hazır değil.");
      setMessageType("error");
      return;
    }
    setIsCreatingIdentity(true);
    setMessage("");
    setMessageType("");

    try {
      const { data: workspaceId, error } = await supabase.rpc(
        "create_company_identity_with_workspace",
        {
          p_official_name: company.name,
          p_sector: company.sector ?? null,
          p_nace_code: company.naceCode ?? null,
          p_hazard_class: company.hazardClass ?? null,
          p_address: company.address ?? null,
          p_display_name: company.shortName || company.name,
          p_notes: `${company.name} için firma çalışma alanı üzerinden oluşturuldu.`,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!workspaceId) {
        throw new Error("Ortak firma kimliği oluşturuldu ancak çalışma alanı bilgisi alınamadı.");
      }

      const { data: workspaceRow, error: workspaceError } = await supabase
        .from("company_workspaces")
        .select("id, company_identity_id")
        .eq("id", workspaceId)
        .single();

      if (workspaceError) {
        throw new Error(workspaceError.message);
      }

      const { data: identityRow, error: identityError } = await supabase
        .from("company_identities")
        .select("id, company_code")
        .eq("id", workspaceRow.company_identity_id)
        .single();

      if (identityError) {
        throw new Error(identityError.message);
      }

      onSharedLinkChange({
        sharedWorkspaceId: workspaceRow.id,
        sharedCompanyIdentityId: identityRow.id,
        sharedCompanyCode: identityRow.company_code,
      });

      setMessage("Firma için ortak çalışma kimliği oluşturuldu.");
      setMessageType("success");

      await loadSharedSnapshot();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Firma kimliği oluşturulamadı.";
      setMessage(text);
      setMessageType("error");
    } finally {
      setIsCreatingIdentity(false);
    }
  }

  async function handleApproveJoinRequest(requestId: string) {
    if (!supabase) {
      setMessage("Supabase bağlantısı hazır değil.");
      setMessageType("error");
      return;
    }
    setProcessingRequestId(requestId);
    setMessage("");
    setMessageType("");

    try {
      const { error } = await supabase.rpc("approve_company_join_request", {
        p_join_request_id: requestId,
        p_decision_note: null,
      });

      if (error) {
        throw new Error(error.message);
      }

      setMessage("Katılım talebi onaylandı.");
      setMessageType("success");
      await loadSharedSnapshot();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Onay işlemi başarısız.";
      setMessage(text);
      setMessageType("error");
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function handleRejectJoinRequest(requestId: string) {
    if (!supabase) {
      setMessage("Supabase bağlantısı hazır değil.");
      setMessageType("error");
      return;
    }
    setProcessingRequestId(requestId);
    setMessage("");
    setMessageType("");

    try {
      const { error } = await supabase.rpc("reject_company_join_request", {
        p_join_request_id: requestId,
        p_decision_note: null,
      });

      if (error) {
        throw new Error(error.message);
      }

      setMessage("Katılım talebi reddedildi.");
      setMessageType("success");
      await loadSharedSnapshot();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Red işlemi başarısız.";
      setMessage(text);
      setMessageType("error");
    } finally {
      setProcessingRequestId(null);
    }
  }

  return (
    <div className="space-y-5">
      {supabaseUnavailable ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
          <h3 className="text-lg font-semibold text-amber-800">
            Supabase bağlantısı hazır değil
          </h3>
          <p className="mt-2 text-sm leading-7 text-amber-700">
            NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY bulunamadığı için
            ortak firma çalışma alanı paneli yüklenemedi. Ana firma sayfası çalışmaya devam eder.
          </p>
        </div>
      ) : null}
      <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                Firma kimliği ve ortak çalışma alanı
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Aynı işyerine bakan uzman, işyeri hekimi ve diğer sağlık personeli
                bu ortak firma kimliği üzerinden bağlanır. Böylece risk analizi,
                DÖF, takip ve operasyon kayıtları aynı merkezde koordine edilir.
              </p>
            </div>

            {identity ? (
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Firma Kodu: {identity.company_code}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                  Onay Modu: {identity.approval_mode}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    identity.is_active
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {identity.is_active ? "Aktif" : "Pasif"}
                </span>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm leading-7 text-slate-600">
                Bu firma için henüz ortak çalışma kimliği oluşturulmamış. Oluşturduktan sonra
                diğer kullanıcılar firma kodu ile erişim talebi gönderebilir.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {!identity ? (
              <Button
                type="button"
                size="lg"
                onClick={handleCreateSharedIdentity}
                disabled={isCreatingIdentity}
              >
                {isCreatingIdentity ? "Oluşturuluyor..." : "Ortak Firma Kimliği Oluştur"}
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={() => void loadSharedSnapshot()}
                disabled={isLoading}
              >
                {isLoading ? "Yenileniyor..." : "Bilgileri Yenile"}
              </Button>
            )}
          </div>
        </div>

        {message ? (
          <div
            className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${
              messageType === "success"
                ? "border border-green-200 bg-green-50 text-green-700"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message}
          </div>
        ) : null}
      </div>

      {identity ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
              <h3 className="text-base font-semibold text-slate-950">Firma kimliği özeti</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Resmî Ad
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {identity.official_name}
                  </p>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Firma Kodu
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {identity.company_code}
                  </p>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Sektör
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {identity.sector || "-"}
                  </p>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    NACE
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {identity.nace_code || "-"}
                  </p>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Tehlike Sınıfı
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {identity.hazard_class || "-"}
                  </p>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Şehir / İlçe
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {[identity.city, identity.district].filter(Boolean).join(" / ") || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
              <h3 className="text-base font-semibold text-slate-950">Ortak ekip özeti</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Toplam Bağlı Kişi
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {memberships.length}
                  </p>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Bekleyen Talep
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {pendingRequests.length}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                Bu kodu paylaşarak başka uzmanlar, hekimler veya diğer sağlık personeli
                aynı firmaya erişim talebi gönderebilir.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Bağlı kişiler</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Bu firmaya bağlı uzman, hekim ve diğer kullanıcılar burada görünür.
                </p>
              </div>
            </div>

            {memberships.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm leading-7 text-slate-600">
                Henüz bağlı kullanıcı kaydı görünmüyor.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {memberships.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-[20px] border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <p className="text-base font-semibold text-slate-950">
                          {member.full_name || shortUserId(member.user_id)}
                        </p>

                        <p className="text-sm leading-7 text-slate-600">
                          {roleLabel(member.membership_role)}
                          {member.title ? ` · ${member.title}` : ""}
                          {member.email ? ` · ${member.email}` : ""}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                            {employmentTypeLabel(member.employment_type)}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              member.status,
                            )}`}
                          >
                            {statusLabel(member.status)}
                          </span>

                          {member.is_primary_contact ? (
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              Ana İletişim
                            </span>
                          ) : null}

                          {member.can_approve_join_requests ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Onay Yetkisi
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="text-sm text-slate-500">
                        {member.approved_at
                          ? new Date(member.approved_at).toLocaleDateString("tr-TR")
                          : "-"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
            <h3 className="text-base font-semibold text-slate-950">Bekleyen erişim talepleri</h3>

            {pendingRequests.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm leading-7 text-slate-600">
                Bekleyen erişim talebi yok.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-[20px] border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-2">
                        <p className="text-base font-semibold text-slate-950">
                          Talep Kodu: {request.request_code}
                        </p>

                        <p className="text-sm leading-7 text-slate-600">
                          Rol: {roleLabel(request.requested_role)} · Çalışma Türü:{" "}
                          {employmentTypeLabel(request.requested_employment_type)}
                        </p>

                        <p className="text-sm leading-7 text-slate-600">
                          Talep Eden Kullanıcı: {shortUserId(request.requesting_user_id)}
                        </p>

                        <p className="text-sm leading-7 text-slate-600">
                          Not: {request.note || "-"}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={processingRequestId === request.id}
                          onClick={() => void handleRejectJoinRequest(request.id)}
                        >
                          {processingRequestId === request.id ? "İşleniyor..." : "Reddet"}
                        </Button>

                        <Button
                          type="button"
                          disabled={processingRequestId === request.id}
                          onClick={() => void handleApproveJoinRequest(request.id)}
                        >
                          {processingRequestId === request.id ? "İşleniyor..." : "Onayla"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}










