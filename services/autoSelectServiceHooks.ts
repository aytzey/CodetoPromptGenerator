// services/autoSelectServiceHooks.ts
/**
 * Changes (2025‑04‑17)
 * ─────────────────────
 * ✓  Adds `?debug=1` query‑param.
 * ✓  Prints the raw OpenRouter reply to the console.
 * ✓  Works with both old (string[]) and new ({ selected, rawReply }) payloads.
 */

import { useState, useCallback } from "react";
import { useProjectStore } from "@/stores/useProjectStore";
import { usePromptStore } from "@/stores/usePromptStore";
import { flattenFilePaths } from "@/lib/fileFilters";
import { fetchApi } from "./apiService";

type DebugPayload = { selected: string[]; rawReply: string };

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

    // add ?debug=1 to receive rawReply
    const res = await fetchApi<string[] | DebugPayload>("/api/autoselect?debug=1", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!res) {
      setIsSelecting(false);
      return;
    }

    if (Array.isArray(res)) {
      // old schema
      setSelectedFilePaths(res);
    } else {
      // new debug schema
      console.groupCollapsed("%cOpenRouter ↩ raw reply", "color:#16a085;font-weight:bold");
      console.log(res.rawReply);
      console.groupEnd();
      setSelectedFilePaths(res.selected);
    }

    setIsSelecting(false);
  }, [projectPath, mainInstructions, fileTree, setSelectedFilePaths]);

  return { autoSelect, isSelecting };
}
