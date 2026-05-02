"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, MonitorDown, Smartphone, X } from "lucide-react";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaInstallPromptProps = {
  surface: "public" | "app";
  className?: string;
};

const DISMISSED_KEY = "risknova-pwa-install-dismissed";

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function isIosDevice() {
  if (typeof window === "undefined") return false;
  const platform = window.navigator.platform.toLowerCase();
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent) || (platform === "macintel" && navigator.maxTouchPoints > 1);
}

function isRecentlyDismissed() {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
    if (!dismissedAt) return false;
    return Date.now() - dismissedAt < 1000 * 60 * 60 * 24 * 7;
  } catch {
    return false;
  }
}

export function PwaInstallPrompt({ surface, className }: PwaInstallPromptProps) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay() || isRecentlyDismissed()) return;

    if (isIosDevice()) {
      setShowIosHint(true);
      setVisible(true);
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    function handleAppInstalled() {
      setVisible(false);
      setInstallEvent(null);
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const copy = useMemo(() => {
    if (surface === "public") {
      return {
        title: "RiskNova'yı uygulama gibi kur",
        description: "iOS, Android ve Windows'ta ayrı pencereyle hızlı aç.",
        button: "Cihaza kur",
      };
    }

    return {
      title: "RiskNova uygulamasını kur",
      description: "Saha, doküman ve Nova akışlarına ana ekrandan dön.",
      button: "Kur",
    };
  }, [surface]);

  if (!visible) return null;

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
    }
    setInstallEvent(null);
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // noop
    }
    setVisible(false);
  }

  const Icon = surface === "public" ? Smartphone : MonitorDown;

  return (
    <aside
      className={cn(
        "rounded-2xl border shadow-[0_18px_40px_rgba(15,23,42,0.16)]",
        surface === "public"
          ? "border-white/15 bg-white/[0.08] p-4 text-white backdrop-blur-xl"
          : "border-border bg-card p-3 text-foreground",
        className,
      )}
      aria-label="RiskNova uygulama kurulumu"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            surface === "public" ? "bg-amber-400 text-slate-950" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-5">{copy.title}</p>
          <p
            className={cn(
              "mt-1 text-xs leading-5",
              surface === "public" ? "text-slate-300" : "text-muted-foreground",
            )}
          >
            {showIosHint && !installEvent
              ? "iPhone/iPad için Paylaş menüsünden Ana Ekrana Ekle seçeneğini kullan."
              : copy.description}
          </p>
          {installEvent ? (
            <button
              type="button"
              onClick={() => void install()}
              className={cn(
                "mt-3 inline-flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-bold transition-colors",
                surface === "public"
                  ? "bg-amber-400 text-slate-950 hover:bg-amber-300"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              <Download className="h-4 w-4" />
              {copy.button}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            surface === "public" ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-muted",
          )}
          aria-label="Kurulum hatırlatıcısını kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
