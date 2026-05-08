"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, ChevronDown, ChevronRight, Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  fetchCompanyProfile,
  type CompanyProfile,
} from "@/lib/supabase/company-profile";
import { getActiveWorkspace, type WorkspaceRow } from "@/lib/supabase/workspace-api";
import { useI18n } from "@/lib/i18n";
import { WorkspaceSwitcher } from "./workspace-switcher";

// =============================================================================
// Aktif Firma Şeridi — global header'ın hemen altında tüm sayfalarda görünür
// =============================================================================
// Kullanıcının bir firma workspace seçili olduğunda kompakt bir bilgi bandı
// çizer: solda logo + isim tek tıkta çalışma alanı menüsü; meta rozetleri ve
// personel; sağda "Firma Detayı" ile /companies/[id].
// Workspace yoksa sessizce hiçbir şey render etmez (null).
// =============================================================================

function hazardTone(cls: string | null): "success" | "warning" | "danger" | "neutral" {
  if (!cls) return "neutral";
  const v = cls.toLowerCase();
  if (v.includes("çok") || v.includes("cok")) return "danger";
  if (v.includes("tehlikeli")) return "warning";
  if (v.includes("az")) return "success";
  return "neutral";
}

function companyTypeLabel(raw: string | null, translate: (key: string) => string): string {
  if (!raw) return "";
  const k = raw.toLowerCase();
  if (k === "bireysel") return translate("activeCompanyBar.companyTypeIndividual");
  if (k === "osgb") return translate("activeCompanyBar.companyTypeOsgb");
  if (k === "enterprise" || k === "kurumsal") return translate("activeCompanyBar.companyTypeEnterprise");
  return raw;
}

