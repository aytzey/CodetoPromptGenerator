import { useCallback, useState } from "react";
import { usePromptStore } from "@/stores/usePromptStore";
import { useAppStore } from "@/stores/useAppStore";
import { useSettingsStore } from "@/stores/useSettingStore";
import { resolveSmartSelectModelForApiKey } from "@/lib/modelPresets";
import { fetchApiResult } from "./apiService";

interface RefinePromptResponse {
  refinedPrompt: string;
}

export function usePromptService() {
  const {
    setMetaPromptFiles,
    setIsLoadingMetaList,
    setMetaPrompt,
    setIsLoadingMetaContent,
    setIsSavingMeta,
    setNewMetaFileName,
  } = usePromptStore();
  const { setError } = useAppStore();
  const getApiKey = useSettingsStore((state) => state.openrouterApiKey);
  const [isRefining, setIsRefining] = useState(false);

  const fetchMetaPromptList = useCallback(async () => {
    setIsLoadingMetaList(true);
    try {
      const result = await fetchApiResult<string[]>("/api/metaprompts?action=list");
      setMetaPromptFiles(result.ok && result.data ? result.data : []);
    } finally {
      setIsLoadingMetaList(false);
    }
  }, [setIsLoadingMetaList, setMetaPromptFiles]);

  const loadMetaPrompt = useCallback(async () => {
    const selectedMetaFile = usePromptStore.getState().selectedMetaFile;
    if (!selectedMetaFile) return;

    setIsLoadingMetaContent(true);
    try {
      const result = await fetchApiResult<{ content: string }>(
        `/api/metaprompts?action=load&file=${encodeURIComponent(selectedMetaFile)}`,
      );
      setMetaPrompt(result.ok ? result.data?.content ?? "" : "");
    } finally {
      setIsLoadingMetaContent(false);
    }
  }, [setIsLoadingMetaContent, setMetaPrompt]);

  const saveMetaPrompt = useCallback(async () => {
    const { metaPrompt, selectedMetaFile, newMetaFileName } = usePromptStore.getState();
    if (!metaPrompt.trim()) {
      setError("Meta prompt content cannot be empty.");
      return;
    }

    const fileName = newMetaFileName.trim() || selectedMetaFile || `meta_${Date.now()}.txt`;

    setIsSavingMeta(true);
    try {
      const result = await fetchApiResult<{ message: string }>("/api/metaprompts", {
        method: "POST",
        body: JSON.stringify({ filename: fileName, content: metaPrompt }),
      });
      if (!result.ok) return;
      setNewMetaFileName("");
      await fetchMetaPromptList();
    } finally {
      setIsSavingMeta(false);
    }
  }, [fetchMetaPromptList, setError, setIsSavingMeta, setNewMetaFileName]);

  const refinePrompt = useCallback(
    async (textToRefine: string, treeText?: string): Promise<string | null> => {
      if (!textToRefine.trim()) {
        setError("Cannot refine empty text.");
        return null;
      }

      setIsRefining(true);
      try {
        const rawApiKey = getApiKey.trim();
        // "__SERVER_KEY__" is a sentinel meaning "backend has its own key" – don't send it
        const userApiKey = rawApiKey === "__SERVER_KEY__" ? "" : rawApiKey;
        const model = userApiKey ? resolveSmartSelectModelForApiKey(userApiKey) : undefined;
        const result = await fetchApiResult<RefinePromptResponse>("/api/prompt/refine", {
          method: "POST",
          body: JSON.stringify({
            text: textToRefine,
            treeText,
            ...(userApiKey ? { apiKey: userApiKey } : {}),
            ...(model ? { model } : {}),
          }),
        });
        if (!result.ok || !result.data) return null;
        if (typeof result.data.refinedPrompt !== "string") {
          setError("Received unexpected data format from refinement service.");
          return null;
        }
        return result.data.refinedPrompt;
      } finally {
        setIsRefining(false);
      }
    },
    [setError, getApiKey],
  );

  return {
    fetchMetaPromptList,
    loadMetaPrompt,
    saveMetaPrompt,
    refinePrompt,
    isRefining,
  };
}
