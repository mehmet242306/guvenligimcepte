import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InviteActions } from "./InviteActions";

export const dynamic = "force-dynamic";

type InvitePreview = {
  id: string;
  status: string;
  company_identity_id: string;
  company_name: string | null;
  inviter_full_name: string | null;
  invitee_email: string;
  expires_at: string | null;
  message: string | null;
};

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30 px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">RiskNova</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Firma Daveti</h2>
        </div>
        {children}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Ana sayfaya dön</Link>
        </div>
      </div>
    </main>
  );
}

function StatusCard({
  tone,
  title,
  description,
  action,
}: {
  tone: "error" | "info" | "warning";
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  const toneClasses = {
    error:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200",
    info:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100",
    warning:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100",
  }[tone];

  return (
    <div className={`rounded-2xl border p-8 shadow-sm ${toneClasses}`}>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-6 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  if (!supabase) {
    return (
      <InviteShell>
        <StatusCard
          tone="error"
          title="Bağlantı Sorunu"
          description="Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin."
        />
      </InviteShell>
    );
  }

  const [{ data: { user } }, previewResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("preview_company_invitation", { p_invitation_id: id }),
  ]);

  const previewRows = (previewResult.data ?? []) as InvitePreview[];
  const preview = previewRows[0];

  if (previewResult.error || !preview) {
    return (
      <InviteShell>
        <StatusCard
          tone="error"
          title="Davet Bulunamadı"
          description="Bu davet artık mevcut değil ya da bağlantı geçersiz. Davet edenle iletişime geçerek yeni bir bağlantı isteyebilirsiniz."
        />
      </InviteShell>
    );
  }

  if (preview.status === "accepted") {
    return (
      <InviteShell>
        <StatusCard
          tone="info"
          title="Davet Zaten Kabul Edilmiş"
          description="Bu davet daha önce kabul edilmiş. Kontrol panelinizden firma erişiminize ulaşabilirsiniz."
          action={{ href: "/dashboard", label: "Kontrol Paneline Git" }}
        />
      </InviteShell>
    );
  }

  if (preview.status === "declined") {
    return (
      <InviteShell>
        <StatusCard
          tone="error"
          title="Davet Reddedildi"
          description="Bu davet daha önce reddedildi. Yeni bir davet için davet edenle iletişime geçin."
        />
      </InviteShell>
    );
  }

  if (preview.status === "revoked") {
    return (
      <InviteShell>
        <StatusCard
          tone="error"
          title="Davet İptal Edildi"
          description="Bu davet, davet eden tarafından iptal edildi."
        />
      </InviteShell>
    );
  }

  const isExpired =
    preview.status === "expired" || (preview.expires_at != null && new Date(preview.expires_at) < new Date());
  if (isExpired) {
    return (
      <InviteShell>
        <StatusCard
          tone="warning"
          title="Davetin Süresi Geçti"
          description="Bu davetin geçerlilik süresi dolmuş. Yeni bir davet talep edin."
        />
      </InviteShell>
    );
  }

  const expiresLabel = formatDateTime(preview.expires_at);
  const nextPath = `/invite/${preview.id}`;
  const nextParam = encodeURIComponent(nextPath);

  return (
    <InviteShell>
      <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Firma Daveti</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            {preview.company_name || "Bir firma"} sizi RiskNova çalışma alanına davet etti
          </h1>
        </div>

        <dl className="space-y-3 rounded-lg border border-border bg-secondary/30 p-4 text-sm">
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <dt className="text-xs text-muted-foreground">Davet eden</dt>
            <dd className="font-medium text-foreground">{preview.inviter_full_name || "Belirtilmemiş"}</dd>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <dt className="text-xs text-muted-foreground">Davet edilen</dt>
            <dd className="font-medium text-foreground">{preview.invitee_email}</dd>
          </div>
          {preview.message && (
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <dt className="text-xs text-muted-foreground">Not</dt>
              <dd className="text-foreground">{preview.message}</dd>
            </div>
          )}
          {expiresLabel && (
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <dt className="text-xs text-muted-foreground">Son geçerlilik</dt>
              <dd className="text-foreground">{expiresLabel}</dd>
            </div>
          )}
        </dl>

        {user ? (
          <InviteActions
            invitationId={preview.id}
            inviteeEmail={preview.invitee_email}
            currentUserEmail={user.email ?? ""}
          />
        ) : (
          <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
            <p className="text-foreground">
              Daveti kabul etmek için <strong>{preview.invitee_email}</strong> e-posta adresiyle bir hesabın olması
              gerekir.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/login?next=${nextParam}`}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Giriş Yap
              </Link>
              <Link
                href={`/register?email=${encodeURIComponent(preview.invitee_email)}&next=${nextParam}`}
                className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-center text-sm font-semibold text-foreground hover:bg-secondary/50"
              >
                Hesap Oluştur
              </Link>
            </div>
          </div>
        )}
      </div>
    </InviteShell>
  );
}
