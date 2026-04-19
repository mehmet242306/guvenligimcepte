"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusAlert } from "@/components/ui/status-alert";
import { setActiveWorkspace, setLocalWorkspaceContext } from "@/lib/supabase/workspace-api";

type CountryOption = {
  code: string;
  name: string;
  defaultLanguage: string;
  timezone: string;
  suggestedWorkspaceName: string;
};

type RoleOption = {
  value: string;
  label: string;
};

type CertificationOption = {
  id: string;
  countryCode: string;
  roleKey: string;
  code: string;
  name: string;
  issuer: string;
  level: string | null;
};

type ExistingMembership = {
  id: string;
  roleKey: string;
  certificationId: string | null;
  isPrimary: boolean;
  workspace: {
    id: string;
    name: string;
    country_code: string;
    default_language: string;
    timezone: string;
  };
};

type OnboardingPayload = {
  profile: {
    id: string;
    fullName: string | null;
    activeWorkspaceId: string | null;
  };
  organization: {
    id: string;
    name: string;
    countryCode: string | null;
  };
  countries: CountryOption[];
  recommendedCountryCode: string;
  roleOptions: RoleOption[];
  certifications: CertificationOption[];
  warnings?: string[];
  memberships: ExistingMembership[];
};

const selectClassName =
  "h-12 w-full appearance-none rounded-2xl border border-border bg-card px-4 pr-10 text-sm text-slate-950 shadow-[var(--shadow-soft)] transition-colors transition-shadow hover:border-primary/40 focus-visible:border-primary focus-visible:shadow-[0_0_0_4px_var(--ring)] dark:bg-slate-950 dark:text-slate-100 dark:[color-scheme:dark] [&_option]:bg-white [&_option]:text-slate-950 dark:[&_option]:bg-slate-950 dark:[&_option]:text-slate-100";

