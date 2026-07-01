export interface VirtualCV {
  id: string;
  name: string;
  fileName: string;
  content: string;
  lastModified: number;
  size: number;
}

const _store = new Map<string, VirtualCV>();

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
  _store.set(id, {
    ...cv,
    content,
    lastModified: Date.now(),
    size: byteSize(content),
  });
}

export function deleteVirtualCV(id: string): void {
  _store.delete(id);
}

export function listVirtualCVs(): VirtualCV[] {
  return Array.from(_store.values()).sort((a, b) => b.lastModified - a.lastModified);
}

export function isVirtualId(id: string): boolean {
  return id.startsWith("virtual_");
}
