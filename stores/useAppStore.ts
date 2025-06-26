// stores/useAppStore.ts
import { create } from "zustand";
import { devtools } from 'zustand/middleware'; 
import { immer } from 'zustand/middleware/immer'; 
import type { CodemapResponse } from "@/types"; 

export interface AppNotification {
  id?: string; 
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number; 
}

interface AppState {
  error: string | null;
  setError: (e: string | null) => void;
  clearError: () => void;

  isLoading: boolean;
  setIsLoading: (b: boolean) => void;

  codemapFilterEmpty: boolean;
  toggleCodemapFilterEmpty: () => void;

  isSettingsModalOpen: boolean;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;

  isCodemapModalOpen: boolean;
  codemapModalData: CodemapResponse | null;
  openCodemapModal: (data: CodemapResponse) => void;
  closeCodemapModal: () => void;

  notification: AppNotification | null;
  setNotification: (notification: AppNotification | null) => void;
}

export const useAppStore = create<AppState>()(
  devtools( 
    immer((set) => ({ 
      error: null,
      setError: (e) => set((state) => { state.error = e; }),
      clearError: () => set((state) => { state.error = null; }),

      isLoading: false,
      setIsLoading: (b) => set((state) => { state.isLoading = b; }),

      codemapFilterEmpty: false,
      toggleCodemapFilterEmpty: () =>
        set((state) => { state.codemapFilterEmpty = !state.codemapFilterEmpty; }),

      isSettingsModalOpen: false,
      openSettingsModal: () => set((state) => { state.isSettingsModalOpen = true; }),
      closeSettingsModal: () => set((state) => { state.isSettingsModalOpen = false; }),

      isCodemapModalOpen: false,
      codemapModalData: null,
      openCodemapModal: (data) => set((state) => {
        state.isCodemapModalOpen = true;
        state.codemapModalData = data;
      }),
      closeCodemapModal: () => set((state) => {
        state.isCodemapModalOpen = false;
        state.codemapModalData = null;
      }),

      notification: null, 
      setNotification: (notification: AppNotification | null) => set((state) => {
        // The console log you saw (useAppStore.ts:87 for notification) would be here
        // console.log('[useAppStore] setNotification called with:', notification); 
        state.notification = notification;
      }),
      // Line 80 of the original useAppStore.ts might have been here if it was the setMainInstruction log.
      // If mainInstruction and setMainInstruction were removed, this line number would shift or be gone for that specific log.
    })),
  ),
);