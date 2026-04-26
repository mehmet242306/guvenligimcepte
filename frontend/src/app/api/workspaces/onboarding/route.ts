import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/supabase/api-auth";
import {
  createServiceClient,
  logSecurityEventWithContext,
  parseJsonBody,
} from "@/lib/security/server";
import { locales, type Locale } from "@/i18n/routing";

const COUNTRY_CONFIG = {
  TR: {
    name: "Turkiye",
    defaultLanguage: "tr",
    timezone: "Europe/Istanbul",
    workspaceSuffix: "Turkiye Operasyonu",
  },
  US: {
    name: "United States",
    defaultLanguage: "en",
    timezone: "America/New_York",
    workspaceSuffix: "US Operations",
  },
  GB: {
    name: "United Kingdom",
    defaultLanguage: "en",
    timezone: "Europe/London",
    workspaceSuffix: "UK Operations",
  },
  DE: {
    name: "Deutschland",
    defaultLanguage: "de",
    timezone: "Europe/Berlin",
    workspaceSuffix: "Deutschland Betrieb",
  },
  FR: {
    name: "France",
    defaultLanguage: "fr",
    timezone: "Europe/Paris",
    workspaceSuffix: "France Operations",
  },
  ES: {
    name: "Espana",
    defaultLanguage: "es",
    timezone: "Europe/Madrid",
    workspaceSuffix: "Espana Operacion",
  },
  AZ: {
    name: "Azerbaycan",
    defaultLanguage: "az",
    timezone: "Asia/Baku",
    workspaceSuffix: "Azerbaycan Operasyonu",
  },
  RU: {
    name: "Rossiya",
    defaultLanguage: "ru",
    timezone: "Europe/Moscow",
    workspaceSuffix: "Russia Operations",
  },
  SA: {
    name: "Saudi Arabia",
    defaultLanguage: "ar",
    timezone: "Asia/Riyadh",
    workspaceSuffix: "Saudi Operations",
  },
  AE: {
    name: "United Arab Emirates",
    defaultLanguage: "ar",
    timezone: "Asia/Dubai",
    workspaceSuffix: "UAE Operations",
  },
  CN: {
    name: "China",
    defaultLanguage: "zh",
    timezone: "Asia/Shanghai",
    workspaceSuffix: "China Operations",
  },
  JP: {
    name: "Japan",
    defaultLanguage: "ja",
    timezone: "Asia/Tokyo",
    workspaceSuffix: "Japan Operations",
  },
  KR: {
    name: "Korea",
    defaultLanguage: "ko",
    timezone: "Asia/Seoul",
    workspaceSuffix: "Korea Operations",
  },
  IN: {
    name: "India",
    defaultLanguage: "hi",
    timezone: "Asia/Kolkata",
    workspaceSuffix: "India Operations",
  },
  ID: {
    name: "Indonesia",
    defaultLanguage: "id",
    timezone: "Asia/Jakarta",
    workspaceSuffix: "Indonesia Operations",
  },
} as const;

const ROLE_OPTIONS = [
  "safety_professional",
  "occupational_physician",
  "industrial_hygienist",
  "safety_officer",
  "auditor",
  "workspace_admin",
  "viewer",
] as const;

const ROLE_LABELS: Record<(typeof ROLE_OPTIONS)[number], string> = {
  safety_professional: "ISG uzmani",
  occupational_physician: "Isyeri hekimi",
  industrial_hygienist: "Endustriyel hijyen uzmani",
  safety_officer: "Diger saglik personeli / guvenlik gorevlisi",
  auditor: "Denetci",
  workspace_admin: "Calisma alani yoneticisi",
  viewer: "Goruntuleyici",
};

const LANGUAGE_LABELS: Record<Locale, string> = {
  tr: "Turkce",
  en: "English",
  ar: "Arabic",
  ru: "Russian",
  de: "Deutsch",
  fr: "Francais",
  es: "Espanol",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  hi: "Hindi",
  az: "Azerbaycanca",
  id: "Bahasa Indonesia",
};

const fallbackCertifications = [
  {
    id: "fallback-tr-isg-a",
    country_code: "TR",
    role_key: "safety_professional",
    code: "ISG-A",
    name_en: "OHS Specialist Class A",
    name_local: "ISG Uzmani (A Sinifi)",
    issuer: "CSGB",
    level: "A",
  },
  {
    id: "fallback-tr-isg-b",
    country_code: "TR",
    role_key: "safety_professional",
    code: "ISG-B",
    name_en: "OHS Specialist Class B",
    name_local: "ISG Uzmani (B Sinifi)",
    issuer: "CSGB",
    level: "B",
  },
  {
    id: "fallback-tr-isg-c",
    country_code: "TR",
    role_key: "safety_professional",
    code: "ISG-C",
    name_en: "OHS Specialist Class C",
    name_local: "ISG Uzmani (C Sinifi)",
    issuer: "CSGB",
    level: "C",
  },
  {
    id: "fallback-tr-iyh",
    country_code: "TR",
    role_key: "occupational_physician",
    code: "IYH",
    name_en: "Workplace Physician",
    name_local: "Isyeri Hekimi",
    issuer: "CSGB",
    level: null,
  },
  {
    id: "fallback-tr-dsp",
    country_code: "TR",
    role_key: "safety_officer",
    code: "DSP",
    name_en: "Other Health Personnel",
    name_local: "Diger Saglik Personeli",
    issuer: "CSGB",
    level: null,
  },
] as const;

