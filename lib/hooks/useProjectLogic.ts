// lib/hooks/useProjectLogic.ts
import { useEffect, useMemo, useCallback } from "react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useExclusionStore } from "@/stores/useExclusionStore";
import { useProjectService } from "@/services/projectServiceHooks";
import { applyExtensionFilter, applySearchFilter, flattenTree } from "@/lib/fileFilters";

/**
 * Hook for managing project-related logic including:
 * - Project path changes
 * - File tree loading and filtering
 * - File selection operations
 */
export function useProjectLogic() {
  // Store selectors
  const projectPath = useProjectStore((s) => s.projectPath);
  const setProjectPath = useProjectStore((s) => s.setProjectPath);
  const fileTree = useProjectStore((s) => s.fileTree);
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

  // Services
  const { loadProjectTree, loadSelectedFileContents } = useProjectService();

  // Effects for project lifecycle
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

  // Derived data
  const filteredTree = useMemo(() => {
    const extFiltered = extensionFilters.length
      ? applyExtensionFilter(fileTree, extensionFilters)
      : fileTree;
    return fileSearchTerm.trim()
      ? applySearchFilter(extFiltered, fileSearchTerm.toLowerCase())
      : extFiltered;
  }, [fileTree, extensionFilters, fileSearchTerm]);

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

  // Event handlers
  const handleSelectAll = useCallback(() => {
    if (!projectPath) return;
    const allVisibleFiles = flattenTree(filteredTree).filter(
      (p) => !p.endsWith("/"),
    );
    selectAllFiles(
      allVisibleFiles,
      new Set(globalExclusions),
      localExclusionsSet,
    );
  }, [projectPath, filteredTree, selectAllFiles, globalExclusions, localExclusionsSet]);

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
    // State
    projectPath,
    isLoadingTree,
    filteredTree,
    selectedFilePaths,
    fileSearchTerm,
    selectedFileCount,
    totalTokens,
    fileTree,
    
    // Actions
    handlePathSelected,
    handleRefresh,
    handleSelectAll,
    deselectAllFiles,
    setSelectedFilePaths,
    setFileSearchTerm,
  };
}