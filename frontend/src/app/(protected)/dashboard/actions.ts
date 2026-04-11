"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createClient();

  // Remove session record before signing out
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("user_sessions").delete().eq("user_id", user.id);
  }

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
