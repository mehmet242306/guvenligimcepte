import { CompanyWorkspaceClient } from "@/app/(protected)/companies/[id]/CompanyWorkspaceClient";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  // Slug veya UUID olabilir — önce slug olarak dene
  let workspaceId: string | null = null;
  const { data: bySlug } = await supabase
    .from("company_workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (bySlug?.id) {
    workspaceId = bySlug.id;
  } else {
    // Slug bulunamazsa UUID olabilir
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(slug)) {
      workspaceId = slug;
    }
  }

  if (!workspaceId) notFound();

  return <CompanyWorkspaceClient companyId={workspaceId} />;
}
