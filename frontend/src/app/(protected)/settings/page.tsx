"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/lib/hooks/use-is-admin";
import { usePermission } from "@/lib/hooks/use-permission";
import { usePersistedState } from "@/lib/use-persisted-state";
import { AdminAITab } from "./AdminAITab";
import { AdminDocumentsTab } from "./AdminDocumentsTab";
import { AdminNotificationsTab } from "./AdminNotificationsTab";
import { AdminOverviewTab } from "./AdminOverviewTab";
import { AIUsageTab } from "./AIUsageTab";
import { AuditLogsTab } from "./AuditLogsTab";
import { DatabaseHealthTab } from "./DatabaseHealthTab";
import { DeletedRecordsTab } from "./DeletedRecordsTab";
import { ErrorLogsTab } from "./ErrorLogsTab";
import { KvkkCenterTab } from "./KvkkCenterTab";
import { MevzuatSyncTab } from "./MevzuatSyncTab";
import { RoleManagementTab } from "./RoleManagementTab";
import { SecurityEventsTab } from "./SecurityEventsTab";
import { SelfHealingTab } from "./SelfHealingTab";
import { UserManagementTab } from "./UserManagementTab";

type TabKey =
  | "admin_dashboard"
  | "general"
  | "mevzuat"
  | "security_events"
  | "role_management"
  | "kvkk_center"
  | "self_healing"
  | "error_logs"
  | "users"
  | "ai_usage"
  | "database_health"
  | "admin_notifications"
  | "admin_documents"
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
  { key: "admin_dashboard", label: "Admin Dashboard", permission: "admin.dashboard.view" },
  { key: "general", label: "Genel" },
  { key: "mevzuat", label: "Mevzuat Senkronizasyonu" },
  { key: "error_logs", label: "Hata Loglari", permission: "admin.error_logs.view" },
  { key: "users", label: "Kullanicilar", permission: "admin.users.manage" },
  { key: "ai_usage", label: "AI Kullanim", permission: "admin.ai_usage.view" },
  { key: "database_health", label: "Veritabani", permission: "admin.database_health.view" },
  { key: "admin_notifications", label: "Bildirim Merkezi", permission: "admin.notifications.view" },
  { key: "admin_documents", label: "Belgeler", permission: "admin.documents.manage" },
  { key: "kvkk_center", label: "KVKK Merkezi", permission: "compliance.kvkk.manage" },
  { key: "self_healing", label: "Self-Healing", permission: "self_healing.view" },
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
  const [activeTab, setActiveTab] = usePersistedState<TabKey>("settings:tab", "admin_dashboard");
  const isAdmin = useIsAdmin();
  const canViewAdminDashboard = usePermission("admin.dashboard.view");
  const canViewErrorLogs = usePermission("admin.error_logs.view");
  const canManageUsers = usePermission("admin.users.manage");
  const canViewAiUsage = usePermission("admin.ai_usage.view");
  const canViewDatabaseHealth = usePermission("admin.database_health.view");
  const canViewNotifications = usePermission("admin.notifications.view");
  const canManageDocuments = usePermission("admin.documents.manage");
  const canViewSecurityEvents = usePermission("security.events.view");
  const canManageRoles = usePermission("security.roles.manage");
  const canManageKvkk = usePermission("compliance.kvkk.manage");
  const canViewSelfHealing = usePermission("self_healing.view");

  const permissionState: Record<string, boolean> = {
    "admin.dashboard.view": canViewAdminDashboard === true,
    "admin.error_logs.view": canViewErrorLogs === true,
    "admin.users.manage": canManageUsers === true,
    "admin.ai_usage.view": canViewAiUsage === true,
    "admin.database_health.view": canViewDatabaseHealth === true,
    "admin.notifications.view": canViewNotifications === true,
    "admin.documents.manage": canManageDocuments === true,
    "compliance.kvkk.manage": canManageKvkk === true,
    "self_healing.view": canViewSelfHealing === true,
    "security.events.view": canViewSecurityEvents === true,
    "security.roles.manage": canManageRoles === true,
  };

  const visibleTabs = allTabs.filter((tab) => {
    if (tab.adminOnly) return isAdmin === true;
    if (tab.permission) return permissionState[tab.permission] === true;
    return true;
  });

  useEffect(() => {
    if (visibleTabs.some((tab) => tab.key === activeTab)) {
      return;
    }

    setActiveTab(visibleTabs[0]?.key ?? "general");
  }, [activeTab, setActiveTab, visibleTabs]);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (
      requestedTab === "admin_dashboard" ||
      requestedTab === "general" ||
      requestedTab === "mevzuat" ||
      requestedTab === "error_logs" ||
      requestedTab === "users" ||
      requestedTab === "ai_usage" ||
      requestedTab === "database_health" ||
      requestedTab === "admin_notifications" ||
      requestedTab === "admin_documents" ||
      requestedTab === "kvkk_center" ||
      requestedTab === "self_healing" ||
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
        {activeTab === "admin_dashboard" && canViewAdminDashboard === true && (
          <AdminOverviewTab onNavigate={setActiveTab} />
        )}
        {activeTab === "general" && <GeneralTab />}
        {activeTab === "mevzuat" && <MevzuatSyncTab />}
        {activeTab === "error_logs" && canViewErrorLogs === true && <ErrorLogsTab />}
        {activeTab === "users" && canManageUsers === true && (
          <UserManagementTab onNavigateRoleManagement={() => setActiveTab("role_management")} />
        )}
        {activeTab === "ai_usage" && canViewAiUsage === true && <AIUsageTab />}
        {activeTab === "database_health" && canViewDatabaseHealth === true && <DatabaseHealthTab />}
        {activeTab === "admin_notifications" && canViewNotifications === true && (
          <AdminNotificationsTab />
        )}
        {activeTab === "admin_documents" && canManageDocuments === true && <AdminDocumentsTab />}
        {activeTab === "kvkk_center" && canManageKvkk === true && <KvkkCenterTab />}
        {activeTab === "self_healing" && canViewSelfHealing === true && <SelfHealingTab />}
        {activeTab === "security_events" && canViewSecurityEvents === true && <SecurityEventsTab />}
        {activeTab === "role_management" && canManageRoles === true && <RoleManagementTab />}
        {activeTab === "audit_logs" && isAdmin === true && <AuditLogsTab />}
        {activeTab === "deleted_records" && isAdmin === true && <DeletedRecordsTab />}
        {activeTab === "admin_ai" && isAdmin === true && <AdminAITab />}
      </div>
    </>
  );
}
