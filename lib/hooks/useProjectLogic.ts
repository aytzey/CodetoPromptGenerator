import { useEffect, useMemo, useCallback } from "react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useExclusionStore } from "@/stores/useExclusionStore";
import { useProjectService } from "@/services/projectServiceHooks";
import {
  applyExtensionFilter,
  applySearchFilter,
  applyWildcardFilter,
  flattenTree,
  parseWildcardInput,
} from "@/lib/fileFilters";

export function useProjectLogic() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const setProjectPath = useProjectStore((s) => s.setProjectPath);
  const rawFileTree = useProjectStore((s) => s.fileTree);
  const selectedFilePaths = useProjectStore((s) => s.selectedFilePaths);
  const setSelectedFilePaths = useProjectStore((s) => s.setSelectedFilePaths);
  const isLoadingTree = useProjectStore((s) => s.isLoadingTree);
  const filesData = useProjectStore((s) => s.filesData);
  const fileSearchTerm = useProjectStore((s) => s.fileSearchTerm);
  const setFileSearchTerm = useProjectStore((s) => s.setFileSearchTerm);
  const selectAllFiles = useProjectStore((s) => s.selectAllFiles);
  const deselectAllFiles = useProjectStore((s) => s.deselectAllFiles);

  const globalExclusions = useExclusionStore((s) => s.globalExclusions);
  const localExclusions = useExclusionStore((s) => s.localExclusions);
  const extensionFilters = useExclusionStore((s) => s.extensionFilters);

  const { loadProjectTree, loadSelectedFileContents } = useProjectService();

  useEffect(() => {
    if (projectPath) {
      loadProjectTree();
    } else {
      useProjectStore.setState({
        fileTree: [],
        selectedFilePaths: [],
        filesData: [],
      });
    }
  }, [projectPath, loadProjectTree]);

  useEffect(() => {
    if (projectPath && selectedFilePaths.length) {
      loadSelectedFileContents();
    } else {
      useProjectStore.setState({ filesData: [] });
    }
  }, [selectedFilePaths, projectPath, loadSelectedFileContents]);

  const visibleTree = useMemo(() => {
    const extFiltered = extensionFilters.length
      ? applyExtensionFilter(rawFileTree, extensionFilters)
      : rawFileTree;

    const searchTerm = fileSearchTerm.trim();
    if (!searchTerm) {
      return extFiltered;
    }

    const hasWildcard = /[*?\[\]]/.test(searchTerm);
    if (hasWildcard) {
      return applyWildcardFilter(extFiltered, parseWildcardInput(searchTerm));
    }

    return applySearchFilter(extFiltered, searchTerm.toLowerCase());
  }, [rawFileTree, extensionFilters, fileSearchTerm]);

  const localExclusionsSet = useMemo(
    () => new Set(localExclusions),
    [localExclusions],
  );

  const selectedFileCount = useMemo(
    () => selectedFilePaths.filter((p) => !p.endsWith("/")).length,
    [selectedFilePaths],
  );

  const totalTokens = useMemo(
    () => filesData.reduce((a, f) => a + (f.tokenCount ?? 0), 0),
    [filesData],
  );

  const handleSelectAll = useCallback(() => {
    if (!projectPath) return;
    const allVisibleFiles = flattenTree(visibleTree).filter(
      (p) => !p.endsWith("/"),
    );
    selectAllFiles(
      allVisibleFiles,
      new Set(globalExclusions),
      localExclusionsSet,
    );
  }, [projectPath, visibleTree, selectAllFiles, globalExclusions, localExclusionsSet]);

  const handleRefresh = useCallback(async () => {
    if (!projectPath) return;
    await loadProjectTree();
    if (useProjectStore.getState().selectedFilePaths.length > 0) {
      await loadSelectedFileContents();
    }
  }, [projectPath, loadProjectTree, loadSelectedFileContents]);

  const handlePathSelected = useCallback((path: string) => {
    setProjectPath(path);
  }, [setProjectPath]);

  return {
    projectPath,
    isLoadingTree,
    selectedFilePaths,
    fileSearchTerm,
    selectedFileCount,
    totalTokens,
    fileTree: visibleTree,
    rawFileTree,

    handlePathSelected,
    handleRefresh,
    handleSelectAll,
    deselectAllFiles,
    setSelectedFilePaths,
    setFileSearchTerm,
  };
}
