// services/autoSelectServiceHooks.ts
import { useCallback, useState } from "react";
import { fetchApi } from "./apiService";
import { useProjectStore } from "@/stores/useProjectStore";
import { usePromptStore } from "@/stores/usePromptStore";
import { flattenTree } from "@/lib/fileFilters";
import type { AutoSelectRequest, AutoSelectResponse } from "@/types";
import { toast } from "@/components/ui/toaster";     // ✅ shadcn “toast” API

/* ──────────────────────────────────────────────────────────── *
 *                       Public helper                          *
 * ──────────────────────────────────────────────────────────── */

/**
 * Infer dominant language extensions (py / cpp / ts / js …) from a
 * project tree’s *relative* paths.  Exported so other hooks can reuse.
 */
export function inferLangs(paths: string[]): string[] {
  const exts = new Set(
    paths
      .map(p => p.split(".").pop()?.toLowerCase())
      .filter(Boolean) as string[],
  );
  const m: Record<string, string> = {
    js: "js",
    jsx: "js",
    ts: "ts",
    tsx: "ts",
    py: "py",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    hpp: "cpp",
    c: "c",
  };
  return [...exts].flatMap(e => (m[e] ? [m[e]] : []));
}

/* ──────────────────────────────────────────────────────────── *
 *                    Smart-Select service hook                 *
 * ──────────────────────────────────────────────────────────── */

export function useAutoSelectService() {
  const [isSelecting, setIsSelecting] = useState(false);

  const autoSelect = useCallback(async () => {
    const {
      projectPath,
      fileTree,
      setSelectedFilePaths,
    } = useProjectStore.getState();
    if (!projectPath || isSelecting) return;

    const treePaths = flattenTree(fileTree);
    const langs = inferLangs(treePaths);

    const baseReq: AutoSelectRequest = {
      baseDir: projectPath,
      treePaths,
      instructions: usePromptStore.getState().mainInstructions,
      languages: langs,
    };

    const postSelect = async (
      payload: any,
      clar = false,
    ): Promise<AutoSelectResponse> => {
      const url = clar ? "/api/autoselect/clarify" : "/api/autoselect";
      return fetchApi<AutoSelectResponse>(url, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    };

    try {
      setIsSelecting(true);
      let res = await postSelect(baseReq);

      // clarification loop
      if (res.ask?.length) {
        const answers = await (await import("@/views/SmartSelectDialog"))
          .openSmartSelectDialog(res.ask);
        if (!answers) return;
        res = await postSelect(
          { ...baseReq, clarifications: answers },
          true,
        );
      }

      setSelectedFilePaths(res.selected);

      toast(
        `Smart-Select picked ${res.selected.length} paths (confidence ${(res.confidence * 100).toFixed(
          1,
        )} %)`,
        {
          variant: res.confidence < 0.95 ? "warning" : "success",
        },
      );
    } finally {
      setIsSelecting(false);
    }
  }, [isSelecting]);

  return { autoSelect, isSelecting };
}
