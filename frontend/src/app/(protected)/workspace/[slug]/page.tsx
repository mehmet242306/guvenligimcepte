import { CompanyWorkspaceClient } from "@/app/(protected)/companies/[id]/CompanyWorkspaceClient";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Gerçek 404: yalnızca DB'de kayıtlı slug veya workspace UUID kabul et.
  // Aksi halde istemci "firma bulunamadı" ile 200 döner → Search Console Soft 404.
  let workspaceId: string | null = null;
  if (uuidPattern.test(slug)) {
    const { data } = await supabase.from("company_workspaces").select("id").eq("id", slug).maybeSingle();
    workspaceId = data?.id ?? null;
  } else {
    const { data: bySlug } = await supabase.from("company_workspaces").select("id").eq("slug", slug).maybeSingle();
    workspaceId = bySlug?.id ?? null;
  }

  if (!workspaceId) notFound();

  return <CompanyWorkspaceClient companyId={workspaceId} />;
}