const companyProfileSchema = z.object({
  companyWorkspaceId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(160),
  shortName: z.string().trim().max(160).optional().default(""),
  kind: z.string().trim().max(80).optional().default("Ozel Sektor"),
  companyType: z.string().trim().max(80).optional().default("bagimsiz"),
  address: z.string().trim().max(240).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  district: z.string().trim().max(120).optional().default(""),
  sector: z.string().trim().max(160).optional().default(""),
  naceCode: z.string().trim().max(40).optional().default(""),
  hazardClass: z.string().trim().max(80).optional().default(""),
  taxNumber: z.string().trim().max(40).optional().default(""),
  taxOffice: z.string().trim().max(120).optional().default(""),
  sgkWorkplaceNumber: z.string().trim().max(80).optional().default(""),
  fax: z.string().trim().max(40).optional().default(""),
  employerTitle: z.string().trim().max(120).optional().default(""),
  employeeCount: z.coerce.number().int().min(0).max(100000).optional().default(0),
  shiftModel: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(160).optional().default(""),
  contactPerson: z.string().trim().max(120).optional().default(""),
  employerName: z.string().trim().max(120).optional().default(""),
  employerRepresentative: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(4000).optional().default(""),
  locations: z.array(z.string().trim().max(120)).optional().default([]),
  departments: z.array(z.string().trim().max(120)).optional().default([]),
});

const onboardingSchema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  roleKey: z.enum(ROLE_OPTIONS),
  defaultLanguage: z.enum(locales),
  certificationId: z.string().trim().min(1).nullable().optional(),
  workspaceName: z.string().trim().min(3).max(120).optional(),
  companyWorkspaceId: z.string().uuid().nullable().optional(),
  companyProfile: companyProfileSchema.optional(),
  makePrimary: z.boolean().optional().default(true),
});

type WorkspaceRow = {
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

type OrganizationSummary = {
  id: string;
  name: string;
  country_code: string | null;
};

type WorkspaceCompanyProfile = z.infer<typeof companyProfileSchema>;

type CompanyIdentityRow = {
  official_name: string;
  sector: string | null;
  nace_code: string | null;
  hazard_class: string | null;
  company_type: string | null;
  tax_number: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
};

type CompanyWorkspaceRow = {
  id: string;
  organization_id: string;
  company_identity_id: string;
  display_name: string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  status: string | null;
  is_archived: boolean | null;
  company_identities: CompanyIdentityRow | CompanyIdentityRow[] | null;
};

function isMissingRelationError(message: string | undefined) {
  return Boolean(
    message &&
      (message.includes("Could not find the table") ||
        message.includes("schema cache") ||
        message.includes("does not exist")),
  );
}

function getCountryConfig(code: string) {
  const config = COUNTRY_CONFIG[code as keyof typeof COUNTRY_CONFIG];
  if (config) return config;

  return {
    name: code,
    defaultLanguage: "en",
    timezone: "UTC",
    workspaceSuffix: `${code} Workspace`,
  };
}

function buildSuggestedWorkspaceName(orgName: string, countryCode: string) {
  const config = getCountryConfig(countryCode);
  return `${orgName} ${config.workspaceSuffix}`.slice(0, 120);
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

function metadataString(metadata: Record<string, unknown>, key: string, fallback = "") {
  const value = metadata[key];
  return typeof value === "string" ? value : fallback;
}

function metadataNumber(metadata: Record<string, unknown>, key: string, fallback = 0) {
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function metadataStringList(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  if (!Array.isArray(value)) return [] as string[];

  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean),
    ),
  );
}

function normalizeStringList(items: string[] | undefined) {
  return Array.from(
    new Set(
      (items ?? [])
        .map((item) => String(item ?? "").trim())
        .filter(Boolean),
    ),
  );
}

function unwrapCompanyIdentity(row: CompanyWorkspaceRow) {
  if (Array.isArray(row.company_identities)) {
    return row.company_identities[0] ?? null;
  }

  return row.company_identities ?? null;
}

