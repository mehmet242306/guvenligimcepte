"use client";

import dynamic from "next/dynamic";

const CompanyWorkspaceClientNoSSR = dynamic(
  () =>
    import("./CompanyWorkspaceClient").then(
      (mod) => mod.CompanyWorkspaceClient,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <div className="space-y-4">
          <span className="eyebrow">
            Çalışma Alanı
          </span>
          <h1 className="text-2xl font-semibold text-foreground">
            Çalışma alanı yükleniyor
          </h1>
          <p className="text-sm leading-7 text-muted-foreground">
            Firma verileri tarayıcı tarafında hazırlanıyor. Lütfen bekleyin...
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    ),
  },
);

export function CompanyWorkspacePageClient({
  companyId,
}: {
  companyId: string;
}) {
  return <CompanyWorkspaceClientNoSSR companyId={companyId} />;
}
