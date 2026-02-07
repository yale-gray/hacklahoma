import { useNoteStore } from '@/stores/noteStore.ts';
import { useUIStore } from '@/stores/uiStore.ts';
import { Button } from '@/components/common/index.ts';

export function Header() {
  const createNote = useNoteStore((s) => s.createNote);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const toggleDarkMode = useUIStore((s) => s.toggleDarkMode);
  const darkMode = useUIStore((s) => s.darkMode);

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
    <header className="flex-shrink-0 h-12 flex items-center justify-between px-4 border-b border-border dark:border-gray-700 bg-bg-primary dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-bg-secondary dark:hover:bg-gray-700 text-text-secondary"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-sm font-bold text-text-primary dark:text-gray-100">
          <span className="text-accent">Neural</span> Zettelkasten
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleDarkMode}
          className="p-1.5 rounded-md hover:bg-bg-secondary dark:hover:bg-gray-700 text-text-secondary"
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
        <Button variant="secondary" size="sm" onClick={handleSeedNotes}>
          Seed Notes
        </Button>
        <Button variant="primary" size="sm" onClick={handleNewNote}>
          + New Note
        </Button>
      </div>
    </header>
  );
}
