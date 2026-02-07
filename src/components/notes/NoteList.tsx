import { useEffect, useMemo, useState } from 'react';
import { useNoteStore } from '@/stores/noteStore.ts';
import { NoteListItem } from './NoteListItem.tsx';
import { LoadingSpinner, Button } from '@/components/common/index.ts';

export function NoteList() {
  const notes = useNoteStore((s) => s.notes);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const isLoading = useNoteStore((s) => s.isLoading);
  const deleteNote = useNoteStore((s) => s.deleteNote);
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
      {notes.length > 0 && (
        <div className="sticky top-0 z-10 bg-bg-sidebar dark:bg-gray-800 border-b border-border dark:border-gray-700 px-3 py-2 flex items-center gap-2">
          {selectionMode ? (
            <>
              <button
                onClick={handleSelectAll}
                className="text-[11px] uppercase tracking-wide text-text-secondary dark:text-gray-400 hover:text-text-primary"
              >
                {selectedIds.size === notes.length ? 'Clear all' : 'Select all'}
              </button>
              <span className="text-[11px] text-text-secondary dark:text-gray-400 ml-auto">
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
              <span className="text-[11px] text-text-secondary dark:text-gray-400">
                {notes.length} note{notes.length === 1 ? '' : 's'}
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
      {notes.map((note) => (
        <NoteListItem
          key={note.id}
          note={note}
          isActive={note.id === activeNoteId}
          onClick={() => setActiveNote(note.id)}
          selectable={selectionMode}
          selected={selectionMode ? selectedIds.has(note.id) : false}
          onSelectToggle={selectionMode ? (checked) => toggleSelect(note.id, checked) : undefined}
        />
      ))}
    </div>
  );
}
