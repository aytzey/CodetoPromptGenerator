// stores/useAppStore.ts
import { create } from "zustand";

interface AppState {
  darkMode: boolean;
  toggleDarkMode(): void;

  /** Global error banner (set via fetchApi) */
  error: string | null;
  setError(e: string | null): void;
  clearError(): void;

  /** Generic spinner flag (kept for future use) */
  isLoading: boolean;
  setIsLoading(b: boolean): void;

  /**
   * SETTINGS  – Token optimisation:
   * If true → after codemap extraction, files with *zero*
   * classes & functions are auto‑deselected to save context tokens.
   */
  codemapFilterEmpty: boolean;
  toggleCodemapFilterEmpty(): void;
}

export const useAppStore = create<AppState>((set) => ({
  /* theme */
  darkMode: true,
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),

  /* error handling */
  error: null,
  setError: (e) => set({ error: e }),
  clearError: () => set({ error: null }),

  /* misc loading */
  isLoading: false,
  setIsLoading: (b) => set({ isLoading: b }),

  /* settings */
  codemapFilterEmpty: false,
  toggleCodemapFilterEmpty: () =>
    set((s) => ({ codemapFilterEmpty: !s.codemapFilterEmpty })),
}));
