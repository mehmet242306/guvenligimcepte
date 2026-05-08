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

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  async function resolveCompanyWorkspaceByOrganization(organizationId: string | null | undefined) {
    if (!organizationId) return null;
    const { data } = await supabase
      .from("company_workspaces")
      .select("id, slug")
      .eq("organization_id", organizationId)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  }

  // UUID: slug görünürse (RLS izin veriyorsa) kanonik URL'e yönlendir.
  // RLS satırı gizliyse sorgu boş döner — bu durumda yine de client render edilir;
  // aksi halde sunucu notFound() ile gerçek 404 verir ve kullanıcı hiç içeriği göremez.
  if (uuidPattern.test(id)) {
    const { data } = await supabase
      .from("company_workspaces")
      .select("id, slug")
      .eq("id", id)
      .maybeSingle();
    if (data?.id) {
      const slug = typeof data.slug === "string" ? data.slug.trim() : "";
      if (slug) redirect(`/workspace/${slug}`);
      return <CompanyWorkspaceClient companyId={data.id} />;
    }

    // Fallback: URL'ye yanlışlıkla nova_workspaces.id geldiyse, aynı organization'a
    // bağlı firma workspace'ini çöz.
    const { data: novaWorkspace } = await supabase
      .from("nova_workspaces")
      .select("organization_id")
      .eq("id", id)
      .maybeSingle();
    const mappedCompany = await resolveCompanyWorkspaceByOrganization(
      novaWorkspace?.organization_id,
    );
    if (mappedCompany?.slug) redirect(`/workspace/${mappedCompany.slug}`);
    if (mappedCompany?.id) return <CompanyWorkspaceClient companyId={mappedCompany.id} />;

    return <CompanyWorkspaceClient companyId={id} />;
  }

  const { data: bySlug } = await supabase
    .from("company_workspaces")
    .select("id, slug")
    .eq("slug", id)
    .maybeSingle();
  const slugTrim = typeof bySlug?.slug === "string" ? bySlug.slug.trim() : "";
  if (slugTrim) redirect(`/workspace/${slugTrim}`);
  if (bySlug?.id) return <CompanyWorkspaceClient companyId={bySlug.id} />;

  return <CompanyWorkspaceClient companyId={id} />;
}