export interface CvEntry {
  id: string;
  title: string;
  lastModified: string;
  markdownContent: string;
}

const STORAGE_KEY = "zenith-cv:entries";

export function loadAllCvs(): CvEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CvEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveCv(entry: CvEntry): void {
  const entries = loadAllCvs();
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.unshift(entry);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function deleteCv(id: string): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(loadAllCvs().filter((e) => e.id !== id))
  );
}

export function getCvById(id: string): CvEntry | null {
  return loadAllCvs().find((e) => e.id === id) ?? null;
}

export function generateId(): string {
  return `cv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
