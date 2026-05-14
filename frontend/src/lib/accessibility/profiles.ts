import type { AccessibilityPreferences, AccessibilityProfileId } from "./preferences";
import { DEFAULT_ACCESSIBILITY_PREFERENCES } from "./preferences";

export function applyProfileToPreferences(
  profile: AccessibilityProfileId,
): AccessibilityPreferences {
  const base: AccessibilityPreferences = {
    ...DEFAULT_ACCESSIBILITY_PREFERENCES,
    profile,
  };

  switch (profile) {
    case "none":
      return { ...DEFAULT_ACCESSIBILITY_PREFERENCES, profile: "none" };
    case "vision":
      return {
        ...base,
        fontScale: 1.12,
        lineHeightScale: 1.55,
        letterSpacing: "wide",
        contrastMode: "high",
        emphasizeLinks: true,
        emphasizeHeadings: true,
        strongFocusRing: true,
        largeCursor: true,
      };
    case "colorblind":
      return {
        ...base,
        contrastMode: "high",
        emphasizeLinks: true,
        reduceSaturation: true,
        strongFocusRing: true,
      };
    case "dyslexia":
      return {
        ...base,
        dyslexiaFriendly: true,
        lineHeightScale: 1.55,
        letterSpacing: "wider",
        emphasizeLinks: true,
        fontScale: 1.06,
      };
    case "focus":
      return {
        ...base,
        focusAssist: true,
        strongFocusRing: true,
        reduceMotion: true,
        emphasizeHeadings: true,
      };
    case "motor":
      return {
        ...base,
        largerClickTargets: true,
        strongFocusRing: true,
        largeCursor: true,
        fontScale: 1.08,
      };
    case "lowVision":
      return {
        ...base,
        fontScale: 1.28,
        lineHeightScale: 1.55,
        contrastMode: "high",
        emphasizeLinks: true,
        emphasizeHeadings: true,
        strongFocusRing: true,
      };
    default:
      return base;
  }
}
