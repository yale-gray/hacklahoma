import { SearchBar } from '@/components/notes/SearchBar.tsx';
import { NoteList } from '@/components/notes/NoteList.tsx';

export function Sidebar() {
  return (
    <aside className="w-72 flex-shrink-0 h-full flex flex-col border-r border-border dark:border-gray-700 bg-bg-sidebar dark:bg-gray-800">
      <div className="p-3 border-b border-border dark:border-gray-700">
        <SearchBar />
      </div>
      <NoteList />
    </aside>
  );
}
