import { useNoteStore } from '@/stores/noteStore.ts';
import { NoteListItem } from './NoteListItem.tsx';
import { LoadingSpinner } from '@/components/common/index.ts';

export function NoteList() {
  const notes = useNoteStore((s) => s.notes);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const isLoading = useNoteStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <svg className="w-12 h-12 text-text-secondary/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-text-secondary">No notes yet</p>
        <p className="text-xs text-text-secondary/70 mt-1">Create your first note to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1">
      {notes.map((note) => (
        <NoteListItem
          key={note.id}
          note={note}
          isActive={note.id === activeNoteId}
          onClick={() => setActiveNote(note.id)}
        />
      ))}
    </div>
  );
}
