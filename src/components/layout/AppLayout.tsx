import type { ReactNode } from 'react';
import { useUIStore } from '@/stores/uiStore.ts';
import { Header } from './Header.tsx';
import { Sidebar } from './Sidebar.tsx';
import { SettingsModal } from './SettingsModal.tsx';
import { MapView } from '@/components/map/index.ts';
import { LandingOverlay } from '@/components/landing/LandingOverlay.tsx';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const landingMode = useUIStore((s) => s.landingMode);
  const currentView = useUIStore((s) => s.currentView);
  const showPageSlideUp = useUIStore((s) => s.showPageSlideUp);

  return (
    <div className="h-full flex flex-col bg-[#1a1612]">
      {/* Header always at top */}
      <Header />

      {/* Below header: sidebar + main area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar at left edge (not during landing) */}
        {!landingMode && sidebarOpen && <Sidebar />}

        {/* Main area: map is always the background */}
        <div className="flex-1 relative overflow-hidden">
          {/* Map always rendered */}
          <div className="absolute inset-0">
            <MapView />
          </div>

          {/* Landing overlay */}
          {landingMode && <LandingOverlay />}

          {/* Content pages floating over the map */}
          {!landingMode && currentView !== 'graph' && (
            <div className="absolute inset-0 flex items-center justify-center z-10 p-6 pointer-events-none">
              <div
                style={{
                  transform: showPageSlideUp ? 'translateY(100%)' : 'translateY(0)',
                  opacity: showPageSlideUp ? 0 : 1,
                  transition: 'all 0.7s ease-out',
                }}
                className="w-[90%] h-[92%] pointer-events-auto flex flex-col rounded-lg overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)]"
              >
                <main className="flex-1 overflow-hidden">
                  {children}
                </main>
              </div>
            </div>
          )}
        </div>
      </div>

      <SettingsModal />
    </div>
  );
}
