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

## Current Architecture Overview (V2)

### Data Schema

All CV data lives in browser `localStorage` under the key `zenith-cv:entries`.
Each entry conforms to the `CvEntry` interface (defined in `src/lib/storage.ts`):

```ts
interface CvEntry {
  id: string;           // "cv_{timestamp}_{random}" — e.g. cv_1751398200000_x8k2f
  title: string;        // Human-readable name, set at creation or import time
  lastModified: string; // ISO 8601 timestamp, updated on every autosave
  markdownContent: string; // Full raw Markdown text of the CV
}
```

### State Management

- **100% client-side. Zero server state. Zero database.**
- `localStorage` is the single source of truth for all CVs.
- `src/lib/storage.ts` exposes all CRUD helpers: `loadAllCvs`, `saveCv`, `deleteCv`, `getCvById`, `generateId`.
- On first visit (empty storage), the dashboard seeds one default CV from `DEFAULT_TEMPLATE`.

### Routing

```
/                    → Dashboard (src/app/page.tsx)       — static
/editor/[id]         → Editor    (src/app/editor/[id]/page.tsx) — dynamic (SSR)
```

Navigation uses `useRouter` / `router.push` from `next/navigation`. Both routes are `"use client"` components.

### Layout

```
Dashboard (/)
┌────────────────────────────────────────────────────────┐
│  NAVBAR  (Zenith CV v2 · Import .md · + New CV)        │  ← bg-neutral-950 dark bar
├────────────────────────────────────────────────────────┤
│  Section header: "Your resumes" · count · ZENITH://LOCAL│
│                                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ CV Card  │  │ CV Card  │  │ CV Card  │  ← 3-col grid│
│  │ title    │  │ title    │  │ title    │             │
│  │ snippet  │  │ snippet  │  │ snippet  │             │
│  │ modified │  │ modified │  │ modified │             │
│  │ [Delete] │  │ [Delete] │  │ [Delete] │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│                                                        │
└────────────────────────────────────────────────────────┘
           ↕  clicking a card navigates to /editor/[id]

Editor (/editor/[id])
┌────────────────────────────────────────────────────────┐
│  TOOLBAR  (← Dashboard · title · saved · Load .md · PDF)│  ← bg-neutral-950
├─────────────────────────┬──────────────────────────────┤
│  EDITOR (left 50%)      │  PREVIEW (right 50%)         │
│  <textarea> font-mono   │  <ReactMarkdown> .cv-content │
│  print:hidden           │  A4 shadow card              │
│                         │                              │
└─────────────────────────┴──────────────────────────────┘
```

### Dashboard Features

- **Grid layout**: 3-col on desktop, 2 on tablet, 1 on mobile. Each card shows title, 2-line content snippet, last-modified timestamp (formatted), and a delete button.
- **Seeding**: On first load (empty localStorage), one "My First Zenith CV" is created from `DEFAULT_TEMPLATE` (Alex Rivera engineering resume).
- **Create New CV**: Opens an inline modal overlay asking for a title and a "blank template" toggle. On confirm → saves to localStorage → navigates to `/editor/[id]`.
- **Import .md**: `<input type="file">` reads a `.md` or `.txt` file; filename (without extension, `-`/`_` replaced with spaces) becomes the title. Saved to localStorage and appears immediately in the grid.
- **Delete**: Each card has a delete button that transitions to an inline "Delete permanently? / Confirm / Cancel" confirmation state before wiping from localStorage.

### Editor Features

- **Autosave**: Debounced 500ms — every keystroke schedules a save; the timer resets on each keystroke. Saves `id + title + markdownContent + new lastModified` to localStorage.
- **Save indicator**: Toolbar shows `● saving` (yellow pulse) while debounce is pending, then `✓ saved` (emerald) for 2.5s after each successful save.
- **Back to Dashboard**: Flushes any pending debounced save immediately, then `router.push("/")`.
- **Load .md**: Replaces editor content from a local file (existing V1 feature).
- **Download PDF**: `window.print()` — same print CSS as V1.
- **Not-found guard**: If the `id` in the URL doesn't match any localStorage entry, renders an error state with a link back to dashboard.

### PDF Export

- Same as V1: `window.print()` triggers browser dialog.
- `@media print` in `globals.css` hides toolbar/editor; preview fills the A4 page.
- `@page { size: A4 portrait; margin: 14mm 16mm; }`.

### Markdown Rendering

- Same as V1: `react-markdown` with custom `cv-*` CSS class map.
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
        │   ├── storage.ts            ← CvEntry type + localStorage CRUD helpers
        │   └── templates.ts          ← DEFAULT_TEMPLATE + BLANK_TEMPLATE strings
        └── app/
            ├── layout.tsx            ← Root layout (Geist fonts, metadata, html/body)
            ├── page.tsx              ← Dashboard / Home Screen (CLIENT)
            ├── globals.css           ← Tailwind 4 import + cv-* prose + print CSS
            ├── favicon.ico
            └── editor/
                └── [id]/
                    └── page.tsx      ← Split-screen editor for a specific CV (CLIENT)
```

---

## ESLint Notes (Next.js 16 Stricter Rules)

- **`react-hooks/set-state-in-effect`**: Calling `setState` directly (synchronously) inside a `useEffect` body is an error. Wrap all setState calls in `startTransition(() => { ... })` — this satisfies the rule and marks updates as non-urgent transitions.

---

## Working State (V2)

All V1 features preserved, plus:

- **Dashboard** with localStorage-backed CV management.
- **Multi-CV support**: unlimited CVs, each independently stored, edited, and deleted.
- **File import**: drag-and-drop-free `.md` upload into the dashboard.
- **Autosave** with visual feedback in the editor toolbar.
- **Routing**: `/` → dashboard, `/editor/[id]` → per-CV editor.

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
