// stores/useSettingsStore.ts
import { create } from "zustand";

/**
 * Persists the user's OpenRouter API‑key.
 * — Single Responsibility: only deals with one setting.
 */
interface SettingsState {
  openrouterApiKey: string;
  setOpenrouterApiKey(key: string): void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  openrouterApiKey:
    typeof window === "undefined"
      ? ""
      : localStorage.getItem("openrouterApiKey") || "",
  setOpenrouterApiKey: (key) => {
    set({ openrouterApiKey: key });
    if (typeof window !== "undefined") {
      localStorage.setItem("openrouterApiKey", key);
    }
  },
}));
