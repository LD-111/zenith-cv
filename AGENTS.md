# Zenith CV — Agent Memory

> This file is the canonical system memory for AI assistant interactions on this repo.
> Update it whenever significant architecture decisions are made or new features land.

---

## Project Name & Core Tech Stack

| Item | Value |
|---|---|
| **Project** | Zenith CV |
| **Purpose** | Privacy-first, self-contained Markdown-to-PDF resume builder |
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 (strict) |
| **Styling** | Tailwind CSS 4 (`@import "tailwindcss"` in globals.css — no `tailwind.config.*`) |
| **Markdown** | `react-markdown` + `remark-gfm` (GFM tables, strikethrough, task lists) |
| **Runtime** | React 19, Node 20+ |
| **Package Manager** | npm |
| **Linter** | ESLint 9 (flat config via `eslint.config.mjs`) |

---

## Current Architecture Overview (V4 — Hybrid File Edition)

### Storage Model

**Hybrid strategy — two distinct modes determined at runtime by browser feature detection.**

#### Local File Mode (Case A)
Active when `window.showDirectoryPicker` is available (Chrome / Edge).
- All CV data lives as plain `.md` files inside a user-selected local directory.
- The HTML5 **File System Access API** (`showDirectoryPicker` / `FileSystemDirectoryHandle` / `FileSystemFileHandle`) is the single source of truth.
- No `localStorage`. No database. No cloud.

#### Web Sandbox Mode (Case B)
Active when `showDirectoryPicker` is **not** available (Firefox / Safari / all web deployments), OR when the user explicitly opts in via "Continue in Web Sandbox Mode" on the connect screen.
- CVs are stored as `VirtualCV` objects in a **module-level `Map`** inside `src/lib/virtual-store.ts`.
- State persists across client-side route changes within the same tab session (module state survives Next.js navigation), but **is lost on page refresh**.
- Users are clearly informed via an amber banner and mode badge.
- Users can: create virtual CVs from templates, upload existing `.md` files, or open pre-populated demo templates (Software Engineer, Product Manager).

### Feature Detection (`src/lib/use-fs-support.ts`)

```ts
export function isFsSupported(): boolean
export function useFsSupport(): { supported: boolean; checked: boolean }
```

- `isFsSupported()` — pure synchronous check, safe to call inside `useEffect`.
- `useFsSupport()` — React hook, returns `{ supported, checked }` for components that need reactive detection.
- Both correctly handle SSR (guard with `typeof window !== "undefined"`).

### Mode Routing Decision (Dashboard `page.tsx`)

```
On mount (useEffect):
  isFsSupported() === false  →  phase = "sandbox"
  isFsSupported() === true:
    getDirectoryHandle() === null  →  phase = "connect"
    getDirectoryHandle() !== null  →  phase = "explorer"
```

The connect screen (Case A, not yet connected) also offers a "Continue in Web Sandbox Mode" escape hatch, allowing Chrome users to use sandbox mode without picking a folder.

### Virtual CV Store (`src/lib/virtual-store.ts`)

Module-level `Map<string, VirtualCV>` — never GC'd during client-side navigation.

```ts
interface VirtualCV {
  id: string;         // "virtual_<timestamp>_<random6>" — globally unique, used as URL id param
  name: string;       // slug-style name, e.g. "my-resume"
  fileName: string;   // "my-resume.md"
  content: string;    // full Markdown string
  lastModified: number;
  size: number;       // byte count via TextEncoder
}
```

Key exported functions:

| Function | Description |
|---|---|
| `createVirtualCV(name, content)` | Creates entry in Map, returns `VirtualCV` |
| `getVirtualCV(id)` | Returns `VirtualCV \| null` |
| `updateVirtualCV(id, content)` | Mutates content + lastModified + size |
| `deleteVirtualCV(id)` | Removes from Map |
| `listVirtualCVs()` | Returns all CVs sorted by lastModified desc |
| `isVirtualId(id)` | Returns `true` if `id.startsWith("virtual_")` |

### Editor Mode Detection (`/editor/[id]/page.tsx`)

The editor infers its mode purely from the URL `id` parameter:

```ts
const mode: EditorMode = isVirtualId(rawId) ? "virtual" : "local";
```

