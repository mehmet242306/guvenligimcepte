import { CompanyWorkspaceClient } from "./CompanyWorkspaceClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CompanyWorkspaceClient companyId={id} />;
}