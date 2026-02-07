# Hacklahoma (AI Context Brief - Extended)

## Purpose Of This Document
This README is for AI agents who will continue development. It prioritizes product intent, rules, current implementation, and open decisions. It is not a marketing README.

## One Sentence Summary
A notebook-themed Zettelkasten app where **tags become Chapters** once they appear on **5+ notes**, and the Map view visualizes notes and chapters as a living knowledge graph.

## Product Vision (Metaphor)
- The website is a **notebook**.
- Notes are **pages**.
- Tags are **ideas**.
- A tag that reaches the threshold becomes a **Chapter**.
- Chapters form the **structure** of the notebook and appear as clusters in the Map view.

## Core Rule (Chapters)
- A **Chapter** is created when a tag appears on **5 or more notes**.
- Chapters are not manually created by users.
- Chapters are expected to be stable groupings in the Map view.

## Views
- **Notes View** is the primary writing surface.
- **Map View** is the visual network of notes and chapters.

## User Expectations
- Users should write naturally without special syntax.
- AI should reduce friction by summarizing and tagging.
- Chapters should emerge only after an idea proves meaningful across multiple notes.
- The Map view should feel like a living, scholarly notebook.

## Current Implementation State
- Stack: React + Vite + TypeScript + Tailwind v4.
- Storage: IndexedDB with Dexie.
- State management: Zustand.
- AI: Gemini-backed summaries and auto tags, with local heuristic fallback.
- Manual wiki links: `[[Title]]` are supported but **not auto-generated**.
- Summary tab exists in the editor.
- `Seed Notes` button creates 10 example notes.

## Data Model
### Note (`src/types/note.ts`)
- `id: string`
- `title: string`
- `content: string`
- `tags: string[]` (manual)
- `autoTags?: string[]` (AI)
- `summary?: string` (AI)
- `embedding?: number[]` (reserved for future)
- `createdAt: Date`
- `modifiedAt: Date`

### NoteLink (`src/types/note.ts`)
- `sourceId: string`
- `targetId: string`
- `context?: string`

### Graph Types (`src/types/graph.ts`)
- `GraphNode` and `GraphEdge` exist but are **not wired**.

## Persistence (Dexie)
- DB: `NeuralZettelkastenDB` in `src/db/database.ts`.
- Tables:
  - `notes`: `id, title, *tags, createdAt, modifiedAt`
  - `noteLinks`: `[sourceId+targetId], sourceId, targetId`

## State Stores
- `useNoteStore` (`src/stores/noteStore.ts`)
  - CRUD, search, active note, loading state.
- `useUIStore` (`src/stores/uiStore.ts`)
  - Dark mode, sidebar, editor mode.

## Services
- `noteService` (`src/services/noteService.ts`)
  - create/update/delete/search.
  - syncs wiki links.
  - enriches notes via AI summary + auto tags.
- `aiService` (`src/services/aiService.ts`)
  - calls Gemini API if key exists.
  - falls back to heuristic when key missing.
  - enforces **3–5 theme-level tags**.

## AI Contract (Summaries + Auto Tags)
- Gemini prompt requires JSON:
  - `{"summary":"...","autoTags":["..."]}`
- Summary: 1–2 sentences, <= 240 chars.
- Auto tags: 3–5, lowercase, theme-level.
- Avoid incidental details and proper nouns unless central.

## Environment
- `.env.local`:
  - `VITE_GEMINI_API_KEY=...`
  - `VITE_GEMINI_MODEL=gemini-2.5-flash` (optional)

## How To Run
```bash
cd /Users/garrettfalast/Documents/Hacklahoma/hacklahoma
npm install
npm run dev
```

## Thematic Direction
- Dark academia aesthetic for Map view.
- Visual language should resemble ink, parchment, brass, and scholarly artifacts.
- The Map view should feel like a **codex** or **library ledger**.

## Planned Map View Semantics
- Nodes represent **notes**.
- Chapters are **clusters** that appear after a tag reaches 5 notes.
- Clusters should branch visually from the central mass.

