import { AuthSessionRecoverClient } from "./AuthSessionRecoverClient";

function safeNextPath(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next) return "/dashboard";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AuthSessionRecoverPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string | string[];
    next?: string | string[];
    intent?: string | string[];
    accountType?: string | string[];
    countryCode?: string | string[];
    languageCode?: string | string[];
    roleKey?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const code = firstParam(params.code);

  return (
    <AuthSessionRecoverClient
      code={code}
      nextPath={safeNextPath(params.next)}
      intent={firstParam(params.intent)}
      accountType={firstParam(params.accountType)}
      countryCode={firstParam(params.countryCode)}
      languageCode={firstParam(params.languageCode)}
      roleKey={firstParam(params.roleKey)}
    />
  );
}
