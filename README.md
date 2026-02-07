# Hacklahoma

## Concept
This project is a note‑taking app built around the metaphor of a **notebook**. Users write notes as normal. Ideas emerge through tags, and once a tag appears in **5 or more notes**, it becomes a **Chapter**. Chapters are the main groupings in the Map view, visualized as branching bubbles in the notebook.

## Views
- **Notes View**: Primary writing experience. Users create and edit notes here.
- **Map View**: The notebook map. Chapters branch off when tags reach the 5‑note threshold, revealing the structure of the knowledge network.

## Tag Logic (Chapters)
- Tags represent ideas/themes.
- A tag becomes a **Chapter** when it is used on **5+ notes**.
- Chapters group related notes and appear as distinct branches/bubbles in the Map view.

## Theme
The app is a living notebook:
- Notes are pages.
- Tags are ideas.
- Chapters are the book’s structure.
Everything in the UI reinforces the **chapters and books** metaphor.

## Current State (Implementation)
- **Notes app is live**: React + Vite + TypeScript + Tailwind. Notes are stored in IndexedDB (Dexie).
- **AI summaries + auto tags** are generated on note create/update via `src/services/aiService.ts`.
  - Uses Gemini API when `VITE_GEMINI_API_KEY` is set.
  - Falls back to a local heuristic if the key is missing/placeholder.
  - Auto tags are constrained to **3–5** theme‑level tags.
- **Manual tags** are still supported via `TagInput`.
- **Manual wiki links** exist via `[[Title]]` syntax (no auto‑linking yet).
- **Summary tab** exists in the editor, showing AI summary + auto tags.
- **Seed Notes** button creates 10 example notes (tags are AI‑generated).

## Environment
- `.env.local` should contain:
  - `VITE_GEMINI_API_KEY=...`
  - `VITE_GEMINI_MODEL=gemini-2.5-flash` (optional)

## Open Decisions (For Next Agent)
- **Chapter counting**: Should chapters be computed from manual tags only, auto tags only, or both?
- **Chapter persistence**: If a tag drops below 5 notes later, should its chapter disappear or remain pinned?
- **Auto‑linking**: Decide whether to show suggested links, auto‑link in preview, or insert `[[...]]` into content.

## Next Steps
1. Build **chapter backend logic** (service/store) so Map view can consume it.
2. Define **similarity logic** for suggested links (heuristic vs embeddings).
3. Implement **Map view** once the backend logic is locked.
