// stores/useSettingsStore.ts
import { create } from "zustand";
import { LS_KEY_MODEL_PRESET, LS_KEY_OPENROUTER_API } from "@/lib/constants/localStorage";
import { DEFAULT_MODEL_PRESET_ID, type ModelPresetId } from "@/lib/modelPresets";

/**
 * Persists runtime settings (API key + prompt target preset).
 * API key is validated as Google Gemini key at save time.
 */
interface SettingsState {
  openrouterApiKey: string;
  setOpenrouterApiKey(key: string): void;
  selectedModelPresetId: ModelPresetId;
  setSelectedModelPresetId(presetId: ModelPresetId): void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  openrouterApiKey:
    typeof window === "undefined"
      ? ""
      : localStorage.getItem(LS_KEY_OPENROUTER_API) || "",
  selectedModelPresetId:
    typeof window === "undefined"
      ? DEFAULT_MODEL_PRESET_ID
      : ((localStorage.getItem(LS_KEY_MODEL_PRESET) as ModelPresetId | null) || DEFAULT_MODEL_PRESET_ID),
  setOpenrouterApiKey: (key) => {
    set({ openrouterApiKey: key });
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY_OPENROUTER_API, key);
    }
  },
  setSelectedModelPresetId: (presetId) => {
    set({ selectedModelPresetId: presetId });
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY_MODEL_PRESET, presetId);
    }
  },
}));
