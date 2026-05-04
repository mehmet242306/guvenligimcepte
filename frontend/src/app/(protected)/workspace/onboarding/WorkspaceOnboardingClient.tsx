"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OhsLoadingIndicator } from "@/components/ui/ohs-loading-indicator";
import { PageHeader } from "@/components/ui/page-header";
import { StatusAlert } from "@/components/ui/status-alert";
import { Textarea } from "@/components/ui/textarea";
import { hasAccountTypeAccess } from "@/lib/account/account-type-access";
import type { AccountContextPayload } from "@/lib/account/account-api";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
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

type LanguageOption = {
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

type WorkspaceCompanyProfile = {
  companyWorkspaceId: string | null;
  name: string;
  shortName: string;
  kind: string;
  companyType: string;
  address: string;
  city: string;
  district: string;
  sector: string;
  naceCode: string;
  hazardClass: string;
  taxNumber: string;
  taxOffice: string;
  sgkWorkplaceNumber: string;
  fax: string;
  employerTitle: string;
  employeeCount: number;
  shiftModel: string;
  phone: string;
  email: string;
  contactPerson: string;
  employerName: string;
  employerRepresentative: string;
  notes: string;
  locations: string[];
  departments: string[];
};

type ExistingMembership = {
  id: string;
  roleKey: string;
  certificationId: string | null;
  isPrimary: boolean;
  companyWorkspaceId?: string | null;
  companyProfile?: WorkspaceCompanyProfile | null;
  workspace: {
    id: string;
    organization_id: string;
    country_code: string;
    name: string;
    default_language: string;
    timezone: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
};

type OnboardingPayload = {
  profile: {
    id: string;
    fullName: string | null;
    email: string | null;
    title: string | null;
    phone: string | null;
    activeWorkspaceId: string | null;
  };
  organization: {
    id: string;
    name: string;
    countryCode: string | null;
  };
  countries: CountryOption[];
  recommendedCountryCode: string;
  recommendedLanguage?: string | null;
  recommendedRole?: string | null;
  roleOptions: RoleOption[];
  languageOptions: LanguageOption[];
  certifications: CertificationOption[];
  warnings?: string[];
  memberships: ExistingMembership[];
};

type AccountUsage = {
  maxActiveWorkspaces: number | null;
  maxActiveStaffSeats: number | null;
  hasPersonnelModule: boolean;
  hasTaskTracking: boolean;
  hasAnnouncements: boolean;
  contactRequired: boolean;
  activeWorkspaceCount: number;
  activeStaffCount: number;
};

type AccountContextResponse =
  | {
      ok?: boolean;
      error?: string;
      context?: AccountContextPayload;
      usage?: AccountUsage | null;
      redirectPath?: string;
    }
  | {
      error?: string;
    };

type AccountOnboardingResponse = {
  ok?: boolean;
  error?: string;
  redirectPath?: string;
};

const LANGUAGE_LABEL_KEYS: Record<string, string> = {
  tr: "tr",
  en: "en",
  de: "de",
  fr: "fr",
  es: "es",
  ru: "ru",
  az: "az",
  ar: "ar",
  hi: "hi",
  id: "id",
  ja: "ja",
  ko: "ko",
  zh: "zh",
};

const ROLE_LABEL_KEYS: Record<string, string> = {
  safety_professional: "safetyProfessional",
  workplace_doctor: "workplaceDoctor",
  employer: "employer",
  employer_representative: "employerRepresentative",
  employee_representative: "employeeRepresentative",
  viewer: "viewer",
  admin: "admin",
};

type WorkspaceOnboardingResponse = {
  ok?: boolean;
  error?: string;
  mode?: "local_fallback";
  warning?: string;
  companyWarning?: string | null;
  membershipId?: string | null;
  companyWorkspaceId?: string | null;
  companyProfile?: WorkspaceCompanyProfile | null;
  workspace?: {
    id: string;
    name: string;
    countryCode: string;
    defaultLanguage: string;
    timezone: string;
  };
};

async function readJsonSafely<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();
  if (!raw.trim()) return null;
  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`timeout_${label}`));
    }, ms);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

async function buildAuthHeaders(base: HeadersInit = {}) {
  const headers = new Headers(base);
  const supabase = createBrowserSupabaseClient();
  const session = supabase
    ? (await withTimeout(supabase.auth.getSession(), 8000, "auth_session")).data.session
    : null;

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return headers;
}

function normalizeOnboardingError(
  error: unknown,
  fallback: string,
  t?: ReturnType<typeof useTranslations>,
) {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  if (normalized.startsWith("timeout_")) {
    return t ? t("errors.timeout") : fallback;
  }

  if (normalized.includes("failed to fetch")) {
    return t ? t("errors.fetchFailed") : fallback;
  }

  if (
    normalized.includes("schema cache") ||
    normalized.includes("does not exist") ||
    normalized.includes("relation")
  ) {
    return t ? t("errors.schemaMissing") : fallback;
  }

  return message || fallback;
}

