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

## Current Architecture Overview

### State Model
- **100% client-side, no server state.** All markdown content lives in a single React `useState<string>` hook inside `page.tsx`.
- No database, no auth, no API routes — pure client rendering for the resume editor.
- The page is a `"use client"` component to enable interactive state.

### Layout
```
┌────────────────────────────────────────────────────────┐
│  TOOLBAR  (Zenith CV logo · Load .md · Download PDF)   │  ← print:hidden
├─────────────────────────┬──────────────────────────────┤
│                         │                              │
│   EDITOR (left 50%)     │   PREVIEW (right 50%)        │
│   <textarea>            │   <ReactMarkdown>            │
│   font-mono             │   .cv-content (serif prose)  │
│   print:hidden          │   A4 shadow card             │
│                         │                              │
└─────────────────────────┴──────────────────────────────┘
         Screen view                    ↕
                         (window.print())
┌────────────────────────────────────────────────────────┐
│   PRINT / PDF output                                   │
│   Only #cv-preview rendered · @page A4 14mm/16mm       │
│   No toolbar, no editor, no shadows                    │
└────────────────────────────────────────────────────────┘
```

### PDF Export
- `window.print()` is called from the "Download PDF" toolbar button.
- `@media print` rules in `globals.css` hide the toolbar and editor (`print:hidden` + explicit `display:none`).
- `@page { size: A4 portrait; margin: 14mm 16mm; }` controls physical page margins.
- The preview article expands to `max-width: 100%` and removes all decorative padding/shadow.
- `page-break-after: avoid` on headings prevents orphaned section titles.

### Markdown Rendering
- `react-markdown` renders the raw markdown string into a custom component map.
- Every HTML element (h1–h3, p, ul, li, a, hr, strong, em, code, blockquote, table) is mapped to a component with a `cv-*` CSS class.
- Styles are defined in `globals.css` as plain CSS classes (no Tailwind inside the prose — intentional, for print-safe specificity and easy theming).
- `remark-gfm` enables GitHub-Flavored Markdown: tables, strikethrough, autolinks, task lists.

---

## File Structure Map

```
c:\Projects\zenith-cv\
├── AGENT.md                          ← This file (AI system memory)
└── zenith-cv/                        ← Next.js app root
    ├── package.json                  ← Scripts: dev, build, start, lint
    ├── next.config.ts                ← Next.js config (minimal)
    ├── tsconfig.json                 ← TypeScript config
    ├── eslint.config.mjs             ← ESLint 9 flat config
    ├── postcss.config.mjs            ← PostCSS (Tailwind 4)
    ├── AGENTS.md                     ← Next.js-specific agent notes
    ├── src/
    │   └── app/
    │       ├── layout.tsx            ← Root layout (Geist fonts, metadata, html/body)
    │       ├── page.tsx              ← Main page: editor + preview + toolbar (CLIENT)
    │       ├── globals.css           ← Tailwind 4 import + CV prose styles + print CSS
    │       └── favicon.ico
    └── public/                       ← Static assets
```

---

## Current Working State (V1)

Implemented in the initial build prompt:

- **Split-screen layout**: 50/50 `flex` layout — `<textarea>` editor on the left, `ReactMarkdown` preview on the right. Both panels are independently scrollable.
- **Toolbar**: Fixed header with Zenith CV logo/brand, "Load .md" file upload button, and "Download PDF" button.
- **Load .md**: `<input type="file" accept=".md,.txt">` reads the file via `FileReader` and replaces editor state.
- **PDF export**: `window.print()` triggers browser print dialog. `@media print` CSS hides the editor and toolbar; the preview expands to fill the A4 page with correct margins.
- **CV prose styles**: Custom `cv-*` CSS classes applied via `react-markdown` component overrides. Serif typography, indigo accent headers, clean hierarchy.
- **Example resume template**: A realistic Alex Rivera (Senior Software Engineer) template pre-loaded in `INITIAL_MARKDOWN` — demonstrates headings, bullet lists, bold highlights, italic dates, horizontal rules, and links.
- **Print page-break control**: `page-break-after: avoid` on `cv-h2`/`cv-h3`, `page-break-inside: avoid` on `cv-li`/`cv-p`.

---

## Next Implementation Steps

These are the recommended next features, in priority order:

1. **Local Storage Persistence**
   - Auto-save markdown to `localStorage` on every keystroke (debounced ~500ms).
   - On mount, rehydrate from `localStorage` if a saved draft exists.
   - Show a subtle "Saved" indicator in the toolbar.

2. **Multiple Resume Templates**
   - Add a `templates/` directory with 3–5 named Markdown template strings (e.g., `minimal`, `academic`, `creative`).
   - Add a "Templates" dropdown in the toolbar that replaces editor content (with a confirm prompt if content has been modified).

3. **Modular Section Toggling**
   - Parse the markdown into named sections by H2 heading.
   - Add a sidebar panel with toggles to show/hide individual sections (e.g., hide "Certifications" for a targeted application).

4. **Live Word & Character Count**
   - Display word count, character count, and estimated page count in the status bar below the editor.

5. **Export File Name Control**
   - Before calling `window.print()`, prompt for or auto-derive a filename from the H1 heading (for browsers that support `document.title` override pre-print).

6. **Syntax Highlighting in Editor**
   - Replace the plain `<textarea>` with a lightweight code-mirror or CodeMirror 6 instance for markdown syntax highlighting, line numbers, and keyboard shortcuts.
   - Candidate library: `@uiw/react-codemirror` with `@codemirror/lang-markdown`.

7. **Dark Mode Support for Editor**
   - Add a dark/light toggle to the toolbar.
   - Apply `dark:` variants to the editor panel (preview intentionally stays white for print fidelity).

8. **Custom Theme/Font Selector for Preview**
   - Allow users to pick from 3 font pairings (serif, sans-serif, monospace) and 2–3 accent colour palettes that change the `cv-h2` colour and `cv-hr` colour.
   - Persist preference to `localStorage`.

9. **Shareable URL via URL Hash**
   - Base64-encode the markdown content into the URL hash (`#`) so users can share a link that restores their exact CV content.
   - Keep it opt-in (a "Share" button) to avoid bloating the URL on every keystroke.