| Mode | Load source | Autosave target | "no-workspace" state |
|---|---|---|---|
| `"local"` | `readMdFile(fileName)` via FS API | `writeMdFile(fileName, content)` | Shown if `getDirectoryHandle()` is null |
| `"virtual"` | `getVirtualCV(rawId).content` | `updateVirtualCV(rawId, content)` | Shows "not-found" if ID missing (e.g. after page refresh) |

Virtual autosave is synchronous (no I/O), but still debounced 500ms for UX consistency.
Flush-on-back calls `updateVirtualCV` synchronously before `router.push("/")`.

### Mode Indicators (UX)

Both the Dashboard and Editor display a subtle pill badge indicating the active mode:

| Mode | Badge colour | Text |
|---|---|---|
| Local File Mode | Emerald (with pulse animation) | `Local File Mode` |
| Web Sandbox Mode | Amber | `Web Sandbox Mode` |

The sandbox dashboard also shows a persistent amber info banner explaining session-only storage and directing users to "Download PDF" to save their work.

### File Identity

Each CV is identified by its **ID**:
- **Local Mode**: filename slug (`.md` filename without extension), e.g. `software-eng-v1`
- **Virtual Mode**: prefixed ID `virtual_<timestamp>_<random6>`, e.g. `virtual_1751234567890_a3f9b2`

| Filename on disk       | URL slug           | Display Name          |
|------------------------|--------------------|-----------------------|
| `software-eng-v1.md`  | `software-eng-v1` | `Software Eng V1`     |
| `my-resume.md`        | `my-resume`        | `My Resume`           |

URL routing: `/editor/software-eng-v1` → `params.id = "software-eng-v1"`.

### Module-Level State (`src/lib/fs-access.ts` + `src/lib/virtual-store.ts`)

