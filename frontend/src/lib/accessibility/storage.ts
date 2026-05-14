import type { AccessibilityPreferences } from "./preferences";
import { A11Y_STORAGE_KEY, DEFAULT_ACCESSIBILITY_PREFERENCES } from "./preferences";

export function loadAccessibilityPreferencesFromStorage(): AccessibilityPreferences {
  if (typeof window === "undefined") return DEFAULT_ACCESSIBILITY_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(A11Y_STORAGE_KEY);
    if (!raw) return DEFAULT_ACCESSIBILITY_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>;
    return { ...DEFAULT_ACCESSIBILITY_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_ACCESSIBILITY_PREFERENCES;
  }
}

export function saveAccessibilityPreferencesToStorage(prefs: AccessibilityPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* quota / private mode */
  }
}
