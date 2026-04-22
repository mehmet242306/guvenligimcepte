"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type InviteActionsProps = {
  invitationId: string;
  inviteeEmail: string;
  currentUserEmail: string;
};

export function InviteActions({ invitationId, inviteeEmail, currentUserEmail }: InviteActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<"accepted" | "declined" | null>(null);

  const normalizedInvitee = inviteeEmail.trim().toLowerCase();
  const normalizedCurrent = currentUserEmail.trim().toLowerCase();
  const emailMismatch = Boolean(normalizedCurrent) && normalizedInvitee !== normalizedCurrent;

  if (emailMismatch) {
    return (
      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        <p>
          Bu davet <strong>{inviteeEmail}</strong> e-posta adresi için gönderildi, ancak şu an{" "}
          <strong>{currentUserEmail}</strong> ile giriş yapmış durumdasınız.
        </p>
        <p className="mt-2">Daveti kabul edebilmek için lütfen doğru hesapla tekrar giriş yapın.</p>
      </div>
    );
  }

  if (success === "accepted") {
    return (
      <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
        Davet kabul edildi. Kontrol paneline yönlendiriliyorsunuz…
      </div>
    );
  }

  if (success === "declined") {
    return (
      <div className="mt-6 rounded-lg border border-border bg-secondary/40 p-4 text-sm text-foreground">
        Daveti reddettiniz. İstediğiniz zaman yeni bir davet talep edebilirsiniz.
      </div>
    );
  }

  async function accept() {
    setLoading("accept");
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Veritabanı bağlantısı kurulamadı.");
      setLoading(null);
      return;
    }
    const { error: rpcError } = await supabase.rpc("accept_company_invitation", {
      p_invitation_id: invitationId,
    });
    if (rpcError) {
      setError(translateInviteError(rpcError.message));
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
      setError("Veritabanı bağlantısı kurulamadı.");
      setLoading(null);
      return;
    }
    const { error: rpcError } = await supabase.rpc("decline_company_invitation", {
      p_invitation_id: invitationId,
    });
    if (rpcError) {
      setError(translateInviteError(rpcError.message));
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
          {loading === "accept" ? "Kabul ediliyor…" : "Daveti Kabul Et"}
        </button>
        <button
          type="button"
          disabled={loading !== null}
          onClick={decline}
          className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary/50 disabled:opacity-50"
        >
          {loading === "decline" ? "İşleniyor…" : "Reddet"}
        </button>
      </div>
    </div>
  );
}

function translateInviteError(message: string): string {
  if (!message) return "Beklenmeyen bir hata oluştu.";
  if (/expired/i.test(message)) return "Bu davetin süresi dolmuş.";
  if (/not pending/i.test(message)) return "Bu davet artık bekleyen durumda değil (kabul/red/iptal edilmiş olabilir).";
  if (/does not match/i.test(message) || /does not belong/i.test(message))
    return "Bu davet, giriş yaptığınız kullanıcıya ait değil. Doğru hesapla giriş yapmanız gerekir.";
  if (/not found/i.test(message)) return "Davet bulunamadı.";
  if (/auth context/i.test(message)) return "Davet kabulü için giriş yapmanız gerekir.";
  return message;
}
