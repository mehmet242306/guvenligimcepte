"use client";

import { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SubcategorySidebar, type SidebarItem } from "../SubcategorySidebar";
import type { SessionActions } from "../../_hooks/useInspectionSession";
import { MODE_COPY } from "../../_lib/constants";
import { createTemplate } from "@/lib/supabase/checklist-api";

type Props = {
  actions: SessionActions;
  onTemplateCreated: (templateId: string) => void;
};

type NovaSources = {
  risks: boolean;
  previousFindings: boolean;
  openActions: boolean;
  dof: boolean;
  library: boolean;
  reports: boolean;
};

const SOURCE_ITEMS: Array<{ key: keyof NovaSources; label: string }> = [
  { key: "risks", label: "Mevcut risk analizleri" },
  { key: "previousFindings", label: "Geçmiş saha tespitleri" },
  { key: "openActions", label: "Açık aksiyonlar" },
  { key: "dof", label: "DÖF kayıtları" },
  { key: "library", label: "İSG kütüphanesi" },
  { key: "reports", label: "Önceki raporlar" },
];

export function NovaTab({ actions, onTemplateCreated }: Props) {
  const [subItem, setSubItem] = useState<string>("studio");
  const [purpose, setPurpose] = useState("Üretim hattında günlük İSG ortam gözetimi yapmak istiyorum.");
  const [mode, setMode] = useState<keyof typeof MODE_COPY>("standard");
  const [siteLabel, setSiteLabel] = useState("");
  const [sources, setSources] = useState<NovaSources>({
    risks: true,
    previousFindings: true,
    openActions: true,
    dof: false,
    library: true,
    reports: false,
  });
  const [creating, setCreating] = useState(false);

  const sidebarItems: SidebarItem[] = [
    { id: "studio", title: "Checklist stüdyosu", description: "Yeni taslak üret", badge: "Aktif" },
    {
      id: "memory",
      title: "Kurumsal hafıza",
      description: "Tekrar eden sorunlar (S4)",
      badge: "Yakında",
    },
  ];

  const handleCreate = async () => {
    setCreating(true);
    const novaTitle = inferTitleFromPurpose(purpose);
    const created = await createTemplate({
      title: novaTitle,
      description: "Nova tarafından üretilen checklist taslağı. Yayınlamadan önce gözden geçirin.",
      source: "nova",
      mode,
      status: "draft",
      novaPurpose: purpose,
      novaSources: sources as unknown as Record<string, boolean>,
      metadata: { siteLabel },
    });
    setCreating(false);
    if (created) {
      await actions.refreshTemplates();
      onTemplateCreated(created.id);
    }
  };

  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <SubcategorySidebar
        title="Nova Modülleri"
        items={sidebarItems}
        activeItemId={subItem}
        onSelect={setSubItem}
      />

      {subItem === "studio" ? (
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-[var(--gold)]" />
              <h3 className="text-lg font-semibold text-foreground">Checklist Stüdyosu</h3>
              <Badge variant="warning">AI üretimi S4'te</Badge>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Amaç
                </label>
                <Textarea
                  rows={3}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Üretim hattında günlük İSG ortam gözetimi yapmak istiyorum."
                  className="mt-1"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Denetim modu
                  </label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as keyof typeof MODE_COPY)}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  >
                    {(Object.keys(MODE_COPY) as Array<keyof typeof MODE_COPY>).map((k) => (
                      <option key={k} value={k}>
                        {MODE_COPY[k].label} ({MODE_COPY[k].questionCount} soru)
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">{MODE_COPY[mode].description}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Lokasyon / Hat
                  </label>
                  <Input
                    value={siteLabel}
                    onChange={(e) => setSiteLabel(e.target.value)}
                    placeholder="Üretim Hattı 1 · Gündüz"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nova hangi kaynakları tarasın?
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SOURCE_ITEMS.map((s) => (
                    <label
                      key={s.key}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm transition",
                        sources[s.key] && "border-[var(--gold)] bg-[var(--gold)]/10",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={sources[s.key]}
                        onChange={(e) =>
                          setSources((prev) => ({ ...prev, [s.key]: e.target.checked }))
                        }
                      />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button onClick={handleCreate} disabled={creating || !purpose.trim()}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  {creating ? "Oluşturuluyor..." : "Taslak oluştur"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Şu an bu işlem boş taslak oluşturur. S4'te Nova AI edge function'ı bağlandığında otomatik soru üretimi aktifleşir.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-dashed border-border bg-muted/20 px-8 py-16 text-center">
          <Sparkles size={32} className="text-muted-foreground" />
          <p className="text-base font-semibold text-foreground">Kurumsal hafıza yakında</p>
          <p className="text-sm text-muted-foreground">
            Tekrar eden sorunlar ve açık aksiyon uyarıları S4'te gelecek.
          </p>
        </div>
      )}
    </div>
  );
}

function inferTitleFromPurpose(purpose: string): string {
  const n = purpose.toLocaleLowerCase("tr-TR");
  if (n.includes("yangın")) return "Yangın Güvenliği Saha Taraması";
  if (n.includes("elektrik")) return "Elektrik Güvenliği Checklist Taslağı";
  if (n.includes("kkd")) return "KKD Davranış Gözlemi Taslağı";
  if (n.includes("kimyasal")) return "Kimyasal Depo Kontrol Taslağı";
  if (n.includes("makine")) return "Makine Emniyeti İnceleme Taslağı";
  return "Nova ile oluşturulan saha denetimi taslağı";
}