## Open Decisions (Must Resolve)
- Chapter counting source: manual tags only, auto tags only, or both?
- Chapter persistence: if a tag drops below 5, should the chapter vanish or stay pinned?
- Auto-linking behavior: suggested links panel, preview-only auto-links, or insert `[[...]]` into content?

## Next Implementation Steps
1. Add **chapter computation** backend (service + store).
2. Add **similarity logic** for suggested links.
3. Build **Map view UI** once backend logic is stable.

## Potential Chapter Computation (Draft)
Input: all notes
Output: list of chapters

Rules:
- Count tags across notes.
- Include only tags with count >= 5.
- Each chapter includes `tag`, `count`, `noteIds`.

## Suggested Link Computation (Draft)
Option A: Heuristic
- Use overlap between autoTags, manual tags, title tokens, summary tokens.
- Rank by overlap score.

Option B: Embeddings
- Store embedding per note.
- Compute cosine similarity.

## UX Flow (Notes)
- User creates note.
- AI summarizes + tags.
- Note appears in list with tags.
- If a tag reaches 5 notes, it becomes a Chapter in Map view.

## UX Flow (Map)
- Map opens to a central cluster of notes.
- Chapters branch out as separate clusters.
- Clicking a node opens the note.

## Known Constraints
- Frontend only; Gemini API key is in client.
- Production should move AI calls to a backend proxy.

## Seed Notes
- `Seed Notes` button creates 10 notes with empty manual tags.
- AI generates summaries and auto tags.

## Glossary
- **Note**: a single page of content.
- **Tag**: a theme or idea assigned to a note.
- **Chapter**: a tag with >= 5 notes.
- **Map View**: a visual graph of notes + chapters.

## Non-Goals (For Now)
- No server-side auth.
- No multi-user sync.
- No export/import pipeline.

## File Map (Key Files)
- `src/App.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/components/notes/NoteEditor.tsx`
- `src/components/notes/NoteList.tsx`
- `src/components/notes/MarkdownPreview.tsx`
- `src/services/aiService.ts`
- `src/services/noteService.ts`
- `src/stores/noteStore.ts`
- `src/db/database.ts`

## File Structure
```zettel-neural/
├─ README.md
├─ index.html
├─ package.json
├─ package-lock.json
├─ .gitignore
├─ eslint.config.js
├─ vite.config.ts
├─ tsconfig.json
├─ tsconfig.app.json
├─ tsconfig.node.json
│
├─ public/
│  └─ vite.svg
│
├─ src/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ index.css
│  ├─ vite-env.d.ts
│  ├─ assets/
│  ├─ db/
│  │  └─ database.ts
│  ├─ hooks/
│  │  └─ useDebounce.ts
│  ├─ services/
│  │  ├─ aiService.ts
│  │  └─ noteService.ts
│  ├─ stores/
│  │  ├─ noteStore.ts
│  │  └─ uiStore.ts
│  ├─ utils/
│  │  ├─ idGenerator.ts
│  │  └─ wikiLinkParser.ts
│  ├─ types/
│  │  ├─ ai.ts
│  │  ├─ graph.ts
│  │  ├─ index.ts
│  │  └─ note.ts
│  └─ components/
│     ├─ common/
│     │  ├─ Button.tsx
│     │  ├─ ErrorBoundary.tsx
│     │  ├─ LoadingSpinner.tsx
│     │  ├─ Modal.tsx
│     │  └─ index.ts
│     ├─ layout/
│     │  ├─ AppLayout.tsx
│     │  ├─ Header.tsx
│     │  ├─ Sidebar.tsx
│     │  └─ index.ts
│     └─ notes/
│        ├─ MarkdownPreview.tsx
│        ├─ NoteEditor.tsx
│        ├─ NoteList.tsx
│        ├─ NoteListItem.tsx
│        ├─ SearchBar.tsx
│        ├─ TagInput.tsx
│        └─ index.ts
│
├─ dist/
│  ├─ index.html
│  ├─ vite.svg
│  └─ assets/
│     ├─ index-DkF0ufhG.js
│     └─ index-CdBC0FoV.css
│
├─ node_modules/
└─ .git/
```

## What Must Be Preserved
- The notebook + chapters metaphor is core.
- Chapters emerge only after the 5‑note threshold.
- Notes remain the primary user entry point.
