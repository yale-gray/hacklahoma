import { formatDistanceToNow } from 'date-fns';
import type { Note } from '@/types/index.ts';

interface NoteListItemProps {
  note: Note;
  isActive: boolean;
  onClick: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectToggle?: (checked: boolean) => void;
}

export function NoteListItem({
  note,
  isActive,
  onClick,
  selectable = false,
  selected = false,
  onSelectToggle,
}: NoteListItemProps) {
  const timeAgo = formatDistanceToNow(new Date(note.modifiedAt), { addSuffix: true });
  const combinedTags = [...note.tags, ...(note.autoTags ?? [])];
  const uniqueTags = [...new Set(combinedTags)];

  // Use custom color if set, otherwise assign a consistent color based on note ID
  const colorIndex = note.bookColor !== undefined
    ? note.bookColor
    : note.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 6;

  return (
    <div className="flex items-start gap-2 px-2 mb-3">
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelectToggle?.(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 h-3.5 w-3.5 rounded border-[#d4a574]/50 bg-[#1a1612] text-[#d4a574] focus:ring-[#d4a574]"
          aria-label={`Select note ${note.title || 'Untitled'}`}
        />
      )}
      <button
        onClick={onClick}
        className={`group w-full text-left px-3 py-2.5 h-[70px] book-spine book-spine-color-${colorIndex} ${
          isActive ? 'active' : ''
        }`}
      >
        <div className="relative z-10">
          <h3 className="font-serif font-semibold text-xs text-[#f4e8d0] truncate tracking-wide"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
            {note.title || 'Untitled'}
          </h3>
          {uniqueTags.length > 0 && (
            <div className="hidden group-hover:flex flex-wrap gap-1 mt-2">
              {uniqueTags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-block px-1.5 py-0.5 text-[8px] font-serif bg-black/40 text-[#d4a574] rounded border border-[#d4a574]/40"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
