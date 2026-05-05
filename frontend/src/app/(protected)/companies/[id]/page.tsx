import { notFound, redirect } from "next/navigation";
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

  // UUID: kayıt varsa ve anlamlı bir slug varsa kanonik /workspace/[slug]; slug yoksa
  // veya henüz atanmamışsa /companies/[uuid] üzerinden client açılmalı (404 olmamalı).
  if (uuidPattern.test(id)) {
    const { data } = await supabase
      .from("company_workspaces")
      .select("id, slug")
      .eq("id", id)
      .maybeSingle();
    if (!data?.id) notFound();
    const slug = typeof data.slug === "string" ? data.slug.trim() : "";
    if (slug) redirect(`/workspace/${slug}`);
    return <CompanyWorkspaceClient companyId={id} />;
  }

  // Slug veya eski id string (ör. üst bardaki /companies/{slug} linki)
  const { data: bySlug } = await supabase
    .from("company_workspaces")
    .select("id")
    .eq("slug", id)
    .maybeSingle();
  if (bySlug?.id) {
    return <CompanyWorkspaceClient companyId={bySlug.id} />;
  }

  const { data: row } = await supabase.from("company_workspaces").select("id").eq("id", id).maybeSingle();
  if (!row?.id) notFound();

  return <CompanyWorkspaceClient companyId={id} />;
}