const selectClassName =
  "h-12 w-full appearance-none rounded-2xl border border-border bg-card px-4 pr-10 text-sm text-slate-950 shadow-[var(--shadow-soft)] transition-colors transition-shadow hover:border-primary/40 focus-visible:border-primary focus-visible:shadow-[0_0_0_4px_var(--ring)] dark:bg-slate-950 dark:text-slate-100 dark:[color-scheme:dark] [&_option]:bg-white [&_option]:text-slate-950 dark:[&_option]:bg-slate-950 dark:[&_option]:text-slate-100";

function createEmptyCompanyProfile(workspaceName = ""): WorkspaceCompanyProfile {
  return {
    companyWorkspaceId: null,
    name: workspaceName,
    shortName: workspaceName,
    kind: "Ozel Sektor",
    companyType: "bagimsiz",
    address: "",
    city: "",
    district: "",
    sector: "",
    naceCode: "",
    hazardClass: "",
    taxNumber: "",
    taxOffice: "",
    sgkWorkplaceNumber: "",
    fax: "",
    employerTitle: "",
    employeeCount: 0,
    shiftModel: "",
    phone: "",
    email: "",
    contactPerson: "",
    employerName: "",
    employerRepresentative: "",
    notes: "",
    locations: [],
    departments: [],
  };
}

