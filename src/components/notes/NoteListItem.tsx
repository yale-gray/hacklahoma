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
  const colorIndex = note.bookColor !== undefined
    ? note.bookColor
    : note.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 6;

  const heightVariant = note.id.charCodeAt(0) % 3;
  const heights = ['h-[120px]', 'h-[130px]', 'h-[115px]'];
  const widthVariant = (note.id.charCodeAt(1) ?? 0) % 3;
  const widths = ['w-[38px]', 'w-[42px]', 'w-[34px]'];

  return (
    <div className="relative flex-shrink-0">
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onSelectToggle?.(e.target.checked);
          }}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-1/2 -translate-y-1/2 left-1 z-10 h-3 w-3 rounded border-[#d4a574]/50 bg-[#1a1612] text-[#d4a574] focus:ring-[#d4a574] cursor-pointer"
          aria-label={`Select note ${note.title || 'Untitled'}`}
        />
      )}
      <button
        onClick={onClick}
        className={`group relative ${widths[widthVariant]} ${heights[heightVariant]} shelf-book shelf-book-color-${colorIndex} ${
          isActive ? 'active' : ''
        } ${selected ? 'ring-1 ring-[#d4a574]' : ''}`}
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
    </div>
  );
}
