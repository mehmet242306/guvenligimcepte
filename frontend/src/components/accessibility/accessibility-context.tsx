"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AccessibilityPreferences, AccessibilityProfileId } from "@/lib/accessibility/preferences";
import { DEFAULT_ACCESSIBILITY_PREFERENCES, clampFontScale } from "@/lib/accessibility/preferences";
import { applyProfileToPreferences } from "@/lib/accessibility/profiles";
import { applyAccessibilityPreferencesToDocument } from "@/lib/accessibility/sync-document";
import {
  loadAccessibilityPreferencesFromStorage,
  saveAccessibilityPreferencesToStorage,
} from "@/lib/accessibility/storage";

type AccessibilityContextValue = {
  preferences: AccessibilityPreferences;
  setProfile: (id: AccessibilityProfileId) => void;
  patchPreferences: (patch: Partial<AccessibilityPreferences>) => void;
  resetPreferences: () => void;
  bumpFontScale: (delta: number) => void;
  bumpLineHeight: (direction: "up" | "down") => void;
  bumpLetterSpacing: (direction: "up" | "down") => void;
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

const LINE_ORDER = [1, 1.15, 1.35, 1.55] as const;
const LETTER_ORDER = ["normal", "wide", "wider"] as const;

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(DEFAULT_ACCESSIBILITY_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPreferences(loadAccessibilityPreferencesFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyAccessibilityPreferencesToDocument(preferences);
    saveAccessibilityPreferencesToStorage(preferences);
  }, [preferences, hydrated]);

  const setProfile = useCallback((id: AccessibilityProfileId) => {
    setPreferences(applyProfileToPreferences(id));
  }, []);

  const patchPreferences = useCallback((patch: Partial<AccessibilityPreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      ...patch,
      fontScale: patch.fontScale !== undefined ? clampFontScale(patch.fontScale) : prev.fontScale,
    }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_ACCESSIBILITY_PREFERENCES);
    applyAccessibilityPreferencesToDocument(DEFAULT_ACCESSIBILITY_PREFERENCES);
    saveAccessibilityPreferencesToStorage(DEFAULT_ACCESSIBILITY_PREFERENCES);
  }, []);

  const bumpFontScale = useCallback((delta: number) => {
    setPreferences((p) => ({ ...p, profile: "none", fontScale: clampFontScale(p.fontScale + delta) }));
  }, []);

  const bumpLineHeight = useCallback((direction: "up" | "down") => {
    setPreferences((p) => {
      const idx = LINE_ORDER.indexOf(p.lineHeightScale);
      const next =
        direction === "up"
          ? LINE_ORDER[Math.min(LINE_ORDER.length - 1, Math.max(0, idx === -1 ? 0 : idx + 1))]
          : LINE_ORDER[Math.max(0, (idx === -1 ? 0 : idx) - 1)];
      return { ...p, profile: "none", lineHeightScale: next };
    });
  }, []);

  const bumpLetterSpacing = useCallback((direction: "up" | "down") => {
    setPreferences((p) => {
      const idx = LETTER_ORDER.indexOf(p.letterSpacing);
      const base = idx === -1 ? 0 : idx;
      const next =
        direction === "up"
          ? LETTER_ORDER[Math.min(LETTER_ORDER.length - 1, base + 1)]
          : LETTER_ORDER[Math.max(0, base - 1)];
      return { ...p, profile: "none", letterSpacing: next };
    });
  }, []);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      preferences,
      setProfile,
      patchPreferences,
      resetPreferences,
      bumpFontScale,
      bumpLineHeight,
      bumpLetterSpacing,
    }),
    [preferences, setProfile, patchPreferences, resetPreferences, bumpFontScale, bumpLineHeight, bumpLetterSpacing],
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibility must be used within AccessibilityProvider");
  }
  return ctx;
}
