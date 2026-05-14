"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Accessibility, Minus, Plus, RotateCcw, Type, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccessibility } from "@/components/accessibility/accessibility-context";
import type { AccessibilityProfileId, ContrastMode } from "@/lib/accessibility/preferences";

/** Odak — kurumsal teal / slate dil; Nova altın launcher’dan ayrışır */
const fabShell =
  "relative inline-flex h-[3.45rem] w-[3.45rem] shrink-0 items-center justify-center overflow-hidden rounded-[1.2rem] border border-teal-400/35 text-teal-100 shadow-[0_14px_42px_rgba(6,78,59,0.38),inset_0_1px_0_rgba(255,255,255,0.12)] transition duration-200 ease-out hover:border-teal-300/55 hover:text-white hover:shadow-[0_18px_48px_rgba(13,148,136,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] active:scale-[0.97] dark:border-teal-500/30 dark:shadow-[0_14px_42px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]";

const fabGradient =
  "pointer-events-none absolute inset-0 bg-[linear-gradient(155deg,#042f2e_0%,#115e59_42%,#134e4a_100%)] dark:bg-[linear-gradient(155deg,#020617_0%,#0f3d3a_45%,#042f2e_100%)]";

const fabGlass =
  "pointer-events-none absolute inset-[1px] rounded-[1.05rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,transparent_42%,rgba(0,0,0,0.08)_100%)] opacity-90";

const fabFocus =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal-300/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const panelShell =
  "flex max-h-[min(92dvh,840px)] w-full max-w-md flex-col overflow-hidden border-l border-teal-900/10 bg-card shadow-[0_0_0_1px_rgba(15,118,110,0.06),0_28px_80px_rgba(15,23,42,0.18)] dark:border-teal-400/10 dark:shadow-[0_0_0_1px_rgba(45,212,191,0.08),0_32px_90px_rgba(0,0,0,0.55)]";

const panelHeader =
  "relative border-b border-border/80 bg-[linear-gradient(180deg,rgba(45,212,191,0.07)_0%,transparent_55%)] px-4 pb-4 pt-4 dark:bg-[linear-gradient(180deg,rgba(45,212,191,0.1)_0%,transparent_50%)]";

const sectionLabelWrap = "mb-2.5 flex items-center gap-2.5";
const sectionLabelAccent = "h-1 w-5 shrink-0 rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 shadow-[0_0_12px_rgba(45,212,191,0.35)]";
const sectionLabelText =
  "text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground";

const toggleRow =
  "flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-gradient-to-b from-card to-muted/25 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:from-card/90 dark:to-muted/15 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

const pillIdle =
  "border-border/80 bg-muted/40 text-muted-foreground shadow-sm hover:border-teal-500/30 hover:bg-muted/70 hover:text-foreground dark:hover:border-teal-400/25";

const pillOn =
  "border-teal-600/50 bg-gradient-to-b from-teal-600/18 to-teal-700/10 text-teal-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_1px_0_rgba(0,0,0,0.04)] dark:border-teal-400/45 dark:from-teal-400/15 dark:to-teal-950/20 dark:text-teal-50";

const microRoundBtn =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-gradient-to-b from-background to-muted/30 text-foreground shadow-sm transition hover:border-teal-500/35 hover:from-muted/40 hover:to-muted/60 hover:shadow active:scale-[0.96] dark:border-border/60 dark:from-muted/20 dark:to-muted/5";

const widePillBtn =
  "rounded-full border border-border/80 bg-gradient-to-b from-muted/30 to-muted/15 py-2.5 text-[11px] font-semibold leading-snug text-foreground shadow-sm transition hover:border-teal-500/30 hover:from-muted/45 hover:to-muted/25 hover:shadow dark:from-muted/15 dark:to-muted/5";

const contrastPill = (active: boolean) =>
  cn(
    "flex min-h-[2.75rem] items-center justify-center rounded-full border px-2 py-2 text-center text-[10px] font-bold uppercase leading-tight tracking-wide transition duration-150",
    active ? pillOn : cn(pillIdle, "text-foreground"),
  );

function listFocusableInPanel(panel: HTMLElement | null): HTMLElement[] {
  if (!panel) return [];
  return Array.from(
    panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((n) => !n.hasAttribute("disabled") && n.tabIndex !== -1);
}

function A11ySectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className={sectionLabelWrap}>
      <span className={sectionLabelAccent} aria-hidden />
      <p className={sectionLabelText}>{children}</p>
    </div>
  );
}

function ToggleRowI18n({
  label,
  pressed,
  onToggle,
  onLabel,
  offLabel,
  disabled,
}: {
  label: string;
  pressed: boolean;
  onToggle: () => void;
  onLabel: string;
  offLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className={toggleRow}>
      <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">{label}</span>
      <button
        type="button"
        aria-pressed={pressed}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          "inline-flex min-h-10 min-w-[4.5rem] shrink-0 items-center justify-center rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition duration-150",
          pressed ? pillOn : pillIdle,
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        {pressed ? onLabel : offLabel}
      </button>
    </div>
  );
}

