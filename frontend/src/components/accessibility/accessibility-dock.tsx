"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Accessibility, Minus, Plus, RotateCcw, Sparkles, Type, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAccessibility } from "@/components/accessibility/accessibility-context";
import type { AccessibilityProfileId, ContrastMode } from "@/lib/accessibility/preferences";

function listFocusableInPanel(panel: HTMLElement | null): HTMLElement[] {
  if (!panel) return [];
  return Array.from(
    panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((n) => !n.hasAttribute("disabled") && n.tabIndex !== -1);
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card/60 px-3 py-2.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Button
        type="button"
        variant={pressed ? "accent" : "outline"}
        size="sm"
        className="min-h-10 min-w-[4.5rem] shrink-0 px-3"
        aria-pressed={pressed}
        disabled={disabled}
        onClick={onToggle}
      >
        {pressed ? onLabel : offLabel}
      </Button>
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
        "w-full rounded-2xl border px-3 py-2.5 text-left transition focus-visible:shadow-[0_0_0_4px_var(--ring)]",
        active
          ? "border-[var(--gold)] bg-[var(--gold)]/10 shadow-[var(--shadow-soft)]"
          : "border-border bg-muted/30 hover:border-[var(--gold)]/50 hover:bg-muted/50",
      )}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{description}</p>
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
    <div className="pointer-events-none fixed inset-x-0 z-[85]" style={{ top: y - 3 }} aria-hidden>
      <div className="mx-auto h-1.5 w-[min(92vw,720px)] rounded-full bg-[var(--gold)]/90 shadow-[0_0_24px_rgba(200,155,91,0.55)]" />
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
          "fixed z-[90] flex flex-col items-end gap-2",
          "bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]",
          "max-[640px]:bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]",
        )}
      >
        <Button
          type="button"
          variant="accent"
          size="lg"
          className={cn(
            "h-14 w-14 rounded-2xl border border-amber-400/40 p-0 shadow-[var(--shadow-elevated)]",
            "focus-visible:shadow-[0_0_0_4px_var(--ring)]",
          )}
          aria-expanded={open}
          aria-controls="risknova-a11y-panel"
          aria-haspopup="dialog"
          aria-label={open ? t("fabCloseLabel") : t("fabLabel")}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" aria-hidden /> : <Accessibility className="h-6 w-6" aria-hidden />}
        </Button>
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
                className="fixed inset-0 z-[94] cursor-default bg-slate-950/40 backdrop-blur-[1px] dark:bg-black/55"
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
                  "fixed z-[96] flex max-h-[min(92dvh,820px)] w-full max-w-md flex-col border-l border-border bg-card shadow-[var(--shadow-elevated)]",
                  "inset-y-0 right-0 rounded-l-[1.25rem] max-sm:rounded-none",
                )}
              >
                <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)]">
                        <Sparkles className="h-4 w-4" aria-hidden />
                      </span>
                      <h2 id={titleId} className="text-base font-semibold leading-tight text-foreground">
                        {t("panelTitle")}
                      </h2>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("panelIntro")}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 shrink-0 p-0"
                    aria-label={t("close")}
                    onClick={close}
                  >
                    <X className="h-5 w-5" aria-hidden />
                  </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("profilesTitle")}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
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

                  <div className="mt-6 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("sectionVisual")}
                    </p>
                    <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-muted/20 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Type className="h-4 w-4 shrink-0 text-[var(--gold)]" aria-hidden />
                          {t("fontSize")}
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0"
                            aria-label={t("fontDecrease")}
                            onClick={() => bumpFontScale(-0.05)}
                          >
                            <Minus className="h-4 w-4" aria-hidden />
                          </Button>
                          <span className="min-w-[3rem] text-center text-xs font-semibold text-foreground">
                            {Math.round(preferences.fontScale * 100)}%
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0"
                            aria-label={t("fontIncrease")}
                            onClick={() => bumpFontScale(0.05)}
                          >
                            <Plus className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="w-full text-xs font-semibold" onClick={resetTypography}>
                        {t("fontReset")}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => bumpLineHeight("down")}>
                        {t("lineTighten")}
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => bumpLineHeight("up")}>
                        {t("lineLoosen")}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => bumpLetterSpacing("down")}>
                        {t("letterNarrower")}
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => bumpLetterSpacing("up")}>
                        {t("letterWider")}
                      </Button>
                    </div>
                    <p className="text-xs font-medium text-foreground">{t("contrast")}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {contrastModes.map((m) => (
                        <Button
                          key={m.id}
                          type="button"
                          size="sm"
                          variant={preferences.contrastMode === m.id ? "accent" : "outline"}
                          className="h-auto min-h-10 whitespace-normal px-2 py-2 text-center text-[11px] font-semibold leading-snug"
                          aria-pressed={preferences.contrastMode === m.id}
                          onClick={() => patchPreferences({ profile: "none", contrastMode: m.id })}
                        >
                          {m.label}
                        </Button>
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

                  <div className="mt-6 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("sectionReading")}
                    </p>
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

                  <div className="mt-6 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("sectionInteraction")}
                    </p>
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

                <div className="border-t border-border p-4">
                  <Button type="button" variant="outline" className="w-full gap-2" onClick={() => resetPreferences()}>
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    {t("reset")}
                  </Button>
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
