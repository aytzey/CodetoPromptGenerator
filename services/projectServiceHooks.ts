import { useCallback } from "react";
import { useProjectStore } from "@/stores/useProjectStore";
import { fetchApiResult } from "./apiService";
import type { FileData, FileNode } from "@/types";

export function useProjectService() {
  const store = useProjectStore;

  const loadProjectTree = useCallback(async () => {
    const projectPath = store.getState().projectPath;
    if (!projectPath) return;

    store.getState().setIsLoadingTree(true);
    try {
      const result = await fetchApiResult<FileNode[]>(
        `/api/projects/tree?rootDir=${encodeURIComponent(projectPath)}`,
      );
      store.getState().setFileTree(result.ok && result.data ? result.data : []);
    } finally {
      store.getState().setIsLoadingTree(false);
    }
  }, [store]);

  const loadSelectedFileContents = useCallback(async () => {
    const { projectPath, selectedFilePaths } = store.getState();
    if (!projectPath || selectedFilePaths.length === 0) {
      store.getState().setFilesData([]);
      return;
    }

    const pathsToFetch = selectedFilePaths.filter((path) => !path.endsWith("/"));
    if (pathsToFetch.length === 0) {
      store.getState().setFilesData([]);
      return;
    }

    store.getState().setIsLoadingContents(true);
    try {
      const result = await fetchApiResult<FileData[]>("/api/projects/files", {
        method: "POST",
        body: JSON.stringify({ baseDir: projectPath, paths: pathsToFetch }),
      });
      if (!result.ok || !result.data) return;

      const validFiles = result.data.filter((file) => (file.tokenCount ?? 0) > 0);
      store.getState().setFilesData(validFiles);
    } finally {
      store.getState().setIsLoadingContents(false);
    }
  }, [store]);

  return { loadProjectTree, loadSelectedFileContents };
}
