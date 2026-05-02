"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Brand } from "./brand";
import { LanguageSelector } from "./language-selector";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { ActiveCompanyBar } from "./active-company-bar";
import { ActiveCompanyNavLink } from "./active-company-nav-link";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { ConsentGate } from "@/components/compliance/ConsentGate";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/lib/hooks/use-is-admin";
import { createClient } from "@/lib/supabase/client";
import { quickSignOut } from "@/lib/auth/quick-sign-out";
import {
  getActiveWorkspace,
  listMyWorkspaces,
  setActiveWorkspace,
  setLocalWorkspaceContext,
} from "@/lib/supabase/workspace-api";
import { filterNavItemsForJurisdiction } from "@/lib/workspace/jurisdiction";
import {
  hasManagedOsgbAccount,
  resolveClientAccountSurface,
  type AccountContextPayload,
} from "@/lib/account/account-api";
import {
  listMyNotifications,
  markAllMyNotificationsAsRead,
  markNotificationAsRead,
  type NotificationRow,
} from "@/lib/supabase/notification-api";

type ProtectedShellProps = {
  children: ReactNode;
  initialAccountContext?: AccountContextPayload | null;
  initialIsAdmin?: boolean | null;
  initialHasActiveWorkspace?: boolean;
};

type ShellAccountContext = AccountContextPayload;

/* Top bar: core modules */
const primaryNav = [
  { href: "/dashboard", key: "nav.dashboard" },
  { href: "/workspace/onboarding", key: "nav.workspace" },
  { href: "/companies", key: "nav.companies" },
  { href: "/risk-analysis", key: "nav.riskAnalysis" },
  { href: "/corrective-actions", key: "nav.correctiveActions" },
  { href: "/incidents", key: "nav.incidents" },
  { href: "/isg-library", key: "nav.library" },
];

/* Second bar: other modules */
type NavItem = { href: string; key: string; adminOnly?: boolean };
const secondaryNav: NavItem[] = [
  { href: "/training", key: "nav.trainingHub" },
  { href: "/score-history", key: "nav.scoreHistory" },
  { href: "/planner", key: "nav.planner" },
  // { href: "/timesheet", key: "nav.timesheet" }, // Planner içindeki Puantaj sekmesinde
  { href: "/digital-twin", key: "nav.digitalTwin", adminOnly: true },
  // Raporlar: Artık firma workspace'i içindeki "İSG Dosyası" sekmesine taşındı.
  // { href: "/reports", key: "nav.reports" },
  // Paketler: üst menüden kaldırıldı — dashboard’daki “Paket ve kapasite” kartından erişim.
  { href: "/settings", key: "nav.settings" },
];

const osgbPrimaryNav = [
  { href: "/osgb", key: "nav.osgbPanel" },
  { href: "/dashboard", key: "nav.appDashboard" },
  { href: "/companies", key: "nav.firmaWorkspace" },
  { href: "/risk-analysis", key: "nav.riskAnalysis" },
  { href: "/corrective-actions", key: "nav.incidents" },
  { href: "/isg-library", key: "nav.library" },
  { href: "/osgb/firms", key: "nav.osgbClientFirms" },
  { href: "/osgb/professionals", key: "nav.osgbProfessionals" },
  { href: "/osgb/personnel", key: "nav.osgbPersonnel" },
  { href: "/osgb/assignments", key: "nav.osgbAssignments" },
  { href: "/osgb/tasks", key: "nav.osgbWorkTracking" },
];

const osgbSecondaryNav = [
  { href: "/training", key: "nav.trainingHub" },
  { href: "/osgb/contracts", key: "nav.osgbContracts" },
  // Raporlar: Firma workspace → İSG Dosyası sekmesine taşındı.
  { href: "/cozumler/osgb", key: "nav.osgbOffersCapacity" },
  { href: "/settings", key: "nav.settings" },
];

