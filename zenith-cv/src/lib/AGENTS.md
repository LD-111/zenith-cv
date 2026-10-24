# src/lib — Core Library Logic (Zenith CV)

Pure logic and state modules (minimal React). Shared between Local and Sandbox modes.

See:
- `zenith-cv/AGENTS.md` for overall modes/storage model.
- Root `AGENTS.md` for general rules.

## Module State Design

- `fs-access.ts`: `let _dirHandle: FileSystemDirectoryHandle | null = null`
- `virtual-store.ts`: `const _store = new Map<string, VirtualCV>()`

Both live for the browser tab lifetime (Next.js client navigation does not reset modules).

## File Overview & API

### fs-access.ts (Local File Mode)

**Interface**
```ts
export interface MdFile {
  slug: string;       // without .md
  fileName: string;   // with .md
  lastModified: number;
  size: number;
}
```

**Exported API**
| Function | Purpose |
|----------|---------|
| `pickDirectory()` | Show picker (readwrite, id `zenith-cv`), store handle, persist to IndexedDB |
| `adoptDirectoryHandle(handle)` | Restore a stored handle into module state |
| `getDirectoryHandle()` / `getDirectoryName()` / `clearDirectoryHandle()` | Accessor + reset. Clear also forgets the stored handle |
| `scanMdFiles()` | Async iter dir, collect *.md as MdFile[], sort by mtime desc |
| `readMdFile(name)` | getFileHandle + getFile().text() |
| `writeMdFile(name, content)` | get/create handle → createWritable() → write → close (atomic stream) |
| `deleteMdFile(name)` | removeEntry |
| `renameMdFile(old, new)` | read content, remove old, write new (no native rename) |
| `fileExists(name)` | try getFileHandle |
| `sanitizeSlug(str)` | lower, spaces→-, strip invalid |
| `allocateCopySlug(base, isTaken)` | next free `base-copy` / `base-copy-N` slug |
| `slugToDisplayName(slug)` | title case |
| `formatFileSize(n)`, `formatDate(ts)` | UI helpers |

**Notes**
- All FS ops assume handle set; throw otherwise.
- Uses augmented type for `entries()` iterator.
- Stream write pattern guarantees no partial files.

### virtual-store.ts (Sandbox Mode)

**Interface**
```ts
export interface VirtualCV {
  id: string;         // virtual_... 
  name: string;
  fileName: string;
  content: string;
  lastModified: number;
  size: number;
}
```

**Exported API**
| Function | Purpose |
|----------|---------|
| `createVirtualCV(name, content)` | generate id, store, return |
| `getVirtualCV(id)` | Map get or null |
| `updateVirtualCV(id, content)` | mutate content + timestamps + size |
| `updateVirtualCVName(id, newName)` | mutate name + fileName |
| `deleteVirtualCV(id)` | remove |
| `listVirtualCVs()` | array sorted desc lastModified |
| `isVirtualId(id)` | `id.startsWith("virtual_")` |
| `markVirtualDownloaded(id)` / `isVirtualDownloaded(id)` | `.md` download flag. `updateVirtualCV` clears it when content changes |
| `hasUndownloadedVirtualCVs()` | True if any sandbox CV has not had its `.md` downloaded since the last edit |

**Notes**
- ID generation: `virtual_${Date.now()}_${rand6}`
- Size: `new TextEncoder().encode(content).length`
- Fully synchronous.

### use-fs-support.ts

```ts
export function isFsSupported(): boolean
```

- Pure function safe anywhere (SSR guarded).

Used by dashboard to branch to sandbox vs connect/explorer.

### templates.ts

Three exported template strings:
- `DEFAULT_TEMPLATE` — detailed Software Engineer resume
- `DEMO_TEMPLATE_PM` — Product Manager variant
- `BLANK_TEMPLATE` — skeleton with only H1 + contact

Used by create modal and demo cards. Keep format compatible with the PDF renderer and preview CSS.

### pdf-export.tsx

**"use client"** heavy module.

- Dynamic-imported from editor.
- Parses markdown with `unified` + `remark-parse` + `remark-gfm` → mdast.
- Recursive walk to emit @react-pdf/renderer elements.
- Supports headings, paragraphs, lists (ordered markers + one nested indent), links, tables, code (Courier), hr, blockquote, strong/em.
- `downloadCVAsPDF(markdown, fileName, pageSize, themeId)` — `pageSize` is `"A4"` or `"LETTER"`. `themeId` is `"serif"` or `"sans"`. `buildPdfStyles` runs per call; the resulting `StyleSheet` is passed into `renderInline` / `renderList` / `renderBlock` so concurrent exports with different themes cannot clobber each other. Leading frontmatter is stripped before parse.
- Page flow, margins, fonts (Times-Roman family to match Georgia in preview).
- No print CSS path for export (separate from Ctrl+P).

## Cross-cutting

- When editing storage modules (fs-access / virtual-store), keep them in sync (e.g. same rename semantics, same slug/display rules).
- Sanitize on create/rename to prevent FS issues.
- Never assume the handle or Map entry exists — callers check.

### dir-persist.ts

IndexedDB (`zenith-cv` / `handles` / `directory`) stores the directory handle only. No file contents.

| Function | Purpose |
|----------|---------|
| `saveDirectoryHandle` / `loadDirectoryHandle` / `forgetDirectoryHandle` | Persist, restore, delete |
| `queryDirectoryPermission` / `requestDirectoryPermission` | `readwrite`. Request must run from a click |

### cv-theme.ts

`SERIF_THEME` and `SANS_THEME`. `themeCssVars` drives preview CSS variables. PDF `StyleSheet` is built from the same object. Module `getThemeId` / `setThemeId` survives client navigation, not disk. Sans is Helvetica, single column, no icons.

### frontmatter.ts

`splitFrontmatter` reads a leading `---` block. `target` and `notes` are returned separately. The body is what preview and PDF render.

### snippets.ts

`SNIPPETS`: experience, skills, education, project. Plain Markdown inserted at the textarea cursor.

### tailor.ts

`analyzeTailor(body, job)` is pure. Flags missing Contact / Experience / Education. Overlap is case-insensitive terms of length ≥ 4, stopwords removed. No network, no storage.

Update this file + parents when lib contracts or behavior changes.
