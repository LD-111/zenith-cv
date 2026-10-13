# src/app/editor — Editor Route

Contains the dynamic `[id]/page.tsx` — the heart of content editing and PDF export.

See `src/app/AGENTS.md` for high-level editor description and `src/lib/AGENTS.md` for backing APIs.

## Editor Page Details

File: `editor/[id]/page.tsx`

### Entry
- `const rawId = decodeURIComponent(params.id)`
- `const mode = isVirtualId(rawId) ? "virtual" : "local"`

Derives `initialFileName` and initial virtual name from store or slug.

### Name State (post-rename support)
- `activeSlug`, `activeVirtualName` — updated live on successful rename.
- `activeFileName`, `activeDisplayName` derived.
- `activeFileNameRef` synced via effect for autosave closures.

### Load & Lifecycle
- On mount: for local check handle + read; for virtual get or not-found.
- Sets markdown + currentMarkdown ref.
- Cleanup clears debounce timers.

### Autosave
- `handleMarkdownChange` updates state + ref + schedules debounced save.
- `save` async: sets "saving", calls write or update, then briefly "saved".
- Error sets "error".

### Rename Flow
- Pencil toggles renameMode.
- Save rename:
  1. Validate + check exists (local) or list (virtual).
  2. Call rename* API.
  3. Update local active states.
  4. Local mode: router.replace to new slug URL (history friendly).
  5. Virtual: just state.
- Errors shown, auto-cleared on input.

### Other Actions
- Back: flush save immediately, then push("/").
- Load .md: replaces markdown (triggers autosave).
- Export PDF: dynamic import pdf-export, `downloadCVAsPDF(markdown, fileName, pageSize)`. Spinner state. A4 or Letter from preview header.
- Download `.md`: blob download of the current buffer.
- Duplicate: `allocateCopySlug`, write/create, then `router.push` the copy.
- Shortcuts: `Ctrl+S` / `⌘S` calls `flushSave`. `Ctrl+E` / `⌘E` calls PDF export. Labeled in the editor pane chrome and on the PDF button title.
- Spellcheck toggle on the textarea (default off).
- Page budget: `ResizeObserver` on preview content vs content-box height (269mm A4, 251.4mm Letter). Shows `1 page` or `N pages · overflows`.

### UI Layout
- Fixed toolbar (back, name+rename, status, duplicate, download .md, load, export). Shortcut legend in the editor pane header.
- Flex 1 row: textarea (50%) + preview card (50%).
- Preview uses ReactMarkdown + GFM; classes from globals.css `.cv-*`.
- Dark editor, light preview.

### Important Refs
- saveTimerRef, savedTimerRef
- isFirstRender (to skip initial autosave)
- currentMarkdown
- activeFileNameRef

### Edge Cases Handled
- Virtual CV missing after refresh.
- Permission loss mid-edit (write rejects → error status).
- Concurrent renames / deletes (caller checks).

Keep this file and the app/lib AGENTS.md in sync when changing editor logic.
