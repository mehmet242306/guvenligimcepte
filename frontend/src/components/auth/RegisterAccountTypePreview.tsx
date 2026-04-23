"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CommercialLeadDialog } from "@/components/auth/CommercialLeadDialog";
import { type CommercialInterestType } from "@/lib/account/register-offers";

export function RegisterAccountTypePreview() {
  const [activeLeadType, setActiveLeadType] =
    useState<CommercialInterestType | null>(null);

  const items = [
    {
      title: "Bireysel",
      description:
        "Bagimsiz calisan uzman, hekim, DSP veya bireysel profesyoneller icin.",
      note: "Varsayilan baslangic plani: 1 aktif firma / workspace.",
      actionLabel: null,
      actionType: null,
    },
    {
      title: "OSGB",
      description:
        "OSGB firmalari, ekip yonetimi, personel gorevlendirme ve is takibi icin.",
      note: "Starter: 699 TL / ay, Team: 1.799 TL / ay. Limitler pakete gore yonetilir.",
      actionLabel: "Ozel teklif sor",
      actionType: "osgb" as const,
    },
    {
      title: "Firma / Kurumsal",
      description:
        "Cok lokasyonlu ve ozel ihtiyacli kurumlar icin iletisim odakli akis.",
      note: "Self-service degil; sizi tanimak icin kisa bir iletisim formu ile ilerler.",
      actionLabel: "Gelistirici ile gorus",
      actionType: "enterprise" as const,
    },
  ];

  return (
    <>
      <div className="rounded-3xl border border-border/70 bg-muted/20 p-4">
        <div className="mb-3 text-sm font-semibold text-foreground">
          Kayit sonrasi hesap secimi
        </div>
        <div className="grid gap-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {item.title}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </div>
                </div>
                {item.actionLabel ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setActiveLeadType(item.actionType)}
                  >
                    {item.actionLabel}
                  </Button>
                ) : null}
              </div>
              <div className="mt-2 text-xs font-medium text-primary">
                {item.note}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          Platform Admin public kayit secenegi degildir. Admin kullanicilar
          giris yaptiginda otomatik olarak platform yonetim paneline yonlendirilir.
        </p>
      </div>

      <CommercialLeadDialog
        accountType={activeLeadType ?? "enterprise"}
        open={activeLeadType !== null}
        onClose={() => setActiveLeadType(null)}
      />
    </>
  );
}
