"use client";

import { useEffect, useState } from "react";
import { listActiveConsentRequirements, type ConsentRequirementRow } from "@/lib/supabase/consent-api";
import { ProfileDataRightsPanel } from "./ProfileDataRightsPanel";

const consentTypeLabels: Record<string, string> = {
  aydinlatma: "Aydinlatma",
  acik_riza: "Acik Riza",
  kvkk: "KVKK",
  yurt_disi_aktarim: "Yurt Disi Aktarim",
  pazarlama: "Pazarlama",
};

export function ProfileConsentTab() {
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState<ConsentRequirementRow[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      const rows = await listActiveConsentRequirements("platform");
      if (!mounted) return;
      setRequirements(rows);
      setLoading(false);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <ProfileDataRightsPanel />

      <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Gizlilik ve Onaylar</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Platformun aktif aydinlatma ve KVKK metinleri burada listelenir. Yeni bir surum yayina alindiginda
              sistem sizi yeniden onay ekranina yonlendirir.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-xs text-muted-foreground">
            {requirements.filter((item) => item.is_granted).length} aktif onay -{" "}
            {requirements.filter((item) => item.is_required && !item.is_granted).length} bekleyen zorunlu metin
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-[1.75rem] border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Onay kayitlari yukleniyor...
        </div>
      ) : requirements.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Yayinlanmis bir onay metni bulunmuyor.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {requirements.map((item) => (
            <article
              key={item.version_id}
              className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-card)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                  {consentTypeLabels[item.consent_type] ?? item.consent_type}
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                  {item.version}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    item.is_granted
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  }`}
                >
                  {item.is_granted ? "Onaylandi" : item.is_required ? "Bekleyen zorunlu metin" : "Istege bagli"}
                </span>
              </div>

              <h3 className="mt-4 text-base font-semibold text-foreground">{item.title}</h3>
              {item.description && <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>}
              {item.version_summary && (
                <p className="mt-3 rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                  {item.version_summary}
                </p>
              )}

              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <div>Zorunluluk: {item.is_required ? "Evet" : "Hayir"}</div>
                <div>
                  Son durum:{" "}
                  {item.granted_at
                    ? new Intl.DateTimeFormat("tr-TR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(item.granted_at))
                    : "Heniz onay verilmedi"}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
