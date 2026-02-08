import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type View = 'editor' | 'graph' | 'search' | 'temporal' | 'split';
type EditorMode = 'edit' | 'preview' | 'split';
type SidebarTab = 'notes' | 'groupings';

interface UIState {
  darkMode: boolean;
  sidebarOpen: boolean;
  currentView: View;
  editorPreviewMode: EditorMode;
  groupingMinSize: number;
  mapColorThreshold: number;
  sidebarTab: SidebarTab;
  settingsOpen: boolean;
  hoveredGroupTag: string | null;
  customClusterColors: Record<string, string>; // tag -> hex color
  landingMode: boolean;
  showPageSlideUp: boolean;

  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setView: (view: View) => void;
  setEditorPreviewMode: (mode: EditorMode) => void;
  setGroupingMinSize: (value: number) => void;
  setMapColorThreshold: (value: number) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setHoveredGroupTag: (tag: string | null) => void;
  setCustomClusterColor: (tag: string, color: string) => void;
  openSettings: () => void;
  closeSettings: () => void;
  exitLanding: () => void;
  triggerPageSlideUp: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      darkMode: false,
      sidebarOpen: true,
      currentView: 'editor' as View,
      editorPreviewMode: 'split' as EditorMode,
      groupingMinSize: 5,
      mapColorThreshold: 10,
      sidebarTab: 'notes' as SidebarTab,
      settingsOpen: false,
      hoveredGroupTag: null,
      customClusterColors: {},
      landingMode: true,
      showPageSlideUp: false,

      toggleDarkMode: () =>
        set((state) => {
          const next = !state.darkMode;
          document.documentElement.classList.toggle('dark', next);
          return { darkMode: next };
        }),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setView: (view) => set({ currentView: view }),

      setEditorPreviewMode: (mode) => set({ editorPreviewMode: mode }),

      setGroupingMinSize: (value) =>
        set({ groupingMinSize: Math.max(1, Math.floor(value) || 1) }),

      setMapColorThreshold: (value) =>
        set({ mapColorThreshold: Math.max(2, Math.floor(value) || 2) }),

      setHoveredGroupTag: (tag) => set({ hoveredGroupTag: tag }),
      setSidebarTab: (tab) => set({ sidebarTab: tab }),

      setCustomClusterColor: (tag, color) =>
        set((state) => ({
          customClusterColors: { ...state.customClusterColors, [tag]: color },
        })),

      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),

      exitLanding: () =>
        set({ landingMode: false, sidebarOpen: true, currentView: 'editor' as View }),

      triggerPageSlideUp: () => {
        set({ showPageSlideUp: true });
        // Start animation after brief delay to ensure initial state is registered
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            set({ showPageSlideUp: false });
          });
        });
      },
    }),
    {
      name: 'neural-zettel-ui',
      partialize: (state) => {
        const { hoveredGroupTag: _, landingMode: _l, showPageSlideUp: _s, ...rest } = state;
        return rest;
      },
    }
  )
);
