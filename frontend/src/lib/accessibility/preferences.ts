export type AccessibilityProfileId =
  | "none"
  | "vision"
  | "colorblind"
  | "dyslexia"
  | "focus"
  | "motor"
  | "lowVision";

export type ContrastMode = "default" | "high" | "darkBoost" | "lightBoost";

export type LineHeightScale = 1 | 1.15 | 1.35 | 1.55;

export type LetterSpacingMode = "normal" | "wide" | "wider";

export type AccessibilityPreferences = {
  profile: AccessibilityProfileId;
  fontScale: number;
  lineHeightScale: LineHeightScale;
  letterSpacing: LetterSpacingMode;
  contrastMode: ContrastMode;
  reduceSaturation: boolean;
  grayscale: boolean;
  dyslexiaFriendly: boolean;
  emphasizeLinks: boolean;
  emphasizeHeadings: boolean;
  readingMask: boolean;
  readingGuide: boolean;
  focusAssist: boolean;
  reduceMotion: boolean;
  largeCursor: boolean;
  strongFocusRing: boolean;
  largerClickTargets: boolean;
};

export const A11Y_STORAGE_KEY = "risknova-a11y-preferences-v1";

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  profile: "none",
  fontScale: 1,
  lineHeightScale: 1,
  letterSpacing: "normal",
  contrastMode: "default",
  reduceSaturation: false,
  grayscale: false,
  dyslexiaFriendly: false,
  emphasizeLinks: false,
  emphasizeHeadings: false,
  readingMask: false,
  readingGuide: false,
  focusAssist: false,
  reduceMotion: false,
  largeCursor: false,
  strongFocusRing: false,
  largerClickTargets: false,
};

export function clampFontScale(value: number): number {
  return Math.min(1.45, Math.max(0.85, Math.round(value * 100) / 100));
}
