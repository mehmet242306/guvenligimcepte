"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/lib/hooks/use-is-admin";
import { usePermission } from "@/lib/hooks/use-permission";
import { usePersistedState } from "@/lib/use-persisted-state";
import { AdminAITab } from "./AdminAITab";
import { AuditLogsTab } from "./AuditLogsTab";
import { DeletedRecordsTab } from "./DeletedRecordsTab";
import { KvkkCenterTab } from "./KvkkCenterTab";
import { MevzuatSyncTab } from "./MevzuatSyncTab";
import { RoleManagementTab } from "./RoleManagementTab";
import { SecurityEventsTab } from "./SecurityEventsTab";

type TabKey =
  | "general"
  | "mevzuat"
  | "security_events"
  | "role_management"
  | "kvkk_center"
  | "audit_logs"
  | "deleted_records"
  | "admin_ai";

type TabDef = {
  key: TabKey;
  label: string;
  adminOnly?: boolean;
  permission?: string;
};

const allTabs: TabDef[] = [
  { key: "general", label: "Genel" },
  { key: "mevzuat", label: "Mevzuat Senkronizasyonu" },
  { key: "kvkk_center", label: "KVKK Merkezi", permission: "compliance.kvkk.manage" },
  { key: "security_events", label: "Guvenlik Olaylari", permission: "security.events.view" },
  { key: "role_management", label: "Rol Yonetimi", permission: "security.roles.manage" },
  { key: "audit_logs", label: "Audit Loglari", adminOnly: true },
  { key: "deleted_records", label: "Silinmis Kayitlar", adminOnly: true },
  { key: "admin_ai", label: "Nova AI", adminOnly: true },
];

function GeneralTab() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-base font-semibold text-foreground">Genel Ayarlar</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Sistem tercihleri, kullanici deneyimi ayarlari ve organizasyon duzeyi yapilandirmalar burada yer alacaktir.
      </p>
      <div className="mt-4 space-y-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary/40" />
          Tema ve gorunum tercihleri
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary/40" />
          Bildirim ayarlari
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary/40" />
          Dil ve bolge secimi
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary/40" />
          API anahtarlari ve entegrasyonlar
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = usePersistedState<TabKey>("settings:tab", "mevzuat");
  const isAdmin = useIsAdmin();
  const canViewSecurityEvents = usePermission("security.events.view");
  const canManageRoles = usePermission("security.roles.manage");
  const canManageKvkk = usePermission("compliance.kvkk.manage");

  const visibleTabs = allTabs.filter((tab) => {
    if (tab.adminOnly) return isAdmin === true;
    if (tab.permission === "compliance.kvkk.manage") return canManageKvkk === true;
    if (tab.permission === "security.events.view") return canViewSecurityEvents === true;
    if (tab.permission === "security.roles.manage") return canManageRoles === true;
    return true;
  });

  useEffect(() => {
    if (visibleTabs.some((tab) => tab.key === activeTab)) {
      return;
    }

    setActiveTab("general");
  }, [activeTab, setActiveTab, visibleTabs]);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (
      requestedTab === "general" ||
      requestedTab === "mevzuat" ||
      requestedTab === "kvkk_center" ||
      requestedTab === "security_events" ||
      requestedTab === "role_management" ||
      requestedTab === "audit_logs" ||
      requestedTab === "deleted_records" ||
      requestedTab === "admin_ai"
    ) {
      setActiveTab(requestedTab);
    }
  }, [searchParams, setActiveTab]);

  return (
    <>
      <PageHeader
        eyebrow="Yonetim"
        title="Ayarlar"
        description="Sistem tercihleri, mevzuat senkronizasyonu ve organizasyon duzeyi yapilandirmalar."
      />

      <nav className="flex gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-[var(--shadow-soft)]">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {tab.key === "admin_ai" && (
              <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--accent)] text-[9px] font-bold text-white">
                N
              </span>
            )}
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="mt-4">
        {activeTab === "general" && <GeneralTab />}
        {activeTab === "mevzuat" && <MevzuatSyncTab />}
        {activeTab === "kvkk_center" && canManageKvkk === true && <KvkkCenterTab />}
        {activeTab === "security_events" && canViewSecurityEvents === true && <SecurityEventsTab />}
        {activeTab === "role_management" && canManageRoles === true && <RoleManagementTab />}
        {activeTab === "audit_logs" && isAdmin === true && <AuditLogsTab />}
        {activeTab === "deleted_records" && isAdmin === true && <DeletedRecordsTab />}
        {activeTab === "admin_ai" && isAdmin === true && <AdminAITab />}
      </div>
    </>
  );
}
