import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanyWorkspaceClient } from "./CompanyWorkspaceClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // UUID geldiyse slug'ı bul ve /workspace/[slug]'a redirect et
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(id)) {
    const { data } = await supabase
      .from("company_workspaces")
      .select("slug")
      .eq("id", id)
      .maybeSingle();
    if (data?.slug) {
      redirect(`/workspace/${data.slug}`);
    }
  }

  return <CompanyWorkspaceClient companyId={id} />;
}