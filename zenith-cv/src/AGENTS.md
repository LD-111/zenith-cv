# src/ — Source Tree (Zenith CV)

## Layout
```
src/
├── lib/          ← Pure modules + state (see lib/AGENTS.md)
│   ├── fs-access.ts
│   ├── virtual-store.ts
│   ├── pdf-export.tsx
│   ├── templates.ts
│   ├── use-fs-support.ts
│   └── storage.ts (legacy)
└── app/          ← Next.js App Router UI (see app/AGENTS.md)
    ├── layout.tsx
    ├── globals.css
    ├── page.tsx (Dashboard)
    └── editor/
        └── [id]/page.tsx (Editor)
            (see editor/AGENTS.md)
```

## Guidelines for src/
- lib/ changes require updating both local and virtual paths for parity.
- app/ changes should consider both Local and Sandbox modes.
- No server components or API routes currently — everything client.

Drill down to the sub `AGENTS.md` files for details.

See root and zenith-cv/ AGENTS.md for higher rules and architecture.
