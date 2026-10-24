export interface TailorReport {
  missing: string[];
  overlap: string[];
  missingTerms: string[];
  overlapCount: number;
  termCount: number;
}

const STOP = new Set([
  "with", "that", "this", "from", "your", "have", "will", "their", "they", "been",
  "were", "what", "when", "where", "which", "while", "about", "into", "over",
  "such", "than", "then", "also", "more", "most", "other", "some", "able", "using",
  "used", "work", "team", "role", "years", "year", "including", "across", "within",
  "strong", "experience", "skills", "skill", "ability", "required", "requirements",
  "preferred", "looking", "candidate", "position", "responsibilities",
]);

function headings(body: string): string[] {
  return body
    .split(/\r?\n/)
    .filter((line) => /^#{1,3}\s+/.test(line))
    .map((line) => line.replace(/^#{1,3}\s+/, "").trim().toLowerCase());
}

function hasContact(body: string): boolean {
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(body)) return true;
  if (/(?:\+?\d[\d\s().-]{7,}\d)/.test(body)) return true;
  return headings(body).some((h) => h.startsWith("contact"));
}

function termsOf(text: string): string[] {
  const found = text.toLowerCase().match(/[a-z][a-z0-9+.#-]{3,}/g) ?? [];
  const unique = new Set<string>();
  for (const term of found) {
    if (STOP.has(term)) continue;
    unique.add(term);
  }
  return Array.from(unique);
}

export function analyzeTailor(body: string, job: string): TailorReport {
  const heads = headings(body);
  const missing: string[] = [];
  if (!hasContact(body)) missing.push("Contact");
  if (!heads.some((h) => /experience|employment|work history/.test(h))) missing.push("Experience");
  if (!heads.some((h) => h.startsWith("education"))) missing.push("Education");

  const jobTerms = termsOf(job);
  const cvTerms = new Set(termsOf(body));
  const overlap = jobTerms.filter((term) => cvTerms.has(term));
  const missingTerms = jobTerms.filter((term) => !cvTerms.has(term)).slice(0, 12);
  return {
    missing,
    overlap: overlap.slice(0, 40),
    missingTerms,
    overlapCount: overlap.length,
    termCount: jobTerms.length,
  };
}