function defaultCompanyProfile(workspaceName: string): WorkspaceCompanyProfile {
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

function toWorkspaceCompanyProfile(
  row: CompanyWorkspaceRow,
  fallbackWorkspaceName: string,
): WorkspaceCompanyProfile {
  const identity = unwrapCompanyIdentity(row);
  const metadata = asRecord(row.metadata);
  const workspaceName = fallbackWorkspaceName || identity?.official_name || row.display_name;

  return {
    companyWorkspaceId: row.id,
    name: identity?.official_name || workspaceName,
    shortName: row.display_name || workspaceName,
    kind: metadataString(metadata, "kind", "Ozel Sektor"),
    companyType: metadataString(metadata, "companyType", identity?.company_type || "bagimsiz"),
    address: identity?.address || metadataString(metadata, "address"),
    city: identity?.city || metadataString(metadata, "city"),
    district: identity?.district || metadataString(metadata, "district"),
    sector: identity?.sector || metadataString(metadata, "sector"),
    naceCode: identity?.nace_code || metadataString(metadata, "naceCode"),
    hazardClass: identity?.hazard_class || metadataString(metadata, "hazardClass"),
    taxNumber: identity?.tax_number || metadataString(metadata, "taxNumber"),
    taxOffice: metadataString(metadata, "taxOffice"),
    sgkWorkplaceNumber: metadataString(metadata, "sgkWorkplaceNumber"),
    fax: metadataString(metadata, "fax"),
    employerTitle: metadataString(metadata, "employerTitle"),
    employeeCount: metadataNumber(metadata, "employeeCount", 0),
    shiftModel: metadataString(metadata, "shiftModel"),
    phone: metadataString(metadata, "phone"),
    email: metadataString(metadata, "email"),
    contactPerson: metadataString(metadata, "contactPerson"),
    employerName: metadataString(metadata, "employerName"),
    employerRepresentative: metadataString(metadata, "employerRepresentative"),
    notes: row.notes || metadataString(metadata, "notes"),
    locations: metadataStringList(metadata, "locations"),
    departments: metadataStringList(metadata, "departments"),
  };
}

function companyProfileToMetadata(
  profile: WorkspaceCompanyProfile,
  workspaceId: string,
  workspaceCountryCode: string,
) {
  return {
    kind: profile.kind,
    companyType: profile.companyType,
    address: profile.address,
    city: profile.city,
    district: profile.district,
    sector: profile.sector,
    naceCode: profile.naceCode,
    hazardClass: profile.hazardClass,
    taxNumber: profile.taxNumber,
    taxOffice: profile.taxOffice,
    sgkWorkplaceNumber: profile.sgkWorkplaceNumber,
    fax: profile.fax,
    employerTitle: profile.employerTitle,
    employeeCount: profile.employeeCount,
    shiftModel: profile.shiftModel,
    phone: profile.phone,
    email: profile.email,
    contactPerson: profile.contactPerson,
    employerName: profile.employerName,
    employerRepresentative: profile.employerRepresentative,
    notes: profile.notes,
    locations: profile.locations,
    departments: profile.departments,
    novaWorkspaceId: workspaceId,
    workspaceCountryCode,
  };
}

function normalizeCompanyProfile(
  input: Partial<WorkspaceCompanyProfile> | undefined,
  workspaceName: string,
) {
  const base = defaultCompanyProfile(workspaceName);
  const merged = { ...base, ...(input ?? {}) };

  return {
    ...merged,
    companyWorkspaceId: merged.companyWorkspaceId ?? null,
    name: merged.name.trim() || workspaceName,
    shortName: merged.shortName.trim() || merged.name.trim() || workspaceName,
    kind: merged.kind.trim() || "Ozel Sektor",
    companyType: merged.companyType.trim() || "bagimsiz",
    address: merged.address.trim(),
    city: merged.city.trim(),
    district: merged.district.trim(),
    sector: merged.sector.trim(),
    naceCode: merged.naceCode.trim(),
    hazardClass: merged.hazardClass.trim(),
    taxNumber: merged.taxNumber.trim(),
    taxOffice: merged.taxOffice.trim(),
    sgkWorkplaceNumber: merged.sgkWorkplaceNumber.trim(),
    fax: merged.fax.trim(),
    employerTitle: merged.employerTitle.trim(),
    employeeCount: Number.isFinite(merged.employeeCount) ? merged.employeeCount : 0,
    shiftModel: merged.shiftModel.trim(),
    phone: merged.phone.trim(),
    email: merged.email.trim(),
    contactPerson: merged.contactPerson.trim(),
    employerName: merged.employerName.trim(),
    employerRepresentative: merged.employerRepresentative.trim(),
    notes: merged.notes.trim(),
    locations: normalizeStringList(merged.locations),
    departments: normalizeStringList(merged.departments),
  } satisfies WorkspaceCompanyProfile;
}

function mapRoleKeyToCompanyMembershipRole(roleKey: (typeof ROLE_OPTIONS)[number]) {
  switch (roleKey) {
    case "occupational_physician":
      return "workplace_physician";
    case "safety_officer":
      return "other_health_personnel";
    case "viewer":
      return "viewer";
    default:
      return "ohs_specialist";
  }
}

async function persistUserPreferenceLanguage(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  language: string,
) {
  const result = await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      language,
    },
    {
      onConflict: "user_id",
    },
  );

  if (result.error && !isMissingRelationError(result.error.message)) {
    throw new Error(result.error.message);
  }
}

async function resolveWorkspaceFallback(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
) {
  const { data } = await supabase
    .from("nova_workspace_members")
    .select(
      `
      workspace:nova_workspaces!inner (
        id,
        organization_id,
        country_code,
        name,
        default_language,
        timezone,
        is_active,
        created_at,
        updated_at
      )
    `,
    )
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const rawWorkspace = data?.workspace as WorkspaceRow | WorkspaceRow[] | null | undefined;
  return Array.isArray(rawWorkspace) ? rawWorkspace[0] ?? null : rawWorkspace ?? null;
}

