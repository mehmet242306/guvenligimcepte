import type { AccessibilityPreferences } from "./preferences";

/**
 * Applies preferences to <html> for global CSS and optional prefers-reduced-motion override.
 */
export function applyAccessibilityPreferencesToDocument(prefs: AccessibilityPreferences): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  root.style.setProperty("--a11y-font-scale", String(prefs.fontScale));
  root.dataset.a11yLineHeight = String(prefs.lineHeightScale);
  root.dataset.a11yLetterSpacing = prefs.letterSpacing;
  root.dataset.a11yContrast = prefs.contrastMode;
  root.dataset.a11yReduceSaturation = prefs.reduceSaturation ? "true" : "false";
  root.dataset.a11yGrayscale = prefs.grayscale ? "true" : "false";
  root.dataset.a11yDyslexia = prefs.dyslexiaFriendly ? "true" : "false";
  root.dataset.a11yEmphasizeLinks = prefs.emphasizeLinks ? "true" : "false";
  root.dataset.a11yEmphasizeHeadings = prefs.emphasizeHeadings ? "true" : "false";
  root.dataset.a11yReadingMask = prefs.readingMask ? "true" : "false";
  root.dataset.a11yReadingGuide = prefs.readingGuide ? "true" : "false";
  root.dataset.a11yFocusAssist = prefs.focusAssist ? "true" : "false";
  root.dataset.a11yLargeCursor = prefs.largeCursor ? "true" : "false";
  root.dataset.a11yStrongFocus = prefs.strongFocusRing ? "true" : "false";
  root.dataset.a11yTouchTargets = prefs.largerClickTargets ? "true" : "false";
  root.dataset.a11yProfile = prefs.profile;

  if (prefs.reduceMotion) {
    root.dataset.a11yReduceMotion = "true";
  } else {
    delete root.dataset.a11yReduceMotion;
  }
}
