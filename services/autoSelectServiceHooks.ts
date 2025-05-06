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
      const { projectPath, fileTree } = projectStore.getState();
      if (!projectPath || isSelecting) return;

      const treePaths = flattenTree(fileTree); // <── FIX: use helper, not store fn

      const request: AutoSelectRequest = {
        baseDir:     projectPath,
        treePaths,                           // full project tree
        instructions: promptStore.getState().mainInstructions,
      };

      // const url = `/api/autoselect${opts?.debug ? "?debug=1" : ""}`;
      const url = "/api/autoselect?debug=1";
      try {
        setIsSelecting(true);

        const res = await fetchApi<AutoSelectResponse>(url, {
          method: "POST",
          body:   JSON.stringify(request),
        });
        if (!res) return;

        // Update selected paths in the project store
        projectStore.getState().setSelectedFilePaths(res.selected);

        // Optional debug → pretty-print codemap
        if (opts?.debug && res.codemap) {
          console.groupCollapsed("🗺️ Codemap summaries");
          Object.entries(res.codemap).forEach(([file, info]) =>
            console.info(file, info),
          );
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
