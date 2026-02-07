import { formatDistanceToNow } from 'date-fns';
import type { Note } from '@/types/index.ts';

interface NoteListItemProps {
  note: Note;
  isActive: boolean;
  onClick: () => void;
}

export function NoteListItem({ note, isActive, onClick }: NoteListItemProps) {
  const preview = note.content.split('\n')[0]?.slice(0, 80) || 'Empty note';
  const timeAgo = formatDistanceToNow(new Date(note.modifiedAt), { addSuffix: true });

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 border-b border-border dark:border-gray-700 transition-colors ${
        isActive
          ? 'bg-accent/10 border-l-2 border-l-accent'
          : 'hover:bg-bg-secondary dark:hover:bg-gray-700'
      }`}
    >
      <h3 className="font-medium text-sm text-text-primary dark:text-gray-100 truncate">
        {note.title || 'Untitled'}
      </h3>
      <p className="text-xs text-text-secondary dark:text-gray-400 truncate mt-0.5">
        {preview}
      </p>
      <div className="flex items-center gap-2 mt-1.5">
        {note.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="inline-block px-1.5 py-0.5 text-[10px] bg-accent/10 text-accent rounded-full"
          >
            {tag}
          </span>
        ))}
        <span className="text-[10px] text-text-secondary dark:text-gray-500 ml-auto">
          {timeAgo}
        </span>
      </div>
    </button>
  );
}
