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

  // UUID: slug görünürse (RLS izin veriyorsa) kanonik URL'e yönlendir.
  // RLS satırı gizliyse sorgu boş döner — bu durumda yine de client render edilir;
  // aksi halde sunucu notFound() ile gerçek 404 verir ve kullanıcı hiç içeriği göremez.
  if (uuidPattern.test(id)) {
    const { data } = await supabase
      .from("company_workspaces")
      .select("slug")
      .eq("id", id)
      .maybeSingle();
    const slug = typeof data?.slug === "string" ? data.slug.trim() : "";
    if (slug) redirect(`/workspace/${slug}`);
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