// services/autoSelectServiceHooks.ts
/**
 * useAutoSelectService
 * ─────────────────────
 * Triggers the `/api/autoselect` endpoint, then updates
 * the global `selectedFilePaths` list.
 *
 * The heavy LLM call is executed server‑side for security
 * (backend holds the OpenRouter key).
 */

import { useState, useCallback } from "react";
import { useProjectStore } from "@/stores/useProjectStore";
import { usePromptStore } from "@/stores/usePromptStore";
import { flattenFilePaths } from "@/lib/fileFilters";
import { fetchApi } from "./apiService";

export function useAutoSelectService() {
  const { projectPath, fileTree, setSelectedFilePaths } = useProjectStore();
  const { mainInstructions } = usePromptStore();

  const [isSelecting, setIsSelecting] = useState(false);

  const autoSelect = useCallback(async () => {
    if (!projectPath || !mainInstructions.trim()) {
      alert("Please choose a project and enter main instructions first.");
      return;
    }
    setIsSelecting(true);

    const body = {
      projectPath,
      instructions: mainInstructions,
      treePaths: flattenFilePaths(fileTree),
    };

    const res = await fetchApi<string[]>("/api/autoselect", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (res) {
      setSelectedFilePaths(res);
    }
    setIsSelecting(false);
  }, [projectPath, mainInstructions, fileTree, setSelectedFilePaths]);

  return { autoSelect, isSelecting };
}
