import { create } from 'zustand';
import type { Note, NoteCreateInput, NoteUpdateInput } from '@/types/index.ts';
import { noteService } from '@/services/noteService.ts';

interface NoteState {
  notes: Note[];
  activeNoteId: string | null;
  isLoading: boolean;
  error: string | null;

  loadNotes: () => Promise<void>;
  createNote: (input: NoteCreateInput) => Promise<Note>;
  updateNote: (id: string, input: NoteUpdateInput) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  setActiveNote: (id: string | null) => void;
  searchNotes: (query: string) => Promise<void>;
  clearError: () => void;
}

export const useNoteStore = create<NoteState>()((set) => ({
  notes: [],
  activeNoteId: null,
  isLoading: false,
  error: null,

  loadNotes: async () => {
    set({ isLoading: true, error: null });
    try {
      const notes = await noteService.getAll();
      set({ notes, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createNote: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const note = await noteService.create(input);
      set((state) => ({
        notes: [note, ...state.notes],
        activeNoteId: note.id,
        isLoading: false,
      }));
      return note;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  updateNote: async (id, input) => {
    try {
      const updated = await noteService.update(id, input);
      if (updated) {
        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? updated : n)),
        }));
      }
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  deleteNote: async (id) => {
    try {
      await noteService.delete(id);
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
        activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  setActiveNote: (id) => set({ activeNoteId: id }),

  searchNotes: async (query) => {
    set({ isLoading: true });
    try {
      const notes = query
        ? await noteService.search(query)
        : await noteService.getAll();
      set({ notes, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
