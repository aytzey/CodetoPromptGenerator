// lib/hooks/useRefactoredHomePageLogic.ts
import { useMemo } from "react";
import { useProjectLogic } from "./useProjectLogic";
import { useDataInitialization } from "./useDataInitialization";
import { useUIState } from "./useUIState";
import { useServiceActions } from "./useServiceActions";

export function useRefactoredHomePageLogic() {
  const { isClient, apiKeyDraft, setApiKeyDraft } = useDataInitialization();
  const projectLogic = useProjectLogic();
  const uiState = useUIState();
  const serviceActions = useServiceActions(apiKeyDraft);

  const hasContent = useMemo(
    () => uiState.hasContent || projectLogic.selectedFileCount > 0,
    [uiState.hasContent, projectLogic.selectedFileCount],
  );

  return {
    isClient,
    projectPath: projectLogic.projectPath,
    isLoadingTree: projectLogic.isLoadingTree,
    isSelecting: serviceActions.isSelecting,
    activeTab: uiState.activeTab,
    selectedFilePaths: projectLogic.selectedFilePaths,
    fileSearchTerm: projectLogic.fileSearchTerm,
    hasContent,
    selectedFileCount: projectLogic.selectedFileCount,
    totalTokens: projectLogic.totalTokens,
    apiKeyDraft,
    fileTree: projectLogic.fileTree,
    rawFileTree: projectLogic.rawFileTree,

    handlePathSelected: projectLogic.handlePathSelected,
    autoSelect: serviceActions.autoSelect,
    openSettingsModal: uiState.openSettingsModal,
    saveApiKey: serviceActions.saveApiKey,
    setApiKeyDraft,
    setActiveTab: uiState.setActiveTab,
    setFileSearchTerm: projectLogic.setFileSearchTerm,
    handleRefresh: projectLogic.handleRefresh,
    handleSelectAll: projectLogic.handleSelectAll,
    deselectAllFiles: projectLogic.deselectAllFiles,
    setSelectedFilePaths: projectLogic.setSelectedFilePaths,
    treeRef: uiState.treeRef,
  };
}
