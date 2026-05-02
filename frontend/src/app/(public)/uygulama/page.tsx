import type { Metadata } from "next";
import Link from "next/link";
import { MonitorDown, Share2, Smartphone, Wifi } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicSiteFooter } from "@/components/layout/public-site-footer";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";

export const metadata: Metadata = {
  title: "RiskNova Uygulaması",
  description:
    "RiskNova'yı iOS, Android ve Windows cihazlarınıza mağaza gerektirmeden PWA olarak kurun.",
  alternates: { canonical: "/uygulama" },
  robots: { index: true, follow: true },
};

const installCards = [
  {
    icon: Smartphone,
    title: "Android",
    text: "Chrome veya Edge ile RiskNova'yı açın; kurulum bildirimi görünürse Cihaza kur seçeneğini kullanın.",
    steps: ["getrisknova.com adresini aç", "Cihaza kur butonuna bas", "RiskNova ikonundan giriş yap"],
  },
  {
    icon: Share2,
    title: "iPhone ve iPad",
    text: "Safari ile açın; Paylaş menüsünden Ana Ekrana Ekle seçeneğini kullanarak RiskNova ikonunu oluşturun.",
    steps: ["Safari'de siteyi aç", "Paylaş ikonuna dokun", "Ana Ekrana Ekle seçeneğini seç"],
  },
  {
    icon: MonitorDown,
    title: "Windows",
    text: "Chrome veya Edge adres çubuğundaki uygulama kur ikonuyla RiskNova'yı ayrı masaüstü penceresi olarak açın.",
    steps: ["Edge veya Chrome ile aç", "Uygulamayı yükle ikonuna bas", "Başlat menüsünden RiskNova'yı aç"],
  },
];

export default function PwaInstallPage() {
  return (
    <main className="app-shell min-h-screen bg-background">
      <PublicHeader />

      <section className="relative overflow-hidden bg-[var(--navy-dark)]">
        <div className="page-shell relative z-[1] grid min-h-[68vh] items-center gap-10 py-20 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="max-w-3xl">
            <span className="tag-label mb-6 inline-flex">Store gerektirmeyen uygulama</span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl xl:text-6xl">
              RiskNova'yı mobil ve masaüstünde uygulama gibi kullanın
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              iOS, Android ve Windows cihazlarda RiskNova'yı ana ekrana veya masaüstüne ekleyin.
              Siteye gelen güncellemeler uygulama deneyimine de otomatik yansır.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-amber-400 px-7 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-300"
              >
                Ücretsiz başla
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-7 text-sm font-bold text-white transition-colors hover:bg-white/[0.12]"
              >
                Platforma giriş yap
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_26px_70px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <PwaInstallPrompt surface="public" />
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-400 text-slate-950">
                  <Wifi className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Güncellemeler otomatik gelir</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    RiskNova web uygulaması güncellendiğinde PWA da yeni sürümü alır. Bu yüzden
                    mağaza güncellemesi beklemezsiniz.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="page-shell py-16">
          <div className="grid gap-5 lg:grid-cols-3">
            {installCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-5 text-xl font-bold tracking-tight text-foreground">{card.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.text}</p>
                  <ol className="mt-5 space-y-3">
                    {card.steps.map((step, index) => (
                      <li key={step} className="flex items-start gap-3 text-sm text-foreground">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-950">
                          {index + 1}
                        </span>
                        <span className="leading-6">{step}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}
