import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type View = 'editor' | 'graph' | 'split';
type EditorMode = 'edit' | 'preview' | 'split';

interface UIState {
  darkMode: boolean;
  sidebarOpen: boolean;
  currentView: View;
  editorPreviewMode: EditorMode;
  groupingMinSize: number;

  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setView: (view: View) => void;
  setEditorPreviewMode: (mode: EditorMode) => void;
  setGroupingMinSize: (value: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      darkMode: false,
      sidebarOpen: true,
      currentView: 'editor' as View,
      editorPreviewMode: 'split' as EditorMode,
      groupingMinSize: 5,

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
    }),
    {
      name: 'neural-zettel-ui',
    }
  )
);
