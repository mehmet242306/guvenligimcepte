"use client";

import dynamic from "next/dynamic";
import { CompanyWorkspaceShellLoading } from "./CompanyWorkspaceShellLoading";

const CompanyWorkspaceClientNoSSR = dynamic(
  () =>
    import("./CompanyWorkspaceClient").then(
      (mod) => mod.CompanyWorkspaceClient,
    ),
  {
    ssr: false,
    loading: () => <CompanyWorkspaceShellLoading />,
  },
);

export function CompanyWorkspacePageClient({
  companyId,
}: {
  companyId: string;
}) {
  return <CompanyWorkspaceClientNoSSR companyId={companyId} />;
}
