import { useState } from 'react';
import { useNoteStore } from '@/stores/noteStore.ts';
import { useUIStore } from '@/stores/uiStore.ts';
import { Button } from '@/components/common/index.ts';
import { aiService } from '@/services/aiService.ts';

export function Header() {
  const createNote = useNoteStore((s) => s.createNote);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const currentView = useUIStore((s) => s.currentView);
  const setView = useUIStore((s) => s.setView);
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const openSettings = useUIStore((s) => s.openSettings);

  const handleNewNote = () => {
    createNote({ title: 'Untitled', content: '', tags: [] });
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateNote = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const draft = await aiService.generateRandomNote();
      await createNote({ title: draft.title || 'Untitled', content: draft.content, tags: [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate note.';
      console.error(message);
      window.alert(`Could not generate note: ${message}`);
    } finally {
      setIsGenerating(false);
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
        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={() => setView('editor')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              currentView === 'editor'
                ? 'bg-[#d4a574] text-[#1a0f0a]'
                : 'text-[#d4a574] hover:text-[#e8dcc4] hover:bg-[#2d1f14]'
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => setView('graph')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              currentView === 'graph'
                ? 'bg-[#d4a574] text-[#1a0f0a]'
                : 'text-[#d4a574] hover:text-[#e8dcc4] hover:bg-[#2d1f14]'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setView('search')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              currentView === 'search'
                ? 'bg-[#d4a574] text-[#1a0f0a]'
                : 'text-[#d4a574] hover:text-[#e8dcc4] hover:bg-[#2d1f14]'
            }`}
          >
            Search
          </button>
          <button
            onClick={() => setView('temporal')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              currentView === 'temporal'
                ? 'bg-[#d4a574] text-[#1a0f0a]'
                : 'text-[#d4a574] hover:text-[#e8dcc4] hover:bg-[#2d1f14]'
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 relative z-10">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleGenerateNote}
          loading={isGenerating}
        >
          Generate New Note
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
