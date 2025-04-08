// File: stores/useAppStore.ts
// NEW FILE
import { create } from 'zustand';

interface AppState {
  darkMode: boolean;
  toggleDarkMode: () => void;
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
  isLoading: boolean; // Generic loading indicator if needed
  setIsLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  darkMode: true, // Default to dark mode
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  error: null,
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));

// Initialize dark mode based on system preference or localStorage (optional enhancement)
// Example:
// const storedDarkMode = localStorage.getItem('darkMode');
// useAppStore.setState({
//   darkMode: storedDarkMode ? JSON.parse(storedDarkMode) : window.matchMedia('(prefers-color-scheme: dark)').matches
// });
// // Persist changes
// useAppStore.subscribe(
//   (state) => localStorage.setItem('darkMode', JSON.stringify(state.darkMode))
// );