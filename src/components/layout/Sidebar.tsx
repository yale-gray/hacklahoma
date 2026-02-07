import { SearchBar } from '@/components/notes/SearchBar.tsx';
import { NoteList } from '@/components/notes/NoteList.tsx';
import { TagGroupList } from '@/components/notes/TagGroupList.tsx';
import { useUIStore } from '@/stores/uiStore.ts';

export function Sidebar() {
  const activeTab = useUIStore((s) => s.sidebarTab);
  const setSidebarTab = useUIStore((s) => s.setSidebarTab);

  return (
    <aside className="w-72 flex-shrink-0 h-full flex flex-col border-r-2 border-[#3d2817] bookshelf-sidebar">
      <div className="p-4 bookshelf-header">
        <div className="flex gap-1 border-2 border-[#d4a574]/30 rounded p-1 mb-3 bg-[#2d1f14]/50">
          {(['notes', 'groupings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSidebarTab(tab)}
              className={`flex-1 px-3 py-1 text-xs font-serif rounded transition-colors ${
                activeTab === tab
                  ? 'bg-[#d4a574] text-[#1a0f0a] font-semibold'
                  : 'text-[#b8a88a] hover:text-[#d4a574]'
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
