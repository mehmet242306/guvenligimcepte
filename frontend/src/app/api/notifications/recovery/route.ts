import { NextRequest, NextResponse } from "next/server";
import { sendRecoveryNudgeEmail } from "@/lib/mailer";
import { createServiceClient } from "@/lib/security/server";
import { resolveAppOriginFromRequest } from "@/lib/server/app-origin";

export const runtime = "nodejs";

const DEFAULT_INACTIVE_DAYS = 30;
const MAX_USERS_PER_RUN = 100;

function isAuthorizedCronRequest(request: NextRequest) {
  if (request.headers.get("x-vercel-cron") === "1") return true;

  const cronSecret =
    process.env.CRON_SECRET?.trim() || process.env.SELF_HEALING_CRON_SECRET?.trim();
  if (cronSecret) {
    return request.headers.get("authorization") === `Bearer ${cronSecret}`;
  }

  return process.env.NODE_ENV !== "production";
}

function monthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function daysBetween(left: Date, right: Date) {
  return Math.max(0, Math.floor((right.getTime() - left.getTime()) / 86_400_000));
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inactiveDays = Number(process.env.RECOVERY_EMAIL_INACTIVE_DAYS ?? DEFAULT_INACTIVE_DAYS);
  const thresholdDays =
    Number.isFinite(inactiveDays) && inactiveDays >= 7 ? inactiveDays : DEFAULT_INACTIVE_DAYS;
  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() - thresholdDays);

  const service = createServiceClient();
  const { data: usersData, error: usersError } = await service.auth.admin.listUsers({
    page: 1,
    perPage: MAX_USERS_PER_RUN,
  });

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const candidates = (usersData.users ?? [])
    .filter((user) => user.email)
    .filter((user) => {
      const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
      const createdAt = user.created_at ? new Date(user.created_at) : null;
      const activityDate = lastSignIn ?? createdAt;
      return activityDate ? activityDate < threshold : false;
    });

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0 });
  }

  const userIds = candidates.map((user) => user.id);
  const [{ data: profileRows }, { data: preferenceRows }] = await Promise.all([
    service.from("user_profiles").select("auth_user_id, full_name, email").in("auth_user_id", userIds),
    service.from("user_preferences").select("user_id, email_notifications").in("user_id", userIds),
  ]);

  const profilesByUser = new Map(
    ((profileRows ?? []) as Array<{
      auth_user_id: string;
      full_name: string | null;
      email: string | null;
    }>).map((row) => [row.auth_user_id, row]),
  );
  const preferencesByUser = new Map(
    ((preferenceRows ?? []) as Array<{ user_id: string; email_notifications: boolean }>).map(
      (row) => [row.user_id, row.email_notifications],
    ),
  );

  const loginUrl = `${resolveAppOriginFromRequest(request)}/login`;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of candidates) {
    if (!user.email) continue;
    if (preferencesByUser.get(user.id) === false) {
      skipped += 1;
      continue;
    }

    const profile = profilesByUser.get(user.id);
    const recipientEmail = profile?.email?.trim() || user.email;
    const activityDate = new Date(user.last_sign_in_at ?? user.created_at ?? now.toISOString());
    const eventKey = `recovery-nudge:${user.id}:${monthKey(now)}`;
    const { error: logInsertError } = await service.from("email_notification_logs").insert({
      event_key: eventKey,
      notification_type: "recovery_nudge",
      user_id: user.id,
      organization_id: null,
      recipient_email: recipientEmail,
      status: "sent",
      metadata: {
        last_sign_in_at: user.last_sign_in_at ?? null,
        created_at: user.created_at ?? null,
        threshold_days: thresholdDays,
      },
    });

    if (logInsertError) {
      if (logInsertError.message.toLowerCase().includes("duplicate")) {
        skipped += 1;
        continue;
      }
      failed += 1;
      console.error("[recovery-email] log insert failed:", logInsertError.message);
      continue;
    }

    try {
      await sendRecoveryNudgeEmail({
        to: recipientEmail,
        fullName: profile?.full_name ?? recipientEmail,
        loginUrl,
        daysInactive: daysBetween(activityDate, now),
      });
      sent += 1;
    } catch (mailError) {
      failed += 1;
      await service
        .from("email_notification_logs")
        .update({
          status: "failed",
          error_message:
            mailError instanceof Error ? mailError.message.slice(0, 500) : "mail_failed",
        })
        .eq("event_key", eventKey);
      console.error("[recovery-email] send failed:", mailError);
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, failed });
}
