import { useNoteStore } from '@/stores/noteStore.ts';
import { useUIStore } from '@/stores/uiStore.ts';
import { Button } from '@/components/common/index.ts';

export function Header() {
  const createNote = useNoteStore((s) => s.createNote);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const openSettings = useUIStore((s) => s.openSettings);

  const handleNewNote = () => {
    createNote({ title: 'Untitled', content: '', tags: [] });
  };

  const handleSeedNotes = async () => {
    const seedNotes = [
      {
        title: 'Personal Knowledge System',
        content:
          'I want a lightweight system for capturing ideas, linking them, and turning them into useful knowledge. The focus is on quick capture, clear summaries, and easy retrieval.',
      },
      {
        title: 'Hackathon Pitch Outline',
        content:
          'Problem: messy personal notes. Solution: AI-assisted notes with summaries and auto tags. Market: students, researchers, and product teams. Demo should show instant summaries.',
      },
      {
        title: 'UX Principles For Note Apps',
        content:
          'Speed and low friction matter most. Users should be able to write without syntax overhead. Auto suggestions should feel helpful, not noisy. Visual hierarchy keeps focus.',
      },
      {
        title: 'Project Milestones',
        content:
          'Week 1: MVP editor + storage. Week 2: AI summaries + tags. Week 3: auto links + graph view. Week 4: polish, onboarding, and demo prep.',
      },
      {
        title: 'Feature Ideas',
        content:
          'Daily notes, quick capture widget, backlinks, and a graph view. Also want a list of suggested connections based on semantic similarity.',
      },
      {
        title: 'Research Notes: Zettelkasten',
        content:
          'Zettelkasten is a method for writing and linking small notes to form a network of ideas. The value comes from connections and emergent insights.',
      },
      {
        title: 'Marketing Copy Draft',
        content:
          'Write once, remember forever. Capture thoughts fast and let AI organize the rest. Your ideas become a connected knowledge graph.',
      },
      {
        title: 'Engineering Checklist',
        content:
          'Add summarization service, handle API errors gracefully, and ensure data stays in IndexedDB. Test note creation and search.',
      },
      {
        title: 'Customer Interview Notes',
        content:
          'Users feel overwhelmed by messy notes. They want a system that surfaces related ideas automatically and keeps things organized without extra effort.',
      },
      {
        title: 'Demo Flow',
        content:
          'Create a note, watch summary + auto tags appear, then show suggested links. Finish with a short visual graph of note relationships.',
      },
    ];

    for (const note of seedNotes) {
      await createNote({ title: note.title, content: note.content, tags: [] });
    }
  };

  return (
    <header className="flex-shrink-0 h-14 flex items-center justify-between px-6 border-b-2 border-[#d4a574]/50 bg-[#1a0f0a] shadow-lg relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#2d1f14]/30 to-transparent pointer-events-none"></div>
      <div className="flex items-center gap-4 relative z-10">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded hover:bg-[#2d1f14] text-[#d4a574] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-serif font-bold text-[#e8dcc4] tracking-wide">
          <span className="text-[#d4a574]">Neural</span> Zettelkasten
        </h1>
      </div>

      <div className="flex items-center gap-2 relative z-10">
        <Button variant="secondary" size="sm" onClick={handleSeedNotes}>
          Seed Notes
        </Button>
        <Button variant="primary" size="sm" onClick={handleNewNote}>
          + New Note
        </Button>
        <button
          type="button"
          onClick={openSettings}
          aria-label="Settings"
          className={`p-2 rounded transition-colors ${
            settingsOpen
              ? 'bg-[#d4a574] text-[#1a0f0a]'
              : 'text-[#d4a574] hover:text-[#e8dcc4] hover:bg-[#2d1f14]'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
