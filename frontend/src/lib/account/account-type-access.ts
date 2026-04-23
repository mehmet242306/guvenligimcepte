export const ACCOUNT_TYPE_VALUES = ["individual", "osgb", "enterprise"] as const;

export type ManagedAccountType = (typeof ACCOUNT_TYPE_VALUES)[number];
export type PrivilegedAccountType = Exclude<ManagedAccountType, "individual">;

type MetadataRecord = Record<string, unknown>;

function isMetadataRecord(value: unknown): value is MetadataRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeManagedAccountType(value: unknown): ManagedAccountType | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "osgb") return "osgb";
  if (normalized === "enterprise" || normalized === "corporate" || normalized === "kurumsal") {
    return "enterprise";
  }
  if (normalized === "individual" || normalized === "bireysel") {
    return "individual";
  }
  return null;
}

function collectAllowedAccountTypes(value: unknown, bucket: Set<ManagedAccountType>) {
  if (!value) return;

  if (Array.isArray(value)) {
    value.forEach((item) => {
      const normalized = normalizeManagedAccountType(item);
      if (normalized) bucket.add(normalized);
    });
    return;
  }

  if (typeof value === "string") {
    value
      .split(/[,\s]+/)
      .map((item) => normalizeManagedAccountType(item))
      .filter((item): item is ManagedAccountType => item !== null)
      .forEach((item) => bucket.add(item));
    return;
  }

  if (!isMetadataRecord(value)) {
    return;
  }

  if ("allowed_account_types" in value) {
    collectAllowedAccountTypes(value.allowed_account_types, bucket);
  }

  if ("account_type_access" in value) {
    collectAllowedAccountTypes(value.account_type_access, bucket);
  }

  for (const accountType of ACCOUNT_TYPE_VALUES) {
    if (value[accountType] === true) {
      bucket.add(accountType);
    }
  }
}

export function readAllowedAccountTypesFromMetadata(...sources: unknown[]): ManagedAccountType[] {
  const bucket = new Set<ManagedAccountType>();
  sources.forEach((source) => collectAllowedAccountTypes(source, bucket));
  return ACCOUNT_TYPE_VALUES.filter((accountType) => bucket.has(accountType));
}

export function resolveAllowedAccountTypes(options: {
  appMetadata?: unknown;
  userMetadata?: unknown;
  currentAccountType?: ManagedAccountType | null;
  isPlatformAdmin?: boolean;
}): ManagedAccountType[] {
  if (options.isPlatformAdmin) {
    return [...ACCOUNT_TYPE_VALUES];
  }

  const bucket = new Set<ManagedAccountType>(["individual"]);

  readAllowedAccountTypesFromMetadata(options.appMetadata, options.userMetadata).forEach((accountType) => {
    bucket.add(accountType);
  });

  if (options.currentAccountType) {
    bucket.add(options.currentAccountType);
  }

  return ACCOUNT_TYPE_VALUES.filter((accountType) => bucket.has(accountType));
}

export function hasAccountTypeAccess(
  allowedAccountTypes: readonly ManagedAccountType[] | null | undefined,
  accountType: ManagedAccountType,
) {
  if (accountType === "individual") {
    return true;
  }

  return (allowedAccountTypes ?? []).includes(accountType);
}

export function setPrivilegedAccountTypeAccess(
  metadata: Record<string, unknown> | null | undefined,
  accountType: PrivilegedAccountType,
  enabled: boolean,
): Record<string, unknown> {
  const current = new Set(readAllowedAccountTypesFromMetadata(metadata));

  if (enabled) {
    current.add(accountType);
  } else {
    current.delete(accountType);
  }

  current.add("individual");

  return {
    ...(metadata ?? {}),
    allowed_account_types: ACCOUNT_TYPE_VALUES.filter((value) => current.has(value)),
  };
}
