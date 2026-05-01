'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Building2,
  Calendar,
  ChevronRight,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileEdit,
  FileText,
  GaugeCircle,
  GraduationCap,
  LayoutDashboard,
  CreditCard,
  PenTool,
  Radar,
  ShieldAlert,
  Siren,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PremiumIconBadge, type PremiumIconTone } from '@/components/ui/premium-icon-badge';
import { DashboardTrackingSummary } from '@/components/dashboard/DashboardTrackingSummary';
import { OhsFileWidget } from '@/components/dashboard/OhsFileWidget';

interface DashboardStats {
  riskCount: number;
  highRiskCount: number;
  documentCount: number;
  readyDocCount: number;
  draftDocCount: number;
  incidentCount: number;
  companyCount: number;
  taskCount: number;
  librarySourcedSurveyCount: number;
  librarySourcedExamCount: number;
  userName: string;
  recentDocs: Array<{ id: string; title: string; status: string; updated_at: string }>;
  isDemoAccount: boolean;
}

export function DashboardClient() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Dashboard açılışında yaklaşan ajanda görevleri için bildirim tarama
  // (günde bir kez, duplike önlemi var)
  useEffect(() => {
    void import("@/lib/supabase/ajanda-sync").then((m) => m.scanUpcomingAjandaTasks({ daysAhead: 7 }));
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      if (!supabase) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, organization_id, full_name')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile?.organization_id) {
        setLoading(false);
        return;
      }

      const orgId = profile.organization_id;

      const [
        { count: riskCount },
        { data: highRisks },
        { data: documents },
        { count: incidentCount },
        { count: companyCount },
        { count: taskCount },
        { count: librarySourcedSurveyCount },
        { count: librarySourcedExamCount },
      ] = await Promise.all([
        supabase.from('risk_assessments').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('risk_assessments').select('id').eq('organization_id', orgId).gte('highest_item_score', 15),
        supabase
          .from('editor_documents')
          .select('id, title, status, updated_at')
          .eq('organization_id', orgId)
          .neq('status', 'arsiv')
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('company_workspaces').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('isg_tasks').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).in('status', ['planned', 'overdue']),
        supabase
          .from('surveys')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('type', 'survey')
          .contains('settings', { source_library: { provider: 'isg-library' } }),
        supabase
          .from('surveys')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('type', 'exam')
          .contains('settings', { source_library: { provider: 'isg-library' } }),
      ]);

      const docs = documents || [];
      const isDemoAccount =
        user.user_metadata?.demo_mode === true || user.app_metadata?.demo_mode === true;
      setStats({
        riskCount: riskCount || 0,
        highRiskCount: highRisks?.length || 0,
        documentCount: docs.length,
        readyDocCount: docs.filter((d) => d.status === 'hazir').length,
        draftDocCount: docs.filter((d) => d.status === 'taslak').length,
        incidentCount: incidentCount || 0,
        companyCount: companyCount || 0,
        taskCount: taskCount || 0,
        librarySourcedSurveyCount: librarySourcedSurveyCount || 0,
        librarySourcedExamCount: librarySourcedExamCount || 0,
        userName: profile.full_name || user.email || '',
        recentDocs: docs.slice(0, 5),
        isDemoAccount,
      });
      setLoading(false);
    }

    void load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="animate-pulse space-y-4">
          <div className="h-36 rounded-[2rem] bg-black/5 dark:bg-white/5" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-[1.75rem] bg-black/5 dark:bg-white/5" />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.95fr)]">
            <div className="h-96 rounded-[2rem] bg-black/5 dark:bg-white/5" />
            <div className="h-96 rounded-[2rem] bg-black/5 dark:bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  // Guard: stats may be null when session/profile couldn't be loaded
  // (e.g. demo-expired user briefly landing here before DemoSessionGuard
  // kicks in). Return empty shell; the guard will redirect shortly.
  if (!stats) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-[2rem] border border-dashed border-border bg-muted/10 px-8 py-16 text-center">
        <div className="space-y-2">
          <p className="text-base font-semibold text-foreground">Oturum yükleniyor...</p>
          <p className="text-sm text-muted-foreground">
            Oturumunuz doğrulanıyor. Birkaç saniye sürebilir; devam etmezse lütfen yeniden giriş yapın.
          </p>
        </div>
      </div>
    );
  }

  const s = stats;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
  const firstName = (s.userName || '').split(' ')[0] || 'Kullanıcı';
  const totalWorkload = s.highRiskCount + s.incidentCount + s.taskCount;
  const operationState =
    totalWorkload > 8 ? 'Yoğun takip' : totalWorkload > 0 ? 'Kontrol altında' : 'Sakin operasyon';
  const operationTone =
    totalWorkload > 8
      ? 'text-amber-700 dark:text-amber-300'
      : totalWorkload > 0
        ? 'text-emerald-700 dark:text-emerald-300'
        : 'text-blue-700 dark:text-blue-300';

  return (
    <div className="relative isolate space-y-6 pb-4">
      <div className="pointer-events-none absolute -left-20 top-8 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(200,155,91,0.22),transparent_66%)] blur-2xl" />
      <div className="pointer-events-none absolute right-0 top-32 -z-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.12),transparent_68%)] blur-2xl dark:bg-[radial-gradient(circle,rgba(56,189,248,0.12),transparent_68%)]" />

      <section className="relative overflow-hidden rounded-[2.2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,248,236,0.94)_44%,rgba(239,231,219,0.92))] p-5 shadow-[var(--shadow-elevated)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(17,26,43,0.98),rgba(9,17,31,0.98)_54%,rgba(35,27,16,0.9))] sm:p-7 xl:p-8">
        <div className="pointer-events-none absolute right-[-8rem] top-[-12rem] h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(200,155,91,0.28),transparent_64%)] blur-xl" />
        <div className="pointer-events-none absolute bottom-[-10rem] left-[28%] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.13),transparent_66%)] blur-xl" />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] xl:items-end">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/12 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
                <LayoutDashboard size={14} />
                Kontrol Merkezi
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                Canlı operasyon
              </span>
              <span className="inline-flex items-center rounded-full border border-border/70 bg-background/65 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
                Remote Supabase senkron
              </span>
            </div>

            <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-4xl xl:text-5xl">
              {greeting}, {firstName}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
              Tüm İSG operasyonunu tek ekranda izleyin: riskler, İSG kütüphanesi çıktıları, olaylar, görevler ve firma takipleri daha okunabilir bir komuta panelinde toplandı.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <HeroSignal icon={Radar} label="Operasyon Durumu" value={operationState} valueClassName={operationTone} />
              <HeroSignal icon={Target} label="Öncelik Yükü" value={`${totalWorkload} takip`} />
              <HeroSignal icon={TrendingUp} label="Firma Kapsamı" value={`${s.companyCount} firma`} />
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-white/70 bg-white/62 p-4 shadow-[0_24px_70px_rgba(16,24,40,0.10)] backdrop-blur dark:border-white/10 dark:bg-white/[0.045]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Bugünün odağı</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Önce kritik işler</p>
              </div>
              <PremiumIconBadge icon={GaugeCircle} tone={totalWorkload > 0 ? "amber" : "success"} size="sm" />
            </div>
            <div className="grid gap-2">
              <PriorityPill label="Yüksek risk" value={s.highRiskCount} tone={s.highRiskCount > 0 ? "risk" : "success"} />
              <PriorityPill label="Açık görev" value={s.taskCount} tone={s.taskCount > 0 ? "amber" : "success"} />
              <PriorityPill label="Olay kaydı" value={s.incidentCount} tone={s.incidentCount > 0 ? "cobalt" : "success"} />
            </div>
          </div>
        </div>
      </section>

      <section
        className={`rounded-[1.75rem] border px-5 py-4 shadow-sm sm:px-6 sm:py-5 ${
          s.isDemoAccount
            ? "border-amber-400/40 bg-amber-50/90 dark:border-amber-500/30 dark:bg-amber-950/25"
            : "border-[var(--gold)]/30 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,248,236,0.5))] dark:border-white/10 dark:bg-white/[0.04]"
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--gold)]/35 bg-[var(--gold)]/15 text-[var(--gold)]">
              <CreditCard className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {s.isDemoAccount ? "Demo hesabındasınız" : "Paket ve kapasite"}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {s.isDemoAccount
                  ? "Üretim kullanımına geçmek için uygun paketi seçin; ödeme ve faturalama Paketler sayfasından yönetilir."
                  : "Daha fazla çalışma alanı veya modül ihtiyacınız varsa paketleri inceleyin; yükseltme self-servis olarak yapılabilir."}
              </p>
            </div>
          </div>
          <Link
            href="/pricing"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[var(--gold)] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_32px_rgba(217,162,27,0.35)] transition hover:brightness-110"
          >
            Paketlere git
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard
          icon={ShieldAlert}
          label="Risk Analizi"
          value={s.riskCount}
          sub={s.highRiskCount > 0 ? `${s.highRiskCount} yüksek risk` : 'Yüksek risk yok'}
          subColor={s.highRiskCount > 0 ? 'text-red-500' : 'text-emerald-600'}
          tone="risk"
          onClick={() => router.push('/risk-analysis')}
        />
        <StatCard
          icon={FileText}
          label="Kütüphane dokümanı"
          value={s.documentCount}
          sub={`${s.readyDocCount} hazır, ${s.draftDocCount} taslak`}
          tone="cobalt"
          onClick={() => router.push('/isg-library?section=documentation')}
        />
        <StatCard
          icon={AlertTriangle}
          label="Olay ve Kaza"
          value={s.incidentCount}
          sub="Toplam kayıt"
          tone="amber"
          onClick={() => router.push('/incidents')}
        />
        <StatCard
          icon={ClipboardCheck}
          label="Açık Görev"
          value={s.taskCount}
          sub="Takip bekleyen işler"
          tone="violet"
          onClick={() => router.push('/planner')}
        />
        <StatCard
          icon={GraduationCap}
          label="Kutuphane Egitim"
          value={s.librarySourcedSurveyCount}
          sub="Aktarilan anket/egitim"
          tone="teal"
          onClick={() => router.push('/training')}
        />
        <StatCard
          icon={PenTool}
          label="Kutuphane Sinav"
          value={s.librarySourcedExamCount}
          sub="Aktarilan sinavlar"
          tone="indigo"
          onClick={() => router.push('/training')}
        />
      </div>

      <DashboardTrackingSummary />

      <OhsFileWidget />

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(min(100%,340px),0.95fr)]">
        <div className="min-w-0 space-y-4">
          <div className="surface-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Sparkles size={16} className="text-[var(--gold)]" />
                  Hızlı İş Akışları
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  En sık kullanılan modüllere tek tıkla geçiş yapın.
                </p>
              </div>
              <div className="hidden rounded-full border border-[var(--gold)]/20 bg-[var(--gold)]/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)] lg:inline-flex">
                platform
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <QuickAction icon={ShieldAlert} label="Risk Analizi" href="/risk-analysis" tone="risk" />
              <QuickAction icon={FileText} label="İSG kütüphanesi" href="/isg-library?section=documentation" tone="cobalt" />
              <QuickAction icon={AlertTriangle} label="Olay Bildir" href="/incidents" tone="amber" />
              <QuickAction icon={Calendar} label="Planlayıcı" href="/planner" tone="emerald" />
              <QuickAction icon={GraduationCap} label="Eğitimler" href="/isg-library?section=education" tone="teal" />
              <QuickAction icon={BarChart3} label="Raporlar" href="/reports" tone="indigo" />
              <QuickAction icon={Building2} label="Firmalar" href="/companies" tone="orange" />
              <QuickAction icon={ClipboardCheck} label="Saha Denetimi" href="/score-history" tone="plum" />
            </div>
          </div>

          <div className="surface-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <FileText size={16} className="text-[var(--gold)]" />
                  Kütüphanedeki son çıktılar
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  İSG kütüphanesi akışında son düzenlenen dokümanlar burada özetlenir.
                </p>
              </div>
              <button
                onClick={() => router.push('/isg-library?section=documentation')}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)] transition-colors hover:bg-[var(--gold)]/8"
              >
                Kütüphaneye git <ChevronRight size={12} />
              </button>
            </div>

            {s.recentDocs.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-border bg-background/55 px-4 py-12 text-center text-sm text-muted-foreground">
                Henüz kütüphane çıktısı yok. İSG kütüphanesinden şablon seçerek başlayabilirsiniz.
              </div>
            ) : (
              <div className="space-y-2">
                {s.recentDocs.map((doc) => {
                  const stCfg: Record<string, { label: string; color: string }> = {
                    taslak: {
                      label: 'Taslak',
                      color: 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300',
                    },
                    hazir: {
                      label: 'Hazır',
                      color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300',
                    },
                    onay_bekliyor: {
                      label: 'Onay',
                      color: 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300',
                    },
                    revizyon: {
                      label: 'Revizyon',
                      color: 'text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300',
                    },
                  };
                  const st = stCfg[doc.status] || stCfg.taslak;

                  return (
                    <div
                      key={doc.id}
                      onClick={() => router.push(`/documents/${doc.id}`)}
                      className="group flex items-center gap-3 rounded-[1.25rem] border border-border/80 bg-background/62 px-4 py-3 transition-all duration-200 hover:border-[var(--gold)]/30 hover:bg-[var(--gold)]/6 hover:shadow-[var(--shadow-soft)]"
                    >
                      <PremiumIconBadge icon={FileEdit} tone="gold" size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground group-hover:text-[var(--primary)]">
                          {doc.title}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {new Date(doc.updated_at).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="surface-card">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
              <Building2 size={16} className="text-[var(--gold)]" />
              Firma Özeti
            </h2>
            <div className="rounded-[1.5rem] border border-[var(--gold)]/20 bg-[linear-gradient(135deg,rgba(200,155,91,0.12),rgba(255,255,255,0.55))] px-5 py-6 text-center dark:bg-[linear-gradient(135deg,rgba(213,177,122,0.12),rgba(17,26,43,0.45))]">
              <p className="text-4xl font-semibold tracking-tight text-[var(--primary)]">{s.companyCount}</p>
              <p className="mt-2 text-sm text-muted-foreground">Kayıtlı firma</p>
            </div>
            <button
              onClick={() => router.push('/companies')}
              className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-2xl border border-border/80 bg-background/85 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:border-[var(--gold)]/30 hover:bg-[var(--gold)]/8"
            >
              Firmaları Yönet <ChevronRight size={14} />
            </button>
          </div>

          <div className="surface-card">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-foreground">İSG Modülleri</h2>
              <p className="mt-1 text-sm text-muted-foreground">Platformun aktif operasyon alanları.</p>
            </div>
            <div className="space-y-2">
              <ModuleLink icon={ShieldAlert} label="Risk Analizi" desc={`${s.riskCount} değerlendirme`} href="/risk-analysis" tone="risk" />
              <ModuleLink icon={FileText} label="İSG kütüphanesi" desc="Doküman ve şablonlar" href="/isg-library?section=documentation" tone="cobalt" />
              <ModuleLink icon={Siren} label="Acil Durum" desc="Plan ve tatbikatlar" href="/isg-library?section=emergency" tone="amber" />
              <ModuleLink icon={GraduationCap} label="Eğitimler" desc="Takip ve kayıt" href="/isg-library?section=education" tone="teal" />
              <ModuleLink icon={PenTool} label="Sınav ve Anket" desc="AI destekli ölçüm akışları" href="/isg-library?section=assessment" tone="indigo" />
              <ModuleLink icon={Download} label="Mevzuat" desc="Mevzuat ve rehber kütüphanesi" href="/isg-library?section=legal" tone="gold" />
            </div>
          </div>

          <div className="surface-card bg-[linear-gradient(135deg,rgba(200,155,91,0.14),rgba(255,252,247,0.92))] dark:bg-[linear-gradient(135deg,rgba(213,177,122,0.12),rgba(17,26,43,0.95))]">
            <div className="mb-2 flex items-center gap-2">
              <Calendar size={16} className="text-[var(--gold)]" />
              <h2 className="text-base font-semibold text-foreground">Bugün</h2>
            </div>
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {new Date().toLocaleDateString('tr-TR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {s.taskCount > 0 ? `${s.taskCount} açık görev bekliyor` : 'Tüm görevler tamamlandı'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSignal({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/65 bg-white/58 px-4 py-3 shadow-[0_14px_34px_rgba(16,24,40,0.07)] backdrop-blur dark:border-white/10 dark:bg-white/[0.045]">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        <Icon size={14} className="text-[var(--gold)]" />
        {label}
      </div>
      <p className={`text-base font-semibold text-foreground ${valueClassName ?? ''}`}>{value}</p>
    </div>
  );
}

function PriorityPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: PremiumIconTone;
}) {
  const isClear = value === 0;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <PremiumIconBadge icon={isClear ? CheckCircle2 : AlertTriangle} tone={tone} size="xs" />
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      <span className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-xs font-bold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  subColor,
  tone,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sub: string;
  subColor?: string;
  tone: PremiumIconTone;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full cursor-pointer overflow-hidden rounded-[1.85rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(255,252,247,0.82))] px-5 py-4 text-left shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--gold)]/35 hover:shadow-[var(--shadow-elevated)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(17,26,43,0.98),rgba(17,26,43,0.74))]"
    >
      <div className="pointer-events-none absolute right-[-4rem] top-[-5rem] h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(200,155,91,0.16),transparent_68%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <div className="mb-4 flex items-center justify-between gap-3">
        <PremiumIconBadge icon={Icon} tone={tone} />
        <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          canlı <ArrowUpRight size={11} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
      <div className="text-sm font-semibold text-foreground">{label}</div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className={`mt-1 text-xs ${subColor || 'text-muted-foreground'}`}>{sub}</p>
    </button>
  );
}

function QuickAction({
  icon: Icon,
  label,
  href,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  tone: PremiumIconTone;
}) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(href)}
      className="group relative flex min-h-28 flex-col items-start justify-between overflow-hidden rounded-[1.4rem] border border-border/85 bg-[linear-gradient(145deg,rgba(255,255,255,0.76),rgba(255,252,247,0.52))] p-4 text-left shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--gold)]/32 hover:bg-[var(--gold)]/6 hover:shadow-[var(--shadow-card)] dark:bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/45 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <PremiumIconBadge icon={Icon} tone={tone} size="sm" />
      <span className="flex w-full items-center justify-between gap-2 text-sm font-semibold text-foreground group-hover:text-[var(--primary)]">
        {label}
        <ArrowUpRight size={13} className="opacity-0 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
      </span>
    </button>
  );
}

function ModuleLink({
  icon: Icon,
  label,
  desc,
  href,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  desc: string;
  href: string;
  tone: PremiumIconTone;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="flex w-full cursor-pointer items-center gap-3 rounded-[1.2rem] border border-border/75 bg-background/55 px-4 py-3 text-left transition-all duration-200 hover:border-[var(--gold)]/28 hover:bg-[var(--gold)]/6"
    >
      <PremiumIconBadge icon={Icon} tone={tone} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ChevronRight size={14} className="text-muted-foreground" />
    </button>
  );
}
