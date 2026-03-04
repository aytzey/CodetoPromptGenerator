// services/autoSelectServiceHooks.ts
import { useCallback, useState } from "react";
import { fetchApi } from "./apiService";

import { useProjectStore } from "@/stores/useProjectStore";
import { usePromptStore } from "@/stores/usePromptStore";
import { useSettingsStore } from "@/stores/useSettingStore";
import { useAppStore } from "@/stores/useAppStore";
import { resolveSmartSelectModelForApiKey } from "@/lib/modelPresets";

import { flattenFilePaths } from "@/lib/fileFilters";
import type { AutoSelectRequest, AutoSelectResponse } from "@/types";

/* ────────────────────────────────────────────────────────────────────────── *
 *       Smart-Select  –  service hook (⇧-for-debug supported)                *
 * ────────────────────────────────────────────────────────────────────────── */

export function useAutoSelectService() {
  /* ---- stores ---- */
  const projectStore = useProjectStore;
  const promptStore  = usePromptStore;
  const apiKey = useSettingsStore((state) => state.openrouterApiKey);
  const setError = useAppStore((state) => state.setError);

  /* ---- local state ---- */
  const [isSelecting, setIsSelecting] = useState(false);

  /* ---- main action ---- */
  const autoSelect = useCallback(
    async (opts?: { debug?: boolean }) => {
      const { projectPath, fileTree, setSelectedFilePaths } = projectStore.getState();
      if (!projectPath) {
        setError("No project folder selected. Choose a folder first.");
        return;
      }
      if (isSelecting) return;

      const treePaths = flattenFilePaths(fileTree);
      if (treePaths.length === 0) {
        setError("File tree is empty. Load a project folder first.");
        return;
      }

      const instructions = promptStore.getState().mainInstructions;
      if (!instructions.trim()) {
        setError("Write instructions first (section 2b) so Smart Select knows what to look for.");
        return;
      }

      // Build request – API key is optional; backend falls back to GOOGLE_API_KEY env var
      // "__SERVER_KEY__" is a sentinel meaning "backend has its own key" – don't send it
      const trimmedApiKey = apiKey.trim();
      const isServerKey = trimmedApiKey === "__SERVER_KEY__";
      const userApiKey = isServerKey ? "" : trimmedApiKey;
      const resolvedModel = userApiKey
        ? resolveSmartSelectModelForApiKey(userApiKey)
        : undefined;

      const request: AutoSelectRequest = {
        baseDir: projectPath,
        treePaths,
        instructions,
        ...(userApiKey ? { apiKey: userApiKey } : {}),
        ...(resolvedModel ? { model: resolvedModel } : {}),
      };

      const url = `/api/autoselect${opts?.debug ? "?debug=1" : ""}`;

      try {
        setIsSelecting(true);

        const res = await fetchApi<AutoSelectResponse>(url, {
          method: "POST",
          body: JSON.stringify(request),
        });

        // fetchApi returns null on network/HTTP error (already shown via setError)
        if (res === null) return;

        if (!res.selected?.length) {
          setError("Smart Select returned no files. Try broadening your instructions.");
          return;
        }

        setSelectedFilePaths(res.selected);

        if (opts?.debug && res.codemap) {
          console.groupCollapsed("Codemap summaries");
          Object.entries(res.codemap).forEach(([file, info]) => {
            console.info(file, info);
          });
          console.groupEnd();
        }
      } finally {
        setIsSelecting(false);
      }
    },
    [isSelecting, projectStore, promptStore, apiKey, setError],
  );

  /* ---- public API ---- */
  return { autoSelect, isSelecting };
}
