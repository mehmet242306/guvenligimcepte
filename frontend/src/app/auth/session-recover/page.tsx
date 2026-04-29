import { AuthSessionRecoverClient } from "./AuthSessionRecoverClient";

function safeNextPath(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next) return "/dashboard";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export default async function AuthSessionRecoverPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[]; next?: string | string[] }>;
}) {
  const params = await searchParams;
  const code = Array.isArray(params.code) ? params.code[0] ?? "" : params.code ?? "";

  return (
    <AuthSessionRecoverClient
      code={code}
      nextPath={safeNextPath(params.next)}
    />
  );
}