A single module-level variable `_dirHandle: FileSystemDirectoryHandle | null` holds the active directory connection (Local Mode).
A module-level `Map<string, VirtualCV>` in `virtual-store.ts` holds in-memory CVs (Sandbox Mode).
Both persist across Next.js route changes within the same browser tab session (module state is never GC'd during client-side navigation).

Key exported functions:

| Function | Description |
|---|---|
| `pickDirectory()` | Calls `window.showDirectoryPicker({ mode: "readwrite" })`, stores handle |
| `getDirectoryHandle()` | Returns current `_dirHandle` (null if not connected) |
| `getDirectoryName()` | Returns the folder name string |
| `clearDirectoryHandle()` | Resets `_dirHandle` to null (disconnect) |
| `scanMdFiles()` | `for await` over `dirHandle.entries()`, returns `MdFile[]` sorted by lastModified desc |
| `readMdFile(fileName)` | Gets file handle → `getFile()` → `.text()` |
| `writeMdFile(fileName, content)` | Gets handle with `{ create: true }` → `createWritable()` → `write()` → `close()` |
| `deleteMdFile(fileName)` | `dirHandle.removeEntry(fileName)` |
| `fileExists(fileName)` | `getFileHandle()` wrapped in try/catch |
| `sanitizeSlug(input)` | Lowercases, replaces spaces with `-`, strips invalid chars |
| `slugToDisplayName(slug)` | Converts `my-resume` → `My Resume` |

### `MdFile` Interface

```ts
interface MdFile {
  slug: string;       // "software-eng-v1" — used as URL id param
  fileName: string;   // "software-eng-v1.md" — actual filename on disk
  lastModified: number; // Unix ms timestamp from File.lastModified
  size: number;       // bytes
}
```

### Routing

```
/                    → Dashboard (src/app/page.tsx)           — CLIENT
/editor/[id]         → Editor    (src/app/editor/[id]/page.tsx) — CLIENT
```

`id` param is `encodeURIComponent(slug)` when navigating, decoded with `decodeURIComponent(params.id)` in the editor.

### Dashboard — Three Phases (V4)

**Phase 1: `connect`** (FS supported, no `_dirHandle`)
- Full-screen dark landing with brand, explanation text, and "Connect Local CV Folder" button.
- Also shows "Continue in Web Sandbox Mode" secondary option for users who prefer not to pick a folder.
- Calls `pickDirectory()` on click; `AbortError` silently ignored; other errors shown inline.

**Phase 2: `explorer`** (FS supported, handle is set)
- Navbar with "New CV" button + emerald "Local File Mode" badge.
- Connected folder name shown. Refresh / Disconnect controls.
- File grid: shows display name, filename, last modified, file size, delete action.
- **Create New CV modal**: 3-way template selector (Engineering / Product Manager / Blank), sanitizes slug, checks duplicates, writes `.md`, navigates to editor.
- **Delete**: inline confirmation before `deleteMdFile()`.

**Phase 3: `sandbox`** (FS not supported OR user opted in)
- Navbar with "New CV" button + amber "Web Sandbox Mode" badge.
- If FS is actually supported, shows "Connect Folder" escape hatch in navbar.
- Amber info banner explaining session-only storage and PDF download.
- Virtual CV grid: lists all in-memory CVs.
- "Upload .md" button: reads file via FileReader, calls `createVirtualCV`, navigates to editor.
- "Demo Templates" section: Software Engineer and Product Manager cards that open pre-populated editors instantly.
- **Create New CV modal**: same 3-way template selector; creates `VirtualCV` in store, navigates to editor.

### Layout

```
Connect Screen (/ — FS supported, no workspace)
┌────────────────────────────────────────────────────────┐
│                                                        │
│           [folder icon]  Zenith CV  v4                 │
│                                                        │
│    "Your CVs live as .md files on your computer"       │
│                                                        │
│          [ Connect Local CV Folder ]                   │
│                                                        │
│    ──────── or continue without a folder ──────────    │
│         [ Continue in Web Sandbox Mode ]               │
│                                                        │
│     Local Mode · Chrome / Edge · File System API       │
└────────────────────────────────────────────────────────┘

Explorer Dashboard (/ — Local File Mode, connected)
┌────────────────────────────────────────────────────────┐
│  NAVBAR  (Zenith CV v4 · ● Local File Mode · + New CV) │
├────────────────────────────────────────────────────────┤
│  "Your resumes" · 📁 folder-name · N files             │
│  [Refresh]  [Disconnect]                               │
│                                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ File Card│  │ File Card│  │ File Card│  ← 3-col    │
│  └──────────┘  └──────────┘  └──────────┘             │
└────────────────────────────────────────────────────────┘

Sandbox Dashboard (/ — Web Sandbox Mode)
┌────────────────────────────────────────────────────────┐
│  NAVBAR  (Zenith CV v4 · ● Web Sandbox Mode · + New CV)│
│  [Connect Folder] (shown only if FS is supported)      │
├────────────────────────────────────────────────────────┤
│  ⚠ Amber banner: session memory only, use Download PDF │
├────────────────────────────────────────────────────────┤
│  "Your CVs" · N CVs in session memory · [Upload .md]   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ VirtualCV│  │ VirtualCV│  │ VirtualCV│  ← 3-col    │
│  └──────────┘  └──────────┘  └──────────┘             │
│                                                        │
│  Demo Templates                                        │
│  ┌────────────────────┐  ┌────────────────────┐        │
│  │ Demo: SWE          │  │ Demo: PM           │        │
│  └────────────────────┘  └────────────────────┘        │
└────────────────────────────────────────────────────────┘

Editor (/editor/[id])
┌────────────────────────────────────────────────────────┐
│  TOOLBAR  (← Dashboard · name · slug.md · [mode badge] │
│            · saving · Load .md · Download PDF)          │
├─────────────────────────┬──────────────────────────────┤
│  EDITOR (left 50%)      │  PREVIEW (right 50%)         │
│  <textarea> font-mono   │  <ReactMarkdown> .cv-content │
│  print:hidden           │  A4 shadow card              │
└─────────────────────────┴──────────────────────────────┘
```

### Editor Features (V4)

- **Mode detection**: `isVirtualId(params.id)` determines whether to use FS API or virtual store.
- **File loading (Local)**: Checks `getDirectoryHandle()`. If null → `no-workspace` error state. Reads via `readMdFile(fileName)`.
- **File loading (Virtual)**: `getVirtualCV(rawId)`. If null (page refreshed) → `not-found` state with explanation about session memory.
- **Autosave (Local)**: Debounced 500ms → `writeMdFile(fileName, content)` stream write to disk.
- **Autosave (Virtual)**: Debounced 500ms → `updateVirtualCV(rawId, content)` synchronous Map update.
- **Flush on back**: "Back to Dashboard" clears debounce and calls save immediately before `router.push("/")`.
- **Load .md**: `<input type="file">` FileReader replaces editor content (in Local Mode, triggers autosave to disk; in Virtual Mode, updates store).
- **Download PDF**: Dynamically imports `src/lib/pdf-export.tsx`, parses the markdown AST, and generates a real text-based PDF via `@react-pdf/renderer`. Shows a spinner in the toolbar button while generating; triggers a browser file download on completion.
- **Mode badge**: Toolbar shows emerald "Local File Mode" or amber "Web Sandbox Mode" pill.
- **currentMarkdown ref**: Tracks latest content for flush-on-back without stale closure issues.

### Stream Write Architecture (Local Mode only)

Every autosave uses the `FileSystemWritableFileStream` pattern:
```
getFileHandle(name, { create: true })
  → createWritable()       // opens a writable stream (atomic, temp file under the hood)
    → writable.write(content)
    → writable.close()     // atomically swaps the temp file into place
```
This ensures no partial writes corrupt the file.

### Error Handling

| Error | Source | Handling |
|---|---|---|
| `DOMException: AbortError` | User cancelled `showDirectoryPicker` | Silently ignored |
| `DOMException: NotFoundError` | File missing when editor opens | Shows `not-found` state |
| `DOMException: NotAllowedError` | Permission revoked mid-session | `writeMdFile` rejects → `saveStatus = "error"` shown in toolbar |
| Unsupported browser | No `showDirectoryPicker` in `window` | Automatically routes to Sandbox Mode |
| Virtual CV not found | Page refreshed, Map cleared | Shows `not-found` state with session-memory explanation |
| Duplicate filename on create | `fileExists()` returns true | Inline error in create modal |

## PDF Export

- **`src/lib/pdf-export.tsx`** — client-side, text-based PDF generation via `@react-pdf/renderer@4`.
- The markdown string is parsed with `unified` + `remark-parse` + `remark-gfm` into an mdast AST, then each AST node is converted to `@react-pdf/renderer` primitives (`<Document>`, `<Page>`, `<Text>`, `<View>`, `<Link>`).
- Output is a real PDF with selectable, indexable text — ATS-compatible, no print dialog.
- Multi-page flow is handled automatically by `@react-pdf/renderer`'s layout engine; content never cuts off at page boundaries.
- The editor's "Download PDF" button dynamically imports `pdf-export.tsx` (keeping `@react-pdf/renderer` out of the initial bundle), shows a spinner during generation, and then triggers a browser file download.
- Font mapping: `Times-Roman` / `Times-Bold` / `Times-Italic` (PDF built-ins) match the Georgia/Times New Roman used in the on-screen preview; `Courier` for inline/block code.
- Styles mirror `globals.css` `.cv-*` values: same font sizes, colours, margins, and border rules (H2 indigo border-bottom, HR, blockquote, table).
- The legacy `@media print` CSS in `globals.css` is retained for Ctrl+P browser printing but is no longer the primary export path.

## Markdown Rendering

- Same as V1/V2: `react-markdown` with custom `cv-*` CSS class map.
- All element overrides (h1–h3, p, ul, li, a, hr, strong, em, code, blockquote, table, th, td) defined in `globals.css`.

---

## File Structure Map

```
c:\Projects\zenith-cv\
├── AGENTS.md                         ← Root AI system memory (this file)
├── README.md
├── .gitignore
└── zenith-cv/                        ← Next.js app root
    ├── package.json                  ← Scripts: dev, build, start, lint
    ├── next.config.ts                ← Next.js config (minimal)
    ├── tsconfig.json                 ← TypeScript (paths: @/* → src/*)
    ├── eslint.config.mjs             ← ESLint 9 flat config
    ├── postcss.config.mjs            ← PostCSS (Tailwind 4)
    ├── AGENTS.md                     ← Next.js-specific agent notes
    └── src/
        ├── lib/
        │   ├── use-fs-support.ts     ← isFsSupported() utility + useFsSupport() hook
        │   ├── virtual-store.ts      ← In-memory VirtualCV Map for Sandbox Mode
        │   ├── fs-access.ts          ← File System Access API module (Local Mode)
        │   ├── storage.ts            ← (legacy) CvEntry type + localStorage CRUD — unused
        │   └── templates.ts          ← DEFAULT_TEMPLATE + DEMO_TEMPLATE_PM + BLANK_TEMPLATE
        └── app/
            ├── layout.tsx            ← Root layout (Geist fonts, metadata, html/body)
            ├── page.tsx              ← Dashboard: connect / explorer (Local) / sandbox (Virtual)
            ├── globals.css           ← Tailwind 4 import + cv-* prose + print CSS
            ├── favicon.ico
            └── editor/
                └── [id]/
                    └── page.tsx      ← Hybrid editor: local disk OR virtual store by id prefix
```

---

## ESLint Notes (Next.js 16 Stricter Rules)

- **`react-hooks/set-state-in-effect`**: Calling `setState` directly (synchronously) inside a `useEffect` body is an error. Wrap all setState calls in `startTransition(() => { ... })` — this satisfies the rule and marks updates as non-urgent transitions.

---

## Working State (V4 — Hybrid File Edition)

All V3 features preserved (local file storage, editor, PDF export, print CSS, ReactMarkdown rendering), plus:

- **Browser feature detection**: `isFsSupported()` in `src/lib/use-fs-support.ts` gates Local vs Sandbox mode.
- **Web Sandbox Mode**: Full dashboard for Firefox/Safari/portfolio deployments — no FS API required.
  - Virtual CVs stored in module-level Map, survive client-side navigation, lost on page refresh.
  - Upload any `.md` file via standard `<input type="file">` — no picker required.
  - Two pre-populated demo templates (Software Engineer, Product Manager) openable in one click.
- **Hybrid editor**: Single `/editor/[id]` route handles both local files and virtual CVs via `isVirtualId(id)`.
- **Mode indicators**: Emerald badge (Local File Mode) and amber badge (Web Sandbox Mode) in both dashboard and editor toolbar.
- **Escape hatch**: Chrome/Edge users can voluntarily switch to Sandbox Mode from the Connect screen; sandbox users with FS support can connect a folder at any time.
- **3-way template selector**: Create modal now offers Engineering, Product Manager, and Blank templates in both modes.
- **DEMO_TEMPLATE_PM**: New Product Manager resume template in `src/lib/templates.ts`.

---

## Next Implementation Steps

Priority order for V3+:

1. **Multiple Resume Templates**
   - Add a `templates/` directory with 3–5 named Markdown template strings (e.g., `minimal`, `academic`, `creative`).
   - Add a "Templates" dropdown in the Create modal or editor toolbar.

2. **Modular Section Toggling**
   - Parse the markdown into named sections by H2 heading.
   - Add a sidebar panel with toggles to show/hide individual sections.

3. **CV Title Editing**
   - Allow renaming a CV from the dashboard card (inline edit) or from the editor toolbar.
   - Persist the new title to localStorage immediately.

4. **Live Word & Character Count**
   - Display word count, character count, and estimated page count in a status bar below the editor.

5. **Syntax Highlighting in Editor**
   - Replace the plain `<textarea>` with CodeMirror 6 (`@uiw/react-codemirror` + `@codemirror/lang-markdown`).

6. **Dark Mode for Editor**
   - Add a dark/light toggle to the toolbar; apply `dark:` variants to the editor panel.
   - Preview intentionally stays white for print fidelity.

7. **Custom Theme/Font Selector for Preview**
   - Pick from 3 font pairings and 2–3 accent colour palettes changing `cv-h2`/`cv-hr` colours.
   - Persist preference to `localStorage`.

8. **Export File Name Control**
   - Before `window.print()`, derive filename from the CV title or H1 heading via `document.title` override.

9. **Shareable URL via URL Hash**
   - Base64-encode markdown content into the URL hash (`#`) as an opt-in "Share" button.
