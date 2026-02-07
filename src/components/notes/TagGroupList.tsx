import { useState } from 'react';
import { useNoteStore } from '@/stores/noteStore.ts';
import { useUIStore } from '@/stores/uiStore.ts';
import { NoteListItem } from './NoteListItem.tsx';
import { LoadingSpinner } from '@/components/common/index.ts';

export function TagGroupList() {
  const notes = useNoteStore((s) => s.notes);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const isLoading = useNoteStore((s) => s.isLoading);
  const groupingMinSize = useUIStore((s) => s.groupingMinSize);
  const [collapsedTags, setCollapsedTags] = useState<Record<string, boolean>>({});

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

  const tagMap = new Map<string, typeof notes>();

  for (const note of notes) {
    if (!note.tags.length) continue;
    for (const tag of note.tags) {
      const existing = tagMap.get(tag);
      if (existing) {
        existing.push(note);
      } else {
        tagMap.set(tag, [note]);
      }
    }
  }

  const sortedTags = [...tagMap.keys()]
    .filter((tag) => (tagMap.get(tag)?.length ?? 0) >= groupingMinSize)
    .sort((a, b) => a.localeCompare(b));

  const toggleTag = (tag: string) => {
    setCollapsedTags((prev) => ({ ...prev, [tag]: !prev[tag] }));
  };

  if (sortedTags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <p className="text-sm text-text-secondary">No groupings yet</p>
        <p className="text-xs text-text-secondary/70 mt-1">
          Tags appear after they are used on at least {groupingMinSize} notes
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1">
      {sortedTags.map((tag) => {
        const items = tagMap.get(tag) ?? [];
        const isCollapsed = collapsedTags[tag] ?? false;
        return (
          <div key={tag} className="border-b border-border dark:border-gray-700">
            <button
              onClick={() => toggleTag(tag)}
              className="w-full px-3 py-2 text-[11px] uppercase tracking-wide text-text-secondary dark:text-gray-400 flex items-center justify-between hover:text-text-primary"
            >
              <span>{tag} ({items.length})</span>
              <svg
                className={`w-3 h-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {!isCollapsed && items.map((note) => (
              <NoteListItem
                key={`${tag}-${note.id}`}
                note={note}
                isActive={note.id === activeNoteId}
                onClick={() => setActiveNote(note.id)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
