// lib/hooks/useDataInitialization.ts
import { useEffect, useState } from "react";
import { usePromptService } from "@/services/promptServiceHooks";
import { useExclusionService } from "@/services/exclusionServiceHooks";
import { useTodoService } from "@/services/todoServiceHooks";
import { useSettingsStore } from "@/stores/useSettingStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useTodoStore } from "@/stores/useTodoStore";
import { useExclusionStore } from "@/stores/useExclusionStore";
import { LS_KEY_OPENROUTER_API } from "@/lib/constants/localStorage";
export function useDataInitialization() {
  const [isClient, setIsClient] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState<string>("");

  const projectPath = useProjectStore((s) => s.projectPath);
  const setOpenrouterApiKey = useSettingsStore((s) => s.setOpenrouterApiKey);

  const { fetchMetaPromptList } = usePromptService();
  const { fetchGlobalExclusions, fetchLocalExclusions } = useExclusionService();
  const { loadTodos } = useTodoService();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    fetchGlobalExclusions();
    fetchMetaPromptList();
    const storedKey = localStorage.getItem(LS_KEY_OPENROUTER_API) ?? "";
    setApiKeyDraft(storedKey);
    if (storedKey) {
      setOpenrouterApiKey(storedKey);
    }

    // Check if the backend has a Google API key via env var
    // so Smart Select / Refine can work without manual UI key entry
    if (!storedKey) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5010"}/api/settings/env-status`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.data?.googleKeyAvailable) {
            // Set a sentinel so hooks know the backend has a key
            setOpenrouterApiKey("__SERVER_KEY__");
          }
        })
        .catch(() => {/* backend unreachable – ignore */});
    }
  }, [fetchGlobalExclusions, fetchMetaPromptList, setOpenrouterApiKey]);

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
