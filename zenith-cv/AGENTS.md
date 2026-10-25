<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Zenith CV — App-level Agent Memory

> App-specific architecture, modes, current features, and implementation notes for the Next.js application.
> See root `AGENTS.md` for general conventions, update rules, and drill-down guidance.
> For low-level lib details see `src/lib/AGENTS.md`; for UI pages see `src/app/AGENTS.md`.

## Architecture Overview

Zenith CV is a Next.js application for creating and editing resumes in Markdown format with PDF export capabilities. The app supports two modes:

1. **Local File Mode**: Files are stored directly on the user's computer using the File System Access API (Chrome/Edge only)
2. **Web Sandbox Mode**: Files are stored in session memory (module Map), lost on page refresh

### Storage Model (Hybrid)

Determined at runtime by `isFsSupported()` (presence of `showDirectoryPicker`).

- Local: uses `src/lib/fs-access.ts` + real FS handles. Single source of truth on disk.
- Sandbox: `src/lib/virtual-store.ts` Map. Survives route changes in tab, lost on reload/refresh.

Users can voluntarily enter Sandbox even on supporting browsers via the connect screen escape hatch.

### Mode Indicators

- Local: emerald pill "Local File Mode" (pulse on connected)
- Sandbox: amber pill "Web Sandbox Mode" + persistent amber banner warning "session memory only — use Download PDF to persist"

### Routing

- `/` → Dashboard (`src/app/page.tsx`)
- `/editor/[id]` → Editor (`src/app/editor/[id]/page.tsx`)

`id` is slug (local) or `virtual_*` id. Decoded with `decodeURIComponent`.

Editor decides mode purely via `isVirtualId(rawId)` from virtual-store.

## Current Features (Working State)

- Hybrid FS + virtual storage with correct fallback.
- Full CRUD + rename for CVs in both modes.
- 3-template selector on create (Engineering / PM / Blank).
- Demo templates loadable instantly in sandbox.
- .md upload (FileReader) works in both modes.
- Debounced autosave (500ms) + flush-on-back.
- Real text-based PDF export via @react-pdf/renderer (ATS safe, selectable).
- Live Markdown preview with GFM.
- Inline rename from dashboard cards and editor toolbar (Enter/Esc, validation, duplicate checks).
- Mode badges and escape hatches in both directions.
- Download `.md` from the editor (sandbox persist path). Duplicate creates a `-copy` slug and opens it.
- Editor: A4/Letter export, page-budget indicator, spellcheck toggle, `Ctrl+S` flush and `Ctrl+E` PDF (shown in the editor chrome).
- Dashboard name filter. Ordered lists and one nested level in the PDF.
- No analytics. Privacy claim matches the build.
- Folder handle is remembered in IndexedDB (permission re-requested). Disconnect forgets it.
- Serif and compact Sans themes share `cv-theme.ts` tokens for preview CSS and PDF.
- Snippet insert, hidden `target`/`notes` frontmatter, session-only tailor check, and a leave warning for undownloaded sandbox CVs.
- Live demo: https://cv.ldevia.dev/. MIT license at repo root. CI: `.github/workflows/ci.yml` (lint + build).
- `layout.tsx` sets `metadataBase` / Open Graph / Twitter against `https://cv.ldevia.dev` and `public/og.png`.

See `src/app/AGENTS.md` and `src/lib/AGENTS.md` for details on implementation.

## Rename Feature (Implemented)

Renaming was added after the initial V4 docs.

### Backend

- `fs-access.ts`: `renameMdFile(oldFileName, newFileName)` — reads content, removes old entry, writes to new handle.
- `virtual-store.ts`: `updateVirtualCVName(id, newName)` — mutates name + fileName.

### Frontend

- Dashboard (`page.tsx`): FileCard / VirtualFileCard show rename on hover. Inline input with .md hint. Validates non-empty + !exists. Uses startTransition.
- Editor: Pencil icon next to name in toolbar. Inline edit + Save/Cancel. Updates active state immediately; calls rename + router replace for URL update in local mode.

Validation and errors shown inline; cleared on new input.

Keyboard: Enter confirms, Escape cancels.

## Development Notes (App)

- Heavy use of `useCallback`, `useRef`, `useEffect` + `startTransition` for state.
- Refs used for current content (flush), timers (debounce), upload inputs.
- No external state libs; everything local + module state.
- Tailwind dark theme + specific prose classes in globals.css.
- PDF generation is async dynamic import; spinner during export.
- Error handling: silent AbortError on picker cancel; explicit states for not-found / no-workspace.

## Sub-AGENTS Index

- `src/lib/AGENTS.md` — detailed function tables, interfaces, and notes for fs-access, virtual-store, pdf-export, templates, use-fs-support.
- `src/app/AGENTS.md` — dashboard phases, editor behavior, CSS, layout.
- `src/app/editor/AGENTS.md` — editor-specific flows (if present).

Update this file when high-level features or cross-cutting app behavior changes.
