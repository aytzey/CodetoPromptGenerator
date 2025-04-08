// File: stores/useExclusionStore.ts
// NEW FILE
import { create } from 'zustand';

interface ExclusionState {
  globalExclusions: string[];
  setGlobalExclusions: (exclusions: string[]) => void;
  localExclusions: string[];
  setLocalExclusions: (exclusions: string[]) => void;
  extensionFilters: string[]; // Renamed from filterExtensions for clarity
  setExtensionFilters: (filters: string[]) => void;
  addExtensionFilter: (filter: string) => void;
  removeExtensionFilter: (filter: string) => void;
  clearExtensionFilters: () => void;
  extensionInput: string; // Keep input state local to component or here? Decide based on usage. Keep local for now.
  // setExtensionInput: (input: string) => void;
  isLoadingGlobal: boolean;
  setIsLoadingGlobal: (loading: boolean) => void;
  isLoadingLocal: boolean;
  setIsLoadingLocal: (loading: boolean) => void;
  isSavingGlobal: boolean;
  setIsSavingGlobal: (saving: boolean) => void;
  isSavingLocal: boolean; // Might be needed if adding/removing triggers save
  setIsSavingLocal: (saving: boolean) => void;
}

export const useExclusionStore = create<ExclusionState>((set, get) => ({
  globalExclusions: [],
  setGlobalExclusions: (exclusions) => set({ globalExclusions: exclusions }),
  localExclusions: [],
  setLocalExclusions: (exclusions) => set({ localExclusions: exclusions }),
  extensionFilters: [],
  setExtensionFilters: (filters) => set({ extensionFilters: filters }),
  addExtensionFilter: (filter) => {
      const trimmed = filter.trim();
      if (!trimmed) return;
      let ext = trimmed;
      if (!ext.startsWith('.')) {
          ext = `.${ext}`;
      }
      if (!get().extensionFilters.includes(ext)) {
          set((state) => ({ extensionFilters: [...state.extensionFilters, ext] }));
      }
  },
  removeExtensionFilter: (filter) => set((state) => ({
      extensionFilters: state.extensionFilters.filter((f) => f !== filter)
  })),
  clearExtensionFilters: () => set({ extensionFilters: [] }),
  // extensionInput: '', // Keep local to component managing the input
  // setExtensionInput: (input) => set({ extensionInput: input }),
  isLoadingGlobal: false,
  setIsLoadingGlobal: (loading) => set({ isLoadingGlobal: loading }),
  isLoadingLocal: false,
  setIsLoadingLocal: (loading) => set({ isLoadingLocal: loading }),
  isSavingGlobal: false,
  setIsSavingGlobal: (saving) => set({ isSavingGlobal: saving }),
  isSavingLocal: false,
  setIsSavingLocal: (saving) => set({ isSavingLocal: saving }),
}));
