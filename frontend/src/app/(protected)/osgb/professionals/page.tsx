import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getAccountContextForUser,
  hasOsgbManagementAccess,
  resolvePostLoginPath,
} from "@/lib/account/account-routing";
import OsgbManagedProfessionalsClient from "./OsgbManagedProfessionalsClient";

export default async function OsgbProfessionalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const context = await getAccountContextForUser(user.id);
  if (context.isPlatformAdmin) {
    redirect("/platform-admin");
  }
  if (!hasOsgbManagementAccess(context)) {
    redirect(resolvePostLoginPath(context));
  }

  return <OsgbManagedProfessionalsClient />;
}