function ProfileChip({
  title,
  description,
  active,
  onSelect,
}: {
  title: string;
  description: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border px-3.5 py-3 text-left transition duration-200",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        active
          ? "border-teal-600/45 bg-gradient-to-br from-teal-600/12 via-card to-card shadow-[0_10px_28px_rgba(15,118,110,0.12),inset_0_1px_0_rgba(255,255,255,0.5)] dark:border-teal-400/40 dark:from-teal-400/14 dark:via-card dark:to-card dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          : cn(
              "border-border/80 bg-gradient-to-b from-card to-muted/20 shadow-sm",
              "hover:border-teal-500/28 hover:shadow-md dark:hover:border-teal-400/22",
            ),
      )}
    >
      {active ? (
        <span
          className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full border border-teal-600/40 bg-teal-600/12 py-1 pl-1.5 pr-2 dark:border-teal-400/45 dark:bg-teal-400/12"
          aria-hidden
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(34,211,238,0.75)] dark:bg-teal-300" />
        </span>
      ) : null}
      <p className="pr-14 text-sm font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground group-hover:text-foreground/80">{description}</p>
      ) : null}
    </button>
  );
}

function ReadingMaskLayer() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[86]"
      aria-hidden
      style={{
        background:
          "linear-gradient(to bottom, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.55) 32%, transparent 38%, transparent 62%, rgba(15,23,42,0.55) 68%, rgba(15,23,42,0.55) 100%)",
      }}
    />
  );
}

function ReadingGuideLayer() {
  const [y, setY] = useState(() =>
    typeof window !== "undefined" ? Math.max(120, window.innerHeight / 2) : 400,
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setY(e.clientY);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 z-[85]" style={{ top: y - 4 }} aria-hidden>
      <div className="mx-auto h-2 w-[min(92vw,720px)] rounded-full bg-gradient-to-r from-teal-600 via-teal-400 to-cyan-400 opacity-95 shadow-[0_0_28px_rgba(20,184,166,0.55)]" />
    </div>
  );
}

