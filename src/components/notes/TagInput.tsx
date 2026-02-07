import { useState, useCallback, type KeyboardEvent } from 'react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState('');

  const addTag = useCallback(
    (value: string) => {
      const tag = value.trim().toLowerCase();
      if (tag && !tags.includes(tag)) {
        onChange([...tags, tag]);
      }
      setInput('');
    },
    [tags, onChange]
  );

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((t) => t !== tagToRemove));
    },
    [tags, onChange]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-2 border-[#d4a574]/30 rounded bg-[#1a1612] focus-within:ring-2 focus-within:ring-[#d4a574] shadow-inner">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-serif bg-[#d4a574]/20 text-[#d4a574] rounded border border-[#d4a574]/30"
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="hover:text-[#c4956a]"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input) addTag(input); }}
        placeholder={tags.length === 0 ? 'Add tags...' : ''}
        className="flex-1 min-w-[80px] text-xs font-serif bg-transparent focus:outline-none text-[#e8dcc4] placeholder-[#b8a88a]/50"
      />
    </div>
  );
}
