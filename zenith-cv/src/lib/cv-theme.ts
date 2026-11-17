export type ThemeId = "serif" | "sans";

export interface CvTheme {
  id: ThemeId;
  label: string;
  previewFont: string;
  pdfFont: string;
  pdfFontBold: string;
  pdfFontItalic: string;
  fontSize: number;
  lineHeight: number;
  color: string;
  heading: string;
  muted: string;
  accent: string;
  link: string;
  rule: string;
  softRule: string;
  h1Size: number;
  h2Size: number;
  h3Size: number;
  h1TrackingEm: number;
  h2TrackingEm: number;
  h2MarginTop: number;
  h3MarginTop: number;
  pMarginBottom: number;
  emSize: number;
}

export const SERIF_THEME: CvTheme = {
  id: "serif",
  label: "Serif",
  previewFont: '"Georgia", "Times New Roman", serif',
  pdfFont: "Times-Roman",
  pdfFontBold: "Times-Bold",
  pdfFontItalic: "Times-Italic",
  fontSize: 10.5,
  lineHeight: 1.55,
  color: "#1a1a1a",
  heading: "#111827",
  muted: "#6b7280",
  accent: "#4338ca",
  link: "#4338ca",
  rule: "#e5e7eb",
  softRule: "#e0e7ff",
  h1Size: 22,
  h2Size: 10,
  h3Size: 11,
  h1TrackingEm: -0.02,
  h2TrackingEm: 0.12,
  h2MarginTop: 18,
  h3MarginTop: 12,
  pMarginBottom: 6,
  emSize: 9.5,
};

export const SANS_THEME: CvTheme = {
  id: "sans",
  label: "Sans",
  previewFont: "Helvetica, Arial, sans-serif",
  pdfFont: "Helvetica",
  pdfFontBold: "Helvetica-Bold",
  pdfFontItalic: "Helvetica-Oblique",
  fontSize: 10,
  lineHeight: 1.35,
  color: "#1a1a1a",
  heading: "#111827",
  muted: "#4b5563",
  accent: "#1e3a5f",
  link: "#1e3a5f",
  rule: "#d4d4d4",
  softRule: "#e5e7eb",
  h1Size: 16,
  h2Size: 9,
  h3Size: 10.5,
  h1TrackingEm: -0.01,
  h2TrackingEm: 0.08,
  h2MarginTop: 10,
  h3MarginTop: 7,
  pMarginBottom: 3,
  emSize: 9.5,
};

const THEMES: Record<ThemeId, CvTheme> = {
  serif: SERIF_THEME,
  sans: SANS_THEME,
};

let _themeId: ThemeId = "serif";

export function getThemeId(): ThemeId {
  return _themeId;
}

export function setThemeId(id: ThemeId): void {
  _themeId = id;
}

export function getTheme(id: ThemeId = _themeId): CvTheme {
  return THEMES[id];
}

export function themeCssVars(theme: CvTheme): Record<string, string> {
  return {
    "--cv-font": theme.previewFont,
    "--cv-size": `${theme.fontSize}pt`,
    "--cv-leading": String(theme.lineHeight),
    "--cv-color": theme.color,
    "--cv-heading": theme.heading,
    "--cv-muted": theme.muted,
    "--cv-accent": theme.accent,
    "--cv-link": theme.link,
    "--cv-rule": theme.rule,
    "--cv-soft-rule": theme.softRule,
    "--cv-h1": `${theme.h1Size}pt`,
    "--cv-h2": `${theme.h2Size}pt`,
    "--cv-h3": `${theme.h3Size}pt`,
    "--cv-h1-track": `${theme.h1TrackingEm}em`,
    "--cv-h2-track": `${theme.h2TrackingEm}em`,
    "--cv-h2-top": `${theme.h2MarginTop}px`,
    "--cv-h3-top": `${theme.h3MarginTop}px`,
    "--cv-p-bottom": `${theme.pMarginBottom}px`,
    "--cv-em-size": `${theme.emSize}pt`,
  };
}

export interface CvPaletteColors {
  primary: string;
  secondary: string;
  tertiary: string;
}

export function parseCssHex(value: string): string | null {
  const match = value.trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return null;
  const hex = match[1];
  const full = hex.length === 3 ? hex.split("").map((channel) => channel + channel).join("") : hex;
  return `#${full.toLowerCase()}`;
}

function mixTowardWhite(hex: string, white: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (c: number) => Math.round(c + (255 - c) * white).toString(16).padStart(2, "0");
  return `#${channel((n >> 16) & 255)}${channel((n >> 8) & 255)}${channel(n & 255)}`;
}

export function applyPalette(theme: CvTheme, colors: CvPaletteColors): CvTheme {
  const next: CvTheme = { ...theme };
  const primary = parseCssHex(colors.primary);
  const secondary = parseCssHex(colors.secondary);
  const tertiary = parseCssHex(colors.tertiary);
  if (primary) next.heading = primary;
  if (secondary) {
    next.accent = secondary;
    next.softRule = mixTowardWhite(secondary, 0.8);
  }
  if (tertiary) next.link = tertiary;
  return next;
}