async function loadProfileForOnboarding(
  supabase: ReturnType<typeof createServiceClient>,
  profileId: string,
  authUserId: string,
) {
  const primaryQuery = await supabase
    .from("user_profiles")
    .select(
      `
      id,
      full_name,
      email,
      title,
      phone,
      active_workspace_id,
      organization:organizations!user_profiles_organization_id_fkey (
        id,
        name,
        country_code
      )
    `,
    )
    .eq("id", profileId)
    .maybeSingle();

  if (!primaryQuery.error) {
    return {
      profile: primaryQuery.data,
      activeWorkspaceId: primaryQuery.data?.active_workspace_id ?? null,
    };
  }

  if (!primaryQuery.error.message.includes("active_workspace_id")) {
    throw new Error(primaryQuery.error.message);
  }

  const { data: fallbackProfile, error: fallbackError } = await supabase
    .from("user_profiles")
    .select(
      `
      id,
      full_name,
      email,
      title,
      phone,
      organization:organizations!user_profiles_organization_id_fkey (
        id,
        name,
        country_code
      )
    `,
    )
    .eq("id", profileId)
    .maybeSingle();

  if (fallbackError) {
    throw new Error(fallbackError.message);
  }

  const fallbackWorkspace = await resolveWorkspaceFallback(supabase, authUserId);
  return {
    profile: fallbackProfile,
    activeWorkspaceId: fallbackWorkspace?.id ?? null,
  };
}

async function loadOrganizationSummary(
  supabase: ReturnType<typeof createServiceClient>,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, country_code")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    return {
      organization: {
        id: organizationId,
        name: "Organization",
        country_code: "TR",
      } satisfies OrganizationSummary,
      warning: `Organizasyon ozeti okunamadi: ${error.message}`,
    };
  }

  return {
    organization:
      data ??
      ({
        id: organizationId,
        name: "Organization",
        country_code: "TR",
      } satisfies OrganizationSummary),
    warning: null,
  };
}

async function loadCompanyWorkspaceRows(
  supabase: ReturnType<typeof createServiceClient>,
  organizationId: string,
) {
  const result = await supabase
    .from("company_workspaces")
    .select(
      `
      id,
      organization_id,
      company_identity_id,
      display_name,
      notes,
      metadata,
      status,
      is_archived,
      company_identities!inner (
        official_name,
        sector,
        nace_code,
        hazard_class,
        company_type,
        tax_number,
        address,
        city,
        district
      )
    `,
    )
    .eq("organization_id", organizationId);

  if (result.error) {
    if (isMissingRelationError(result.error.message)) {
      return {
        rows: [] as CompanyWorkspaceRow[],
        warning:
          "Firma workspace tablolari henuz okunamadi. Ileri seviye isyeri alanlari bu ortamda kisitli olabilir.",
      };
    }

    throw new Error(result.error.message);
  }

  return {
    rows: ((result.data ?? []) as CompanyWorkspaceRow[]).filter(
      (row) => row.status !== "archived" && row.is_archived !== true,
    ),
    warning: null,
  };
}

function findCompanyWorkspaceForMembership(
  rows: CompanyWorkspaceRow[],
  workspace: WorkspaceRow,
) {
  const linked = rows.find((row) => {
    const metadata = asRecord(row.metadata);
    return metadataString(metadata, "novaWorkspaceId") === workspace.id;
  });

  if (linked) return linked;

  const workspaceName = normalizeText(workspace.name);
  const byName = rows.filter((row) => {
    const identity = unwrapCompanyIdentity(row);
    return (
      normalizeText(row.display_name) === workspaceName ||
      normalizeText(identity?.official_name) === workspaceName
    );
  });

  return byName.length === 1 ? byName[0] : null;
}

