import { useNoteStore } from '@/stores/noteStore.ts';
import { useUIStore } from '@/stores/uiStore.ts';
import { LoadingSpinner } from '@/components/common/index.ts';
import type { Note } from '@/types/index.ts';

function BookSpine({ note, isActive, onClick }: { note: Note; isActive: boolean; onClick: () => void }) {
  const colorIndex = note.bookColor !== undefined
    ? note.bookColor
    : note.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 6;

  // Vary height slightly for realism
  const heightVariant = (note.id.charCodeAt(0) % 3);
  const heights = ['h-[120px]', 'h-[130px]', 'h-[115px]'];
  // Vary width slightly
  const widthVariant = (note.id.charCodeAt(1) ?? 0) % 3;
  const widths = ['w-[38px]', 'w-[42px]', 'w-[34px]'];

  return (
    <button
      onClick={onClick}
      className={`group relative flex-shrink-0 ${widths[widthVariant]} ${heights[heightVariant]} shelf-book shelf-book-color-${colorIndex} ${
        isActive ? 'active' : ''
      }`}
      title={note.title || 'Untitled'}
    >
      {/* Gold foil title */}
      <span className="shelf-book-title">
        {note.title || 'Untitled'}
      </span>
      {/* Decorative line near top */}
      <span className="shelf-book-ornament-top" />
      {/* Decorative line near bottom */}
      <span className="shelf-book-ornament-bottom" />
    </button>
  );
}

export function TagGroupList() {
  const notes = useNoteStore((s) => s.notes);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const isLoading = useNoteStore((s) => s.isLoading);
  const groupingMinSize = useUIStore((s) => s.groupingMinSize);

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

  const tagMap = new Map<string, Note[]>();

  for (const note of notes) {
    const allTags = [...note.tags, ...(note.autoTags ?? [])];
    const uniqueTags = [...new Set(allTags)];
    if (!uniqueTags.length) continue;
    for (const tag of uniqueTags) {
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

  if (sortedTags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-sm text-[#b8a88a] font-serif">No groupings yet</p>
        <p className="text-xs text-[#b8a88a]/60 mt-2 font-serif italic">
          Tags appear after they are used on at least {groupingMinSize} notes
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1 py-2">
      {sortedTags.map((tag) => {
        const items = tagMap.get(tag) ?? [];
        return (
          <div key={tag} className="mb-1">
            {/* Shelf label */}
            <div className="shelf-label">
              <span className="shelf-label-text">{tag}</span>
              <span className="shelf-label-count">{items.length}</span>
            </div>
            {/* Bookshelf row */}
            <div className="shelf-row">
              <div className="shelf-books">
                {items.map((note) => (
                  <BookSpine
                    key={`${tag}-${note.id}`}
                    note={note}
                    isActive={note.id === activeNoteId}
                    onClick={() => setActiveNote(note.id)}
                  />
                ))}
              </div>
              {/* Wooden shelf plank */}
              <div className="shelf-plank" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
