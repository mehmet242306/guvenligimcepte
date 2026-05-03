"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, ChevronRight, Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  fetchCompanyProfile,
  type CompanyProfile,
} from "@/lib/supabase/company-profile";
import { getActiveWorkspace } from "@/lib/supabase/workspace-api";
import { useI18n } from "@/lib/i18n";

// =============================================================================
// Aktif Firma Şeridi — global header'ın hemen altında tüm sayfalarda görünür
// =============================================================================
// Kullanıcının bir firma workspace seçili olduğunda kompakt bir bilgi bandı
// çizer: logo + isim + tehlike sınıfı + sektör + personel + konum, tümü
// sola sığdırılmış. Sağda "Firma Detayı" linki ile /companies/[id]'ye yönlendirir.
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
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let canceled = false;
    let loadSeq = 0;

    async function load() {
      const seq = ++loadSeq;
      setLoaded(false);
      const ws = await getActiveWorkspace();
      if (canceled || seq !== loadSeq) return;
      if (!ws?.id) {
        setProfile(null);
        setLoaded(true);
        return;
      }
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
  if (!loaded || !profile) return null;

  const locationText = [profile.district, profile.city].filter(Boolean).join(", ");
  const typeLabel = companyTypeLabel(profile.companyType, t);

  return (
    <div
      className="border-b"
      style={{ borderColor: "var(--border)", background: "var(--card)" }}
    >
      <div className="mx-auto w-full min-w-0 max-w-[1480px] px-3 sm:px-6 xl:px-8 2xl:px-10">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 py-2.5 text-[13px] sm:gap-x-4">
          {/* Logo / avatar */}
          {profile.logoUrl ? (
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

          {/* İsim + kod */}
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-semibold text-foreground" title={profile.workspaceName}>
              {profile.workspaceName}
            </span>
            {profile.companyCode ? (
              <Badge variant="neutral" className="shrink-0 font-mono text-[10px]">
                {profile.companyCode}
              </Badge>
            ) : null}
          </div>

          <span className="hidden text-border xl:inline">|</span>

          {/* Meta chip'leri */}
          <div className="flex flex-wrap items-center gap-1.5">
            {profile.hazardClass ? (
              <Badge variant={hazardTone(profile.hazardClass)} className="gap-1">
                <Shield className="h-3 w-3" />
                {profile.hazardClass}
              </Badge>
            ) : null}
            {typeLabel ? <Badge variant="neutral">{typeLabel}</Badge> : null}
            {profile.sector ? (
              <Badge variant="neutral" className="hidden sm:inline-flex">
                {profile.sector}
              </Badge>
            ) : null}
            {profile.naceCode ? (
              <Badge variant="neutral" className="hidden font-mono md:inline-flex">
                {t("activeCompanyBar.nacePrefix")} {profile.naceCode}
              </Badge>
            ) : null}
          </div>

          <span className="hidden text-border xl:inline">|</span>

          {/* Personel + konum */}
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="inline-flex items-center gap-1 whitespace-nowrap" title={t("activeCompanyBar.personnelCountTitle")}>
              <Users className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{profile.personnelActive}</span>
              <span className="opacity-70">/ {profile.personnelTotal}</span>
            </span>
            {locationText ? (
              <span className="hidden truncate md:inline" title={profile.address ?? locationText}>
                {locationText}
              </span>
            ) : null}
            {!profile.isActive ? <Badge variant="danger">{t("activeCompanyBar.inactiveBadge")}</Badge> : null}
          </div>

          {/* Sağ tarafta firma detayı linki */}
          <Link
            href={`/companies/${profile.slug ?? profile.workspaceId}`}
            className={cn(
              "ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
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