const platformAdminPrimaryNav = [
  { href: "/platform-admin", key: "nav.platformAdminHome" },
  { href: "/dashboard", key: "nav.appDashboard" },
  { href: "/companies", key: "nav.companies" },
  { href: "/risk-analysis", key: "nav.riskAnalysis" },
  { href: "/corrective-actions", key: "nav.incidents" },
  { href: "/isg-library", key: "nav.library" },
  { href: "/platform-admin/demo-requests", key: "nav.demoRequestsNav" },
  { href: "/platform-admin/demo-builder", key: "nav.demoBuilderNav" },
  { href: "/platform-admin/legal-corpus", key: "nav.legalCorpus" },
  { href: "/corrective-actions", key: "nav.correctiveActions" },
  { href: "/incidents", key: "nav.incidentsPage" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/osgb" || href === "/platform-admin") return pathname === href;
  if (href === "/isg-library") {
    return pathname.startsWith("/isg-library") || pathname.startsWith("/documents");
  }
  return pathname.startsWith(href);
}

/** Tek sekme: /training alt rotalari (slayt, sinav, yeni) hep "Egitim" aktif */
function isSecondaryNavActive(pathname: string, href: string) {
  if (href === "/training") return pathname.startsWith("/training");
  return isActive(pathname, href);
}

/** İkinci menü: /training (eğitim, anket, sınav) tek hub — alt sekmeler sayfa içinde */
function secondaryNavItemActive(pathname: string, href: string): boolean {
  const baseHref = href.split("?")[0] || href;
  if (baseHref === "/training") return pathname.startsWith("/training");
  return isSecondaryNavActive(pathname, href);
}

type SecondaryNavLinkItem = {
  href: string;
  key?: string;
  label?: string;
  adminOnly?: boolean;
};

type SecondaryNavLinksBaseProps = {
  items: SecondaryNavLinkItem[];
  pathname: string;
  disableWorkspaceModules: boolean;
  resolveNavLabel: (item: SecondaryNavLinkItem) => string;
  showWorkspaceSwitcher: boolean;
};

function SecondaryNavLinksDesktop({
  items,
  pathname,
  disableWorkspaceModules,
  resolveNavLabel,
  showWorkspaceSwitcher,
}: SecondaryNavLinksBaseProps) {
  return (
    <>
      {showWorkspaceSwitcher ? (
        <ActiveCompanyNavLink label="Firma" locked={disableWorkspaceModules} />
      ) : null}
      {items.map((item) => {
        const act = secondaryNavItemActive(pathname, item.href);
        const locked = disableWorkspaceModules && isWorkspaceLockedHref(item.href);
        const classes = cn(
          "relative inline-flex shrink-0 items-center rounded-xl px-3 py-2 text-[13px] font-semibold transition-all duration-200 xl:px-4 xl:text-[14px]",
          locked
            ? "cursor-not-allowed border border-white/8 bg-white/5 text-[var(--secondary-nav-text)] opacity-55"
            : act
              ? "text-[var(--secondary-nav-active)] bg-[var(--secondary-nav-hover-bg)]"
              : "text-[var(--secondary-nav-text)] hover:text-[var(--secondary-nav-hover-text)] hover:bg-[var(--secondary-nav-hover-bg)]",
        );
        const linkKey = item.key ?? `${item.href}:${item.label ?? ""}`;

        if (locked) {
          return (
            <span
              key={linkKey}
              className={classes}
              aria-disabled="true"
              title="Bu modulu acmak icin once calisma alani olustur"
            >
              {resolveNavLabel(item)}
            </span>
          );
        }

        return (
          <Link key={linkKey} href={item.href} className={classes}>
            {resolveNavLabel(item)}
            {act ? (
              <span className="absolute inset-x-1.5 bottom-0 h-0.5 rounded-full bg-[var(--secondary-nav-active)]" />
            ) : null}
          </Link>
        );
      })}
    </>
  );
}

function SecondaryNavLinksMobile({
  items,
  pathname,
  disableWorkspaceModules,
  resolveNavLabel,
  showWorkspaceSwitcher,
}: SecondaryNavLinksBaseProps) {
  return (
    <>
      {showWorkspaceSwitcher ? (
        <ActiveCompanyNavLink label="Firma" locked={disableWorkspaceModules} />
      ) : null}
      {items.map((item) => {
        const act = secondaryNavItemActive(pathname, item.href);
        const locked = disableWorkspaceModules && isWorkspaceLockedHref(item.href);
        const classes = cn(
          "relative inline-flex shrink-0 items-center rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors",
          locked
            ? "cursor-not-allowed opacity-50 text-muted-foreground"
            : act
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
        );
        const linkKey = item.key ?? `${item.href}:${item.label ?? ""}`;

        if (locked) {
          return (
            <span
              key={linkKey}
              className={classes}
              aria-disabled="true"
              title="Bu modulu acmak icin once calisma alani olustur"
            >
              {resolveNavLabel(item)}
            </span>
          );
        }

        return (
          <Link key={linkKey} href={item.href} className={classes}>
            {resolveNavLabel(item)}
            {act ? (
              <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-primary" />
            ) : null}
          </Link>
        );
      })}
    </>
  );
}

function isWorkspaceOptionalPath(pathname: string) {
  return (
    pathname.startsWith("/workspace/onboarding") ||
    pathname.startsWith("/companies") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/account/") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/notifications")
  );
}

