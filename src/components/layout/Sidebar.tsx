import { useState } from 'react';
import { SearchBar } from '@/components/notes/SearchBar.tsx';
import { NoteList } from '@/components/notes/NoteList.tsx';
import { TagGroupList } from '@/components/notes/TagGroupList.tsx';
import { useUIStore } from '@/stores/uiStore.ts';

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<'notes' | 'groupings' | 'settings'>('notes');
  const groupingMinSize = useUIStore((s) => s.groupingMinSize);
  const setGroupingMinSize = useUIStore((s) => s.setGroupingMinSize);

  return (
    <aside className="w-72 flex-shrink-0 h-full flex flex-col border-r border-border dark:border-gray-700 bg-bg-sidebar dark:bg-gray-800">
      <div className="p-3 border-b border-border dark:border-gray-700">
        <div className="flex gap-1 border border-border dark:border-gray-600 rounded-md p-0.5 mb-2">
          {(['notes', 'groupings', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                activeTab === tab
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary dark:hover:text-gray-200'
              }`}
            >
              {tab === 'notes' ? 'Notes' : tab === 'groupings' ? 'Groupings' : 'Settings'}
            </button>
          ))}
        </div>
        {activeTab === 'notes' && <SearchBar />}
      </div>
      {activeTab === 'notes' ? (
        <NoteList />
      ) : activeTab === 'groupings' ? (
        <TagGroupList />
      ) : (
        <div className="p-4 space-y-3 text-sm text-text-secondary dark:text-gray-300">
          <div>
            <label htmlFor="grouping-min-size" className="block text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
              Minimum Grouping Size
            </label>
            <p className="text-xs text-text-secondary/70 mt-1">
              A tag becomes a grouping after it appears on this many notes.
            </p>
          </div>
          <input
            id="grouping-min-size"
            type="number"
            min={1}
            value={groupingMinSize}
            onChange={(e) => setGroupingMinSize(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm rounded-md bg-bg-primary dark:bg-gray-700 border border-border dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary dark:text-gray-100"
          />
        </div>
      )}
    </aside>
  );
}
