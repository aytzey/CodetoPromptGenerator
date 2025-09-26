// services/autoSelectServiceHooks.ts
import { useCallback, useState } from "react";
import { fetchApi } from "./apiService";

import { useProjectStore } from "@/stores/useProjectStore";
import { usePromptStore } from "@/stores/usePromptStore";

import { flattenTree } from "@/lib/fileFilters";
import type { AutoSelectRequest, AutoSelectResponse } from "@/types";

/* ────────────────────────────────────────────────────────────────────────── *
 *       Smart-Select  –  service hook (⇧-for-debug supported)                *
 * ────────────────────────────────────────────────────────────────────────── */

export function useAutoSelectService() {
  /* ---- stores ---- */
  const projectStore = useProjectStore;
  const promptStore  = usePromptStore;

  /* ---- local state ---- */
  const [isSelecting, setIsSelecting] = useState(false);

  /* ---- main action ---- */
  const autoSelect = useCallback(
    async (opts?: { debug?: boolean }) => {
      const { projectPath, fileTree, setSelectedFilePaths } = projectStore.getState();
      if (!projectPath || isSelecting) return;

      const treePaths = flattenTree(fileTree);
      if (treePaths.length === 0) return;

      const request: AutoSelectRequest = {
        baseDir: projectPath,
        treePaths,
        instructions: promptStore.getState().mainInstructions,
      };

      const url = `/api/autoselect${opts?.debug ? "?debug=1" : ""}`;

      try {
        setIsSelecting(true);

        const res = await fetchApi<AutoSelectResponse>(url, {
          method: "POST",
          body: JSON.stringify(request),
        });

        if (!res?.selected?.length) return;

        setSelectedFilePaths(res.selected);

        if (opts?.debug && res.codemap) {
          console.groupCollapsed("🗺️ Codemap summaries");
          Object.entries(res.codemap).forEach(([file, info]) => {
            console.info(file, info);
          });
          console.groupEnd();
        }
      } finally {
        setIsSelecting(false);
      }
    },
    [isSelecting, projectStore, promptStore],
  );

  /* ---- public API ---- */
  return { autoSelect, isSelecting };
}