function normalizeStringListText(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function listToTextarea(value: string[]) {
  return value.join("\n");
}

function formatPlanLabel(planCode: string | null | undefined, t: ReturnType<typeof useTranslations>) {
  switch (planCode) {
    case "individual_free":
      return t("plans.individualFree");
    case "osgb_starter":
      return t("plans.osgbStarter");
    case "enterprise":
      return t("plans.enterprise");
    default:
      return t("plans.unknown");
  }
}

function workspaceStateLabel(
  membership: ExistingMembership,
  activeWorkspaceId: string | null,
  selectedWorkspaceId: string | null,
  t: ReturnType<typeof useTranslations>,
) {
  if (membership.workspace.id === selectedWorkspaceId) return t("state.selected");
  if (membership.workspace.id === activeWorkspaceId) return t("state.active");
  if (membership.isPrimary) return t("state.default");
  return t("state.ready");
}

function goToWorkspaceLabel(
  membership: ExistingMembership | null,
  activeWorkspaceId: string | null,
  t: ReturnType<typeof useTranslations>,
) {
  if (!membership) return t("goToWorkspace");
  return membership.workspace.id === activeWorkspaceId
    ? t("goToWorkspace")
    : t("activateAndGo");
}

export function WorkspaceOnboardingClient({
  nextPath,
  initialMessage,
}: {
  nextPath?: string;
  initialMessage?: string;
}) {
  const t = useTranslations("workspaceOnboarding");
  const router = useRouter();
  const [accountLoading, setAccountLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [accountContext, setAccountContext] = useState<AccountContextPayload | null>(null);
  const [accountUsage, setAccountUsage] = useState<AccountUsage | null>(null);
  const [payload, setPayload] = useState<OnboardingPayload | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState("TR");
  const [defaultLanguage, setDefaultLanguage] = useState("tr");
  const [roleKey, setRoleKey] = useState("safety_professional");
  const [certificationId, setCertificationId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceNameDirty, setWorkspaceNameDirty] = useState(false);
  const [companyNameDirty, setCompanyNameDirty] = useState(false);
  const [companyShortNameDirty, setCompanyShortNameDirty] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<WorkspaceCompanyProfile>(
    createEmptyCompanyProfile(),
  );
  const [accountType, setAccountType] = useState<"individual" | "osgb" | "enterprise">("individual");
  const [accountName, setAccountName] = useState("");
  const [enterpriseForm, setEnterpriseForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    message: "",
    estimatedEmployeeCount: "",
    estimatedLocationCount: "",
  });
  const [message, setMessage] = useState<{ tone: "success" | "danger" | "info"; text: string } | null>(
    initialMessage ? { tone: "success", text: initialMessage } : null,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setAccountLoading(true);
      setLoading(true);
      setMessage(initialMessage ? { tone: "success", text: initialMessage } : null);

      try {
        const accountResponse = await withTimeout(
          fetch("/api/account/context", {
            method: "GET",
            credentials: "include",
            headers: await buildAuthHeaders(),
            cache: "no-store",
          }),
          10000,
          "account_context",
        );

        const accountJson = await readJsonSafely<AccountContextResponse>(accountResponse);
        if (!accountResponse.ok || !accountJson || !("context" in accountJson) || !accountJson.context) {
          throw new Error(
            accountJson && "error" in accountJson
              ? accountJson.error || t("errors.accountContextFailed")
              : t("errors.accountContextFailed"),
          );
        }

        if (cancelled) return;
        setAccountContext(accountJson.context);
        setAccountUsage("usage" in accountJson ? accountJson.usage ?? null : null);

        if (accountJson.context.isPlatformAdmin) {
          router.replace("/platform-admin");
          return;
        }

        if (!accountJson.context.accountType) {
          setAccountLoading(false);
          setLoading(false);
          return;
        }

        const response = await withTimeout(
          fetch("/api/workspaces/onboarding", {
            method: "GET",
            credentials: "include",
            headers: await buildAuthHeaders(),
            cache: "no-store",
          }),
          10000,
          "workspace_onboarding",
        );

        const json = await readJsonSafely<OnboardingPayload | { error?: string }>(response);
        if (!response.ok || !json || ("error" in json && json.error)) {
          throw new Error(
            json && "error" in json ? json.error || t("errors.workspaceDataFailed") : t("errors.workspaceDataFailed"),
          );
        }

        if (cancelled) return;
        const nextPayload = json as OnboardingPayload;
        setPayload(nextPayload);

        let firstWorkspaceId: string | null = null;
        if (nextPayload.memberships.length > 0) {
          const activeId = nextPayload.profile.activeWorkspaceId;
          const activeMatches = Boolean(
            activeId && nextPayload.memberships.some((m) => m.workspace.id === activeId),
          );
          firstWorkspaceId = activeMatches
            ? activeId
            : nextPayload.memberships[0]?.workspace.id ?? null;
        }
        setSelectedWorkspaceId(firstWorkspaceId);
      } catch (error) {
        if (!cancelled) {
          setMessage({
            tone: "danger",
            text: normalizeOnboardingError(error, t("errors.workspaceDataFailed"), t),
          });
        }
      } finally {
        if (!cancelled) {
          setAccountLoading(false);
          setLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [initialMessage, router]);

  const memberships = payload?.memberships ?? [];
  const workspaceLimit = accountUsage?.maxActiveWorkspaces ?? null;
  const canCreateWorkspace = workspaceLimit === null || memberships.length < workspaceLimit;
  const selectedMembership =
    memberships.find((membership) => membership.workspace.id === selectedWorkspaceId) ?? null;
  const selectedCountry =
    payload?.countries.find((country) => country.code === countryCode) ?? null;
  const availableCertifications = useMemo(
    () =>
      (payload?.certifications ?? []).filter(
        (item) => item.countryCode === countryCode && item.roleKey === roleKey,
      ),
    [countryCode, payload, roleKey],
  );
  const selectedLanguageOption =
    payload?.languageOptions.find((item) => item.value === defaultLanguage) ?? null;
  const missingWorkspaceTables = useMemo(
    () =>
      (payload?.warnings ?? []).some((item) =>
        item.toLowerCase().includes("workspace tablolari"),
      ),
    [payload],
  );
  const pendingWorkspaceSlots =
    workspaceLimit === null ? 0 : Math.max(workspaceLimit - memberships.length, 0);
  const needsAccountTypeSelection = !accountLoading && !accountContext?.accountType;
  const allowedAccountTypes = accountContext?.allowedAccountTypes ?? ["individual"];

  const languageLabel = (value: string, fallback: string) => {
    const key = LANGUAGE_LABEL_KEYS[value.toLowerCase()];
    return key ? t(`languages.${key}`) : fallback;
  };

  const roleLabel = (value: string, fallback: string) => {
    const key = ROLE_LABEL_KEYS[value];
    return key ? t(`roles.${key}`) : fallback;
  };

  function updateCompanyProfile(patch: Partial<WorkspaceCompanyProfile>) {
    setCompanyProfile((current) => ({ ...current, ...patch }));
  }

  useEffect(() => {
    if (!payload) return;

    if (selectedMembership) {
      setCountryCode(selectedMembership.workspace.country_code);
      setDefaultLanguage(selectedMembership.workspace.default_language);
      setRoleKey(selectedMembership.roleKey);
      setCertificationId(selectedMembership.certificationId ?? "");
      setWorkspaceName(selectedMembership.workspace.name);
      setWorkspaceNameDirty(false);
      setCompanyProfile(
        selectedMembership.companyProfile
          ? {
              ...selectedMembership.companyProfile,
              companyWorkspaceId:
                selectedMembership.companyWorkspaceId ??
                selectedMembership.companyProfile.companyWorkspaceId ??
                null,
            }
          : createEmptyCompanyProfile(selectedMembership.workspace.name),
      );
      setCompanyNameDirty(false);
      setCompanyShortNameDirty(false);
      return;
    }

    const nextCountryCode =
      payload.countries.find((item) => item.code === payload.recommendedCountryCode)?.code ??
      payload.countries[0]?.code ??
      "TR";
    const nextRoleKey =
      payload.roleOptions.find((item) => item.value === payload.recommendedRole)?.value ??
      payload.roleOptions.find((item) => item.value === "safety_professional")?.value ??
      payload.roleOptions[0]?.value ??
      "viewer";
    const nextLanguage =
      payload.languageOptions.find((item) => item.value === payload.recommendedLanguage)?.value ??
      payload.countries.find((item) => item.code === nextCountryCode)?.defaultLanguage ??
      payload.languageOptions[0]?.value ??
      "tr";

    setCountryCode(nextCountryCode);
    setDefaultLanguage(nextLanguage);
    setRoleKey(nextRoleKey);
    setCertificationId("");
    setWorkspaceName(
      payload.countries.find((item) => item.code === nextCountryCode)?.suggestedWorkspaceName ??
        "",
    );
    setWorkspaceNameDirty(false);
    setCompanyProfile(
      createEmptyCompanyProfile(
        payload.countries.find((item) => item.code === nextCountryCode)?.suggestedWorkspaceName ?? "",
      ),
    );
    setCompanyNameDirty(false);
    setCompanyShortNameDirty(false);
  }, [payload, selectedMembership]);

  useEffect(() => {
    if (!payload || !selectedCountry || selectedMembership) return;

    if (!workspaceNameDirty) {
      setWorkspaceName(selectedCountry.suggestedWorkspaceName);
    }
    setDefaultLanguage(selectedCountry.defaultLanguage);
  }, [payload, selectedCountry, selectedMembership, workspaceNameDirty]);

  const resolvedNextPath =
    nextPath && nextPath !== "/companies" && nextPath !== "/workspace/onboarding"
      ? nextPath
      : "/dashboard";

  useEffect(() => {
    setCertificationId((current) => {
      if (!current) return current;
      const stillAvailable = availableCertifications.some((item) => item.id === current);
      return stillAvailable ? current : "";
    });
  }, [availableCertifications]);

  useEffect(() => {
    if (!workspaceName.trim()) return;

    if (!companyNameDirty) {
      setCompanyProfile((current) => ({ ...current, name: workspaceName }));
    }

    if (!companyShortNameDirty) {
      setCompanyProfile((current) => ({ ...current, shortName: workspaceName }));
    }
  }, [companyNameDirty, companyShortNameDirty, workspaceName]);

  function updatePayloadAfterSave(
    savedWorkspace: NonNullable<WorkspaceOnboardingResponse["workspace"]>,
    membershipId?: string | null,
    savedCompanyProfile?: WorkspaceCompanyProfile | null,
    savedCompanyWorkspaceId?: string | null,
  ) {
    setPayload((current) => {
      if (!current) return current;

      const now = new Date().toISOString();
      const existing = current.memberships.find(
        (membership) =>
          membership.workspace.id === savedWorkspace.id || (membershipId ? membership.id === membershipId : false),
      );

      const nextMembership: ExistingMembership = {
        id: membershipId ?? existing?.id ?? `local-membership-${savedWorkspace.id}`,
        roleKey,
        certificationId: certificationId || null,
        isPrimary: true,
        companyWorkspaceId: savedCompanyWorkspaceId ?? savedCompanyProfile?.companyWorkspaceId ?? null,
        companyProfile: savedCompanyProfile ?? null,
        workspace: {
          id: savedWorkspace.id,
          organization_id: current.organization.id,
          country_code: savedWorkspace.countryCode,
          name: savedWorkspace.name,
          default_language: savedWorkspace.defaultLanguage,
          timezone: savedWorkspace.timezone,
          is_active: true,
          created_at: existing?.workspace.created_at ?? now,
          updated_at: now,
        },
      };

      const otherMemberships = current.memberships
        .filter((membership) => membership.workspace.id !== savedWorkspace.id)
        .map((membership) => ({ ...membership, isPrimary: false }));

      return {
        ...current,
        profile: {
          ...current.profile,
          activeWorkspaceId: savedWorkspace.id,
        },
        memberships: [nextMembership, ...otherMemberships],
      };
    });

    setSelectedWorkspaceId(savedWorkspace.id);
    setWorkspaceName(savedWorkspace.name);
    setWorkspaceNameDirty(false);
    if (savedCompanyProfile) {
      setCompanyProfile(savedCompanyProfile);
      setCompanyNameDirty(false);
      setCompanyShortNameDirty(false);
    }
  }

  async function handleAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/onboarding", {
        method: "POST",
        credentials: "include",
        headers: await buildAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          accountType,
          displayName: accountName || undefined,
          companyName: enterpriseForm.companyName || undefined,
          contactName: enterpriseForm.contactName || undefined,
          email: enterpriseForm.email || undefined,
          phone: enterpriseForm.phone || null,
          message: enterpriseForm.message || null,
          estimatedEmployeeCount: enterpriseForm.estimatedEmployeeCount
            ? Number(enterpriseForm.estimatedEmployeeCount)
            : null,
          estimatedLocationCount: enterpriseForm.estimatedLocationCount
            ? Number(enterpriseForm.estimatedLocationCount)
            : null,
        }),
      });

      const json = await readJsonSafely<AccountOnboardingResponse>(response);

      if (!response.ok || !json?.ok || !json.redirectPath) {
        throw new Error(json?.error || t("errors.accountTypeUnavailable"));
      }

      router.refresh();
      router.replace(json.redirectPath);
    } catch (error) {
      setMessage({
        tone: "danger",
        text: normalizeOnboardingError(error, t("errors.accountTypeFailed"), t),
      });
    } finally {
      setAccountSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payload) return;

    if (!selectedMembership && !canCreateWorkspace) {
      setMessage({
        tone: "info",
        text: t("messages.workspaceLimitReached"),
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      if (missingWorkspaceTables) {
        const localWorkspace = {
          id: selectedMembership?.workspace.id ?? `local-${countryCode}`,
          name:
            workspaceName || selectedCountry?.suggestedWorkspaceName || t("localWorkspaceName"),
          countryCode,
          defaultLanguage,
          timezone: selectedCountry?.timezone || "Europe/Istanbul",
        };

        setLocalWorkspaceContext({
          id: localWorkspace.id,
          organizationId: payload.organization.id,
          countryCode: localWorkspace.countryCode,
          name: localWorkspace.name,
          defaultLanguage: localWorkspace.defaultLanguage,
          timezone: localWorkspace.timezone,
          roleKey,
          certificationId: certificationId || null,
          isPrimary: true,
        });

        updatePayloadAfterSave(
          localWorkspace,
          `local-membership-${localWorkspace.id}`,
          companyProfile,
          companyProfile.companyWorkspaceId,
        );
        setMessage({
          tone: "info",
          text: t("messages.localFallback"),
        });
        router.refresh();
        return;
      }

      const response = await fetch("/api/workspaces/onboarding", {
        method: "POST",
        credentials: "include",
        headers: await buildAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          workspaceId: selectedMembership?.workspace.id ?? null,
          countryCode,
          defaultLanguage,
          roleKey,
          certificationId: certificationId || null,
          workspaceName,
          companyWorkspaceId:
            companyProfile.companyWorkspaceId ?? selectedMembership?.companyWorkspaceId ?? null,
          companyProfile: {
            ...companyProfile,
            locations: Array.from(new Set(companyProfile.locations.map((item) => item.trim()).filter(Boolean))),
            departments: Array.from(new Set(companyProfile.departments.map((item) => item.trim()).filter(Boolean))),
          },
          makePrimary: true,
        }),
      });

      const json = await readJsonSafely<WorkspaceOnboardingResponse>(response);
      if (!response.ok || !json?.ok || !json.workspace?.id) {
        throw new Error(json?.error || t("errors.workspaceSaveUnavailable"));
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

      updatePayloadAfterSave(
        json.workspace,
        json.membershipId,
        json.companyProfile ?? companyProfile,
        json.companyWorkspaceId ?? companyProfile.companyWorkspaceId,
      );
      setMessage({
        tone:
          json.mode === "local_fallback" || json.companyWarning
            ? "info"
            : "success",
        text:
          json.mode === "local_fallback"
            ? json.warning || t("messages.localContextUpdated", { name: json.workspace.name })
            : json.companyWarning
              ? json.companyWarning
            : t("messages.workspaceSaved", { name: json.workspace.name }),
      });

      router.refresh();

      router.replace(resolvedNextPath);
    } catch (error) {
      setMessage({
        tone: "danger",
        text: normalizeOnboardingError(error, t("errors.workspaceSaveFailed"), t),
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
        text: t("errors.activateFailed"),
      });
      return;
    }

    setPayload((current) =>
      current
        ? {
            ...current,
            profile: {
              ...current.profile,
              activeWorkspaceId: workspaceId,
            },
          }
        : current,
    );
    setSelectedWorkspaceId(workspaceId);
    router.refresh();
    router.replace(resolvedNextPath);
  }

  async function handleGoToWorkspace() {
    if (!payload) return;

    if (selectedMembership) {
      if (selectedMembership.workspace.id === payload.profile.activeWorkspaceId) {
        router.replace("/dashboard");
        return;
      }

      await handleActivateExisting(selectedMembership.workspace.id);
      return;
    }

    router.replace("/dashboard");
  }

  if (accountLoading || loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <OhsLoadingIndicator compact />
        </CardContent>
      </Card>
    );
  }

  if (needsAccountTypeSelection) {
    const optionClass =
      "rounded-3xl border border-border bg-card p-5 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[var(--shadow-elevated)]";
    const accountOptions = [
      {
        value: "individual" as const,
        title: t("account.options.individual.title"),
        description: t("account.options.individual.description"),
      },
      {
        value: "osgb" as const,
        title: t("account.options.osgb.title"),
        description: t("account.options.osgb.description"),
      },
      {
        value: "enterprise" as const,
        title: t("account.options.enterprise.title"),
        description: t("account.options.enterprise.description"),
      },
    ];

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("account.eyebrow")}
          title={t("account.title")}
          description={t("account.description")}
        />

        {message ? <StatusAlert tone={message.tone}>{message.text}</StatusAlert> : null}

        <Card>
          <CardHeader>
            <CardTitle>{t("account.cardTitle")}</CardTitle>
          <CardDescription>
              {t("account.cardDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={(event) => void handleAccountSubmit(event)}>
              <div className="rounded-2xl border border-border/70 bg-secondary/35 px-4 py-3 text-sm text-muted-foreground">
                {t("account.info")}
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {accountOptions.map((option) => {
                  const isAllowed = hasAccountTypeAccess(allowedAccountTypes, option.value);

                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={!isAllowed}
                      aria-disabled={!isAllowed}
                      className={`${optionClass} ${
                        accountType === option.value ? "ring-2 ring-primary" : ""
                      } ${
                        !isAllowed
                          ? "cursor-not-allowed border-dashed border-border/80 bg-muted/35 text-muted-foreground opacity-70 hover:translate-y-0 hover:border-border/80 hover:shadow-none"
                          : ""
                      }`}
                      onClick={() => {
                        if (!isAllowed) return;
                        setAccountType(option.value);
                      }}
                    >
                    <div className="text-base font-semibold text-foreground">{option.title}</div>
                    <p className="mt-2 text-sm text-muted-foreground">{option.description}</p>
                    {!isAllowed ? (
                      <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">
                        {t("account.adminApprovalRequired")}
                      </p>
                    ) : null}
                  </button>
                  );
                })}
              </div>

              <Input
                label={t("account.displayName")}
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
                placeholder={t("account.displayNamePlaceholder")}
              />

              {accountType === "enterprise" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label={t("account.companyName")}
                    value={enterpriseForm.companyName}
                    onChange={(event) =>
                      setEnterpriseForm((current) => ({ ...current, companyName: event.target.value }))
                    }
                  />
                  <Input
                    label={t("account.contactName")}
                    value={enterpriseForm.contactName}
                    onChange={(event) =>
                      setEnterpriseForm((current) => ({ ...current, contactName: event.target.value }))
                    }
                  />
                  <Input
                    label={t("common.email")}
                    type="email"
                    value={enterpriseForm.email}
                    onChange={(event) =>
                      setEnterpriseForm((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                  <Input
                    label={t("common.phone")}
                    value={enterpriseForm.phone}
                    onChange={(event) =>
                      setEnterpriseForm((current) => ({ ...current, phone: event.target.value }))
                    }
                  />
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={accountSubmitting}>
                  {accountSubmitting ? t("common.saving") : t("account.continue")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("eyebrow")}
          title={t("errors.dataTitle")}
          description={t("errors.dataDescription")}
        />
        {message ? <StatusAlert tone={message.tone}>{message.text}</StatusAlert> : null}
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-[2rem] border border-border bg-card/90 p-5 shadow-[var(--shadow-elevated)] backdrop-blur sm:p-6 xl:p-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        meta={
          <>
            <span className="rounded-full border border-border bg-secondary/45 px-3 py-1 text-xs font-semibold text-foreground">
              {t("meta.package", { plan: formatPlanLabel(accountContext?.currentPlanCode, t) })}
            </span>
            <span className="rounded-full border border-border bg-secondary/45 px-3 py-1 text-xs font-semibold text-foreground">
              {workspaceLimit === null
                ? t("meta.unlimited", { count: memberships.length })
                : t("meta.usage", { count: memberships.length, limit: workspaceLimit })}
            </span>
            <span className="rounded-full border border-border bg-secondary/45 px-3 py-1 text-xs font-semibold text-foreground">
              {payload.profile.activeWorkspaceId ? t("meta.activeSelected") : t("meta.selectionPending")}
            </span>
          </>
        }
        actions={
          selectedMembership ? (
            <Button
              type="button"
              onClick={() => void handleGoToWorkspace()}
              className="h-14 w-full min-w-0 rounded-2xl px-6 text-base font-bold shadow-[0_16px_34px_rgba(217,162,27,0.28)] sm:w-auto sm:min-w-[240px]"
            >
              {goToWorkspaceLabel(selectedMembership, payload.profile.activeWorkspaceId, t)}
            </Button>
          ) : null
        }
      />

      {message ? <StatusAlert tone={message.tone}>{message.text}</StatusAlert> : null}
      {payload.warnings?.map((warning) => (
        <StatusAlert key={warning} tone="info">
          {warning}
        </StatusAlert>
      ))}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="h-fit min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>{t("list.title")}</CardTitle>
            <CardDescription>
              {t("list.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {memberships.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
                {t("list.empty")}
              </div>
            ) : null}

            {memberships.map((membership) => {
              const isSelected = membership.workspace.id === selectedWorkspaceId;
              const isActive = membership.workspace.id === payload.profile.activeWorkspaceId;
              const stateLabel = workspaceStateLabel(
                membership,
                payload.profile.activeWorkspaceId,
                selectedWorkspaceId,
                t,
              );

              return (
                <button
                  key={membership.id}
                  type="button"
                  onClick={() => setSelectedWorkspaceId(membership.workspace.id)}
                  className={`w-full max-w-full rounded-3xl border p-4 text-left transition-all ${
                    isSelected
                      ? "border-primary/45 bg-primary/8 shadow-[0_14px_34px_rgba(15,23,42,0.10)]"
                      : "border-border bg-card hover:border-primary/30 hover:bg-secondary/20"
                  }`}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold text-foreground">
                        {membership.workspace.name}
                      </p>
                      <p className="mt-1 break-all text-xs leading-5 text-muted-foreground">
                        {membership.workspace.country_code} · {languageLabel(membership.workspace.default_language, membership.workspace.default_language.toUpperCase())} · {roleLabel(membership.roleKey, membership.roleKey)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground">
                      {stateLabel}
                    </span>
                  </div>

                  <div className="mt-3 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <span className="min-w-0 text-xs text-muted-foreground">
                      {isActive ? t("list.currentlyActive") : t("list.canSwitch")}
                    </span>
                    {!isActive ? (
                      <span className="text-xs font-semibold text-primary">{t("list.view")}</span>
                    ) : null}
                  </div>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                if (!canCreateWorkspace) return;
                setSelectedWorkspaceId(null);
                setMessage(null);
              }}
              disabled={!canCreateWorkspace}
              className={`w-full rounded-3xl border border-dashed p-4 text-left transition-all ${
                canCreateWorkspace
                  ? selectedWorkspaceId === null
                    ? "border-primary/45 bg-primary/8 shadow-[0_14px_34px_rgba(15,23,42,0.10)] hover:border-primary/55 hover:bg-primary/10"
                    : "border-primary/35 bg-primary/5 hover:border-primary/55 hover:bg-primary/8"
                  : "cursor-not-allowed border-border bg-secondary/20 opacity-60"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{t("newWorkspace.title")}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t("newWorkspace.description")}
                  </p>
                </div>
                <span className="shrink-0 self-start rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground sm:self-auto">
                  {canCreateWorkspace ? t("newWorkspace.newBadge") : t("newWorkspace.limitBadge")}
                </span>
              </div>
            </button>

            {workspaceLimit !== null ? (
              <div className="rounded-2xl border border-border bg-secondary/20 p-4 text-xs leading-6 text-muted-foreground">
                {pendingWorkspaceSlots > 0
                  ? t("limit.slotsLeft", { count: pendingWorkspaceSlots })
                  : t("limit.reached")}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                {selectedMembership ? t("details.selectedTitle") : t("details.newTitle")}
                </CardTitle>
                <CardDescription>
                {t("details.description")}
                </CardDescription>
              </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
                <Input
                  id="workspaceName"
                  label={t("fields.workspaceName")}
                  value={workspaceName}
                  onChange={(event) => {
                    setWorkspaceNameDirty(true);
                    setWorkspaceName(event.target.value);
                  }}
                  hint={
                    selectedCountry
                      ? t("hints.languageTimezone", { language: languageLabel(defaultLanguage, selectedLanguageOption?.label ?? defaultLanguage.toUpperCase()), timezone: selectedCountry.timezone })
                      : undefined
                  }
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="countryCode">
                      {t("fields.country")}
                    </label>
                    <div className="relative">
                      <select
                        id="countryCode"
                        className={selectClassName}
                        value={countryCode}
                        onChange={(event) => setCountryCode(event.target.value)}
                      >
                        {(payload.countries ?? []).map((option) => (
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
                    <label className="text-sm font-medium text-foreground" htmlFor="defaultLanguage">
                      {t("fields.language")}
                    </label>
                    <div className="relative">
                      <select
                        id="defaultLanguage"
                        className={selectClassName}
                        value={defaultLanguage}
                        onChange={(event) => setDefaultLanguage(event.target.value)}
                      >
                        {(payload.languageOptions ?? []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {languageLabel(option.value, option.label)}
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
                      {t("fields.role")}
                    </label>
                    <div className="relative">
                      <select
                        id="roleKey"
                        className={selectClassName}
                        value={roleKey}
                        onChange={(event) => setRoleKey(event.target.value)}
                      >
                        {(payload.roleOptions ?? []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {roleLabel(option.value, option.label)}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500 dark:text-slate-300">
                        ▾
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="certificationId">
                    {t("fields.certification")}
                  </label>
                  <div className="relative">
                    <select
                      id="certificationId"
                      className={selectClassName}
                      value={certificationId}
                      onChange={(event) => setCertificationId(event.target.value)}
                    >
                      <option value="">{t("fields.noCertification")}</option>
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
                  <p className="text-xs leading-5 text-muted-foreground">
                    {t("hints.certification")}
                  </p>
                </div>

                <div className="rounded-3xl border border-border bg-secondary/20 p-4 text-sm leading-6 text-muted-foreground">
                  {t("details.contextInfo")}
                </div>

                <div className="rounded-3xl border border-border bg-background/80 p-5">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("company.sectionTitle")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {t("company.sectionDescription")}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label={t("company.officialName")}
                      value={companyProfile.name}
                      onChange={(event) => {
                        setCompanyNameDirty(true);
                        updateCompanyProfile({ name: event.target.value });
                      }}
                    />
                    <Input
                      label={t("company.shortName")}
                      value={companyProfile.shortName}
                      onChange={(event) => {
                        setCompanyShortNameDirty(true);
                        updateCompanyProfile({ shortName: event.target.value });
                      }}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="companyKind">
                        {t("company.kind")}
                      </label>
                      <div className="relative">
                        <select
                          id="companyKind"
                          className={selectClassName}
                          value={companyProfile.kind}
                          onChange={(event) => updateCompanyProfile({ kind: event.target.value })}
                        >
                          <option value="Ozel Sektor">{t("company.kindOptions.private")}</option>
                          <option value="Kamu Kurumu">{t("company.kindOptions.public")}</option>
                          <option value="Belediye">{t("company.kindOptions.municipality")}</option>
                          <option value="STK / Vakif">{t("company.kindOptions.ngo")}</option>
                          <option value="Santiye">{t("company.kindOptions.construction")}</option>
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500 dark:text-slate-300">
                          ▾
                        </span>
                      </div>
                    </div>
                    <Input
                      label={t("company.sector")}
                      value={companyProfile.sector}
                      onChange={(event) => updateCompanyProfile({ sector: event.target.value })}
                    />
                    <Input
                      label={t("company.naceCode")}
                      value={companyProfile.naceCode}
                      onChange={(event) => updateCompanyProfile({ naceCode: event.target.value })}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="hazardClass">
                        {t("company.hazardClass")}
                      </label>
                      <div className="relative">
                        <select
                          id="hazardClass"
                          className={selectClassName}
                          value={companyProfile.hazardClass}
                          onChange={(event) => updateCompanyProfile({ hazardClass: event.target.value })}
                        >
                          <option value="">{t("common.select")}</option>
                          <option value="Az Tehlikeli">{t("company.hazardOptions.low")}</option>
                          <option value="Tehlikeli">{t("company.hazardOptions.medium")}</option>
                          <option value="Cok Tehlikeli">{t("company.hazardOptions.high")}</option>
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500 dark:text-slate-300">
                          ▾
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <Input
                      label={t("company.address")}
                      value={companyProfile.address}
                      onChange={(event) => updateCompanyProfile({ address: event.target.value })}
                    />
                    <Input
                      label={t("company.city")}
                      value={companyProfile.city}
                      onChange={(event) => updateCompanyProfile({ city: event.target.value })}
                    />
                    <Input
                      label={t("company.district")}
                      value={companyProfile.district}
                      onChange={(event) => updateCompanyProfile({ district: event.target.value })}
                    />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <Input
                      label={t("common.phone")}
                      value={companyProfile.phone}
                      onChange={(event) => updateCompanyProfile({ phone: event.target.value })}
                    />
                    <Input
                      label={t("common.email")}
                      value={companyProfile.email}
                      onChange={(event) => updateCompanyProfile({ email: event.target.value })}
                    />
                    <Input
                      label={t("company.contactPerson")}
                      value={companyProfile.contactPerson}
                      onChange={(event) => updateCompanyProfile({ contactPerson: event.target.value })}
                    />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <Input
                      label={t("company.sgkNumber")}
                      value={companyProfile.sgkWorkplaceNumber}
                      onChange={(event) =>
                        updateCompanyProfile({ sgkWorkplaceNumber: event.target.value })
                      }
                    />
                    <Input
                      label={t("company.taxNumber")}
                      value={companyProfile.taxNumber}
                      onChange={(event) => updateCompanyProfile({ taxNumber: event.target.value })}
                    />
                    <Input
                      label={t("company.taxOffice")}
                      value={companyProfile.taxOffice}
                      onChange={(event) => updateCompanyProfile({ taxOffice: event.target.value })}
                    />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <Input
                      label={t("company.employeeCount")}
                      type="number"
                      value={String(companyProfile.employeeCount)}
                      onChange={(event) =>
                        updateCompanyProfile({
                          employeeCount: Number(event.target.value || 0),
                        })
                      }
                    />
                    <Input
                      label={t("company.shiftModel")}
                      value={companyProfile.shiftModel}
                      onChange={(event) => updateCompanyProfile({ shiftModel: event.target.value })}
                    />
                    <Input
                      label={t("company.employerTitle")}
                      value={companyProfile.employerTitle}
                      onChange={(event) => updateCompanyProfile({ employerTitle: event.target.value })}
                    />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Input
                      label={t("company.employerName")}
                      value={companyProfile.employerName}
                      onChange={(event) => updateCompanyProfile({ employerName: event.target.value })}
                    />
                    <Input
                      label={t("company.employerRepresentative")}
                      value={companyProfile.employerRepresentative}
                      onChange={(event) =>
                        updateCompanyProfile({ employerRepresentative: event.target.value })
                      }
                    />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="locations">
                        {t("company.locations")}
                      </label>
                      <Textarea
                        id="locations"
                        rows={6}
                        value={listToTextarea(companyProfile.locations)}
                        onChange={(event) =>
                          updateCompanyProfile({
                            locations: normalizeStringListText(event.target.value),
                          })
                        }
                        placeholder={t("company.locationsPlaceholder")}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="departments">
                        {t("company.departments")}
                      </label>
                      <Textarea
                        id="departments"
                        rows={6}
                        value={listToTextarea(companyProfile.departments)}
                        onChange={(event) =>
                          updateCompanyProfile({
                            departments: normalizeStringListText(event.target.value),
                          })
                        }
                        placeholder={t("company.departmentsPlaceholder")}
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="companyNotes">
                      {t("company.notes")}
                    </label>
                    <Textarea
                      id="companyNotes"
                      rows={4}
                      value={companyProfile.notes}
                      onChange={(event) => updateCompanyProfile({ notes: event.target.value })}
                      placeholder={t("company.notesPlaceholder")}
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => router.replace("/profile")}
                    >
                      {t("profile.open")}
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={
                      submitting ||
                      workspaceName.trim().length < 3 ||
                      companyProfile.name.trim().length < 2 ||
                      (!selectedMembership && !canCreateWorkspace)
                    }
                  >
                    {submitting
                      ? t("common.saving")
                      : selectedMembership
                        ? t("actions.saveSettings")
                        : t("actions.createWorkspace")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("profile.title")}</CardTitle>
              <CardDescription>
                {t("profile.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {[
                { label: t("profile.fullName"), value: payload.profile.fullName || t("profile.notAdded") },
                { label: t("common.email"), value: payload.profile.email || t("profile.notAdded") },
                { label: t("profile.titleField"), value: payload.profile.title || t("profile.completeInProfile") },
                { label: t("common.phone"), value: payload.profile.phone || t("profile.completeInProfile") },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-secondary/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              ))}

              <div className="md:col-span-2 rounded-2xl border border-border bg-background/80 p-4 text-sm leading-6 text-muted-foreground">
                {t("profile.footer")}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
