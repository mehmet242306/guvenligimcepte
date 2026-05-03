"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type InviteActionsProps = {
  invitationId: string;
  inviteeEmail: string;
  currentUserEmail: string;
};

type InviteRpcKey =
  | "errUnexpected"
  | "errExpired"
  | "errNotPending"
  | "errWrongUser"
  | "errNotFound"
  | "errAuthRequired";

function inviteRpcErrorKey(message: string): InviteRpcKey | "raw" {
  if (!message) return "errUnexpected";
  if (/expired/i.test(message)) return "errExpired";
  if (/not pending/i.test(message)) return "errNotPending";
  if (/does not match/i.test(message) || /does not belong/i.test(message)) return "errWrongUser";
  if (/not found/i.test(message)) return "errNotFound";
  if (/auth context/i.test(message)) return "errAuthRequired";
  return "raw";
}

export function InviteActions({ invitationId, inviteeEmail, currentUserEmail }: InviteActionsProps) {
  const router = useRouter();
  const t = useTranslations("publicInviteActions");
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<"accepted" | "declined" | null>(null);

  const normalizedInvitee = inviteeEmail.trim().toLowerCase();
  const normalizedCurrent = currentUserEmail.trim().toLowerCase();
  const emailMismatch = Boolean(normalizedCurrent) && normalizedInvitee !== normalizedCurrent;

  if (emailMismatch) {
    return (
      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        <p>{t("emailMismatch", { inviteeEmail, currentUserEmail })}</p>
        <p className="mt-2">{t("emailMismatchHint")}</p>
      </div>
    );
  }

  if (success === "accepted") {
    return (
      <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
        {t("acceptedRedirecting")}
      </div>
    );
  }

  if (success === "declined") {
    return (
      <div className="mt-6 rounded-lg border border-border bg-secondary/40 p-4 text-sm text-foreground">
        {t("declinedMessage")}
      </div>
    );
  }

  function setErrorFromRpc(message: string) {
    const key = inviteRpcErrorKey(message);
    setError(key === "raw" ? message : t(key));
  }

  async function accept() {
    setLoading("accept");
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError(t("dbError"));
      setLoading(null);
      return;
    }
    const { error: rpcError } = await supabase.rpc("accept_company_invitation", {
      p_invitation_id: invitationId,
    });
    if (rpcError) {
      setErrorFromRpc(rpcError.message);
      setLoading(null);
      return;
    }
    setSuccess("accepted");
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  }

  async function decline() {
    setLoading("decline");
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError(t("dbError"));
      setLoading(null);
      return;
    }
    const { error: rpcError } = await supabase.rpc("decline_company_invitation", {
      p_invitation_id: invitationId,
    });
    if (rpcError) {
      setErrorFromRpc(rpcError.message);
      setLoading(null);
      return;
    }
    setSuccess("declined");
    setLoading(null);
  }

  return (
    <div className="mt-6 space-y-3">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={loading !== null}
          onClick={accept}
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {loading === "accept" ? t("accepting") : t("acceptBtn")}
        </button>
        <button
          type="button"
          disabled={loading !== null}
          onClick={decline}
          className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary/50 disabled:opacity-50"
        >
          {loading === "decline" ? t("declineProcessing") : t("declineBtn")}
        </button>
      </div>
    </div>
  );
}
