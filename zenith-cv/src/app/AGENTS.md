# src/app — Next.js UI Layer (Zenith CV)

Contains the App Router pages, layout, global styles, and all interactive UI.

See:
- `zenith-cv/AGENTS.md` for high-level modes, routing, rename overview.
- `src/lib/AGENTS.md` for the backing storage/PDF.
- Root for conventions (no inline comments, startTransition, etc.).

All files are client components (`"use client"` at top of page.tsx files).

## File Map

- `layout.tsx` — Root layout, Geist fonts (sans + mono), metadata, html/body. No analytics.
- `globals.css` — Tailwind import + `.cv-*` prose styles for preview + legacy `@media print`.
- `page.tsx` — Dashboard (1193 LOC): phases, file grids, modals, rename UI.
- `editor/[id]/page.tsx` — Editor (537 LOC): split view, autosave, rename, PDF export, load .md.

## Dashboard (`page.tsx`)

**Phases** (state machine):
- `loading` → detect FS support
- `connect` (FS ok but no handle)
- `explorer` (FS + handle) — local files
- `sandbox` (no FS support or opted out)

Logic in `useEffect` on mount + `isFsSupported()` + `getDirectoryHandle()`.

**Features implemented in UI**:
- Connect button → `pickDirectory()`
- "Continue in Web Sandbox Mode" escape
- Explorer: folder name, refresh, disconnect, name filter, file cards (display, slug, size, date, rename, duplicate, delete)
- Sandbox: amber banner, upload .md (ref + FileReader → createVirtualCV), virtual cards, demo templates section, connect escape if supported.
- Create modal (shared): 3 radio choices (blank/engineering/pm), name input, live slug preview, duplicate check via `fileExists` or list, create + navigate.
- Rename: per-card hover pencil or button → inline input. Shared validation pattern.
- Delete: confirm state per item.
- Uses many refs for inputs, many startTransition for updates.

**State** is local to component + the module stores.

## Editor (`editor/[id]/page.tsx`)

**Mode detection** (top of component, no state):
```ts
const mode: EditorMode = isVirtualId(rawId) ? "virtual" : "local";
```

**Active name handling**:
- `activeSlug` / `activeVirtualName` state updated on rename.
- `activeFileName` computed.
- `activeFileNameRef` for debounce closure.

**Load states**: loading → ready | no-workspace | not-found | error

- Local no-workspace: if handle missing when trying to load.
- Virtual not-found: after refresh (Map cleared).

**Autosave**:
- Debounce 500ms via timer ref.
- On change: schedule `save()` which does `writeMdFile` or `updateVirtualCV`.
- Status: idle → saving → saved (brief) | error
- `currentMarkdown` ref holds latest for flush.

**Flush on back**:
- Before router.push, clear timer, call save synchronously using ref value.

**Rename in editor**:
- Separate renameMode state.
- On save: call rename API, update active states, then for local: router.replace new URL.
- For virtual also updates list indirectly.

**Other toolbar**:
- Load .md: hidden input, FileReader → setMarkdown (triggers autosave).
- Download PDF: dynamic import("@/lib/pdf-export"), await generate, download blob. Spinner on button.
- Mode badge.

**Preview**:
- Right pane: ReactMarkdown + remarkGfm, wrapped in light A4 card with `.cv-content` classes.
- Editor textarea left, mono, full height.

**Refs & effects** careful to avoid stale closures and satisfy ESLint.

## Styling (`globals.css`)

- Imports tailwind.
- `.cv-*` : h1–h3 sizes/weights, p, ul, li, a, hr, strong, em, code (font + bg), pre, blockquote, table (border, thead, td padding), etc.
- Colors chosen for readability (indigo for h2 bottom border).
- Preview stays light even in dark app.
- Legacy print rules retained (may be removed later).

## Layout & Fonts

Geist Sans for UI, Geist Mono for editor. Variables on html. Full height flex col.

Analytics removed. Do not reintroduce a tracker.

## Error / Empty States

- Dashboard connect error inline.
- Editor: big centered messages for no-workspace / not-found with explanations and actions.
- Rename/create errors shown under input.

## Notes for Changes

- When touching rename flows, keep dashboard + editor + both backends in sync.
- Dashboard and editor both import formatters / sanitizers from lib.
- Always test both modes.
- PDF button only in editor. Page size (A4/Letter) is chosen in the preview header and passed to `downloadCVAsPDF`.
- Shortcuts are labeled in the editor pane chrome: `Ctrl+S` flushes save, `Ctrl+E` exports PDF. `metaKey` is also accepted.
- Download `.md` writes the current buffer. Duplicate allocates `name-copy` / `name-copy-N` and navigates to it.
- Page budget measures preview content height against the selected page's content box (page height minus 28mm padding).

Update this AGENTS.md (and parents) after modifying dashboard or editor behavior, adding UI features, or changing CSS.