export function ActiveCompanyBar() {
  const { t } = useI18n();
  const tWorkspace = useTranslations("workspace");
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [workspaceRow, setWorkspaceRow] = useState<WorkspaceRow | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let canceled = false;
    let loadSeq = 0;

    async function load() {
      const seq = ++loadSeq;
      const ws = await getActiveWorkspace();
      if (canceled || seq !== loadSeq) return;
      if (!ws?.id) {
        setProfile(null);
        setWorkspaceRow(null);
        setLoaded(true);
        return;
      }
      setWorkspaceRow(ws);
      // Önceki firmaya ait rozetleri göstermemek için yalnızca workspace değişince sıfırla;
      // loaded=false yapmıyoruz — şerit workspace değişiminde kaybolup yanıp sönmesin.
      setProfile((prev) => (prev?.workspaceId === ws.id ? prev : null));
      const p = await fetchCompanyProfile(ws.id);
      if (canceled || seq !== loadSeq) return;
      setProfile(p);
      setLoaded(true);
    }

    function onWorkspaceChanged() {
      void load();
    }

    void load();
    window.addEventListener("risknova:active-workspace-changed", onWorkspaceChanged);
    return () => {
      canceled = true;
      loadSeq += 1;
      window.removeEventListener("risknova:active-workspace-changed", onWorkspaceChanged);
    };
  }, []);

  // Henüz yükleme tamam değil veya workspace yoksa — ince bir şerit bile
  // göstermeyerek layout şişirmeyelim.
  if (!loaded || !workspaceRow?.id) return null;

  const displayName = profile?.workspaceName ?? workspaceRow.name;
  const workspaceId = profile?.workspaceId ?? workspaceRow.id;
  const locationText = profile ? [profile.district, profile.city].filter(Boolean).join(", ") : "";
  const typeLabel = profile ? companyTypeLabel(profile.companyType, t) : "";

  return (
    <div
      className="border-b"
      style={{ borderColor: "var(--border)", background: "var(--card)" }}
    >
      <div className="mx-auto w-full min-w-0 max-w-[1480px] px-3 sm:px-6 xl:px-8 2xl:px-10">
        <div className="no-scrollbar flex min-w-0 flex-nowrap items-center gap-x-2 gap-y-0 overflow-x-auto py-2.5 text-[13px] sm:gap-x-3">
          <div className="flex min-w-0 flex-1 items-center gap-x-2 overflow-hidden sm:gap-x-3 md:gap-x-4">
            {/* Logo + firma adı = çalışma alanı seçici (tek isim, ayrı dropdown yok) */}
            <WorkspaceSwitcher
              menuAlign="left"
              renderTrigger={({ open, toggle, activeCountry, loading }) => (
                <button
                  type="button"
                  onClick={toggle}
                  aria-haspopup="listbox"
                  aria-expanded={open}
                  disabled={loading && !displayName}
                  className={cn(
                    "flex min-w-0 max-w-[min(100%,36rem)] shrink-0 items-center gap-2 rounded-lg border border-transparent px-1 py-0.5 text-left transition hover:border-border hover:bg-muted/45",
                    open && "border-border bg-muted/35",
                  )}
                  title={`${tWorkspace("switcher")} — ${displayName}`}
                >
                  {profile?.logoUrl ? (
                    <Image
                      src={profile.logoUrl}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 shrink-0 rounded-md border border-border object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-[var(--gold)]/15 text-[var(--gold)]">
                      <Building2 className="h-4 w-4" />
                    </span>
                  )}
                  <span className="hidden shrink-0 rounded-full border border-border/80 bg-background/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground sm:inline-flex">
                    {activeCountry}
                  </span>
                  <span className="min-w-0 truncate font-semibold text-foreground">{displayName}</span>
                  {profile?.companyCode ? (
                    <Badge variant="neutral" className="hidden shrink-0 font-mono text-[10px] sm:inline-flex">
                      {profile.companyCode}
                    </Badge>
                  ) : null}
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
                    aria-hidden
                  />
                </button>
              )}
            />

            <span className="hidden shrink-0 text-border xl:inline">|</span>

            {/* Meta chip'leri — tek satır, taşanlar gizlenir */}
            <div className="hidden min-w-0 flex-1 items-center gap-1.5 overflow-hidden lg:flex">
              {profile?.hazardClass ? (
                <Badge variant={hazardTone(profile.hazardClass)} className="hidden shrink-0 gap-1 md:inline-flex">
                  <Shield className="h-3 w-3" />
                  {profile.hazardClass}
                </Badge>
              ) : null}
              {typeLabel ? (
                <Badge variant="neutral" className="hidden shrink-0 xl:inline-flex">
                  {typeLabel}
                </Badge>
              ) : null}
              {profile?.sector ? (
                <Badge variant="neutral" className="hidden shrink-0 2xl:inline-flex">
                  {profile.sector}
                </Badge>
              ) : null}
              {profile?.naceCode ? (
                <Badge variant="neutral" className="hidden shrink-0 font-mono 2xl:inline-flex">
                  {t("activeCompanyBar.nacePrefix")} {profile.naceCode}
                </Badge>
              ) : null}
            </div>

            <span className="hidden shrink-0 text-border 2xl:inline">|</span>

            {/* Personel + konum */}
            {profile ? (
              <div className="hidden shrink-0 items-center gap-3 text-muted-foreground md:flex">
                <span
                  className="inline-flex items-center gap-1 whitespace-nowrap"
                  title={t("activeCompanyBar.personnelCountTitle")}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">{profile.personnelActive}</span>
                  <span className="opacity-70">/ {profile.personnelTotal}</span>
                </span>
                {locationText ? (
                  <span className="hidden max-w-[10rem] truncate lg:inline" title={profile.address ?? locationText}>
                    {locationText}
                  </span>
                ) : null}
                {!profile.isActive ? (
                  <Badge variant="danger" className="shrink-0">
                    {t("activeCompanyBar.inactiveBadge")}
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </div>

          <Link
            href={`/companies/${workspaceId}`}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
            )}
            title={t("activeCompanyBar.detailLinkTitle")}
          >
            <span className="hidden sm:inline">{t("activeCompanyBar.detailLink")}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
