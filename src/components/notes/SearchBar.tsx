import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce.ts';
import { useNoteStore } from '@/stores/noteStore.ts';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const searchNotes = useNoteStore((s) => s.searchNotes);

  useEffect(() => {
    searchNotes(debouncedQuery);
  }, [debouncedQuery, searchNotes]);

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4a574]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search library..."
        className="w-full pl-9 pr-8 py-2.5 text-sm font-serif bg-[#1a1612] border-2 border-[#d4a574]/30 rounded focus:outline-none focus:ring-2 focus:ring-[#d4a574] focus:border-[#d4a574] text-[#e8dcc4] placeholder-[#b8a88a] shadow-inner"
        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#b8a88a] hover:text-[#d4a574] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
