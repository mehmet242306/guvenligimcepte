import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getDemoAccessState } from "@/lib/platform-admin/demo-access";

/**
 * Demo süresi dolunca /register’a düşen kullanıcı kalıcı hesaba geçtiğinde
 * JWT/metadata hâlâ demo ise middleware tekrar /register’a atar. Sunucu tarafında
 * bayrakları kaldırır (JWT yenilemesi çağıran tarafta yapılmalı).
 */
export async function releaseDemoUserLock(service: SupabaseClient, user: User) {
  const demoState = getDemoAccessState({
    userMetadata: user.user_metadata,
    appMetadata: user.app_metadata,
  });
  if (!demoState.demoMode) return;

  const { error } = await service.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata ?? {}),
      demo_mode: false,
      demo_access_expires_at: null,
      demo_access_disabled_at: null,
    },
    app_metadata: {
      ...(user.app_metadata ?? {}),
      demo_mode: false,
      demo_access_expires_at: null,
      demo_access_disabled_at: null,
    },
  });

  if (error) {
    throw new Error(error.message || "Demo hesap kilidi kaldirilamadi.");
  }
}
