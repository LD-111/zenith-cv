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
- Export PDF: dynamic import pdf-export, `downloadCVAsPDF(markdown, fileName, pageSize, themeId)`. Spinner state. A4 or Letter, and one of the five font ids, from the preview header. Frontmatter is stripped inside the exporter after `primary` / `secondary` / `tertiary` are applied to the theme.
- Preview is `CvPreview` (`editor/cv-preview.tsx`). It renders `splitFrontmatter(markdown).body` with `themeCssVars(applyPalette(theme, meta))` into fixed page sheets. A hidden measurer at the content width (page width minus 32mm) packs top-level blocks. Each sheet clips to the content box (269mm A4, 251.4mm Letter) and `transform: scale()` fits the pane without reflowing. The header count is the sheet count: `1 page` or `N pages`.
- Preview header color inputs (Primary, Secondary, Tertiary) call `setPalette` and the existing markdown setter, so autosave writes them into frontmatter. Reset clears all three keys. Unset roles keep the shared document colors. The font `<select>` calls `setThemeId`. Pickers show the effective color.
- Insert menu writes a snippet at the textarea selection.
- Tailor panel holds a job description in component state only. Overlap terms are `<mark>`ed in the preview. PDF export does not include marks.
- Download `.md` in virtual mode calls `markVirtualDownloaded`.
- Download `.md`: blob download of the current buffer.
- Duplicate: `allocateCopySlug`, write/create, then `router.push` the copy.
- Shortcuts: `Ctrl+S` / `⌘S` calls `flushSave`. `Ctrl+E` / `⌘E` calls PDF export. Labeled in the editor pane chrome and on the PDF button title.
- Spellcheck toggle on the textarea (default off).
- Page breaks: `ResizeObserver` on the measurer and the pane. A block that fits moves whole, so a `##` is not sliced. A block taller than the content box continues on the next sheet. A small page index is rendered in each gap.

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
