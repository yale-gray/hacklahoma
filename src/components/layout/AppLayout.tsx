import type { ReactNode } from 'react';
import { useUIStore } from '@/stores/uiStore.ts';
import { Header } from './Header.tsx';
import { Sidebar } from './Sidebar.tsx';
import { SettingsModal } from './SettingsModal.tsx';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <div className="h-full flex flex-col bg-[#1a1612]">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar />}
        <main className="flex-1 overflow-hidden bg-[#1a1612]">
          {children}
        </main>
      </div>
      <SettingsModal />
    </div>
  );
}
