import { parseCssHex } from "@/lib/cv-theme";

export interface CvFrontmatter {
  body: string;
  target: string;
  notes: string;
  primary: string;
  secondary: string;
  tertiary: string;
}

export type PaletteKey = "primary" | "secondary" | "tertiary";

const PALETTE_KEYS: PaletteKey[] = ["primary", "secondary", "tertiary"];

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function emptyFrontmatter(body: string): CvFrontmatter {
  return { body, target: "", notes: "", primary: "", secondary: "", tertiary: "" };
}

function fieldKey(line: string): string | null {
  const field = line.match(/^([A-Za-z0-9_-]+):/);
  return field ? field[1].toLowerCase() : null;
}

export function splitFrontmatter(markdown: string): CvFrontmatter {
  const match = markdown.match(FRONTMATTER);
  if (!match) return emptyFrontmatter(markdown);
  const result = emptyFrontmatter(markdown.slice(match[0].length));
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;
    const key = field[1].toLowerCase();
    const value = field[2].trim();
    if (key === "target") result.target = value;
    else if (key === "notes") result.notes = value;
    else if (key === "primary" || key === "secondary" || key === "tertiary") {
      result[key] = parseCssHex(value) ?? "";
    }
  }
  return result;
}

function replaceKey(lines: string[], key: PaletteKey, value: string | null): string[] {
  let seen = false;
  const next: string[] = [];
  for (const line of lines) {
    if (fieldKey(line) !== key) {
      next.push(line);
      continue;
    }
    if (!seen && value) {
      next.push(`${key}: ${value}`);
      seen = true;
    }
  }
  if (value && !seen) next.push(`${key}: ${value}`);
  return next;
}

export function setPalette(markdown: string, patch: Partial<Record<PaletteKey, string>>): string {
  const match = markdown.match(FRONTMATTER);
  const newline = markdown.includes("\r\n") ? "\r\n" : "\n";
  let lines = match ? match[1].split(/\r?\n/) : [];
  const body = match ? markdown.slice(match[0].length) : markdown;

  for (const key of PALETTE_KEYS) {
    if (!(key in patch)) continue;
    const raw = patch[key] ?? "";
    if (raw === "") {
      lines = replaceKey(lines, key, null);
      continue;
    }
    const hex = parseCssHex(raw);
    if (!hex) continue;
    lines = replaceKey(lines, key, hex);
  }

  if (!lines.some((line) => line.trim() !== "")) {
    return body;
  }

  return `---${newline}${lines.join(newline)}${newline}---${newline}${body}`;
}
