import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/common/index.ts';
import { AppLayout } from '@/components/layout/index.ts';
import { NoteEditor } from '@/components/notes/index.ts';
import { useNoteStore } from '@/stores/noteStore.ts';
import { useUIStore } from '@/stores/uiStore.ts';

export default function App() {
  const loadNotes = useNoteStore((s) => s.loadNotes);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const notes = useNoteStore((s) => s.notes);
  const darkMode = useUIStore((s) => s.darkMode);

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
        {activeNote ? (
          <NoteEditor note={activeNote} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary dark:text-gray-500">
            <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">No note selected</p>
            <p className="text-sm mt-1">Select a note from the sidebar or create a new one</p>
          </div>
        )}
      </AppLayout>
    </ErrorBoundary>
  );
}
