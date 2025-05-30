// stores/useAppStore.ts
import { create } from "zustand";
import type { CodemapResponse } from "@/types"; // Import CodemapResponse

interface AppState {
  error: string | null;
  setError(e: string | null): void;
  clearError(): void;

  isLoading: boolean;
  setIsLoading(b: boolean): void;

  codemapFilterEmpty: boolean;
  toggleCodemapFilterEmpty(): void;

  // State for settings modal
  isSettingsModalOpen: boolean;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;

  // State for Codemap modal
  isCodemapModalOpen: boolean;
  codemapModalData: CodemapResponse | null;
  openCodemapModal: (data: CodemapResponse) => void;
  closeCodemapModal: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  error: null,
  setError: (e) => set({ error: e }),
  clearError: () => set({ error: null }),

  isLoading: false,
  setIsLoading: (b) => set({ isLoading: b }),

  codemapFilterEmpty: false,
  toggleCodemapFilterEmpty: () =>
    set((s) => ({ codemapFilterEmpty: !s.codemapFilterEmpty })),

  // Settings modal state and actions
  isSettingsModalOpen: false,
  openSettingsModal: () => set({ isSettingsModalOpen: true }),
  closeSettingsModal: () => set({ isSettingsModalOpen: false }),

  // Codemap modal state and actions
  isCodemapModalOpen: false,
  codemapModalData: null,
  openCodemapModal: (data) => set({ isCodemapModalOpen: true, codemapModalData: data }),
  closeCodemapModal: () => set({ isCodemapModalOpen: false, codemapModalData: null }),
}));