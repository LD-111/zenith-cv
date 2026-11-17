export type ThemeId = "source-serif" | "eb-garamond" | "lora" | "source-sans" | "carlito";

export interface ThemeFontFiles {
  regular: string;
  bold: string;
  italic: string;
  boldItalic: string;
}

export interface CvTheme {
  id: ThemeId;
  label: string;
  previewFont: string;
  pdfFont: string;
  fontFiles: ThemeFontFiles;
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

const DOCUMENT_LAYOUT: Omit<CvTheme, "id" | "label" | "previewFont" | "pdfFont" | "fontFiles"> = {
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

interface FontFace {
  id: ThemeId;
  label: string;
  family: string;
  fallback: "serif" | "sans-serif";
  files: ThemeFontFiles;
}

const FACES: FontFace[] = [
  {
    id: "source-serif",
    label: "Source Serif",
    family: "Source Serif 4",
    fallback: "serif",
    files: {
      regular: "/fonts/source-serif/SourceSerif4-Regular.ttf",
      bold: "/fonts/source-serif/SourceSerif4-Bold.ttf",
      italic: "/fonts/source-serif/SourceSerif4-Italic.ttf",
      boldItalic: "/fonts/source-serif/SourceSerif4-BoldItalic.ttf",
    },
  },
  {
    id: "eb-garamond",
    label: "EB Garamond",
    family: "EB Garamond",
    fallback: "serif",
    files: {
      regular: "/fonts/eb-garamond/EBGaramond-Regular.ttf",
      bold: "/fonts/eb-garamond/EBGaramond-Bold.ttf",
      italic: "/fonts/eb-garamond/EBGaramond-Italic.ttf",
      boldItalic: "/fonts/eb-garamond/EBGaramond-BoldItalic.ttf",
    },
  },
  {
    id: "lora",
    label: "Lora",
    family: "Lora",
    fallback: "serif",
    files: {
      regular: "/fonts/lora/Lora-Regular.ttf",
      bold: "/fonts/lora/Lora-Bold.ttf",
      italic: "/fonts/lora/Lora-Italic.ttf",
      boldItalic: "/fonts/lora/Lora-BoldItalic.ttf",
    },
  },
  {
    id: "source-sans",
    label: "Source Sans",
    family: "Source Sans 3",
    fallback: "sans-serif",
    files: {
      regular: "/fonts/source-sans/SourceSans3-Regular.ttf",
      bold: "/fonts/source-sans/SourceSans3-Bold.ttf",
      italic: "/fonts/source-sans/SourceSans3-Italic.ttf",
      boldItalic: "/fonts/source-sans/SourceSans3-BoldItalic.ttf",
    },
  },
  {
    id: "carlito",
    label: "Carlito",
    family: "Carlito",
    fallback: "sans-serif",
    files: {
      regular: "/fonts/carlito/Carlito-Regular.ttf",
      bold: "/fonts/carlito/Carlito-Bold.ttf",
      italic: "/fonts/carlito/Carlito-Italic.ttf",
      boldItalic: "/fonts/carlito/Carlito-BoldItalic.ttf",
    },
  },
];

function buildTheme(face: FontFace): CvTheme {
  return {
    ...DOCUMENT_LAYOUT,
    id: face.id,
    label: face.label,
    previewFont: `"${face.family}", ${face.fallback}`,
    pdfFont: face.family,
    fontFiles: face.files,
  };
}

const THEMES: Record<ThemeId, CvTheme> = {
  "source-serif": buildTheme(FACES[0]),
  "eb-garamond": buildTheme(FACES[1]),
  lora: buildTheme(FACES[2]),
  "source-sans": buildTheme(FACES[3]),
  carlito: buildTheme(FACES[4]),
};

const DEFAULT_THEME_ID: ThemeId = "source-serif";

let _themeId: ThemeId = DEFAULT_THEME_ID;

export function listThemes(): CvTheme[] {
  return FACES.map((face) => THEMES[face.id]);
}

export function getThemeId(): ThemeId {
  return _themeId;
}

export function setThemeId(id: ThemeId): void {
  if (THEMES[id]) _themeId = id;
}

export function getTheme(id: ThemeId = _themeId): CvTheme {
  return THEMES[id] ?? THEMES[DEFAULT_THEME_ID];
}

export function headingKeepAheadPt(fontSize: number, lineHeight: number): number {
  return fontSize * lineHeight * 2;
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
