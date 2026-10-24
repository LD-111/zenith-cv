export interface VirtualCV {
  id: string;
  name: string;
  fileName: string;
  content: string;
  lastModified: number;
  size: number;
}

const _store = new Map<string, VirtualCV>();
const _downloaded = new Set<string>();

function makeId(): string {
  return `virtual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function byteSize(content: string): number {
  return new TextEncoder().encode(content).length;
}

export function createVirtualCV(name: string, content: string): VirtualCV {
  const id = makeId();
  const fileName = name + ".md";
  const cv: VirtualCV = {
    id,
    name,
    fileName,
    content,
    lastModified: Date.now(),
    size: byteSize(content),
  };
  _store.set(id, cv);
  return cv;
}

export function getVirtualCV(id: string): VirtualCV | null {
  return _store.get(id) ?? null;
}

export function updateVirtualCV(id: string, content: string): void {
  const cv = _store.get(id);
  if (!cv) throw new Error(`Virtual CV "${id}" not found.`);
  if (cv.content !== content) _downloaded.delete(id);
  _store.set(id, {
    ...cv,
    content,
    lastModified: Date.now(),
    size: byteSize(content),
  });
}

export function updateVirtualCVName(id: string, newName: string): void {
  const cv = _store.get(id);
  if (!cv) throw new Error(`Virtual CV "${id}" not found.`);
  _store.set(id, {
    ...cv,
    name: newName,
    fileName: newName + ".md",
    lastModified: Date.now(),
  });
}

export function deleteVirtualCV(id: string): void {
  _store.delete(id);
  _downloaded.delete(id);
}

export function markVirtualDownloaded(id: string): void {
  if (_store.has(id)) _downloaded.add(id);
}

export function isVirtualDownloaded(id: string): boolean {
  return _downloaded.has(id);
}

export function hasUndownloadedVirtualCVs(): boolean {
  for (const cv of _store.values()) {
    if (!_downloaded.has(cv.id)) return true;
  }
  return false;
}

export function listVirtualCVs(): VirtualCV[] {
  return Array.from(_store.values()).sort((a, b) => b.lastModified - a.lastModified);
}

export function isVirtualId(id: string): boolean {
  return id.startsWith("virtual_");
}
