<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Architecture Overview

Zenith CV is a Next.js application for creating and editing resumes in Markdown format with PDF export capabilities. The app supports two modes:

1. **Local File Mode**: Files are stored directly on the user's computer using the File System Access API (Chrome/Edge only)
2. **Web Sandbox Mode**: Files are stored in session memory, lost on page refresh

### Project Structure

- `src/app/page.tsx` - Home dashboard showing all CVs and file management UI
- `src/app/editor/[id]/page.tsx` - Main editor with split-panel Markdown editor and live preview
- `src/lib/fs-access.ts` - File system operations for local mode (read, write, delete, rename files)
- `src/lib/virtual-store.ts` - In-memory storage for web sandbox mode
- `src/lib/pdf-export.tsx` - PDF export functionality
- `src/lib/templates.ts` - Default CV templates

### Key Features

- **Rename Files**: Users can rename CVs from both the homescreen cards and the editor header
  - Local files are renamed via the File System Access API
  - Virtual files (sandbox mode) update their name in memory
  - Input validation prevents empty names and file conflicts
  - Rename UI is intuitive with inline editing and keyboard shortcuts (Enter to save, Escape to cancel)

- **File Operations**: Create, read, write, delete, and rename Markdown files
- **Auto-save**: Changes are automatically saved with debouncing (500ms)
- **PDF Export**: Download CVs as formatted PDFs
- **Templates**: Pre-made templates for Software Engineers and Product Managers

### Rename Feature Implementation

#### Backend Functions

**fs-access.ts**:
- `renameMdFile(oldFileName: string, newFileName: string)` - Renames files on disk by reading the old file's content and writing it to a new file name, then deleting the old file

**virtual-store.ts**:
- `updateVirtualCVName(id: string, newName: string)` - Updates the name and fileName of a virtual CV in memory

#### Frontend UI

**Homescreen (page.tsx)**:
- FileCard component: Rename button appears on hover, opens inline editor when clicked
- VirtualFileCard component: Same rename UI for sandbox mode files
- Rename input shows `.md` extension display, validates input before confirming

**Editor (editor/[id]/page.tsx)**:
- Rename pencil icon (✎) next to the file name in the header
- Inline editing with input field, Save and Cancel buttons
- Error display for invalid names or conflicts
- Works in both local and sandbox modes

### Development Notes

- All state management uses React hooks (useState, useCallback, useRef)
- Server Transition API is used for optimistic UI updates
- The app uses Tailwind CSS for styling
- Keyboard shortcuts: Enter to confirm, Escape to cancel in rename mode
- Rename errors are displayed inline and cleared when user starts new input

