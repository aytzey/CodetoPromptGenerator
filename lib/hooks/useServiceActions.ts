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
    const looksLikeGoogle = trimmed.startsWith("AIza");
    if (!looksLikeGoogle) {
      setError("Only Google Gemini API keys are allowed for Smart Select (use AIza...).");
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
