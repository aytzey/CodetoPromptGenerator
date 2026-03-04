// lib/hooks/useServiceActions.ts
import { useCallback } from "react";
import { useAutoSelectService } from "@/services/autoSelectServiceHooks";
import { useSettingsStore } from "@/stores/useSettingStore";
import { useAppStore } from "@/stores/useAppStore";

/**
 * Hook for managing service actions and API interactions
 */
export function useServiceActions(apiKeyDraft: string) {
  const setError = useAppStore((s) => s.setError);
  const closeSettingsModal = useAppStore((s) => s.closeSettingsModal);
  const setOpenrouterApiKey = useSettingsStore((s) => s.setOpenrouterApiKey);

  const { autoSelect, isSelecting } = useAutoSelectService();

  const saveApiKey = useCallback(() => {
    const trimmed = apiKeyDraft.trim();
    if (!trimmed.startsWith("sk-")) {
      setError("API key format looks invalid. It should start with 'sk-'.");
      return;
    }
    setOpenrouterApiKey(trimmed);
    closeSettingsModal();
  }, [apiKeyDraft, setOpenrouterApiKey, setError, closeSettingsModal]);

  return {
    isSelecting,
    autoSelect,
    saveApiKey,
  };
}
