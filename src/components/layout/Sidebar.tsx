import { useState } from 'react';
import { SearchBar } from '@/components/notes/SearchBar.tsx';
import { NoteList } from '@/components/notes/NoteList.tsx';
import { TagGroupList } from '@/components/notes/TagGroupList.tsx';

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<'notes' | 'groupings'>('notes');

  return (
    <aside className="w-72 flex-shrink-0 h-full flex flex-col border-r border-border dark:border-gray-700 bg-bg-sidebar dark:bg-gray-800">
      <div className="p-3 border-b border-border dark:border-gray-700">
        <div className="flex gap-1 border border-border dark:border-gray-600 rounded-md p-0.5 mb-2">
          {(['notes', 'groupings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                activeTab === tab
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary dark:hover:text-gray-200'
              }`}
            >
              {tab === 'notes' ? 'Notes' : 'Groupings'}
            </button>
          ))}
        </div>
        {activeTab === 'notes' && <SearchBar />}
      </div>
      {activeTab === 'notes' ? <NoteList /> : <TagGroupList />}
    </aside>
  );
}
