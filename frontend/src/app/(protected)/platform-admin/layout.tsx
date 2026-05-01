import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getAccountContextForUser,
  resolvePostLoginPath,
} from "@/lib/account/account-routing";

export const dynamic = "force-dynamic";

/**
 * Tum /platform-admin/* rotalari: oturum + platform admin rolu zorunlu.
 * Alt sayfalarda tekrarlanan kontroller kaldirildi (tek kaynak).
 */
export default async function PlatformAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  if (!supabase) {
    redirect(`/login?next=${encodeURIComponent("/platform-admin")}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/platform-admin")}`);
  }

  const context = await getAccountContextForUser(user.id);
  if (!context.isPlatformAdmin) {
    redirect(resolvePostLoginPath(context));
  }

  return <>{children}</>;
}
