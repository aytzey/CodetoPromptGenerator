// lib/hooks/useServiceActions.ts
import { useCallback } from "react";
import { useAutoSelectService } from "@/services/autoSelectServiceHooks";
import { useSettingsStore } from "@/stores/useSettingStore";
import { useAppStore } from "@/stores/useAppStore";

const LS_KEY_OR = "openrouterApiKey";

/**
 * Hook for managing service actions and API interactions
 */
export function useServiceActions(apiKeyDraft: string) {
  const setError = useAppStore((s) => s.setError);
  const closeSettingsModal = useAppStore((s) => s.closeSettingsModal);
  const setOpenrouterApiKey = useSettingsStore((s) => s.setOpenrouterApiKey);

  // Services
  const { autoSelect, isSelecting } = useAutoSelectService();

  // API key management
  const saveApiKey = useCallback(() => {
    const trimmed = apiKeyDraft.trim();
    if (!trimmed.startsWith("sk-")) {
      setError("API key format looks invalid. It should start with 'sk-'.");
      return;
    }
    localStorage.setItem(LS_KEY_OR, trimmed);
    setOpenrouterApiKey(trimmed);
    closeSettingsModal();
  }, [apiKeyDraft, setOpenrouterApiKey, setError, closeSettingsModal]);

  return {
    // Service states
    isSelecting,
    
    // Service actions
    autoSelect,
    saveApiKey,
  };
}
