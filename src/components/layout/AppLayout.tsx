import type { ReactNode } from 'react';
import { useUIStore } from '@/stores/uiStore.ts';
import { Header } from './Header.tsx';
import { Sidebar } from './Sidebar.tsx';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <div className="h-full flex flex-col bg-bg-primary dark:bg-gray-900">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar />}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
