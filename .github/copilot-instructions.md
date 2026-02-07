# AI Coding Instructions for Zettel Neural

A React-based note-taking app with wiki-link graph navigation built with IndexedDB for offline-first local storage.

## Architecture Overview

**Core Data Layer**: [src/db/database.ts](src/db/database.ts) defines `NeuralZettelkastenDB` using Dexie (IndexedDB wrapper). Two tables:
- `notes`: keyed by `id`, indexed on `title`, `*tags`, `createdAt`, `modifiedAt`
- `noteLinks`: compound key `[sourceId+targetId]`, indexed on both

**State Management**: Two Zustand stores:
- [src/stores/noteStore.ts](src/stores/noteStore.ts) - note CRUD, search, active note selection
- [src/stores/uiStore.ts](src/stores/uiStore.ts) - UI state (dark mode, panels)

**Service Layer**: [src/services/noteService.ts](src/services/noteService.ts) orchestrates business logic:
- Creates notes with automatic ID generation (`YYYYMMDDHHMMSSMM` format)
- **Critical**: Wiki link extraction on every note create/update via `syncNoteLinks()`
- Parses `[[Title]]` syntax from content, resolves to note IDs, syncs to `noteLinks` table

**Component Structure**:
- `components/layout/` - AppLayout (main grid), Header, Sidebar
- `components/notes/` - NoteEditor, NoteList, NoteListItem, MarkdownPreview, SearchBar, TagInput
- `components/common/` - ErrorBoundary, Modal, Button, LoadingSpinner

**Key Pattern**: Wiki link resolution uses title-to-ID mapping. Note that `targetId` starts as title text from content, then gets resolved to actual ID in `syncNoteLinks()`. Unresolved links preserve original targetId (the title).

## Developer Workflow

**Local Development**:
```bash
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # TypeScript check + Vite build to dist/
npm run lint     # ESLint check
npm run preview  # Build output preview
```

**Database**: IndexedDB `NeuralZettelkastenDB` persists locally. No backend API - all ops are synchronous or DB-transaction wrapped. Tests use live IndexedDB.

## Conventions & Patterns

**File Organization**: 
- Barrel exports in `components/*/index.ts` and `types/index.ts`
- Path alias `@/` maps to `src/`
- Service layer handles DB transactions; stores dispatch via service methods

**Wiki Link Parsing**:
- Regex: `/\[\[([^\]]+)\]\]/g` extracts titles from `[[Title]]`
- [src/utils/wikiLinkParser.ts](src/utils/wikiLinkParser.ts) exports `extractWikiLinks()` (used by noteService) and `getWikiLinkTitles()` (used by components)
- Note: Parser adds context (50 chars before/after link) for potential graph visualization

**Type System**:
- Core types: [src/types/note.ts](src/types/note.ts) (Note, NoteLink, inputs)
- [src/types/ai.ts](src/types/ai.ts) and [src/types/graph.ts](src/types/graph.ts) prepared for future AI/graph features (currently unused)
- All date fields are actual `Date` objects (not strings)

**State Updates**:
- Zustand immer middleware enables immutable patterns (spread operators)
- Error handling: catch in store methods, set error state, throw to caller
- Loading states managed per-operation, not global

**Styling**: Tailwind CSS with dark mode support (class-based, toggled via `document.documentElement.classList`)

## Important Implementation Notes

- **No backend**: Database is purely client-side IndexedDB. All "sync" means DB-local transactions.
- **Debouncing**: [src/hooks/useDebounce.ts](src/hooks/useDebounce.ts) for search/input fields
- **Link Graph**: NoteLinks table enables future graph visualization/traversal. Currently not rendered in UI.
- **ID Generation**: Uses [src/utils/idGenerator.ts](src/utils/idGenerator.ts) - timestamp-based for uniqueness
- **Markdown Rendering**: `react-markdown` with `remark-gfm` and `remark-wiki-link` plugins. Note: wiki links in markdown may require custom plugin configuration
- **Component Error Handling**: [src/components/common/ErrorBoundary.tsx](src/components/common/ErrorBoundary.tsx) catches React tree errors

## Testing & Debugging

- ESLint configured with React hooks plugin
- No unit tests currently; validation happens at service/store layer
- Browser DevTools: IndexedDB inspection via Application tab (database: `NeuralZettelkastenDB`)
