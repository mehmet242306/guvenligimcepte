import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const quickAccess = [
  {
    href: "/risk-analysis",
    title: "Risk Analizi",
    description:
      "Satır bazlı, çoklu görselli ve metodoloji seçilebilir analiz akışına geç.",
  },
  {
    href: "/r-skor-2d",
    title: "R-SKOR 2D",
    description: "R-SKOR tabanlı değerlendirme ve karar desteği ekranını aç.",
  },
  {
    href: "/score-history",
    title: "Skor Geçmişi",
    description: "Oluşturulan analiz kayıtlarını ve sonuç geçmişini görüntüle.",
  },
  {
    href: "/reports",
    title: "Raporlar",
    description: "Risk sonuçlarını rapor ve çıktı akışına bağla.",
  },
];

const summaryCards = [
  {
    label: "Platform Durumu",
    value: "Hazır",
    text: "Auth, protected alan ve backend çekirdeği çalışıyor.",
  },
  {
    label: "Aşama",
    value: "2A + UI",
    text: "Risk Intelligence çekirdeği hazır, ürün akışı olgunlaşıyor.",
  },
  {
    label: "Ana Odak",
    value: "Risk Analizi",
    text: "Görsel odaklı risk akışı tek modül içinde birleştiriliyor.",
  },
  {
    label: "Hedef",
    value: "Satılabilir SaaS",
    text: "Tespit, skor, DÖF ve rapor zinciri tek ürün içinde tamamlanacak.",
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-6 sm:p-8">
          <Badge className="w-fit">Hoş geldin</Badge>
          <CardTitle className="text-3xl">RiskNova Dashboard</CardTitle>
          <CardDescription className="max-w-3xl text-sm leading-7 sm:text-base">
            Risk analizi, skor üretimi, sonuç inceleme ve rapor akışını tek
            merkezden yönetebilirsin. Ana ürün akışı artık Risk Analizi modülü
            içinde büyütülüyor.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
          <div className="rounded-2xl border border-border bg-muted px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Aktif kullanıcı
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {user.email}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <Card key={item.label}>
            <CardHeader className="p-6 pb-3">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-3xl">{item.value}</CardTitle>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              <p className="text-sm leading-7 text-muted-foreground">
                {item.text}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="p-6 sm:p-8">
          <CardTitle className="text-2xl">Hızlı Erişim</CardTitle>
          <CardDescription className="text-sm leading-7 sm:text-base">
            En önemli modüller burada. Risk analizi ana ürün akışının merkezidir.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 px-6 pb-6 sm:px-8 sm:pb-8 md:grid-cols-2">
          {quickAccess.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-colors hover:bg-secondary"
            >
              <p className="text-lg font-semibold text-foreground">
                {item.title}
              </p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {item.description}
              </p>
              <p className="mt-4 text-sm font-medium text-primary">
                Modüle git →
              </p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
