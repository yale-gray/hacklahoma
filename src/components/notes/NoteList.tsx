import { useEffect, useMemo, useState } from 'react';
import { useNoteStore } from '@/stores/noteStore.ts';
import { useUIStore } from '@/stores/uiStore.ts';
import { NoteListItem } from './NoteListItem.tsx';
import { LoadingSpinner, Button } from '@/components/common/index.ts';

export function NoteList() {
  const notes = useNoteStore((s) => s.notes);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const isLoading = useNoteStore((s) => s.isLoading);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const currentView = useUIStore((s) => s.currentView);
  const setView = useUIStore((s) => s.setView);
  const triggerPageSlideUp = useUIStore((s) => s.triggerPageSlideUp);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const selectedCount = selectedIds.size;
  const selectedLabel = selectedCount === 1 ? '1 selected' : `${selectedCount} selected`;
  const allNoteIds = useMemo(() => notes.map((note) => note.id), [notes]);

  useEffect(() => {
    if (selectedIds.size === 0) return;
    const noteIdSet = new Set(allNoteIds);
    setSelectedIds((prev) => new Set([...prev].filter((id) => noteIdSet.has(id))));
  }, [allNoteIds, selectedIds.size]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === notes.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(allNoteIds));
  };

  const handleToggleSelectionMode = () => {
    setSelectionMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedIds(new Set());
      }
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const confirmMessage = `Delete ${selectedIds.size} selected note${selectedIds.size === 1 ? '' : 's'}?`;
    if (!window.confirm(confirmMessage)) return;

    for (const id of selectedIds) {
      await deleteNote(id);
    }
    setSelectedIds(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <svg className="w-16 h-16 text-[#d4a574]/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-[#b8a88a] font-serif">Empty Library</p>
        <p className="text-xs text-[#b8a88a]/60 mt-2 font-serif italic">Begin your collection of knowledge</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1 pt-2 shelf-background">
      {notes.length > 0 && (
        <div className="sticky top-0 z-10 bg-[#3d2817] border-b-2 border-[#d4a574]/30 px-3 py-2 flex items-center gap-2 -mt-2">
          {selectionMode ? (
            <>
              <button
                onClick={handleSelectAll}
                className="text-[11px] font-serif uppercase tracking-wide text-[#b8a88a] hover:text-[#d4a574]"
              >
                {selectedIds.size === notes.length ? 'Clear all' : 'Select all'}
              </button>
              <span className="text-[11px] font-serif text-[#b8a88a] ml-auto">
                {selectedLabel}
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
              >
                Delete Selected
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleSelectionMode}
              >
                Done
              </Button>
            </>
          ) : (
            <>
              <span className="text-[11px] font-serif text-[#b8a88a]">
                {notes.length} book{notes.length === 1 ? '' : 's'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleSelectionMode}
                className="ml-auto"
              >
                Select
              </Button>
            </>
          )}
        </div>
      )}
      <div className="book-pile">
        {notes.map((note) => (
          <NoteListItem
            key={note.id}
            note={note}
            isActive={note.id === activeNoteId}
            onClick={() => {
              setActiveNote(note.id);
              if (currentView !== 'editor') {
                triggerPageSlideUp();
                setView('editor');
              }
            }}
            selectable={selectionMode}
            selected={selectionMode ? selectedIds.has(note.id) : false}
            onSelectToggle={selectionMode ? (checked) => toggleSelect(note.id, checked) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