export function WorkspaceOnboardingClient({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payload, setPayload] = useState<OnboardingPayload | null>(null);
  const [countryCode, setCountryCode] = useState("TR");
  const [roleKey, setRoleKey] = useState("safety_professional");
  const [certificationId, setCertificationId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceNameDirty, setWorkspaceNameDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger" | "info"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage(null);

      try {
        const response = await fetch("/api/workspaces/onboarding", {
          method: "GET",
          credentials: "include",
        });

        const json = (await response.json()) as OnboardingPayload | { error?: string };
        if (!response.ok) {
          throw new Error("error" in json ? json.error || "Workspace onboarding verisi alinamadi." : "Workspace onboarding verisi alinamadi.");
        }

        if (cancelled) return;
        const data = json as OnboardingPayload;
        setPayload(data);
        const nextCountryCode =
          data.countries.find((item) => item.code === data.recommendedCountryCode)?.code ??
          data.countries[0]?.code ??
          "TR";
        const nextRoleKey =
          data.roleOptions.find((item) => item.value === "safety_professional")?.value ??
          data.roleOptions[0]?.value ??
          "viewer";

        setCountryCode(nextCountryCode);
        setRoleKey(nextRoleKey);
      } catch (error) {
        if (!cancelled) {
          setMessage({
            tone: "danger",
            text: error instanceof Error ? error.message : "Workspace onboarding verisi alinamadi.",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCountry = useMemo(
    () => payload?.countries.find((item) => item.code === countryCode) ?? null,
    [countryCode, payload],
  );

  const availableCertifications = useMemo(
    () =>
      (payload?.certifications ?? []).filter(
        (item) => item.countryCode === countryCode && item.roleKey === roleKey,
      ),
    [countryCode, payload, roleKey],
  );

  const missingWorkspaceTables = useMemo(
    () =>
      (payload?.warnings ?? []).some((item) =>
        item.toLowerCase().includes("workspace tablolar"),
      ),
    [payload],
  );

  useEffect(() => {
    if (!selectedCountry) return;
    if (!workspaceNameDirty) {
      setWorkspaceName(selectedCountry.suggestedWorkspaceName);
    }
  }, [selectedCountry, workspaceNameDirty]);

  useEffect(() => {
    setCertificationId("");
  }, [countryCode, roleKey]);

  useEffect(() => {
    if (!payload?.countries?.length) return;
    if (!payload.countries.some((item) => item.code === countryCode)) {
      setCountryCode(payload.countries[0].code);
    }
  }, [countryCode, payload]);

  useEffect(() => {
    if (!payload?.roleOptions?.length) return;
    if (!payload.roleOptions.some((item) => item.value === roleKey)) {
      setRoleKey(payload.roleOptions[0].value);
    }
  }, [payload, roleKey]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payload) return;

    setSubmitting(true);
    setMessage(null);

    try {
      if (missingWorkspaceTables) {
        const selectedCountry =
          payload.countries.find((item) => item.code === countryCode) ?? null;

        setLocalWorkspaceContext({
          id: `local-${countryCode}`,
          organizationId: payload.organization.id,
          countryCode,
          name: workspaceName || selectedCountry?.suggestedWorkspaceName || "Yerel Workspace",
          defaultLanguage: selectedCountry?.defaultLanguage || "tr",
          timezone: selectedCountry?.timezone || "Europe/Istanbul",
          roleKey,
          certificationId: certificationId || null,
          isPrimary: true,
        });

        setMessage({
          tone: "info",
          text: "Workspace tabloları bu veritabanında henüz yok. Seçimin yerel bağlam olarak kaydedildi; Nova seçtiğin ülke ile çalışacak.",
        });

        router.refresh();
        router.replace(nextPath || "/solution-center");
        return;
      }

      const response = await fetch("/api/workspaces/onboarding", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode,
          roleKey,
          certificationId: certificationId || null,
          workspaceName,
          makePrimary: true,
        }),
      });

      const json = (await response.json()) as {
        ok?: boolean;
        error?: string;
        mode?: "local_fallback";
        warning?: string;
        workspace?: {
          id: string;
          name: string;
          countryCode: string;
          defaultLanguage: string;
          timezone: string;
        };
      };
      if (!response.ok || !json.ok || !json.workspace?.id) {
        throw new Error(json.error || "Workspace kurulumu tamamlanamadi.");
      }

      if (json.mode === "local_fallback") {
        setLocalWorkspaceContext({
          id: json.workspace.id,
          organizationId: payload.organization.id,
          countryCode: json.workspace.countryCode,
          name: json.workspace.name,
          defaultLanguage: json.workspace.defaultLanguage,
          timezone: json.workspace.timezone,
          roleKey,
          certificationId: certificationId || null,
          isPrimary: true,
        });
      }

      setMessage({
        tone: json.mode === "local_fallback" ? "info" : "success",
        text:
          json.mode === "local_fallback"
            ? json.warning ||
              `${json.workspace.name} yerel workspace baglami olarak hazirlandi. Nova secilen jurisdiction ile calisacak.`
            : `${json.workspace.name} hazirlandi. Nova artik bu jurisdiction ile calisacak.`,
      });

      router.refresh();
      router.replace(nextPath || "/solution-center");
    } catch (error) {
      setMessage({
        tone: "danger",
        text: error instanceof Error ? error.message : "Workspace kurulumu tamamlanamadi.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleActivateExisting(workspaceId: string) {
    setMessage(null);
    const ok = await setActiveWorkspace(workspaceId);
    if (!ok) {
      setMessage({
        tone: "danger",
        text: "Mevcut workspace aktif yapilamadi.",
      });
      return;
    }

    router.refresh();
    router.replace(nextPath || "/solution-center");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Workspace Setup"
          title="Ilk jurisdiction alani hazirlaniyor"
          description="Hukuki retrieval, tenant-private mevzuat ve Nova RAG baglamini workspace ustunden kuruyoruz."
        />
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
              <p className="text-sm text-muted-foreground">Onboarding verisi yukleniyor...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Workspace Setup"
          title="Workspace baglami henuz hazir degil"
          description="Workspace sistemi migration veya profil baglami eksik oldugu icin onboarding verisi okunamadi."
        />
        {message ? <StatusAlert tone={message.tone}>{message.text}</StatusAlert> : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Jurisdiction Setup"
        title="Workspace ve mevzuat baglamini tamamla"
        description="Her workspace tek bir ulke/jurisdiction baglamina oturur. Resmi mevzuat cekirdegi sabit kalir; istersen sonrasinda kendi tenant-private dokumanlarini da yuklersin."
      />

      {message ? <StatusAlert tone={message.tone}>{message.text}</StatusAlert> : null}
      {payload.warnings?.map((warning) => (
        <StatusAlert key={warning} tone="info">
          {warning}
        </StatusAlert>
      ))}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Yeni workspace olustur</CardTitle>
            <CardDescription>
              Ulke, rol ve varsa sertifikani sec. Bu secim Nova retrieval filtresini, default dili ve tenant-private hukuk kutuphanesini belirler.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="countryCode">
                    Ulke
                  </label>
                  <div className="relative">
                    <select
                      id="countryCode"
                      className={selectClassName}
                      value={countryCode}
                      onChange={(event) => setCountryCode(event.target.value)}
                    >
                      {(payload?.countries ?? []).map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.name} ({option.code})
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500 dark:text-slate-300">
                      ▾
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="roleKey">
                    Rol
                  </label>
                  <div className="relative">
                    <select
                      id="roleKey"
                      className={selectClassName}
                      value={roleKey}
                      onChange={(event) => setRoleKey(event.target.value)}
                    >
                      {(payload?.roleOptions ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500 dark:text-slate-300">
                      ▾
                    </span>
                  </div>
                </div>
              </div>

              <Input
                id="workspaceName"
                label="Workspace adi"
                value={workspaceName}
                onChange={(event) => {
                  setWorkspaceNameDirty(true);
                  setWorkspaceName(event.target.value);
                }}
                hint={
                  selectedCountry
                    ? `${selectedCountry.defaultLanguage.toUpperCase()} dili ve ${selectedCountry.timezone} saat dilimi ile acilacak.`
                    : undefined
                }
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="certificationId">
                  Sertifika
                </label>
                <div className="relative">
                  <select
                    id="certificationId"
                    className={selectClassName}
                    value={certificationId}
                    onChange={(event) => setCertificationId(event.target.value)}
                  >
                    <option value="">Sertifika secmeden devam et</option>
                    {availableCertifications.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.code} - {option.name}
                        {option.level ? ` (${option.level})` : ""} - {option.issuer}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500 dark:text-slate-300">
                    ▾
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sertifika opsiyonel. Secersen ekip rolunu ve jurisdiction bazli yetkinligi daha net etiketleriz.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                Bu adimdan sonra Settings / Mevzuat Senkronizasyonu alanindan kendi kurumsal mevzuat, talimat ve rehberlerini yukleyip tenant-private RAG katmanini aktive edebilirsin.
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => router.replace(nextPath || "/dashboard")}>
                  Sonra tamamlarim
                </Button>
                <Button type="submit" disabled={submitting || workspaceName.trim().length < 3}>
                  {submitting ? "Workspace kuruluyor..." : "Workspace'i hazirla"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bu kurulum ne saglar?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Resmi mevzuat retrieval'i secilen jurisdiction ile filtrelenir.</p>
              <p>Tenant-private dokumanlar sadece bu workspace icinde gorunur.</p>
              <p>Official ve private kaynaklar cevapta ayri etiketlenir; private dokumanlar resmi hukuku override etmez.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mevcut workspace alanlari</CardTitle>
              <CardDescription>
                Bos degilsen mevcut bir workspace'i aktif edip devam edebilirsin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(payload?.memberships ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Henuz bir workspace yok. Ilk jurisdiction alanini burada kuracagiz.
                </p>
              ) : (
                payload?.memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="rounded-2xl border border-border bg-secondary/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {membership.workspace.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {membership.workspace.country_code} · {membership.roleKey}
                          {membership.isPrimary ? " · primary" : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleActivateExisting(membership.workspace.id)}
                      >
                        Aktif yap
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
