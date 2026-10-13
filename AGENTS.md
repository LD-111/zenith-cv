# Zenith CV — Agent Memory (Root)

> This is the canonical **root** system memory for AI assistant interactions on the repository.
> Detailed implementation, architecture, and feature docs live in nested `AGENTS.md` files to keep token usage low and context focused.

## Project

**Zenith CV** — Privacy-first, self-contained Markdown-to-PDF resume builder.

- All CV data lives as plain `.md` files (Local mode) or session memory (Sandbox mode).
- No cloud. No persistent DB. No cookies for content.
- Runs entirely client-side after load.

## High-Level Tech Stack

| Item          | Value                                      |
|---------------|--------------------------------------------|
| Framework     | Next.js 16 (App Router)                    |
| Language      | TypeScript 5 (strict)                      |
| Styling       | Tailwind CSS 4 (`@import "tailwindcss"`)   |
| Markdown      | `react-markdown` + `remark-gfm`            |
| PDF           | `@react-pdf/renderer` (text-based, ATS-safe) |
| Runtime       | React 19, Node 20+                         |
| Package Mgr   | npm                                        |
| Linter        | ESLint 9 (flat config)                     |

See `zenith-cv/package.json` for exact versions.

## Workspace Layout

```
c:\Projects\zenith-cv\
├── AGENTS.md                 ← YOU ARE HERE (root/meta)
├── README.md
├── zenith-cv/                ← The Next.js application (primary code)
│   ├── AGENTS.md             ← App-level architecture, modes, features
│   ├── src/
│   │   ├── lib/AGENTS.md     ← Core libs: FS, virtual store, PDF, templates, hooks
│   │   └── app/AGENTS.md     ← UI: dashboard, editor, layout, CSS
│   └── ...
└── ...
```

## Agent Memory Tree & Usage

**To reduce context tokens and improve accuracy:**

1. Read this root file.
2. Read the closest/most specific `AGENTS.md` for the files or area you will touch.
3. Use `Read`, `Grep`, `Glob` tools on actual source for implementation truth — AGENTS.md are living supplements.

Relevant drill-down examples:
- Adding/changing storage or PDF logic → `zenith-cv/src/lib/AGENTS.md`
- Dashboard phases, create/rename UI, overall flow → `zenith-cv/AGENTS.md` + `zenith-cv/src/app/AGENTS.md`
- Editor autosave/rename/PDF button/mode detection → `zenith-cv/src/app/AGENTS.md` (and `editor/AGENTS.md` if present)
- Next.js / Tailwind / layout changes → `zenith-cv/AGENTS.md` + `src/app/AGENTS.md`

Sub-AGENTS.md contain the detailed tables, diagrams, function lists, and "working state" that used to be in one giant file.

## Mandatory Update Rule (Critical)

**After you make ANY code change** (feature, fix, refactor, new component, API addition, behavior tweak, file addition/deletion, config change that affects agents, etc.):

- Locate the **most pertinent AGENTS.md** (usually the one inside the directory containing the modified file(s), falling back up the tree).
- **Edit it right away** as part of the same task.
  - Update function tables, add implementation notes, revise "Current Features" / "Working State", remove obsolete "Next Steps", document new error paths, mode interactions, etc.
  - If the change has cross-cutting impact, update parent AGENTS.md files too.
- Commit / save the AGENTS change together with the code change.
- Purpose: Future agents get correct, concise context without re-deriving everything or reading stale monolithic docs. Violating this bloats future sessions.

When in doubt, update the file that would have been most useful to have read before making the change.

## General Conventions (All Code)

- Mimic existing style, imports, naming exactly.
- Strict TypeScript — no `any` unless unavoidable and typed.
- Mark client components with `"use client"` at top.
- For `useEffect` + `setState`: wrap in `startTransition(() => setX(...))` to satisfy `react-hooks/set-state-in-effect`.
- **Do not add comments to source code** unless the user task explicitly asks for them.
- Module state ( `_dirHandle`, `_store` Map ) is intentional — lives for tab session.
- IDs/slugs: local = filename sans .md ; virtual = `virtual_<ts>_<rand>`
- Always handle SSR for window/browser APIs.
- Prefer dynamic imports for heavy libs (e.g. pdf-export).
- UI is dark-themed; preview pane stays light for fidelity.
- No external storage in production paths.
- When creating new files or modals, follow the 3-template selector pattern, sanitization, duplicate checks, etc.
- Run `npm run lint` after changes when possible.

## ESLint Specific

- Uses flat config + next configs.
- The set-state-in-effect rule is enforced; use `startTransition`.

## Other

- The previous monolithic AGENTS.md was split (circa 2026-10) precisely to support scalable future agentic development.
- AGENTS.md files are for AI consumption primarily; keep them technical, concise, accurate, and up-to-date.
- Always prefer actual source + tools over memory docs when implementing.

For app-specific architecture and current feature status, proceed to `zenith-cv/AGENTS.md`.
