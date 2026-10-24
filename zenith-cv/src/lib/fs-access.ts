import {
  forgetDirectoryHandle,
  saveDirectoryHandle,
} from "@/lib/dir-persist";

type DirectoryHandleWithIterators = FileSystemDirectoryHandle & {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
};

let _dirHandle: FileSystemDirectoryHandle | null = null;

export interface MdFile {
  slug: string;
  fileName: string;
  lastModified: number;
  size: number;
}

export function getDirectoryHandle(): FileSystemDirectoryHandle | null {
  return _dirHandle;
}

export function getDirectoryName(): string | null {
  return _dirHandle ? _dirHandle.name : null;
}

export function adoptDirectoryHandle(handle: FileSystemDirectoryHandle): void {
  _dirHandle = handle;
}

export function clearDirectoryHandle(): void {
  _dirHandle = null;
  void forgetDirectoryHandle().catch(() => {});
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
    throw new Error(
      "File System Access API is not supported in this browser. Please use Chrome or Edge."
    );
  }
  const handle = await (
    window as Window & {
      showDirectoryPicker: (opts?: {
        mode?: "read" | "readwrite";
        id?: string;
        startIn?: string;
      }) => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker({ mode: "readwrite", id: "zenith-cv" });
  _dirHandle = handle;
  void saveDirectoryHandle(handle).catch(() => {});
  return handle;
}

export async function scanMdFiles(): Promise<MdFile[]> {
  if (!_dirHandle) throw new Error("No directory connected");
  const files: MdFile[] = [];
  for await (const [name, handle] of (_dirHandle as DirectoryHandleWithIterators).entries()) {
    if (handle.kind === "file" && name.endsWith(".md")) {
      try {
        const file = await (handle as FileSystemFileHandle).getFile();
        files.push({
          slug: name.slice(0, -3),
          fileName: name,
          lastModified: file.lastModified,
          size: file.size,
        });
      } catch {
        // skip files we can't read
      }
    }
  }
  return files.sort((a, b) => b.lastModified - a.lastModified);
}

export async function readMdFile(fileName: string): Promise<string> {
  if (!_dirHandle) throw new Error("No directory connected");
  const handle = await _dirHandle.getFileHandle(fileName);
  const file = await handle.getFile();
  return file.text();
}

export async function writeMdFile(
  fileName: string,
  content: string
): Promise<void> {
  if (!_dirHandle) throw new Error("No directory connected");
  const handle = await _dirHandle.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function deleteMdFile(fileName: string): Promise<void> {
  if (!_dirHandle) throw new Error("No directory connected");
  await _dirHandle.removeEntry(fileName);
}

export async function renameMdFile(
  oldFileName: string,
  newFileName: string
): Promise<void> {
  if (!_dirHandle) throw new Error("No directory connected");
  const fileHandle = await _dirHandle.getFileHandle(oldFileName);
  const file = await fileHandle.getFile();
  const content = await file.text();
  await _dirHandle.removeEntry(oldFileName);
  const newFileHandle = await _dirHandle.getFileHandle(newFileName, { create: true });
  const writable = await newFileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function fileExists(fileName: string): Promise<boolean> {
  if (!_dirHandle) return false;
  try {
    await _dirHandle.getFileHandle(fileName);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

export function slugToDisplayName(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function allocateCopySlug(
  base: string,
  isTaken: (slug: string) => boolean
): string {
  const root = base.replace(/-copy(?:-\d+)?$/i, "") || "cv";
  for (let n = 1; n < 100; n++) {
    const candidate = n === 1 ? `${root}-copy` : `${root}-copy-${n}`;
    if (!isTaken(candidate)) return candidate;
  }
  return `${root}-copy-${Date.now()}`;
}

export function formatDate(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}
