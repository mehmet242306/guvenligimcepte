import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getAccountContextForUser,
  resolvePostLoginPath,
} from "@/lib/account/account-routing";
import IndividualOsgbAffiliationsClient from "./IndividualOsgbAffiliationsClient";

export default async function IndividualOsgbAffiliationsPage() {
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
  if (context.accountType !== "individual" || !context.organizationId) {
    redirect(resolvePostLoginPath(context));
  }
  if (context.membershipRole !== "owner" && context.membershipRole !== "admin") {
    redirect(resolvePostLoginPath(context));
  }

  return <IndividualOsgbAffiliationsClient />;
}