async function upsertCompanyWorkspaceForWorkspace(params: {
  supabase: ReturnType<typeof createServiceClient>;
  organizationId: string;
  userId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceCountryCode: string;
  roleKey: (typeof ROLE_OPTIONS)[number];
  companyWorkspaceId?: string | null;
  companyProfile?: Partial<WorkspaceCompanyProfile>;
}) {
  const normalizedProfile = normalizeCompanyProfile(params.companyProfile, params.workspaceName);
  const baseMetadata = companyProfileToMetadata(
    normalizedProfile,
    params.workspaceId,
    params.workspaceCountryCode,
  );

  let existingRow: CompanyWorkspaceRow | null = null;

  if (params.companyWorkspaceId) {
    const lookup = await params.supabase
      .from("company_workspaces")
      .select(
        `
        id,
        organization_id,
        company_identity_id,
        display_name,
        notes,
        metadata,
        status,
        is_archived,
        company_identities!inner (
          official_name,
          sector,
          nace_code,
          hazard_class,
          company_type,
          tax_number,
          address,
          city,
          district
        )
      `,
      )
      .eq("id", params.companyWorkspaceId)
      .eq("organization_id", params.organizationId)
      .maybeSingle();

    if (lookup.error) {
      if (isMissingRelationError(lookup.error.message)) {
        return {
          companyWorkspaceId: null,
          companyProfile: normalizedProfile,
          warning:
            "Firma kayit tablolari bu ortamda tam kurulu degil. Workspace kaydedildi ama isyeri detaylari sunucuya yazilamadi.",
        };
      }

      throw new Error(lookup.error.message);
    }

    existingRow = (lookup.data as CompanyWorkspaceRow | null) ?? null;
  }

  if (!existingRow) {
    const linkedRows = await loadCompanyWorkspaceRows(params.supabase, params.organizationId);
    existingRow =
      findCompanyWorkspaceForMembership(linkedRows.rows, {
        id: params.workspaceId,
        organization_id: params.organizationId,
        country_code: params.workspaceCountryCode,
        name: params.workspaceName,
        default_language: "tr",
        timezone: "UTC",
        is_active: true,
        created_at: "",
        updated_at: "",
      }) ?? null;
  }

  if (existingRow) {
    const existingMetadata = asRecord(existingRow.metadata);
    const mergedMetadata = {
      ...existingMetadata,
      ...baseMetadata,
    };

    const workspaceUpdate = await params.supabase
      .from("company_workspaces")
      .update({
        display_name: normalizedProfile.shortName || normalizedProfile.name,
        notes: normalizedProfile.notes || null,
        metadata: mergedMetadata,
        updated_by: params.userId,
      })
      .eq("id", existingRow.id)
      .eq("organization_id", params.organizationId);

    if (workspaceUpdate.error) {
      throw new Error(workspaceUpdate.error.message);
    }

    const identityUpdate = await params.supabase
      .from("company_identities")
      .update({
        official_name: normalizedProfile.name,
        sector: normalizedProfile.sector || null,
        nace_code: normalizedProfile.naceCode || null,
        hazard_class: normalizedProfile.hazardClass || null,
        company_type: normalizedProfile.companyType || null,
        tax_number: normalizedProfile.taxNumber || null,
        address: normalizedProfile.address || null,
        city: normalizedProfile.city || null,
        district: normalizedProfile.district || null,
        updated_by: params.userId,
      })
      .eq("id", existingRow.company_identity_id);

    if (identityUpdate.error) {
      throw new Error(identityUpdate.error.message);
    }

    return {
      companyWorkspaceId: existingRow.id,
      companyProfile: {
        ...normalizedProfile,
        companyWorkspaceId: existingRow.id,
      } satisfies WorkspaceCompanyProfile,
      warning: null,
    };
  }

  const insertedIdentity = await params.supabase
    .from("company_identities")
    .insert({
      official_name: normalizedProfile.name,
      sector: normalizedProfile.sector || null,
      nace_code: normalizedProfile.naceCode || null,
      hazard_class: normalizedProfile.hazardClass || null,
      company_type: normalizedProfile.companyType || null,
      tax_number: normalizedProfile.taxNumber || null,
      address: normalizedProfile.address || null,
      city: normalizedProfile.city || null,
      district: normalizedProfile.district || null,
      owner_organization_id: params.organizationId,
      created_by: params.userId,
      updated_by: params.userId,
    })
    .select("id")
    .single();

  if (insertedIdentity.error) {
    if (isMissingRelationError(insertedIdentity.error.message)) {
      return {
        companyWorkspaceId: null,
        companyProfile: normalizedProfile,
        warning:
          "Firma kayit tablolari bu ortamda tam kurulu degil. Workspace kaydedildi ama isyeri detaylari sunucuya yazilamadi.",
      };
    }

    throw new Error(insertedIdentity.error.message);
  }

  const insertedWorkspace = await params.supabase
    .from("company_workspaces")
    .insert({
      organization_id: params.organizationId,
      company_identity_id: insertedIdentity.data.id,
      display_name: normalizedProfile.shortName || normalizedProfile.name,
      notes: normalizedProfile.notes || null,
      metadata: baseMetadata,
      is_primary_workspace: true,
      is_archived: false,
      status: "active",
      created_by: params.userId,
      updated_by: params.userId,
      created_by_user_id: params.userId,
    })
    .select("id")
    .single();

  if (insertedWorkspace.error) {
    throw new Error(insertedWorkspace.error.message);
  }

  const membershipRole = mapRoleKeyToCompanyMembershipRole(params.roleKey);
  const existingMembership = await params.supabase
    .from("company_memberships")
    .select("id")
    .eq("company_workspace_id", insertedWorkspace.data.id)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (!existingMembership.error && !existingMembership.data) {
    const membershipInsert = await params.supabase.from("company_memberships").insert({
      company_identity_id: insertedIdentity.data.id,
      company_workspace_id: insertedWorkspace.data.id,
      organization_id: params.organizationId,
      user_id: params.userId,
      membership_role: membershipRole,
      employment_type: "direct",
      status: "active",
      can_view_shared_operations: true,
      can_create_shared_operations: true,
      can_approve_join_requests: true,
      is_primary_contact: true,
      approved_by: params.userId,
      approved_at: new Date().toISOString(),
      created_by: params.userId,
      updated_by: params.userId,
    });

    if (membershipInsert.error && !isMissingRelationError(membershipInsert.error.message)) {
      throw new Error(membershipInsert.error.message);
    }
  }

  return {
    companyWorkspaceId: insertedWorkspace.data.id,
    companyProfile: {
      ...normalizedProfile,
      companyWorkspaceId: insertedWorkspace.data.id,
    } satisfies WorkspaceCompanyProfile,
    warning: null,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const supabase = createServiceClient();
  const warnings: string[] = [];
  let userMetadata: Record<string, unknown> = {};

  try {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(auth.userId);
    if (userError) {
      warnings.push("Kullanici tercihleri okunamadi.");
    } else {
      userMetadata = (userData.user?.user_metadata ?? {}) as Record<string, unknown>;
    }
  } catch {
    warnings.push("Kullanici tercihleri okunamadi.");
  }

  let certifications:
    | Array<{
        id: string;
        country_code: string;
        role_key: string;
        code: string;
        name_en: string;
        name_local: string | null;
        issuer: string;
        level: string | null;
      }>
    | [] = [];

  const certificationResult = await supabase
    .from("certifications")
    .select("id, country_code, role_key, code, name_en, name_local, issuer, level")
    .eq("is_active", true)
    .order("country_code")
    .order("role_key")
    .order("code");

  if (certificationResult.error) {
    if (isMissingRelationError(certificationResult.error.message)) {
      warnings.push(
        "Sertifika sozlugu bu veritabaninda henuz kurulu degil. Turkiye icin temel sertifikalari fallback olarak gosteriyorum.",
      );
      certifications = [...fallbackCertifications];
    } else {
      warnings.push(`Sertifika sozlugu okunamadi: ${certificationResult.error.message}`);
    }
  } else {
    certifications = certificationResult.data ?? [];
  }

  let memberships:
    | Array<{
        id: string;
        role_key: string;
        certification_id: string | null;
        is_primary: boolean;
        workspace: WorkspaceRow | WorkspaceRow[];
      }>
    | [] = [];

  const membershipResult = await supabase
    .from("nova_workspace_members")
    .select(
      `
      id,
      role_key,
      certification_id,
      is_primary,
      workspace:nova_workspaces!inner (
        id,
        name,
        country_code,
        default_language,
        timezone,
        organization_id,
        is_active,
        created_at,
        updated_at
      )
    `,
    )
    .eq("user_id", auth.userId)
    .order("is_primary", { ascending: false })
    .order("joined_at", { ascending: true });

  if (membershipResult.error) {
    if (isMissingRelationError(membershipResult.error.message)) {
      warnings.push(
        "Workspace tablolari bu veritabaninda henuz kurulu degil. Secim ekranini gosterecegim ama kaydetme adimi icin migration gerekecek.",
      );
    } else {
      warnings.push(`Workspace uyelikleri okunamadi: ${membershipResult.error.message}`);
    }
  } else {
    memberships = membershipResult.data ?? [];
  }

  let profile:
    | {
        id?: string | null;
        full_name?: string | null;
        email?: string | null;
        title?: string | null;
        phone?: string | null;
        organization?:
          | OrganizationSummary
          | OrganizationSummary[]
          | null;
      }
    | null = null;
  let activeWorkspaceId: string | null = null;

  try {
    const profileResult = await loadProfileForOnboarding(supabase, auth.userProfileId, auth.userId);
    profile = profileResult.profile;
    activeWorkspaceId = profileResult.activeWorkspaceId;
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : "Profil okunamadi.");
  }

  const organization = Array.isArray(profile?.organization)
    ? profile?.organization[0]
    : profile?.organization;
  const organizationSummary = organization?.id
    ? { organization, warning: null }
    : await loadOrganizationSummary(supabase, auth.organizationId);

  if (organizationSummary.warning) {
    warnings.push(organizationSummary.warning);
  }

  const resolvedOrganization = organizationSummary.organization;
  const preferredCountryCode =
    typeof userMetadata.preferred_country_code === "string" &&
    COUNTRY_CONFIG[userMetadata.preferred_country_code as keyof typeof COUNTRY_CONFIG]
      ? userMetadata.preferred_country_code
      : null;
  const preferredLanguage =
    typeof userMetadata.preferred_language === "string" &&
    (locales as readonly string[]).includes(userMetadata.preferred_language)
      ? userMetadata.preferred_language
      : null;
  const preferredRole =
    typeof userMetadata.preferred_role_key === "string" &&
    (ROLE_OPTIONS as readonly string[]).includes(userMetadata.preferred_role_key)
      ? userMetadata.preferred_role_key
      : null;
  const recommendedCountryCode =
    preferredCountryCode || resolvedOrganization.country_code || "TR";
  const companyWorkspaceProfiles =
    memberships.length > 0
      ? await loadCompanyWorkspaceRows(
          supabase,
          resolvedOrganization.id,
        )
      : {
          rows: [] as CompanyWorkspaceRow[],
          warning: null,
        };

  if (companyWorkspaceProfiles.warning) {
    warnings.push(companyWorkspaceProfiles.warning);
  }

  return NextResponse.json({
    profile: {
      id: profile?.id ?? auth.userProfileId,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? null,
      title: profile?.title ?? null,
      phone: profile?.phone ?? null,
      activeWorkspaceId,
    },
    organization: {
      id: resolvedOrganization.id,
      name: resolvedOrganization.name,
      countryCode: resolvedOrganization.country_code ?? null,
    },
    countries: Object.entries(COUNTRY_CONFIG).map(([code, config]) => ({
      code,
      name: config.name,
      defaultLanguage: config.defaultLanguage,
      timezone: config.timezone,
      suggestedWorkspaceName: buildSuggestedWorkspaceName(resolvedOrganization.name, code),
    })),
    recommendedCountryCode,
    recommendedLanguage: preferredLanguage,
    recommendedRole: preferredRole,
    roleOptions: ROLE_OPTIONS.map((value) => ({
      value,
      label: ROLE_LABELS[value],
    })),
    languageOptions: locales.map((value) => ({
      value,
      label: LANGUAGE_LABELS[value],
    })),
    certifications: certifications.map((item) => ({
      id: item.id,
      countryCode: item.country_code,
      roleKey: item.role_key,
      code: item.code,
      name: item.name_local || item.name_en,
      issuer: item.issuer,
      level: item.level,
    })),
    warnings,
    memberships: memberships.map((row) => {
      const workspace = Array.isArray(row.workspace) ? row.workspace[0] : row.workspace;
      const linkedCompanyWorkspace = workspace
        ? findCompanyWorkspaceForMembership(companyWorkspaceProfiles.rows, workspace)
        : null;
      return {
        id: row.id,
        roleKey: row.role_key,
        certificationId: row.certification_id,
        isPrimary: row.is_primary,
        workspace,
        companyWorkspaceId: linkedCompanyWorkspace?.id ?? null,
        companyProfile: linkedCompanyWorkspace
          ? toWorkspaceCompanyProfile(linkedCompanyWorkspace, workspace?.name ?? "")
          : null,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, onboardingSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const supabase = createServiceClient();

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select(
      `
      id,
      full_name,
      organization:organizations!user_profiles_organization_id_fkey (
        id,
        name
      )
    `,
    )
    .eq("id", auth.userProfileId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const organization = Array.isArray(profile?.organization)
    ? profile.organization[0]
    : profile?.organization;

  if (!organization?.id) {
    return NextResponse.json({ error: "Organizasyon bulunamadi." }, { status: 404 });
  }

  let certificationId = body.certificationId ?? null;
  if (certificationId) {
    const fallbackCertification = fallbackCertifications.find((item) => item.id === certificationId);
    if (fallbackCertification) {
      if (
        fallbackCertification.country_code !== body.countryCode ||
        fallbackCertification.role_key !== body.roleKey
      ) {
        return NextResponse.json(
          { error: "Secilen sertifika ulke veya role uymuyor." },
          { status: 400 },
        );
      }
      certificationId = null;
    } else {
      const { data: certification, error: certificationError } = await supabase
        .from("certifications")
        .select("id, country_code, role_key, is_active")
      .eq("id", certificationId)
      .maybeSingle();

      if (certificationError) {
        if (isMissingRelationError(certificationError.message)) {
          return NextResponse.json(
            { error: "Sertifika tablosu bu ortamda henuz yok. Sertifika secmeden devam et." },
            { status: 400 },
          );
        }
        return NextResponse.json({ error: certificationError.message }, { status: 500 });
      }

      if (
        !certification ||
        certification.is_active !== true ||
        certification.country_code !== body.countryCode ||
        certification.role_key !== body.roleKey
      ) {
        return NextResponse.json(
          { error: "Secilen sertifika ulke veya role uymuyor." },
          { status: 400 },
        );
      }
    }
  }

  const countryConfig = getCountryConfig(body.countryCode);
  const selectedLanguage = body.defaultLanguage;
  const desiredWorkspaceName =
    body.workspaceName?.trim() ||
    buildSuggestedWorkspaceName(organization.name, body.countryCode);
  const normalizedCompanyProfile = normalizeCompanyProfile(
    body.companyProfile,
    desiredWorkspaceName,
  );
  const fallbackWorkspaceId = `local-${body.countryCode}`;
  const fallbackMembershipId = `local-membership-${body.countryCode}`;

  function buildLocalFallbackResponse(warning: string) {
    return NextResponse.json({
      ok: true,
      mode: "local_fallback",
      warning,
      membershipId: fallbackMembershipId,
      workspace: {
        id: fallbackWorkspaceId,
        name: desiredWorkspaceName,
        countryCode: body.countryCode,
        defaultLanguage: selectedLanguage,
        timezone: countryConfig.timezone,
      },
      companyWorkspaceId: null,
      companyProfile: normalizedCompanyProfile,
    });
  }

  try {
    await persistUserPreferenceLanguage(supabase, auth.userId, selectedLanguage);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kullanici tercihleri kaydedilemedi." },
      { status: 500 },
    );
  }

  let workspace: WorkspaceRow | null = null;

  if (body.workspaceId) {
    const workspaceLookup = await supabase
      .from("nova_workspaces")
      .select(
        "id, organization_id, country_code, name, default_language, timezone, is_active, created_at, updated_at",
      )
      .eq("id", body.workspaceId)
      .eq("organization_id", organization.id)
      .maybeSingle();

    if (workspaceLookup.error && isMissingRelationError(workspaceLookup.error.message)) {
      return buildLocalFallbackResponse(
        "Workspace tablolari bu veritabaninda henuz kurulu degil. Secimin bu cihazda yerel baglam olarak kaydedildi.",
      );
    }

    if (workspaceLookup.error) {
      return NextResponse.json({ error: workspaceLookup.error.message }, { status: 500 });
    }

    workspace = workspaceLookup.data ?? null;
    if (!workspace) {
      return NextResponse.json({ error: "Duzenlenecek calisma alani bulunamadi." }, { status: 404 });
    }
  } else {
    const { data: insertedWorkspace, error: workspaceInsertError } = await supabase
      .from("nova_workspaces")
      .insert({
        organization_id: organization.id,
        country_code: body.countryCode,
        name: desiredWorkspaceName,
        default_language: selectedLanguage,
        timezone: countryConfig.timezone,
      })
      .select(
        "id, organization_id, country_code, name, default_language, timezone, is_active, created_at, updated_at",
      )
      .single();

    if (workspaceInsertError) {
      if (isMissingRelationError(workspaceInsertError.message)) {
        return buildLocalFallbackResponse(
          "Workspace tablolari bu veritabaninda henuz kurulu degil. Secimin bu cihazda yerel baglam olarak kaydedildi.",
        );
      }
      return NextResponse.json({ error: workspaceInsertError.message }, { status: 500 });
    }

    workspace = insertedWorkspace;
  }

  if (
    workspace.name !== desiredWorkspaceName ||
    workspace.country_code !== body.countryCode ||
    workspace.default_language !== selectedLanguage ||
    workspace.timezone !== countryConfig.timezone
  ) {
    const { data: updatedWorkspace, error: workspaceUpdateError } = await supabase
      .from("nova_workspaces")
      .update({
        country_code: body.countryCode,
        name: desiredWorkspaceName,
        default_language: selectedLanguage,
        timezone: countryConfig.timezone,
      })
      .eq("id", workspace.id)
      .eq("organization_id", organization.id)
      .select(
        "id, organization_id, country_code, name, default_language, timezone, is_active, created_at, updated_at",
      )
      .single();

    if (workspaceUpdateError) {
      return NextResponse.json({ error: workspaceUpdateError.message }, { status: 500 });
    }

    workspace = updatedWorkspace;
  }

  if (body.makePrimary) {
    const { error: unsetPrimaryError } = await supabase
      .from("nova_workspace_members")
      .update({ is_primary: false })
      .eq("user_id", auth.userId);

    if (unsetPrimaryError) {
      if (isMissingRelationError(unsetPrimaryError.message)) {
        return buildLocalFallbackResponse(
          "Workspace uyelik tablolari bu veritabaninda henuz kurulu degil. Secimin bu cihazda yerel baglam olarak kaydedildi.",
        );
      }
      return NextResponse.json({ error: unsetPrimaryError.message }, { status: 500 });
    }
  }

  const { data: existingMembership, error: existingMembershipError } = await supabase
    .from("nova_workspace_members")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (existingMembershipError) {
    if (isMissingRelationError(existingMembershipError.message)) {
      return buildLocalFallbackResponse(
        "Workspace uyelik tablolari bu veritabaninda henuz kurulu degil. Secimin bu cihazda yerel baglam olarak kaydedildi.",
      );
    }
    return NextResponse.json({ error: existingMembershipError.message }, { status: 500 });
  }

  let membershipId = existingMembership?.id ?? null;

  if (existingMembership?.id) {
    const { error: updateMembershipError } = await supabase
      .from("nova_workspace_members")
      .update({
        role_key: body.roleKey,
        certification_id: certificationId,
        is_primary: body.makePrimary,
      })
      .eq("id", existingMembership.id);

    if (updateMembershipError) {
      if (isMissingRelationError(updateMembershipError.message)) {
        return buildLocalFallbackResponse(
          "Workspace uyelik tablolari bu veritabaninda henuz kurulu degil. Secimin bu cihazda yerel baglam olarak kaydedildi.",
        );
      }
      return NextResponse.json({ error: updateMembershipError.message }, { status: 500 });
    }
  } else {
    const { data: insertedMembership, error: insertMembershipError } = await supabase
      .from("nova_workspace_members")
      .insert({
        workspace_id: workspace.id,
        user_id: auth.userId,
        role_key: body.roleKey,
        certification_id: certificationId,
        is_primary: body.makePrimary,
      })
      .select("id")
      .single();

    if (insertMembershipError) {
      if (isMissingRelationError(insertMembershipError.message)) {
        return buildLocalFallbackResponse(
          "Workspace uyelik tablolari bu veritabaninda henuz kurulu degil. Secimin bu cihazda yerel baglam olarak kaydedildi.",
        );
      }
      return NextResponse.json({ error: insertMembershipError.message }, { status: 500 });
    }

    membershipId = insertedMembership.id;
  }

  const { error: profileUpdateError } = await supabase
    .from("user_profiles")
    .update({ active_workspace_id: workspace.id })
    .eq("id", auth.userProfileId);

  if (profileUpdateError && !profileUpdateError.message.includes("active_workspace_id")) {
    return NextResponse.json({ error: profileUpdateError.message }, { status: 500 });
  }

  let companyWorkspaceId: string | null = null;
  let savedCompanyProfile: WorkspaceCompanyProfile | null = null;
  let companyWarning: string | null = null;

  try {
    const companySaveResult = await upsertCompanyWorkspaceForWorkspace({
      supabase,
      organizationId: organization.id,
      userId: auth.userId,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceCountryCode: workspace.country_code,
      roleKey: body.roleKey,
      companyWorkspaceId: body.companyWorkspaceId ?? normalizedCompanyProfile.companyWorkspaceId,
      companyProfile: normalizedCompanyProfile,
    });

    companyWorkspaceId = companySaveResult.companyWorkspaceId;
    savedCompanyProfile = companySaveResult.companyProfile;
    companyWarning = companySaveResult.warning;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Isyeri bilgileri kaydedilemedi." },
      { status: 500 },
    );
  }

  await logSecurityEventWithContext({
    eventType: "workspace.onboarding.completed",
    userId: auth.userId,
    organizationId: organization.id,
    severity: "info",
    details: {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      jurisdictionCode: workspace.country_code,
      roleKey: body.roleKey,
      certificationId,
    },
  });

  return NextResponse.json({
    ok: true,
    membershipId,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      countryCode: workspace.country_code,
      defaultLanguage: workspace.default_language,
      timezone: workspace.timezone,
    },
    companyWorkspaceId,
    companyProfile: savedCompanyProfile,
    companyWarning,
  });
}
