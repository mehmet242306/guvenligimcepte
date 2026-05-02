import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getAccountContextForUser,
  hasOsgbManagementAccess,
} from "@/lib/account/account-routing";
import { sendWorkspaceTaskAssignedEmail } from "@/lib/mailer";
import { isCompatError } from "@/lib/osgb/server";
import {
  createServiceClient,
  logSecurityEventWithContext,
  parseJsonBody,
} from "@/lib/security/server";
import { resolveAppOriginFromRequest } from "@/lib/server/app-origin";

const bodySchema = z.object({
  companyWorkspaceId: z.string().uuid("Gecerli bir firma secin."),
  title: z.string().trim().min(2, "Gorev basligi zorunludur.").max(180),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  dueDate: z.string().trim().optional(),
  assigneeUserIds: z.array(z.string().uuid()).max(12).default([]),
});

function normalizeDueDate(value: string | undefined) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
  }

  const context = await getAccountContextForUser(user.id);
  if (
    context.accountType !== "osgb" ||
    !context.organizationId ||
    !hasOsgbManagementAccess(context)
  ) {
    return NextResponse.json({ error: "Bu islem icin yetkiniz yok." }, { status: 403 });
  }

  const service = createServiceClient();
  const dueDate = normalizeDueDate(parsed.data.dueDate);

  if (parsed.data.dueDate && !dueDate) {
    return NextResponse.json(
      { error: "Son tarih YYYY-AA-GG formatinda olmali." },
      { status: 400 },
    );
  }

  const { data: workspaceRow, error: workspaceError } = await service
    .from("company_workspaces")
    .select("id, display_name")
    .eq("id", parsed.data.companyWorkspaceId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (workspaceError) {
    return NextResponse.json({ error: workspaceError.message }, { status: 500 });
  }

  if (!workspaceRow?.id) {
    return NextResponse.json({ error: "Firma kaydi bulunamadi." }, { status: 404 });
  }

  const uniqueAssigneeIds = Array.from(new Set(parsed.data.assigneeUserIds));
  if (uniqueAssigneeIds.length > 0) {
    const { data: assignmentRows, error: assignmentError } = await service
      .from("workspace_assignments")
      .select("user_id")
      .eq("organization_id", context.organizationId)
      .eq("company_workspace_id", parsed.data.companyWorkspaceId)
      .eq("assignment_status", "active")
      .in("user_id", uniqueAssigneeIds);

    if (assignmentError && !isCompatError(assignmentError.message)) {
      return NextResponse.json({ error: assignmentError.message }, { status: 500 });
    }

    const allowedUserIds = new Set(
      ((assignmentRows ?? []) as Array<{ user_id: string }>).map((row) => row.user_id),
    );

    const invalidAssignee = uniqueAssigneeIds.find((id) => !allowedUserIds.has(id));
    if (invalidAssignee) {
      return NextResponse.json(
        { error: "Secilen personel bu firmaya aktif olarak atanmis degil." },
        { status: 400 },
      );
    }
  }

  const { data: taskRow, error: taskError } = await service
    .from("workspace_tasks")
    .insert({
      organization_id: context.organizationId,
      company_workspace_id: parsed.data.companyWorkspaceId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      status: "open",
      priority: parsed.data.priority,
      due_date: dueDate,
      created_by_user_id: user.id,
    })
    .select("id")
    .single();

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 });
  }

  if (uniqueAssigneeIds.length > 0) {
    const { error: taskAssignmentError } = await service
      .from("workspace_task_assignments")
      .insert(
        uniqueAssigneeIds.map((userId) => ({
          task_id: taskRow.id,
          user_id: userId,
        })),
      );

    if (taskAssignmentError && !isCompatError(taskAssignmentError.message)) {
      return NextResponse.json({ error: taskAssignmentError.message }, { status: 500 });
    }
  }

  if (uniqueAssigneeIds.length > 0) {
    try {
      const [{ data: profileRows }, { data: preferenceRows }, { data: creatorProfile }] =
        await Promise.all([
          service
            .from("user_profiles")
            .select("auth_user_id, full_name, email")
            .in("auth_user_id", uniqueAssigneeIds),
          service
            .from("user_preferences")
            .select("user_id, email_notifications")
            .in("user_id", uniqueAssigneeIds),
          service
            .from("user_profiles")
            .select("full_name, email")
            .eq("auth_user_id", user.id)
            .maybeSingle(),
        ]);

      const preferencesByUser = new Map(
        ((preferenceRows ?? []) as Array<{ user_id: string; email_notifications: boolean }>).map(
          (row) => [row.user_id, row.email_notifications],
        ),
      );
      const origin = resolveAppOriginFromRequest(request);
      const taskUrl = `${origin}/osgb/tasks?workspaceId=${parsed.data.companyWorkspaceId}`;
      const dueDateLabel = dueDate
        ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(dueDate))
        : null;
      const assignedByName =
        creatorProfile?.full_name?.trim() || creatorProfile?.email || user.email || "RiskNova";

      for (const profile of (profileRows ?? []) as Array<{
        auth_user_id: string;
        full_name: string | null;
        email: string | null;
      }>) {
        if (!profile.email) continue;
        if (preferencesByUser.get(profile.auth_user_id) === false) continue;

        const eventKey = `workspace-task-assigned:${taskRow.id}:${profile.auth_user_id}`;
        const { error: logInsertError } = await service.from("email_notification_logs").insert({
          event_key: eventKey,
          notification_type: "workspace_task_assigned",
          user_id: profile.auth_user_id,
          organization_id: context.organizationId,
          recipient_email: profile.email,
          status: "sent",
          metadata: {
            task_id: taskRow.id,
            company_workspace_id: parsed.data.companyWorkspaceId,
          },
        });

        if (logInsertError) {
          if (!logInsertError.message.toLowerCase().includes("duplicate")) {
            console.error("[osgb.tasks.create] email log failed:", logInsertError.message);
          }
          continue;
        }

        try {
          await sendWorkspaceTaskAssignedEmail({
            to: profile.email,
            fullName: profile.full_name || profile.email,
            taskTitle: parsed.data.title,
            companyName: workspaceRow.display_name || "Firma",
            priority: parsed.data.priority,
            dueDateLabel,
            taskUrl,
            assignedByName,
          });
        } catch (mailError) {
          await service
            .from("email_notification_logs")
            .update({
              status: "failed",
              error_message:
                mailError instanceof Error ? mailError.message.slice(0, 500) : "mail_failed",
            })
            .eq("event_key", eventKey);
          console.error("[osgb.tasks.create] assignment email failed:", mailError);
        }
      }
    } catch (mailSetupError) {
      console.error("[osgb.tasks.create] assignment email setup failed:", mailSetupError);
    }
  }

  try {
    const { error: activityError } = await service.from("workspace_activity_logs").insert({
      organization_id: context.organizationId,
      company_workspace_id: parsed.data.companyWorkspaceId,
      actor_user_id: user.id,
      event_type: "workspace.task.created",
      event_payload: {
        task_id: taskRow.id,
        title: parsed.data.title,
        priority: parsed.data.priority,
        due_date: dueDate,
        assignee_count: uniqueAssigneeIds.length,
      },
    });

    if (activityError && !isCompatError(activityError.message)) {
      console.error("[osgb.tasks.create] activity log failed:", activityError.message);
    }
  } catch (error) {
    console.error("[osgb.tasks.create] activity log failed:", error);
  }

  await logSecurityEventWithContext({
    eventType: "osgb.task.created",
    endpoint: "/api/osgb/tasks",
    userId: user.id,
    organizationId: context.organizationId,
    severity: "info",
    details: {
      companyWorkspaceId: parsed.data.companyWorkspaceId,
      taskId: taskRow.id,
      assigneeCount: uniqueAssigneeIds.length,
    },
  });

  return NextResponse.json({
    ok: true,
    taskId: taskRow.id,
    message: `${workspaceRow.display_name || "Firma"} icin gorev olusturuldu.`,
  });
}
