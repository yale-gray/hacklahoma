import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/common/index.ts';
import { AppLayout } from '@/components/layout/index.ts';
import { NoteEditor } from '@/components/notes/index.ts';
import { MapView } from '@/components/map/index.ts';
import { KnowledgeChat } from '@/components/search/index.ts';
import { TemporalGraph } from '@/components/temporal/index.ts';
import { ArgumentMapper } from '@/components/arguments/index.ts';
import { ReadingImporter } from '@/components/reading/index.ts';
import { useNoteStore } from '@/stores/noteStore.ts';
import { useUIStore } from '@/stores/uiStore.ts';

export default function App() {
  const loadNotes = useNoteStore((s) => s.loadNotes);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const notes = useNoteStore((s) => s.notes);
  const darkMode = useUIStore((s) => s.darkMode);
  const currentView = useUIStore((s) => s.currentView);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;

  return (
    <ErrorBoundary>
      <AppLayout>
        {currentView === 'graph' ? (
          <MapView />
        ) : currentView === 'search' ? (
          <KnowledgeChat />
        ) : currentView === 'temporal' ? (
          <TemporalGraph />
        ) : currentView === 'arguments' ? (
          <ArgumentMapper />
        ) : currentView === 'reading' ? (
          <ReadingImporter />
        ) : activeNote ? (
          <NoteEditor note={activeNote} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-[#1a1612] text-[#b8a88a]">
            <svg className="w-20 h-20 mb-6 text-[#d4a574]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-serif font-medium text-[#e8dcc4]">No Manuscript Selected</p>
            <p className="text-sm mt-2 font-serif italic">Select a tome from your library or begin a new work</p>
          </div>
        )}
      </AppLayout>
    </ErrorBoundary>
  );
}
