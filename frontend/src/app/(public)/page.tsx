import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicSiteFooter } from "@/components/layout/public-site-footer";
import { PublicChatWidget } from "@/components/chat/PublicChatWidget";
import { DemoRequestTrigger } from "@/components/public/DemoRequestDialog";
import { LandingHeroAtmosphere } from "@/components/public/landing-hero-atmosphere";
import { LandingCtaAtmosphere } from "@/components/public/landing-cta-atmosphere";
import { LandingIsgHeroDecorations } from "@/components/public/landing-isg-hero-decorations";
import { LandingRevealProvider } from "@/components/public/landing-reveal-provider";
import { isPublicDemoFeatureEnabled } from "@/lib/feature-flags";
import { PremiumIconBadge, type PremiumIconTone } from "@/components/ui/premium-icon-badge";
import {
  BrainCircuit,
  Search,
  BarChart3,
  ShieldCheck,
  Monitor,
  Sparkles,
  Lock,
  FileInput,
  Cpu,
  ClipboardCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const featureIcons: Record<string, LucideIcon> = {
  "brain-circuit": BrainCircuit,
  search: Search,
  "bar-chart": BarChart3,
  "shield-check": ShieldCheck,
  monitor: Monitor,
  sparkles: Sparkles,
};

const workflowIcons: Record<string, LucideIcon> = {
  lock: Lock,
  "file-input": FileInput,
  cpu: Cpu,
  "clipboard-check": ClipboardCheck,
};

const featureTones: PremiumIconTone[] = ["gold", "cobalt", "violet", "emerald", "teal", "indigo"];
const workflowTones: PremiumIconTone[] = ["gold", "amber", "violet", "emerald"];

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const stats = [
  { value: "500+", label: "AKTIF KULLANICI" },
  { value: "%99.5", label: "UPTIME" },
  { value: "15sn", label: "ANALİZ SÜRESİ" },
  { value: "R-SKOR", label: "RİSK PUANLAMA" },
];

const features = [
  {
    iconKey: "brain-circuit",
    title: "AI destekli risk analizi",
    text: "Manuel veya modül bazlı risk girdilerini tek akışta toplayan, sonuçları daha görünür hâle getiren ürün temeli.",
  },
  {
    iconKey: "search",
    title: "Saha bulguları ve aksiyon yönetimi",
    text: "Denetim, bulgu, görev ve takip alanlarını operasyon ekibinin okuyabileceği düzen içinde bir araya getirir.",
  },
  {
    iconKey: "bar-chart",
    title: "Raporlama ve kayıt altyapısı",
    text: "Oluşturulan sonuçların geçmiş, detay ve çıktı süreçlerine bağlanabileceği tutarlı ekran omurgası sağlar.",
  },
  {
    iconKey: "shield-check",
    title: "Risk modülü için ürün vitrini",
    text: "Risk analizi ekranı, sonuç ekranı ve skor geçmişi gibi alanlar için profesyonel ve güven veren zemin hazırlar.",
  },
  {
    iconKey: "monitor",
    title: "Mobil, tablet ve desktop uyumu",
    text: "Tek kolon, iki kolon ve geniş ekran yerleşimleriyle farklı cihazlarda okunabilirliğini korur.",
  },
  {
    iconKey: "sparkles",
    title: "Kurumsal ve modern görsel dil",
    text: "Açık yüzeyler, kontrollü kontrast ve net CTA yapısıyla profesyonel SaaS hissi üretir.",
  },
];

const workflow = [
  {
    step: "01",
    iconKey: "lock",
    title: "Güvenli Erişim",
    text: "Kurumunuza özel hesabınızla platforma güvenli bir şekilde giriş yapın.",
  },
  {
    step: "02",
    iconKey: "file-input",
    title: "Risk Verisinin Girilmesi",
    text: "Alan denetimleri, tehlike bildirimleri ve risk parametrelerini sisteme aktarın.",
  },
  {
    step: "03",
    iconKey: "cpu",
    title: "R-SKOR Üretimi",
    text: "AI destekli analiz motorumuz verilerinizi işleyerek risk skorlarını hesaplar.",
  },
  {
    step: "04",
    iconKey: "clipboard-check",
    title: "Aksiyon ve Takip",
    text: "Sonuçlara dayalı aksiyon planları oluşturun, takip edin ve raporlayın.",
  },
];

const benefits = [
  "Temiz, modern ve güven veren İSG görünümü",
  "Operasyon odaklı, dikkat dağıtmayan ekran kurgusu",
  "Risk Intelligence modülüne hazır tasarım sistemi",
  "Multi-tenant organizasyon bazlı güvenli yapı",
  "AI destekli karar destek mekanizması",
  "Kurumsal raporlama ve arşiv altyapısı",
];

const testimonials = [
  {
    quote:
      "RiskNova ile saha denetimlerimiz çok daha sistematik hale geldi. AI yorumları gerçekten faydalı.",
    author: "Mehmet K.",
    role: "İSG Uzmanı",
  },
  {
    quote:
      "Tek platformda risk analizi, raporlama ve takip yapabilmek operasyonel verimliliğimizi artırdı.",
    author: "Ayşe T.",
    role: "İSG Müdürü",
  },
  {
    quote:
      "Kurumsal görünümü ve kullanım kolaylığı sayesinde ekip adaptasyonu çok hızlı oldu.",
    author: "Can D.",
    role: "Operasyon Yöneticisi",
  },
];

export const metadata: Metadata = {
  title: "İSG Risk Yönetimi ve AI Destekli Operasyon",
  description:
    "AI destekli risk analizi, saha denetimi, bulgu/aksiyon ve raporlamayı tek platformda toplayan İSG yazılımı. Bireysel, OSGB ve kurumsal modeller.",
  openGraph: {
    title: "RiskNova — AI destekli İSG platformu",
    description:
      "İSG risk yönetimi, saha operasyonları ve karar desteği için modern SaaS platformu.",
    type: "website",
    url: "/",
  },
  robots: { index: true, follow: true },
};

/* ------------------------------------------------------------------ */
/*  Shared classes                                                     */
/* ------------------------------------------------------------------ */

const primaryLinkClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-amber-500/20 bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_50%,#FBBF24_100%)] px-7 text-sm font-medium text-white shadow-[0_16px_34px_rgba(184,134,11,0.28)] transition-all hover:brightness-[1.05]";

const secondaryLinkClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[0.06] px-7 text-sm font-medium text-white transition-colors hover:bg-white/[0.12]";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const showPublicDemoCta = isPublicDemoFeatureEnabled();
  return (
    <main className="app-shell flex min-h-screen flex-col">
      <PublicHeader />
      <LandingRevealProvider>
      <div className="flex flex-1 flex-col">

      {/* ============================================================ */}
      {/* HERO                                                          */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-[var(--navy-dark)]">
        <LandingHeroAtmosphere />
        <LandingIsgHeroDecorations />
        <div className="page-shell relative z-[1] flex min-h-[85vh] flex-col items-center justify-center py-20 text-center">
          <span className="tag-label landing-hero-eyebrow landing-hero-enter mb-8 rounded-full px-4 py-1.5">
            YAPAY ZEKA DESTEKLİ İSG PLATFORMU
          </span>

          <h1 className="landing-hero-enter landing-hero-enter--d1 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl xl:text-6xl">
            İSG Risk Yönetimini{" "}
            <span className="text-accent-serif landing-hero-gradient-text">Sanata</span>{" "}
            Dönüştürün
          </h1>

          <p className="landing-hero-enter landing-hero-enter--d2 mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            AI destekli analiz, saha denetimleri, bulgu ve aksiyon takibi ile
            raporlama ve arşivi tek platformda toplar. Bireyselden OSGB ve
            çok lokasyonlu kurumsal modele kadar aynı ürün disipliniyle
            ölçeklenir.
          </p>

          <div className="landing-hero-enter landing-hero-enter--d3 mt-10 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link href="/register" className={primaryLinkClass + " hover-glow"}>
              Ücretsiz Başla
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="ml-1"
              >
                <path
                  d="M6 3l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            {showPublicDemoCta ? (
              <DemoRequestTrigger className={secondaryLinkClass + " border-[var(--gold)]/40 bg-[var(--gold)]/10 hover:bg-[var(--gold)]/20"}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr-1">
                  <path d="M8 1l2 4 4.5.7L11 9l1 4.5L8 11.5 4 13.5l1-4.5L1.5 5.7 6 5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
                Demo Talep Et
              </DemoRequestTrigger>
            ) : null}
            <Link href="/login" className={secondaryLinkClass}>
              Platforma Giriş Yap
            </Link>
          </div>

          {/* Stats */}
          <div className="landing-hero-stats landing-hero-enter landing-hero-enter--d4 mt-16 grid w-full max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md md:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center gap-1 bg-[var(--navy-dark)] px-6 py-5"
              >
                <span className="text-2xl font-bold tracking-tight text-[var(--gold)]">
                  {s.value}
                </span>
                <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OSGB / Kurumsal — ürün dışı satış & teklif CTA (net yönlendirme) */}
      <section
        className="border-y border-white/10 bg-[#0a0d14] py-5"
        aria-label="Kurumsal ve OSGB"
      >
        <div className="page-shell flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-sm leading-7 text-slate-400 sm:text-left">
            <span className="font-medium text-slate-200">OSGB veya çok lokasyonlu kurum musunuz?</span>{" "}
            Paket özetlerini inceleyin, teklif veya kayıt üzerinden lead bırakın; ekibimiz dönüş yapsın.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Link
              href="/cozumler/osgb"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
            >
              OSGB: teklif ve iletişim
            </Link>
            <Link
              href="/cozumler/kurumsal"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Kurumsal: teklif ve iletişim
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FEATURES                                                      */}
      {/* ============================================================ */}
      <section id="features" className="bg-background">
        <div className="page-shell py-20">
          <div className="mx-auto max-w-2xl text-center" data-landing-reveal>
            <span className="tag-label mb-6 inline-flex">ÖZELLİKLER</span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Kapsamlı{" "}
              <span className="text-accent-serif">Çözümler</span>
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              İSG süreçlerinizi uçtan uca yöneten profesyonel araçlar.
            </p>
          </div>

          <div
            id="landing-features-grid"
            className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            {features.map((item, index) => {
              const Icon = featureIcons[item.iconKey];
              return (
              <div
                key={item.title}
                data-landing-reveal
                data-stagger={String(index)}
                className="group rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-card)] hover-lift"
              >
                <div className="mb-4 transition-transform duration-300 ease-out will-change-transform group-hover:scale-110 group-hover:-rotate-2">
                  <PremiumIconBadge icon={Icon} tone={featureTones[index % featureTones.length]} size="md" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {item.text}
                </p>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* HOW IT WORKS                                                  */}
      {/* ============================================================ */}
      <section id="how-it-works" className="bg-[var(--navy-dark)]">
        <div className="page-shell py-20">
          <div className="mx-auto max-w-2xl text-center" data-landing-reveal>
            <span className="tag-label mb-6 inline-flex">NASIL ÇALIŞIR</span>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Dört Adımda{" "}
              <span className="text-accent-serif">Kontrol</span>
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-400">
              Platformumuzu kullanmaya başlamak için basit adımlar.
            </p>
          </div>

          <div
            id="landing-workflow-grid"
            className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4"
          >
            {workflow.map((item, index) => {
              const Icon = workflowIcons[item.iconKey];
              return (
              <div
                key={item.step}
                data-landing-reveal
                data-stagger={String(index)}
                className="group hover-lift relative overflow-hidden rounded-2xl glass-card p-7"
              >
                <div className="flex items-center gap-3">
                  <PremiumIconBadge icon={Icon} tone={workflowTones[index % workflowTones.length]} size="sm" />
                  <div className="landing-workflow-bar h-1 w-10 origin-left rounded-full bg-[linear-gradient(90deg,var(--gold),var(--gold-light))]" />
                </div>
                <span className="pointer-events-none absolute right-4 top-2 select-none text-6xl font-bold text-white/[0.04]">
                  {item.step}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  {item.text}
                </p>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* VALUE PROPOSITION                                             */}
      {/* ============================================================ */}
      <section className="bg-background">
        <div className="page-shell py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div data-landing-reveal>
              <span className="tag-label mb-6 inline-flex">
                NEDEN RİSKNOVA
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Güven Veren{" "}
                <span className="text-accent-serif">Premium</span>{" "}
                Deneyim
              </h2>
              <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
                Mavi güven hissini ve altın kalite vurgusunu taşıyan, açık
                yüzeyler ve yumuşak kontrast ile profesyonel SaaS deneyimi
                oluşturur.
              </p>

              <ul className="mt-8 space-y-4">
                {benefits.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--gold)] text-white">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <path
                          d="M3 7l3 3 5-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="text-sm font-medium leading-7 text-foreground">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              data-landing-reveal
              data-stagger="1"
              className="hover-lift rounded-3xl border border-border bg-[radial-gradient(circle_at_top_right,var(--gold-glow),transparent_50%)] p-10 shadow-[var(--shadow-card)]"
            >
              <span className="eyebrow mb-4 inline-flex">Hemen deneyin</span>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                Risk modülü, denetim ve raporlama aynı ürün deneyiminde
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Form, sonuç, skor geçmişi ve çıktılar tutarlı ekranlarla sunulur;
                ekibiniz operasyonda kaldığı yerden devam eder.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-amber-500/20 bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_50%,#FBBF24_100%)] px-6 text-sm font-medium text-white shadow-[0_16px_34px_rgba(184,134,11,0.28)] transition-all hover:brightness-[1.05]"
                >
                  Hesap Oluştur
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-card px-6 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Giriş Yap
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* TESTIMONIALS                                                  */}
      {/* ============================================================ */}
      <section className="bg-[var(--navy-dark)]">
        <div className="page-shell py-20">
          <div className="mx-auto max-w-2xl text-center" data-landing-reveal>
            <span className="tag-label mb-6 inline-flex">MÜŞTERİ YORUMLARI</span>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Kullanıcılarımız{" "}
              <span className="text-accent-serif">Ne Diyor</span>
            </h2>
          </div>

          <div
            id="landing-testimonials-grid"
            className="mt-14 grid gap-5 md:grid-cols-3"
          >
            {testimonials.map((t, index) => (
              <div
                key={t.author}
                data-landing-reveal
                data-stagger={String(index)}
                className="hover-lift rounded-2xl glass-card p-7"
              >
                <div className="mb-4 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="var(--gold)"
                    >
                      <path d="M8 1l2.2 4.5L15 6.3l-3.5 3.4.8 4.9L8 12.3 3.7 14.6l.8-4.9L1 6.3l4.8-.8z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm leading-7 text-slate-300">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-sm font-semibold text-white">
                    {t.author}
                  </p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* BOTTOM CTA                                                    */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-[var(--navy-dark)]">
        <LandingCtaAtmosphere />
        <div className="page-shell relative z-[1] py-24 text-center">
          <h2
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl xl:text-5xl"
            data-landing-reveal
          >
            İSG Süreçlerinizi{" "}
            <span className="text-accent-serif landing-hero-gradient-text">Dönüştürün</span>
          </h2>
          <p
            className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-400"
            data-landing-reveal
            data-stagger="1"
          >
            RiskNova ile risk analizinden raporlamaya kadar tüm İSG
            operasyonlarınızı tek platformda yönetin.
          </p>
          <div
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center"
            data-landing-reveal
            data-stagger="2"
          >
            <Link href="/register" className={primaryLinkClass}>
              Ücretsiz Başla
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="ml-1"
              >
                <path
                  d="M6 3l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            {showPublicDemoCta ? (
              <DemoRequestTrigger className={secondaryLinkClass + " border-[var(--gold)]/40 bg-[var(--gold)]/10 hover:bg-[var(--gold)]/20"}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr-1">
                  <path d="M8 1l2 4 4.5.7L11 9l1 4.5L8 11.5 4 13.5l1-4.5L1.5 5.7 6 5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
                Demo Talep Et
              </DemoRequestTrigger>
            ) : null}
            <Link href="/login" className={secondaryLinkClass}>
              Giriş Yap
            </Link>
          </div>
        </div>
      </section>

      </div>
      </LandingRevealProvider>
      <PublicSiteFooter />
      <PublicChatWidget />
    </main>
  );
}
