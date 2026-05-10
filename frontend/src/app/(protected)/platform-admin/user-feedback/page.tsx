import Link from "next/link";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createServiceClient } from "@/lib/security/server";

export const dynamic = "force-dynamic";

type FeedbackRow = {
  id: string;
  user_id: string;
  organization_id: string | null;
  category: string;
  message: string;
  page_path: string | null;
  locale: string | null;
  created_at: string;
};

type ProfileLite = {
  auth_user_id: string | null;
  email: string | null;
  full_name: string | null;
};

function categoryLabel(
  t: Awaited<ReturnType<typeof getTranslations>>,
  code: string,
) {
  const map: Record<string, string> = {
    bug: t("category_bug"),
    idea: t("category_idea"),
    usability: t("category_usability"),
    other: t("category_other"),
  };
  return map[code] ?? code;
}

export default async function PlatformAdminUserFeedbackPage() {
  const t = await getTranslations("platformAdmin.userFeedback");
  const service = createServiceClient();

  const { data: rawRows, error } = await service
    .from("platform_user_feedback")
    .select("id, user_id, organization_id, category, message, page_path, locale, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  const rows: FeedbackRow[] = ((rawRows as FeedbackRow[] | null) ?? []).filter(Boolean);

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const orgIds = [...new Set(rows.map((r) => r.organization_id).filter(Boolean))] as string[];

  const [{ data: profiles }, { data: orgs }] = await Promise.all([
    userIds.length
      ? service
          .from("user_profiles")
          .select("auth_user_id, email, full_name")
          .in("auth_user_id", userIds)
      : Promise.resolve({ data: [] as ProfileLite[] | null }),
    orgIds.length
      ? service.from("organizations").select("id, name").in("id", orgIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] | null }),
  ]);

  const profileByUser = new Map<string, ProfileLite>();
  for (const p of (profiles as ProfileLite[] | null) ?? []) {
    if (p.auth_user_id) profileByUser.set(p.auth_user_id, p);
  }

  const orgNameById = new Map<string, string>();
  for (const o of orgs ?? []) {
    orgNameById.set(o.id, o.name);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <Link
            href="/platform-admin"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            {t("backLink")}
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <MessageSquareText className="h-6 w-6 text-[var(--gold)]" />
            {t("title")}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
          {t("loadError", { message: error.message })}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center shadow-[var(--shadow-elevated)]">
          <p className="text-base font-semibold text-foreground">{t("emptyTitle")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-[var(--shadow-elevated)]">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 font-semibold text-foreground">{t("colDate")}</th>
                <th className="px-4 py-3 font-semibold text-foreground">{t("colCategory")}</th>
                <th className="px-4 py-3 font-semibold text-foreground">{t("colUser")}</th>
                <th className="px-4 py-3 font-semibold text-foreground">{t("colOrg")}</th>
                <th className="px-4 py-3 font-semibold text-foreground">{t("localeLabel")}</th>
                <th className="px-4 py-3 font-semibold text-foreground">{t("colPage")}</th>
                <th className="px-4 py-3 font-semibold text-foreground">{t("colMessage")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const prof = profileByUser.get(row.user_id);
                const display =
                  prof?.full_name?.trim() ||
                  prof?.email?.trim() ||
                  `${row.user_id.slice(0, 8)}…`;
                const org =
                  row.organization_id && orgNameById.has(row.organization_id)
                    ? orgNameById.get(row.organization_id)!
                    : row.organization_id
                      ? row.organization_id.slice(0, 8) + "…"
                      : "—";
                const when = new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(row.created_at));

                return (
                  <tr key={row.id} className="border-b border-border/60 align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{when}</td>
                    <td className="whitespace-nowrap px-4 py-3">{categoryLabel(t, row.category)}</td>
                    <td className="max-w-[200px] px-4 py-3">
                      <div className="font-medium text-foreground">{display}</div>
                      {prof?.email ? (
                        <div className="break-all text-xs text-muted-foreground">{prof.email}</div>
                      ) : null}
                    </td>
                    <td className="max-w-[160px] px-4 py-3 text-muted-foreground">{org}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {row.locale ?? "—"}
                    </td>
                    <td className="max-w-[200px] px-4 py-3 font-mono text-xs text-muted-foreground">
                      {row.page_path ? (
                        <span className="break-all" title={row.page_path}>
                          {row.page_path.length > 48 ? `${row.page_path.slice(0, 48)}…` : row.page_path}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <p className="whitespace-pre-wrap text-foreground">{row.message}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
