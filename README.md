# Zenith CV

**Privacy-first, self-contained Markdown-to-PDF resume builder.**

Your resumes live as plain `.md` files you fully control — either directly on disk (Chrome/Edge) or in browser memory (other browsers). Beautiful live preview, real text-based PDF export, zero accounts, zero cloud, zero lock-in.

## The Problem It Solves

Traditional resume tools suffer from:

- **Privacy & lock-in**: Data trapped in SaaS dashboards; no easy export or Git history.
- **Bloat & ATS issues**: WYSIWYG editors produce non-semantic HTML/PDF that ATS parsers and recruiters hate.
- **Friction**: Accounts, paywalls, and clunky UIs for what should be simple text.
- **Portability**: Can't easily version, diff, or store resumes alongside code projects.

Zenith CV fixes this by treating your CV as **first-class Markdown** that renders to a clean, professional, ATS-friendly PDF.

## Features

- **True hybrid storage**
  - **Local File Mode** (Chrome/Edge): Direct read/write of `.md` files via the File System Access API. No `localStorage`, database, or cloud sync.
  - **Web Sandbox Mode** (Firefox, Safari, deployments): In-memory virtual CVs that survive route changes but are cleared on refresh. Clear amber banners warn you.
- **Live Markdown editor + preview**: Split-pane with `react-markdown` + GFM support (tables, task lists, strikethrough). What you see is exactly what you get in the PDF.
- **Real PDF export** (primary path): Uses `@react-pdf/renderer` to produce selectable, indexable, text-based PDFs (not a print dialog hack). Multi-page, ATS-compatible. The export code is dynamically imported.
- **Templates & demos**: Engineering, Product Manager, and Blank starters. One-click demo CVs for quick starts. Upload any existing `.md` file.
- **Autosave & reliability**: 500ms debounced autosave. Stream writes (`FileSystemWritableFileStream`) for atomic local saves. Flush-on-navigate.
- **Rename anywhere**: Inline rename on dashboard cards and editor toolbar. Works in both modes with validation.
- **Download `.md` and duplicate**: Keep the Markdown source (required in sandbox). Duplicate opens a `-copy` file.
- **Page size and length**: A4 or US Letter. Preview shows when the CV overflows one page.
- **Editor shortcuts**: `Ctrl+S` saves immediately, `Ctrl+E` downloads the PDF. Both are labeled in the editor.
- **Mode awareness**: Subtle emerald/amber badges everywhere. "Connect Folder" escape hatch even in sandbox when FS is supported.
- **No bloat**: Minimal Next.js 16 + Tailwind 4 setup. Print CSS retained as fallback for Ctrl+P.

## Architecture

Runtime mode is chosen via feature detection:

```ts
// src/lib/use-fs-support.ts
export function isFsSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}
```

**Dashboard phases**:
- `connect` → prompt for folder (local) or "continue in sandbox"
- `explorer` → local files grid (when connected)
- `sandbox` → virtual CVs + upload + demos

**Editor** (`/editor/[id]`): Single route handles both modes by checking if `id` starts with `virtual_`:

| Mode     | Load                        | Autosave target                  |
|----------|-----------------------------|----------------------------------|
| local    | `readMdFile()` via FS API   | `writeMdFile()` (stream write)   |
| virtual  | `getVirtualCV(id).content`  | `updateVirtualCV()` (Map mutate) |

All state is module-level (never GC'd on client nav):
- `fs-access.ts`: `_dirHandle`
- `virtual-store.ts`: `Map<string, VirtualCV>`

PDF generation walks the mdast (unified + remark-parse + remark-gfm) and emits `@react-pdf/renderer` elements.

See `AGENTS.md` for the full V4 specification.

## Tech Stack

| Layer          | Technology                                      |
|----------------|-------------------------------------------------|
| Framework      | Next.js 16 (App Router)                         |
| Language       | TypeScript 5 (strict)                           |
| UI             | React 19                                        |
| Styling        | Tailwind CSS 4 (`@import "tailwindcss"`, no config) |
| Markdown       | `react-markdown` + `remark-gfm`                 |
| PDF            | `@react-pdf/renderer@^4` + unified/remark       |
| Runtime        | Node 20+                                        |
| Package Mgmt   | npm                                             |
| Linting        | ESLint 9 (flat config)                          |

## Getting Started

```bash
cd zenith-cv
npm install
npm run dev
```

Open http://localhost:3000.

- On Chrome/Edge: Click **Connect Local CV Folder** and pick (or create) an empty directory for your `.md` files.
- On other browsers: Use **Continue in Web Sandbox Mode** (or the demo templates).
- Create, edit, rename, and **Download PDF**.

## Example CV Snippet

```markdown
# Alex Rivera
**Senior Software Engineer** | San Francisco, CA
alex.rivera@email.com · ...

## Summary
...

## Technical Skills
**Languages:** TypeScript, Go, ...
```

## Development Notes

- All client components (`"use client"`).
- `startTransition` used for state updates inside effects (ESLint 9 + React 19 rules).
- Rename uses keyboard shortcuts (Enter/Escape) + optimistic updates.
- Legacy `@media print` styles still present for browser print fallback.

## License

MIT (or your preferred license — add it here).

---

Built for people who want their resumes to be **versionable, private, and portable**.
