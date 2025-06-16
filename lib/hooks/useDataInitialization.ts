// lib/hooks/useDataInitialization.ts
import { useEffect, useState } from "react";
import { usePromptService } from "@/services/promptServiceHooks";
import { useExclusionService } from "@/services/exclusionServiceHooks";
import { useTodoService } from "@/services/todoServiceHooks";
import { useSettingsStore } from "@/stores/useSettingStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useTodoStore } from "@/stores/useTodoStore";
import { useExclusionStore } from "@/stores/useExclusionStore";

const LS_KEY_OR = "openrouterApiKey";

/**
 * Hook for managing initial data loading and client-side initialization
 */
export function useDataInitialization() {
  const [isClient, setIsClient] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState<string>("");

  const projectPath = useProjectStore((s) => s.projectPath);
  const setOpenrouterApiKey = useSettingsStore((s) => s.setOpenrouterApiKey);

  // Services
  const { fetchMetaPromptList } = usePromptService();
  const { fetchGlobalExclusions, fetchLocalExclusions } = useExclusionService();
  const { loadTodos } = useTodoService();

  // Client-side initialization
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initial data loading
  useEffect(() => {
    fetchGlobalExclusions();
    fetchMetaPromptList();
    const storedKey = localStorage.getItem(LS_KEY_OR) ?? "";
    setApiKeyDraft(storedKey);
    if (storedKey) {
      setOpenrouterApiKey(storedKey);
    }
  }, [fetchGlobalExclusions, fetchMetaPromptList, setOpenrouterApiKey]);

  // Project-specific data loading
  useEffect(() => {
    if (projectPath) {
      loadTodos();
      fetchLocalExclusions();
    } else {
      useTodoStore.setState({ todos: [] });
      useExclusionStore.setState({ localExclusions: [] });
    }
  }, [projectPath, loadTodos, fetchLocalExclusions]);

  return {
    isClient,
    apiKeyDraft,
    setApiKeyDraft,
  };
}