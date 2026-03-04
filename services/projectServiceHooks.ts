import { useCallback } from "react";
import { useProjectStore } from "@/stores/useProjectStore";
import { fetchApiResult } from "./apiService";
import type { FileData, FileNode } from "@/types";

let latestTreeRequestId = 0;
let latestContentsRequestId = 0;

export function useProjectService() {
  const store = useProjectStore;

  const loadProjectTree = useCallback(async () => {
    const projectPath = store.getState().projectPath;
    if (!projectPath) {
      latestTreeRequestId += 1;
      store.getState().setIsLoadingTree(false);
      return;
    }

    const requestId = ++latestTreeRequestId;
    const requestPath = projectPath;

    store.getState().setIsLoadingTree(true);
    try {
      const result = await fetchApiResult<FileNode[]>(
        `/api/projects/tree?rootDir=${encodeURIComponent(projectPath)}`,
      );
      if (requestId !== latestTreeRequestId) return;
      if (store.getState().projectPath !== requestPath) return;

      store.getState().setFileTree(result.ok && result.data ? result.data : []);
    } finally {
      if (requestId === latestTreeRequestId) {
        store.getState().setIsLoadingTree(false);
      }
    }
  }, [store]);

  const loadSelectedFileContents = useCallback(async () => {
    const { projectPath, selectedFilePaths } = store.getState();
    if (!projectPath || selectedFilePaths.length === 0) {
      latestContentsRequestId += 1;
      store.getState().setFilesData([]);
      store.getState().setIsLoadingContents(false);
      return;
    }

    const pathsToFetch = selectedFilePaths.filter((path) => !path.endsWith("/"));
    if (pathsToFetch.length === 0) {
      latestContentsRequestId += 1;
      store.getState().setFilesData([]);
      store.getState().setIsLoadingContents(false);
      return;
    }

    const requestId = ++latestContentsRequestId;
    const requestPath = projectPath;
    const requestPathsKey = pathsToFetch.join("\u0000");

    store.getState().setIsLoadingContents(true);
    try {
      const result = await fetchApiResult<FileData[]>("/api/projects/files", {
        method: "POST",
        body: JSON.stringify({ baseDir: projectPath, paths: pathsToFetch }),
      });
      if (requestId !== latestContentsRequestId) return;
      if (store.getState().projectPath !== requestPath) return;

      const currentPathsKey = store
        .getState()
        .selectedFilePaths
        .filter((path) => !path.endsWith("/"))
        .join("\u0000");
      if (currentPathsKey !== requestPathsKey) return;

      if (!result.ok || !result.data) return;

      const validFiles = result.data.filter((file) => (file.tokenCount ?? 0) > 0);
      store.getState().setFilesData(validFiles);
    } finally {
      if (requestId === latestContentsRequestId) {
        store.getState().setIsLoadingContents(false);
      }
    }
  }, [store]);

  return { loadProjectTree, loadSelectedFileContents };
}