function isWorkspaceLockedHref(href: string) {
  const pathOnly = href.split("?")[0] ?? href;
  if (pathOnly === "/pricing") return false;
  if (pathOnly.startsWith("/cozumler/")) return false;
  return (
    pathOnly !== "/workspace/onboarding" &&
    pathOnly !== "/companies" &&
    pathOnly !== "/settings" &&
    pathOnly !== "/account/osgb-affiliations"
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`timeout_${label}`));
    }, ms);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

/* ------------------------------------------------------------------ */
/* Theme toggle                                                        */
/* ------------------------------------------------------------------ */
function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem("risknova-theme");
    const isDark =
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDark);
    mountedRef.current = true;
  }, []);

  function toggle() {
    const root = document.documentElement;
    const currentlyDark = root.getAttribute("data-theme") === "dark";
    const next = !currentlyDark;
    root.setAttribute("data-theme", next ? "dark" : "light");
    root.classList.toggle("dark", next);
    localStorage.setItem("risknova-theme", next ? "dark" : "light");
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Açık tema" : "Koyu tema"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--nav-icon-color)] transition-all duration-200 hover:bg-white/10 hover:text-white sm:h-11 sm:w-11"
    >
      {dark ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Notification Bell                                                   */
/* ------------------------------------------------------------------ */

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    const data = await listMyNotifications(10);
    setNotifications(data);
    setUnreadCount(data.filter((n) => !n.is_read).length);
  }, []);

  useEffect(() => { void loadNotifications(); }, [loadNotifications]);

  // Periodically refresh (every 30s)
  useEffect(() => {
    const interval = setInterval(() => { void loadNotifications(); }, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAsRead(id: string) {
    const ok = await markNotificationAsRead(id);
    if (!ok) return;
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const ok = await markAllMyNotificationsAsRead(unreadIds);
    if (!ok) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Az önce";
    if (mins < 60) return `${mins} dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    return `${days} gün önce`;
  }

  function levelColor(level: string) {
    if (level === "critical") return "bg-red-500";
    if (level === "warning") return "bg-amber-500";
    return "bg-blue-500";
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); if (!open) void loadNotifications(); }}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--nav-icon-color)] transition-all duration-200 hover:bg-white/10 hover:text-white sm:h-11 sm:w-11"
        aria-label="Bildirimler"
      >
        <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-[0_0_6px_rgba(239,68,68,0.5)] animate-pulse" style={{ animationDuration: "2s" }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elevated)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Bildirimler</h3>
            {unreadCount > 0 && (
              <button type="button" onClick={() => void markAllRead()} className="text-[11px] font-medium text-primary hover:underline">
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Henüz bildirim yok
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-border/50 px-4 py-3 transition-colors ${n.is_read ? "opacity-60" : "bg-primary/5"}`}
                >
                  {n.link ? (
                    <Link
                      href={n.link}
                      onClick={() => { void markAsRead(n.id); setOpen(false); }}
                      className="block"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${levelColor(n.level)}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground">{n.title}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{n.message}</p>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                            {n.actor_name && <span>{n.actor_name}</span>}
                            <span>{timeAgo(n.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-start gap-2.5" onClick={() => void markAsRead(n.id)} role="button" tabIndex={0}>
                      <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${levelColor(n.level)}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground">{n.title}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{n.message}</p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                          {n.actor_name && <span>{n.actor_name}</span>}
                          <span>{timeAgo(n.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-medium text-primary hover:underline"
            >
              Tümünü Gör
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderSignOutButton() {
  const [signingOut, setSigningOut] = useState(false);

  async function handleClick() {
    if (signingOut) return;
    setSigningOut(true);
    await quickSignOut("/login");
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={signingOut}
      className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-xl border border-[rgba(231,205,163,0.18)] text-[14px] font-bold text-[var(--gold-light)] transition-all duration-200 hover:bg-[var(--gold-glow)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:w-auto sm:px-3"
      aria-label="Oturumu kapat"
      title="Oturumu kapat"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      <span className="hidden 2xl:inline">{signingOut ? "Çıkılıyor..." : "Çıkış"}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */
export function ProtectedShell({
  children,
  initialAccountContext = null,
  initialIsAdmin = null,
  initialHasActiveWorkspace = false,
}: ProtectedShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const resolveNavLabel = (item: { key?: string; label?: string }) =>
    item.key ? t(item.key) : item.label ?? "";
  const isAdmin = useIsAdmin(initialIsAdmin);
  const [accountContext, setAccountContext] = useState<ShellAccountContext | null>(
    initialAccountContext,
  );
  const [authReady, setAuthReady] = useState(initialAccountContext !== null);
  const [workspaceReady, setWorkspaceReady] = useState(initialAccountContext !== null);
  const [hasActiveWorkspace, setHasActiveWorkspace] = useState(initialHasActiveWorkspace);
  /** Aktif workspace country_code — TR dışındaki bölgelerde Türkiye’ye özel menüler filtrelenir. */
  const [workspaceCountryCode, setWorkspaceCountryCode] = useState<string | null>(null);
  /** Tailwind `md` (768px) alti: tek sutun mobil nav; workspace switcher asagida gosterilir */
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const isFullscreenWorkspaceOnboarding = pathname.startsWith("/workspace/onboarding");
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!authReady || !accountContext?.organizationId) return;
    let cancelled = false;

    async function syncWorkspaceCountry() {
      try {
        const ws = await getActiveWorkspace();
        if (cancelled) return;
        setWorkspaceCountryCode(ws?.country_code ?? null);
      } catch {
        if (!cancelled) setWorkspaceCountryCode(null);
      }
    }

    void syncWorkspaceCountry();

    function onWorkspaceChanged() {
      void syncWorkspaceCountry();
    }

    window.addEventListener("risknova:active-workspace-changed", onWorkspaceChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("risknova:active-workspace-changed", onWorkspaceChanged);
    };
  }, [authReady, accountContext?.organizationId, hasActiveWorkspace]);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsNarrowViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const accountSurface = resolveClientAccountSurface(accountContext);
  const isPlatformAdminShell =
    pathname.startsWith("/platform-admin") || accountSurface === "platform-admin";
  const isIndividualWorkspaceHome =
    accountSurface === "standard" && accountContext?.accountType === "individual";
  const isOsgbShell =
    !isPlatformAdminShell && accountSurface === "osgb-manager";
  const showWorkspaceSwitcher = !isPlatformAdminShell;
  const showNotificationBell = !isPlatformAdminShell && !!accountContext?.organizationId;
  const showChatWidget = true;
  const disableWorkspaceModules =
    accountSurface === "standard" &&
    accountContext?.accountType === "individual" &&
    !hasActiveWorkspace;
  const standardPrimaryNav =
    accountContext?.accountType === "individual"
      ? primaryNav.map((item) =>
          item.href === "/companies"
            ? { href: item.href, key: "nav.workplace" }
            : item,
        )
      : primaryNav;
  const visibleStandardPrimaryNav =
    accountContext?.accountType === "individual"
      ? primaryNav.filter((item) => item.href !== "/companies")
      : standardPrimaryNav;
  const basePrimaryNav = isPlatformAdminShell
    ? platformAdminPrimaryNav
    : isOsgbShell
      ? osgbPrimaryNav
      : visibleStandardPrimaryNav;
  const baseSecondaryNav = isPlatformAdminShell
    ? []
    : isOsgbShell
      ? [...osgbSecondaryNav]
      : [
          ...secondaryNav.filter((i) => !i.adminOnly || isAdmin === true),
          ...(accountContext?.accountType === "individual" &&
          (accountContext.membershipRole === "owner" || accountContext.membershipRole === "admin")
            ? [{ href: "/account/osgb-affiliations" as const, key: "nav.osgbAffiliations" as const }]
            : []),
        ];

  const navJurisdictionMode = isOsgbShell ? "osgb" : "standard";
  const primaryNavForUi = isPlatformAdminShell
    ? basePrimaryNav
    : (filterNavItemsForJurisdiction(
        basePrimaryNav as readonly { href: string }[],
        workspaceCountryCode,
        navJurisdictionMode,
      ) as typeof basePrimaryNav);
  const secondaryNavForUi = isPlatformAdminShell
    ? baseSecondaryNav
    : (filterNavItemsForJurisdiction(
        baseSecondaryNav as readonly { href: string }[],
        workspaceCountryCode,
        navJurisdictionMode,
      ) as typeof baseSecondaryNav);

  const homeHref = isPlatformAdminShell
    ? "/platform-admin"
    : isOsgbShell
      ? "/osgb"
      : isIndividualWorkspaceHome
        ? hasActiveWorkspace
          ? "/dashboard"
          : "/workspace/onboarding"
        : accountContext?.accountType === "enterprise"
          ? "/enterprise"
          : "/companies";

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    if (!supabase) {
      router.replace(`/login?next=${encodeURIComponent(pathnameRef.current)}`);
      return;
    }

    const authClient = supabase;

    async function ensureAuthenticated() {
      let user = null;

      try {
        const result = await withTimeout(authClient.auth.getUser(), 8000, "auth_get_user");
        user = result.data.user;
      } catch (error) {
        console.warn("[protected-shell] auth.getUser failed:", error);
      }

      if (cancelled) return;

      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(pathnameRef.current)}`);
        return;
      }

      let assuranceData = null;
      let assuranceError: unknown = null;

      try {
        const assuranceResult = await withTimeout(
          authClient.auth.mfa.getAuthenticatorAssuranceLevel(),
          8000,
          "mfa_assurance",
        );
        assuranceData = assuranceResult.data;
        assuranceError = assuranceResult.error;
      } catch (error) {
        assuranceError = error;
        console.warn("[protected-shell] mfa assurance failed:", error);
      }

      if (cancelled) return;

      if (
        !assuranceError &&
        assuranceData?.nextLevel === "aal2" &&
        assuranceData.currentLevel !== "aal2"
      ) {
        router.replace(
          `/auth/mfa-challenge?next=${encodeURIComponent(pathnameRef.current)}`,
        );
        return;
      }

      try {
        const response = await withTimeout(
          fetch("/api/account/context", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
          8000,
          "account_context",
        );
        const raw = await response.text();
        const json = raw.trim() ? JSON.parse(raw) as { context?: ShellAccountContext } : null;
        if (!cancelled) {
          setAccountContext(json?.context ?? null);
        }
      } catch {
        if (!cancelled) {
          setAccountContext(null);
        }
      }

      setAuthReady(true);
    }

    // İlk yüklemede SSR data geldiyse client-side fetch atla.
    // Subscription auth event'lerinde re-validate yine çalışır.
    if (initialAccountContext === null) {
      setAuthReady(false);
      void ensureAuthenticated();
    }

    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace(`/login?next=${encodeURIComponent(pathnameRef.current)}`);
        return;
      }

      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "MFA_CHALLENGE_VERIFIED"
      ) {
        void ensureAuthenticated();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    const shouldCheckWorkspace =
      accountSurface === "standard" && accountContext?.accountType === "individual";
    const requiresWorkspaceContext =
      shouldCheckWorkspace && !isWorkspaceOptionalPath(pathnameRef.current);

    // SSR'dan workspace bilgisi geldiyse ve aktifse — fetch atla.
    if (initialAccountContext !== null && initialHasActiveWorkspace && shouldCheckWorkspace) {
      setHasActiveWorkspace(true);
      setWorkspaceReady(true);
      return;
    }

    async function ensureWorkspaceContext() {
      if (!authReady) return;

      if (!shouldCheckWorkspace) {
        setHasActiveWorkspace(true);
        setWorkspaceReady(true);
        return;
      }

      if (requiresWorkspaceContext) {
        setWorkspaceReady(false);
      } else {
        setWorkspaceReady(true);
      }

      let memberships: Awaited<ReturnType<typeof listMyWorkspaces>> = [];
      let activeWorkspace: Awaited<ReturnType<typeof getActiveWorkspace>> = null;

      try {
        [memberships, activeWorkspace] = await withTimeout(
          Promise.all([
            listMyWorkspaces(),
            getActiveWorkspace(),
          ]),
          10000,
          "workspace_context",
        );
      } catch (error) {
        console.warn("[protected-shell] workspace context lookup failed:", error);
        memberships = [];
        activeWorkspace = null;
      }

      if (cancelled) return;

      if (activeWorkspace?.id) {
        setHasActiveWorkspace(true);
        setWorkspaceReady(true);
        return;
      }

      if (memberships.length > 0) {
        const fallbackMembership = memberships[0];
        setLocalWorkspaceContext({
          id: fallbackMembership.workspace.id,
          organizationId: fallbackMembership.workspace.organization_id,
          countryCode: fallbackMembership.workspace.country_code,
          name: fallbackMembership.workspace.name,
          defaultLanguage: fallbackMembership.workspace.default_language,
          timezone: fallbackMembership.workspace.timezone,
          roleKey: fallbackMembership.role_key,
          certificationId: fallbackMembership.certification_id ?? null,
          isPrimary: fallbackMembership.is_primary,
        });
        setHasActiveWorkspace(true);
        setWorkspaceReady(true);
        void setActiveWorkspace(fallbackMembership.workspace.id);
        return;
      }

      try {
        const response = await withTimeout(
          fetch("/api/workspaces/onboarding", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
          10000,
          "workspace_onboarding",
        );
        const raw = await response.text();
        const json = raw.trim()
          ? (JSON.parse(raw) as {
              memberships?: Array<{
                roleKey?: string;
                certificationId?: string | null;
                isPrimary?: boolean;
                workspace?: {
                  id: string;
                  organization_id: string;
                  country_code: string;
                  name: string;
                  default_language: string;
                  timezone: string;
                };
              }>;
              profile?: { activeWorkspaceId?: string | null };
            })
          : null;

        if (!cancelled && Array.isArray(json?.memberships) && json.memberships.length > 0) {
          const selectedMembership =
            json.memberships.find(
              (membership) => membership.workspace?.id === json.profile?.activeWorkspaceId,
            ) ?? json.memberships[0];

          if (selectedMembership?.workspace) {
            setLocalWorkspaceContext({
              id: selectedMembership.workspace.id,
              organizationId: selectedMembership.workspace.organization_id,
              countryCode: selectedMembership.workspace.country_code,
              name: selectedMembership.workspace.name,
              defaultLanguage: selectedMembership.workspace.default_language,
              timezone: selectedMembership.workspace.timezone,
              roleKey: selectedMembership.roleKey ?? "member",
              certificationId: selectedMembership.certificationId ?? null,
              isPrimary: selectedMembership.isPrimary ?? true,
            });
            setHasActiveWorkspace(true);
            setWorkspaceReady(true);
            void setActiveWorkspace(selectedMembership.workspace.id);
            return;
          }
        }
      } catch {
        // Silent fallback: if workspace bootstrap endpoint is unreachable we
        // keep the existing redirect behavior below.
      }

      setHasActiveWorkspace(false);

      if (!requiresWorkspaceContext) {
        setWorkspaceReady(true);
        return;
      }

      router.replace(`/workspace/onboarding?next=${encodeURIComponent(pathnameRef.current)}`);
    }

    void ensureWorkspaceContext();

    return () => {
      cancelled = true;
    };
    // pathname dep kaldırıldı — workspace check her sayfa geçişinde tekrarlanmasın.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountContext?.accountType, accountSurface, authReady]);

  if (!authReady || !workspaceReady) {
    return (
      <div className="app-shell">
        <main className="mx-auto flex min-h-[60vh] w-full max-w-[1480px] items-center justify-center px-4 py-6 sm:px-6 xl:px-8 2xl:px-10">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
            <p className="text-sm text-muted-foreground">
              {authReady ? "Workspace baglami hazirlaniyor..." : "Guvenli oturum dogrulaniyor..."}
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (isFullscreenWorkspaceOnboarding) {
    return (
      <div className="app-shell min-h-screen">
        <main className="mx-auto w-full max-w-[1680px] px-4 py-5 sm:px-6 lg:px-10 xl:px-12 2xl:px-16">
          {children}
        </main>
        <ConsentGate />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* ── Sticky header group (both bars stay fixed) ── */}
      <div className="sticky top-0 z-40">
        {/* ── Top Header — Brand + Primary Nav + Actions ── */}
        <header
          className="relative z-10"
          style={{ background: "var(--header-bg-solid)", borderBottom: "1px solid var(--header-border)" }}
        >
          <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-2 px-3 py-2 sm:px-5 xl:px-8 2xl:px-10">
            {/* Satir 1: marka + aksiyonlar (dar ekranda tek satir; lg+ ust bant) */}
            <div className="flex min-h-[64px] items-center justify-between gap-3 sm:min-h-[68px] lg:min-h-[56px]">
            <div className="min-w-0">
              <div className="xl:hidden">
                <Brand href={homeHref} inverted compact />
              </div>
              <div className="hidden xl:block">
                <Brand href={homeHref} inverted />
              </div>
            </div>

            {/* Mobil / tablet: birincil menu asagidaki blokta; burada sadece aksiyonlar */}
            <div className="flex min-w-0 shrink-0 items-center justify-end gap-0.5 sm:gap-1.5">
              <LanguageSelector variant="dark" />
              {showNotificationBell ? <NotificationBell /> : null}
              <ThemeToggle />
              <Link
                href="/profile"
                className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-xl text-[14px] font-bold text-[var(--gold-light)] transition-all duration-200 hover:bg-[var(--gold-glow)] hover:text-white sm:h-11 sm:w-auto sm:px-3"
                aria-label="Profil"
                title="Profil"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="hidden 2xl:inline">{t("common.profile")}</span>
              </Link>
              {isAdmin === true ? (
                <Link
                  href="/platform-admin"
                  className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-xl text-[14px] font-bold text-[var(--gold-light)] transition-all duration-200 hover:bg-[var(--gold-glow)] hover:text-white sm:h-11 sm:w-auto sm:px-3"
                  aria-label="Platform Admin"
                  title="Platform Admin"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
                    <path d="M9.5 12.5l1.8 1.8 3.2-4.3" />
                  </svg>
                  <span className="hidden 2xl:inline">Admin</span>
                </Link>
              ) : null}
              <HeaderSignOutButton />
            </div>
            </div>

            {/* Satir 2: birincil menu — tam genislik, satir kirar; kaydirma yok */}
            <nav className="hidden w-full min-w-0 border-t border-white/10 pt-2 lg:block lg:border-t-0 lg:pt-0">
              <div className="flex w-full flex-wrap items-center justify-center gap-x-0.5 gap-y-1.5 sm:gap-x-1">
                {primaryNavForUi.map((item) => {
                  const act = isActive(pathname, item.href);
                  const locked = disableWorkspaceModules && isWorkspaceLockedHref(item.href);
                  const classes = cn(
                    "relative inline-flex h-10 max-w-full items-center rounded-2xl px-2 text-[12px] font-bold tracking-[-0.012em] transition-all duration-200 sm:h-11 sm:px-2.5 sm:text-[13px] xl:px-3 xl:text-[14px] 2xl:px-3.5 2xl:text-[15px]",
                    locked
                      ? "cursor-not-allowed border border-white/8 bg-white/5 text-[var(--header-muted)] opacity-55"
                      : act
                        ? "bg-[var(--gold-glow)] text-[var(--gold-light)] shadow-[0_10px_30px_rgba(0,0,0,0.18)] ring-1 ring-[rgba(231,205,163,0.22)]"
                        : "text-[var(--gold-light)] hover:bg-[var(--header-hover-bg)] hover:text-white",
                  );

                  if (locked) {
                    return (
                      <span
                        key={"key" in item && item.key ? item.key : item.href}
                        className={classes}
                        aria-disabled="true"
                        title="Bu modulu acmak icin once calisma alani olustur"
                      >
                        {resolveNavLabel(item)}
                      </span>
                    );
                  }

                  return (
                    <Link
                      key={"key" in item && item.key ? item.key : item.href}
                      href={item.href}
                      className={classes}
                    >
                      {resolveNavLabel(item)}
                      {act && (
                        <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--gold-light)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </header>

        {/* ── Secondary navigation bar (centered, sticky with header) ── */}
        {/* Gold ayraç — 1 ile 2 arası (üst üste, boşluksuz) */}
        <div className="hidden md:block relative z-0" style={{ background: "var(--secondary-nav-bg-solid)", borderBottom: "1px solid var(--secondary-nav-border)" }}>
          <div className="mx-auto grid min-h-12 w-full max-w-[1480px] grid-cols-[minmax(260px,1fr)_auto_minmax(260px,1fr)] items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6 xl:grid-cols-[minmax(280px,1fr)_auto_minmax(280px,1fr)] xl:gap-4 xl:px-8 2xl:px-10">
            <div />
            <div className="min-w-0 max-w-full justify-self-center">
              <div className="flex max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-1.5">
                {/* Firma linki — secondary nav'ın ilk item'ı. Aktif workspace'in
                    /companies/[slug|id] detay sayfasına götürür (10 sekmeli). */}
                <SecondaryNavLinksDesktop
                  items={secondaryNavForUi}
                  pathname={pathname}
                  disableWorkspaceModules={disableWorkspaceModules}
                  resolveNavLabel={resolveNavLabel}
                  showWorkspaceSwitcher={showWorkspaceSwitcher}
                />
              </div>
            </div>
            <div className="flex items-center justify-end">
              {showWorkspaceSwitcher && !isNarrowViewport ? (
                <WorkspaceSwitcher variant="desktop" />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation: primary and secondary modules stay on separate rows. */}
      <div className="border-b md:hidden" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="mx-auto w-full max-w-[1480px]">
          <div className="border-b border-border/70 px-2">
            <div className="no-scrollbar flex max-w-full flex-nowrap justify-start gap-x-0.5 gap-y-1 overflow-x-auto py-1.5 sm:flex-wrap sm:justify-center">
              {primaryNavForUi.map((item) => {
              const act = isActive(pathname, item.href);
              const locked = disableWorkspaceModules && isWorkspaceLockedHref(item.href);
              const classes = cn(
                "relative inline-flex shrink-0 items-center px-3 py-2.5 text-[13px] font-semibold transition-colors",
                locked
                  ? "cursor-not-allowed opacity-50 text-muted-foreground"
                  : act
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
              );

              if (locked) {
                return (
                  <span
                    key={"key" in item && item.key ? item.key : item.href}
                    className={classes}
                    aria-disabled="true"
                    title="Bu modulu acmak icin once calisma alani olustur"
                  >
                    {resolveNavLabel(item)}
                  </span>
                );
              }

              return (
                <Link
                  key={"key" in item && item.key ? item.key : item.href}
                  href={item.href}
                  className={classes}
                >
                  {resolveNavLabel(item)}
                  {act && (
                    <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
            </div>
          </div>

          <div className="px-2">
            <div className="no-scrollbar flex max-w-full flex-nowrap justify-start gap-x-0.5 gap-y-1 overflow-x-auto py-1.5 sm:flex-wrap sm:justify-center">
              <SecondaryNavLinksMobile
                items={secondaryNavForUi}
                pathname={pathname}
                disableWorkspaceModules={disableWorkspaceModules}
                resolveNavLabel={resolveNavLabel}
                showWorkspaceSwitcher={showWorkspaceSwitcher}
              />
            </div>
          </div>

          {showWorkspaceSwitcher && isNarrowViewport ? (
            <div className="border-t border-border/70 bg-muted/20 px-2 py-2">
              <p className="mb-1.5 px-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t("nav.workspace")}
              </p>
              <WorkspaceSwitcher variant="mobile" />
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Aktif firma şeridi (header 3. satırı) — sadece workspace seçiliyse ── */}
      {showWorkspaceSwitcher ? <ActiveCompanyBar /> : null}

      {/* ── Main content ── */}
      <main className="mx-auto min-w-0 w-full max-w-[1480px] overflow-x-hidden px-3 py-5 sm:px-6 xl:px-8 2xl:px-10">
        <div className="page-stack min-w-0 max-w-full">{children}</div>
      </main>

      {/* ── Chat Widget ── */}
      <ConsentGate />
      {showChatWidget ? <ChatWidget isAuthenticated /> : null}
    </div>
  );
}