export function AccessibilityDock() {
  const t = useTranslations("accessibility");
  const { preferences, setProfile, patchPreferences, resetPreferences, bumpFontScale, bumpLineHeight, bumpLetterSpacing } =
    useAccessibility();

  const resetTypography = useCallback(() => {
    patchPreferences({
      profile: "none",
      fontScale: 1,
      lineHeightScale: 1,
      letterSpacing: "normal",
    });
  }, [patchPreferences]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const prevFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const tId = window.setTimeout(() => {
      const first = listFocusableInPanel(panel)[0];
      first?.focus();
    }, 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(tId);
      document.removeEventListener("keydown", onKey);
      prevFocus.current?.focus?.();
    };
  }, [open, close]);

  const contrastModes: { id: ContrastMode; label: string }[] = [
    { id: "default", label: t("contrastDefault") },
    { id: "high", label: t("contrastHigh") },
    { id: "darkBoost", label: t("contrastDarkBoost") },
    { id: "lightBoost", label: t("contrastLightBoost") },
  ];

  const profiles: { id: AccessibilityProfileId; title: string; desc: string }[] = [
    { id: "none", title: t("profileNone"), desc: t("profileNoneDesc") },
    { id: "vision", title: t("profileVision"), desc: t("profileVisionDesc") },
    { id: "colorblind", title: t("profileColorblind"), desc: t("profileColorblindDesc") },
    { id: "dyslexia", title: t("profileDyslexia"), desc: t("profileDyslexiaDesc") },
    { id: "focus", title: t("profileFocus"), desc: t("profileFocusDesc") },
    { id: "motor", title: t("profileMotor"), desc: t("profileMotorDesc") },
    { id: "lowVision", title: t("profileLowVision"), desc: t("profileLowVisionDesc") },
  ];

  return (
    <>
      {preferences.readingMask ? <ReadingMaskLayer /> : null}
      {preferences.readingGuide ? <ReadingGuideLayer /> : null}

      <div
        className={cn(
          "pointer-events-auto fixed z-[92] flex flex-col items-center",
          "right-[max(0.65rem,env(safe-area-inset-right,0px))] sm:right-5",
          "top-1/2 -translate-y-1/2",
        )}
      >
        <button
          type="button"
          className={cn(fabShell, fabFocus)}
          aria-expanded={open}
          aria-controls="risknova-a11y-panel"
          aria-haspopup="dialog"
          aria-label={open ? t("fabCloseLabel") : t("fabLabel")}
          title={open ? t("fabCloseLabel") : t("fabLabel")}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={fabGradient} aria-hidden />
          <span className={fabGlass} aria-hidden />
          <span className="relative z-[1] flex items-center justify-center">
            {open ? (
              <X className="h-6 w-6 shrink-0" strokeWidth={2.25} aria-hidden />
            ) : (
              <Accessibility className="h-7 w-7 shrink-0" strokeWidth={2.35} aria-hidden />
            )}
          </span>
        </button>
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <>
              <div
                tabIndex={0}
                className="fixed left-0 top-0 h-px w-px overflow-hidden opacity-0"
                aria-hidden
                onFocus={(e) => {
                  const panel = panelRef.current;
                  const list = listFocusableInPanel(panel);
                  if (!list.length) return;
                  const from = e.relatedTarget as Node | null;
                  if (from && panel?.contains(from)) list[list.length - 1].focus();
                  else list[0].focus();
                }}
              />
              <div
                className="fixed inset-0 z-[94] cursor-default bg-slate-950/45 backdrop-blur-[2px] dark:bg-black/60"
                role="presentation"
                tabIndex={-1}
                aria-hidden
                onClick={(e) => {
                  if (e.target === e.currentTarget) close();
                }}
              />
              <div
                ref={panelRef}
                id="risknova-a11y-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={cn(
                  "fixed inset-y-0 right-0 z-[96] rounded-l-[1.35rem] max-sm:rounded-none",
                  panelShell,
                )}
              >
                <div className={panelHeader}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-600/15 to-cyan-500/10 text-teal-800 shadow-inner dark:border-teal-400/35 dark:from-teal-400/12 dark:to-teal-950/30 dark:text-teal-100">
                          <Accessibility className="h-6 w-6" strokeWidth={2.35} aria-hidden />
                        </span>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-700/90 dark:text-teal-300/90">
                            {t("brandEyebrow")}
                          </p>
                          <h2 id={titleId} className="text-base font-semibold leading-tight tracking-tight text-foreground">
                            {t("panelTitle")}
                          </h2>
                        </div>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("panelIntro")}</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-transparent text-muted-foreground transition hover:border-border hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal-400/40"
                      aria-label={t("close")}
                      onClick={close}
                    >
                      <X className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-4">
                  <div>
                    <A11ySectionLabel>{t("profilesTitle")}</A11ySectionLabel>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {profiles.map((p) => (
                        <ProfileChip
                          key={p.id}
                          title={p.title}
                          description={p.desc}
                          active={preferences.profile === p.id}
                          onSelect={() => setProfile(p.id)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <A11ySectionLabel>{t("sectionVisual")}</A11ySectionLabel>
                    <div className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-muted/15 p-3.5 shadow-sm dark:to-muted/10">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Type className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-300" aria-hidden />
                          {t("fontSize")}
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            className={microRoundBtn}
                            aria-label={t("fontDecrease")}
                            onClick={() => bumpFontScale(-0.05)}
                          >
                            <Minus className="h-4 w-4" aria-hidden />
                          </button>
                          <span className="min-w-[3.25rem] rounded-full border border-border/70 bg-background/90 px-2 py-1 text-center font-mono text-xs font-bold tabular-nums text-foreground shadow-inner">
                            {Math.round(preferences.fontScale * 100)}%
                          </span>
                          <button
                            type="button"
                            className={microRoundBtn}
                            aria-label={t("fontIncrease")}
                            onClick={() => bumpFontScale(0.05)}
                          >
                            <Plus className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={cn("mt-3 w-full", widePillBtn)}
                        onClick={resetTypography}
                      >
                        {t("fontReset")}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className={cn("flex-1", widePillBtn)} onClick={() => bumpLineHeight("down")}>
                        {t("lineTighten")}
                      </button>
                      <button type="button" className={cn("flex-1", widePillBtn)} onClick={() => bumpLineHeight("up")}>
                        {t("lineLoosen")}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className={cn("flex-1", widePillBtn)} onClick={() => bumpLetterSpacing("down")}>
                        {t("letterNarrower")}
                      </button>
                      <button type="button" className={cn("flex-1", widePillBtn)} onClick={() => bumpLetterSpacing("up")}>
                        {t("letterWider")}
                      </button>
                    </div>
                    <p className="pl-7 text-xs font-semibold text-foreground">{t("contrast")}</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {contrastModes.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className={contrastPill(preferences.contrastMode === m.id)}
                          aria-pressed={preferences.contrastMode === m.id}
                          onClick={() => patchPreferences({ profile: "none", contrastMode: m.id })}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <ToggleRowI18n
                      label={t("reduceSaturation")}
                      pressed={preferences.reduceSaturation}
                      onToggle={() => patchPreferences({ profile: "none", reduceSaturation: !preferences.reduceSaturation })}
                      onLabel={t("on")}
                      offLabel={t("off")}
                    />
                    <ToggleRowI18n
                      label={t("grayscale")}
                      pressed={preferences.grayscale}
                      onToggle={() => patchPreferences({ profile: "none", grayscale: !preferences.grayscale })}
                      onLabel={t("on")}
                      offLabel={t("off")}
                    />
                  </div>

                  <div className="space-y-2.5">
                    <A11ySectionLabel>{t("sectionReading")}</A11ySectionLabel>
                    <ToggleRowI18n
                      label={t("dyslexiaFont")}
                      pressed={preferences.dyslexiaFriendly}
                      onToggle={() => patchPreferences({ profile: "none", dyslexiaFriendly: !preferences.dyslexiaFriendly })}
                      onLabel={t("on")}
                      offLabel={t("off")}
                    />
                    <ToggleRowI18n
                      label={t("emphasizeLinks")}
                      pressed={preferences.emphasizeLinks}
                      onToggle={() => patchPreferences({ profile: "none", emphasizeLinks: !preferences.emphasizeLinks })}
                      onLabel={t("on")}
                      offLabel={t("off")}
                    />
                    <ToggleRowI18n
                      label={t("emphasizeHeadings")}
                      pressed={preferences.emphasizeHeadings}
                      onToggle={() => patchPreferences({ profile: "none", emphasizeHeadings: !preferences.emphasizeHeadings })}
                      onLabel={t("on")}
                      offLabel={t("off")}
                    />
                    <ToggleRowI18n
                      label={t("readingMask")}
                      pressed={preferences.readingMask}
                      onToggle={() => patchPreferences({ profile: "none", readingMask: !preferences.readingMask })}
                      onLabel={t("on")}
                      offLabel={t("off")}
                    />
                    <ToggleRowI18n
                      label={t("readingGuide")}
                      pressed={preferences.readingGuide}
                      onToggle={() => patchPreferences({ profile: "none", readingGuide: !preferences.readingGuide })}
                      onLabel={t("on")}
                      offLabel={t("off")}
                    />
                    <ToggleRowI18n
                      label={t("focusAssist")}
                      pressed={preferences.focusAssist}
                      onToggle={() => patchPreferences({ profile: "none", focusAssist: !preferences.focusAssist })}
                      onLabel={t("on")}
                      offLabel={t("off")}
                    />
                  </div>

                  <div className="space-y-2.5">
                    <A11ySectionLabel>{t("sectionInteraction")}</A11ySectionLabel>
                    <ToggleRowI18n
                      label={t("reduceMotion")}
                      pressed={preferences.reduceMotion}
                      onToggle={() => patchPreferences({ profile: "none", reduceMotion: !preferences.reduceMotion })}
                      onLabel={t("on")}
                      offLabel={t("off")}
                    />
                    <ToggleRowI18n
                      label={t("largeCursor")}
                      pressed={preferences.largeCursor}
                      onToggle={() => patchPreferences({ profile: "none", largeCursor: !preferences.largeCursor })}
                      onLabel={t("on")}
                      offLabel={t("off")}
                    />
                    <ToggleRowI18n
                      label={t("strongFocus")}
                      pressed={preferences.strongFocusRing}
                      onToggle={() => patchPreferences({ profile: "none", strongFocusRing: !preferences.strongFocusRing })}
                      onLabel={t("on")}
                      offLabel={t("off")}
                    />
                    <ToggleRowI18n
                      label={t("largerTargets")}
                      pressed={preferences.largerClickTargets}
                      onToggle={() => patchPreferences({ profile: "none", largerClickTargets: !preferences.largerClickTargets })}
                      onLabel={t("on")}
                      offLabel={t("off")}
                    />
                  </div>
                </div>

                <div className="border-t border-border/80 bg-muted/10 px-4 py-4 dark:bg-muted/5">
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-full border border-border/80 py-3 text-sm font-semibold text-foreground shadow-sm transition",
                      "hover:border-teal-600/35 hover:bg-gradient-to-b hover:from-muted/50 hover:to-muted/30 hover:shadow-md",
                      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal-400/40",
                    )}
                    onClick={() => resetPreferences()}
                  >
                    <RotateCcw className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden />
                    {t("reset")}
                  </button>
                </div>
              </div>
              <div
                tabIndex={0}
                className="fixed left-0 top-0 h-px w-px overflow-hidden opacity-0"
                aria-hidden
                onFocus={(e) => {
                  const panel = panelRef.current;
                  const list = listFocusableInPanel(panel);
                  if (!list.length) return;
                  const from = e.relatedTarget as Node | null;
                  if (from && panel?.contains(from)) list[0].focus();
                  else list[list.length - 1].focus();
                }}
              />
            </>,
            document.body,
          )
        : null}
    </>
  );
}
