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

## Current Architecture Overview (V3 — File System Edition)

### Storage Model

**No `localStorage`. No database. No cloud.**
All CV data lives as plain `.md` files inside a user-selected local directory on their machine.
The HTML5 **File System Access API** (`showDirectoryPicker` / `FileSystemDirectoryHandle` / `FileSystemFileHandle`) is the single source of truth.

### File Identity

Each CV is identified by its **filename slug** (the `.md` filename without extension).

| Filename on disk       | URL slug           | Display Name          |
|------------------------|--------------------|-----------------------|
| `software-eng-v1.md`  | `software-eng-v1` | `Software Eng V1`     |
| `my-resume.md`        | `my-resume`        | `My Resume`           |

URL routing: `/editor/software-eng-v1` → `params.id = "software-eng-v1"`.

### Module-Level State (`src/lib/fs-access.ts`)

A single module-level variable `_dirHandle: FileSystemDirectoryHandle | null` holds the active directory connection.
This persists across Next.js route changes within the same browser tab session (module state is never GC'd during client-side navigation).

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

### Dashboard — Two Phases

**Phase 1: `connect`** (no `_dirHandle`)
- Full-screen dark landing with brand, explanation text, and a single "Select Local CV Folder" button.
- Calls `pickDirectory()` on click; `AbortError` (user cancelled) is silently ignored; other errors shown inline.
- Browser compatibility note: requires Chrome or Edge (File System Access API not available in Firefox/Safari).

**Phase 2: `explorer`** (handle is set)
- Navbar with "New CV" button.
- Connected folder name shown with emerald indicator.
- "Refresh" button re-scans directory; "Disconnect" calls `clearDirectoryHandle()` and returns to Phase 1.
- File grid (3-col desktop / 2 tablet / 1 mobile): shows display name, filename, last modified, file size, delete action.
- **Create New CV modal**: prompts for a filename slug, sanitizes it, checks for duplicates via `fileExists()`, writes the file via `writeMdFile()`, navigates to `/editor/[slug]`.
- **Delete**: inline "Delete from disk? / Confirm / Cancel" confirmation before `deleteMdFile()`.

### Layout

```
Connect Screen (/ — no workspace)
┌────────────────────────────────────────────────────────┐
│                                                        │
│           [folder icon]  Zenith CV  v3                 │
│                                                        │
│    "Your CVs live as .md files on your computer"       │
│                                                        │
│          [ Select Local CV Folder ]                    │
│                                                        │
│     Requires Chrome or Edge · File System Access API   │
└────────────────────────────────────────────────────────┘

Explorer Dashboard (/ — workspace connected)
┌────────────────────────────────────────────────────────┐
│  NAVBAR  (Zenith CV v3 · + New CV)                     │  ← bg-neutral-950
├────────────────────────────────────────────────────────┤
│  "Your resumes" · 📁 folder-name · N files             │
│  [Refresh]  [Disconnect]                               │
│                                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ File Card│  │ File Card│  │ File Card│  ← 3-col    │
│  │ name     │  │ name     │  │ name     │             │
│  │ slug.md  │  │ slug.md  │  │ slug.md  │             │
│  │ modified │  │ modified │  │ modified │             │
│  │ size     │  │ size     │  │ size     │             │
│  │ [Delete] │  │ [Delete] │  │ [Delete] │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└────────────────────────────────────────────────────────┘

Editor (/editor/[slug])
┌────────────────────────────────────────────────────────┐
│  TOOLBAR  (← Dashboard · name · slug.md · saving · PDF)│  ← bg-neutral-950
├─────────────────────────┬──────────────────────────────┤
│  EDITOR (left 50%)      │  PREVIEW (right 50%)         │
│  <textarea> font-mono   │  <ReactMarkdown> .cv-content │
│  print:hidden           │  A4 shadow card              │
└─────────────────────────┴──────────────────────────────┘
```

### Editor Features (V3)

- **File loading**: On mount, checks `getDirectoryHandle()`. If null → `no-workspace` error state with link to dashboard. Reads file content via `readMdFile(fileName)`. `NotFoundError` → `not-found` state.
- **Autosave**: Debounced 500ms. After debounce fires, calls `await writeMdFile(fileName, markdown)` (stream write to disk). Save states: `idle` → `saving` (yellow pulse) → `saved` (emerald, 2.5s) | `error` (red).
- **Flush on back**: "Back to Dashboard" clears the debounce timer and calls `writeMdFile` immediately before `router.push("/")`.
- **Load .md**: `<input type="file">` FileReader replaces editor content (content is then autosaved to disk).
- **Download PDF**: `window.print()` — same print CSS as before.
- **currentMarkdown ref**: A `useRef` tracks latest content for the flush-on-back case without stale closure issues.

### Stream Write Architecture

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
| Unsupported browser | No `showDirectoryPicker` in `window` | Error message shown before picker call |
| Duplicate filename on create | `fileExists()` returns true | Inline error in create modal |

## PDF Export

- Same as V1/V2: `window.print()` triggers browser print dialog.
- `@media print` in `globals.css` hides toolbar/editor; preview fills the A4 page.
- `@page { size: A4 portrait; margin: 14mm 16mm; }`.

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
        │   ├── fs-access.ts          ← File System Access API module (module-level state + all FS ops)
        │   ├── storage.ts            ← (legacy) CvEntry type + localStorage CRUD — no longer used by main app
        │   └── templates.ts          ← DEFAULT_TEMPLATE + BLANK_TEMPLATE strings
        └── app/
            ├── layout.tsx            ← Root layout (Geist fonts, metadata, html/body)
            ├── page.tsx              ← Dashboard: Connect Workspace OR File Explorer (CLIENT)
            ├── globals.css           ← Tailwind 4 import + cv-* prose + print CSS
            ├── favicon.ico
            └── editor/
                └── [id]/
                    └── page.tsx      ← Split-screen editor; [id] = slug (filename without .md) (CLIENT)
```

---

## ESLint Notes (Next.js 16 Stricter Rules)

- **`react-hooks/set-state-in-effect`**: Calling `setState` directly (synchronously) inside a `useEffect` body is an error. Wrap all setState calls in `startTransition(() => { ... })` — this satisfies the rule and marks updates as non-urgent transitions.

---

## Working State (V3 — File System Edition)

All V2 features preserved (editor, PDF export, print CSS, ReactMarkdown rendering), plus:

- **True local file storage**: CVs are real `.md` files on the user's disk — no localStorage, no cloud.
- **Workspace Connect flow**: Clean landing screen with `showDirectoryPicker()` to select any local folder.
- **File explorer**: Scans for `.md` files, shows filename + last modified + size. Reconnect / Disconnect / Refresh.
- **File-based autosave**: Every keystroke debounce (500ms) streams content to disk via `FileSystemWritableFileStream`. Atomic write (no corruption risk).
- **Create New CV**: Prompts for filename slug, sanitizes, checks duplicates, writes `.md` file, opens editor.
- **Delete from disk**: Inline confirmation, then `dirHandle.removeEntry(fileName)`.
- **Graceful degradation**: Editor detects missing workspace (page refresh) and shows reconnect prompt.

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
