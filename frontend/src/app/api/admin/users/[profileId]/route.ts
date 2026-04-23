import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setPrivilegedAccountTypeAccess } from "@/lib/account/account-type-access";
import { createAdminNotification, logErrorEvent } from "@/lib/admin-observability/server";
import { requirePermission } from "@/lib/supabase/api-auth";
import { resolveAppOriginFromRequest } from "@/lib/server/app-origin";
import { createServiceClient, logSecurityEventWithContext, parseJsonBody } from "@/lib/security/server";

const bodySchema = z.object({
  action: z.enum(["toggle_active", "send_password_reset", "unlock_account", "set_account_type_access"]),
  isActive: z.boolean().optional(),
  accountType: z.enum(["osgb", "enterprise"]).optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ profileId: string }> },
) {
  const auth = await requirePermission(request, "admin.users.manage");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const { profileId } = await context.params;
  const supabase = createServiceClient();

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, auth_user_id, email, full_name, is_active")
    .eq("id", profileId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile?.id) {
    return NextResponse.json({ error: "Kullanici profili bulunamadi." }, { status: 404 });
  }

  try {
    if (parsed.data.action === "toggle_active") {
      const nextState = parsed.data.isActive ?? !profile.is_active;
      const { error } = await supabase
        .from("user_profiles")
        .update({ is_active: nextState })
        .eq("id", profile.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await logSecurityEventWithContext({
        eventType: nextState ? "admin.user.activated" : "admin.user.deactivated",
        userId: auth.userId,
        organizationId: auth.organizationId,
        severity: "warning",
        details: {
          targetProfileId: profile.id,
          targetAuthUserId: profile.auth_user_id,
          targetEmail: profile.email,
        },
      });

      await createAdminNotification({
        category: "user_management",
        level: "info",
        title: nextState ? "Kullanici yeniden aktifleştirildi" : "Kullanici pasife alindi",
        message: `${profile.full_name || profile.email || "Kullanici"} durumu guncellendi.`,
        link: "/settings?tab=users",
        metadata: { profileId: profile.id, isActive: nextState },
      });

      return NextResponse.json({ ok: true, isActive: nextState });
    }

    if (parsed.data.action === "send_password_reset") {
      if (!profile.email) {
        return NextResponse.json({ error: "Kullanici icin e-posta bulunamadi." }, { status: 400 });
      }

      const origin = resolveAppOriginFromRequest(request);
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${origin}/reset-password`,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await logSecurityEventWithContext({
        eventType: "admin.user.password_reset_sent",
        userId: auth.userId,
        organizationId: auth.organizationId,
        severity: "info",
        details: { targetProfileId: profile.id, targetEmail: profile.email },
      });

      return NextResponse.json({ ok: true });
    }

    if (parsed.data.action === "set_account_type_access") {
      if (!profile.auth_user_id) {
        return NextResponse.json({ error: "Auth kullanici kaydi bulunamadi." }, { status: 400 });
      }

      if (!parsed.data.accountType || typeof parsed.data.enabled !== "boolean") {
        return NextResponse.json({ error: "Hesap tipi erisim bilgisi eksik." }, { status: 400 });
      }

      const { data: fetchedUser, error: fetchUserError } = await supabase.auth.admin.getUserById(
        profile.auth_user_id,
      );

      if (fetchUserError || !fetchedUser.user) {
        return NextResponse.json(
          { error: fetchUserError?.message || "Auth kullanicisi okunamadi." },
          { status: 404 },
        );
      }

      const targetUser = fetchedUser.user;
      const accountTypeLabel = parsed.data.accountType === "osgb" ? "OSGB" : "Kurumsal";

      const { error: updateAccessError } = await supabase.auth.admin.updateUserById(targetUser.id, {
        app_metadata: setPrivilegedAccountTypeAccess(
          (targetUser.app_metadata ?? {}) as Record<string, unknown>,
          parsed.data.accountType,
          parsed.data.enabled,
        ),
      });

      if (updateAccessError) {
        return NextResponse.json({ error: updateAccessError.message }, { status: 500 });
      }

      await logSecurityEventWithContext({
        eventType: parsed.data.enabled
          ? "admin.user.account_type_access_enabled"
          : "admin.user.account_type_access_disabled",
        userId: auth.userId,
        organizationId: auth.organizationId,
        severity: "warning",
        details: {
          targetProfileId: profile.id,
          targetAuthUserId: targetUser.id,
          targetEmail: profile.email,
          accountType: parsed.data.accountType,
          enabled: parsed.data.enabled,
        },
      });

      await createAdminNotification({
        category: "user_management",
        level: "info",
        title: `${accountTypeLabel} erisimi guncellendi`,
        message: `${profile.full_name || profile.email || "Kullanici"} icin ${accountTypeLabel.toLowerCase()} secenegi ${
          parsed.data.enabled ? "acildi" : "kapatildi"
        }.`,
        link: "/settings?tab=users",
        metadata: {
          profileId: profile.id,
          authUserId: targetUser.id,
          accountType: parsed.data.accountType,
          enabled: parsed.data.enabled,
        },
      });

      return NextResponse.json({ ok: true });
    }

    if (profile.auth_user_id) {
      const { error: unlockByUserError } = await supabase
        .from("auth_login_lockouts")
        .update({
          failed_attempts: 0,
          locked_until: null,
          last_failed_at: null,
        })
        .eq("user_id", profile.auth_user_id);

      if (unlockByUserError) {
        return NextResponse.json({ error: unlockByUserError.message }, { status: 500 });
      }
    }

    if (profile.email) {
      const { error: unlockByEmailError } = await supabase
        .from("auth_login_lockouts")
        .update({
          failed_attempts: 0,
          locked_until: null,
          last_failed_at: null,
        })
        .eq("email", profile.email);

      if (unlockByEmailError) {
        return NextResponse.json({ error: unlockByEmailError.message }, { status: 500 });
      }
    }

    await logSecurityEventWithContext({
      eventType: "admin.user.lockout_cleared",
      userId: auth.userId,
      organizationId: auth.organizationId,
      severity: "warning",
      details: {
        targetProfileId: profile.id,
        targetAuthUserId: profile.auth_user_id,
        targetEmail: profile.email,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kullanici aksiyonu basarisiz oldu.";
    await logErrorEvent({
      level: "error",
      source: "api.admin.users",
      endpoint: request.nextUrl.pathname,
      message,
      stackTrace: error instanceof Error ? error.stack ?? null : null,
      userId: auth.userId,
      organizationId: auth.organizationId,
      context: {
        action: parsed.data.action,
        profileId,
      },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
