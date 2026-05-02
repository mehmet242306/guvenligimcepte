import type { Metadata } from "next";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicLegalFooter } from "@/components/layout/public-legal-footer";

export const metadata: Metadata = {
  title: "Çerez Politikası",
  description:
    "RiskNova çerez politikası; zorunlu oturum, güvenlik, dil tercihi ve benzer teknolojilerin kullanımını açıklar.",
  alternates: { canonical: "/cookie-policy" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Çerez Politikası | RiskNova",
    description: "RiskNova çerez ve benzer teknolojileri nasıl kullanır.",
    type: "article",
    url: "/cookie-policy",
  },
};

const sections = [
  {
    title: "Çerez nedir?",
    content:
      "Çerezler ve benzer yerel saklama teknolojileri, web uygulamasının oturum, güvenlik, dil tercihi ve ürün işlevlerini hatırlaması için kullanılan küçük teknik kayıtlardır.",
  },
  {
    title: "Zorunlu çerezler",
    content:
      "RiskNova; oturumun sürdürülmesi, Supabase kimlik doğrulama akışı, OAuth yönlendirmeleri, parola yenileme, güvenlik kontrolleri, CSRF/akış tutarlılığı ve dil tercihi için zorunlu çerezler kullanır. Bu çerezler kapatılırsa platformun temel işlevleri çalışmayabilir.",
  },
  {
    title: "Tercih ve ürün çerezleri",
    content:
      "Dil, bölge, arayüz tercihi, son seçilen çalışma alanı veya benzeri ürün tercihleri çerez ya da localStorage içinde tutulabilir. Bu kayıtlar kullanıcı deneyimini tutarlı hale getirmek için kullanılır.",
  },
  {
    title: "Analitik ve pazarlama çerezleri",
    content:
      "Bu sürümde kullanıcı takibi veya pazarlama amaçlı üçüncü taraf çerezleri zorunlu akışın parçası değildir. İleride analitik veya pazarlama çerezi devreye alınırsa, kullanıcıya ayrı bilgilendirme ve gerekiyorsa izin kontrolü sunulur.",
  },
  {
    title: "Çerezleri yönetme",
    content:
      "Tarayıcı ayarlarınızdan çerezleri silebilir veya engelleyebilirsiniz. Ancak oturum, güvenlik ve dil tercihi gibi zorunlu çerezlerin engellenmesi login, kayıt, ödeme veya uygulama içi iş akışlarını bozabilir.",
  },
  {
    title: "İletişim",
    content:
      "Çerezler veya gizlilik ayarlarıyla ilgili sorular için support@getrisknova.com adresine yazabilirsiniz.",
  },
];

export default async function CookiePolicyPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <section className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase text-amber-700">Çerez Politikası</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          RiskNova Çerez Politikası
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Son güncelleme: 2 Mayıs 2026
        </p>
        <div className="mt-8 space-y-7 text-base leading-8 text-muted-foreground">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {section.title}
              </h2>
              <p className="mt-2">{section.content}</p>
            </section>
          ))}
        </div>
      </section>
      <PublicLegalFooter />
    </main>
  );
}
