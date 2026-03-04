// stores/useSettingsStore.ts
import { create } from "zustand";
import { LS_KEY_OPENROUTER_API } from "@/lib/constants/localStorage";

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
      : localStorage.getItem(LS_KEY_OPENROUTER_API) || "",
  setOpenrouterApiKey: (key) => {
    set({ openrouterApiKey: key });
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY_OPENROUTER_API, key);
    }
  },
}));
