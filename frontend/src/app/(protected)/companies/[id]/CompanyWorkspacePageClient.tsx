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
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
        <div className="space-y-4">
          <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            İşyeri çalışma alanı
          </span>
          <h1 className="text-2xl font-semibold text-slate-950">
            İşyeri çalışma alanı yükleniyor
          </h1>
          <p className="text-sm leading-7 text-slate-600">
            Firma verileri tarayıcı tarafında hazırlanıyor. Lütfen bekleyin...
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-200" />
          <div className="h-4 w-full animate-pulse rounded-full bg-slate-200" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-200" />
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
