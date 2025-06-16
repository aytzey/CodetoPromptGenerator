// lib/hooks/useRefactoredHomePageLogic.ts
import { useMemo } from "react";
import { useTodoStore } from "@/stores/useTodoStore";
import { useExclusionStore } from "@/stores/useExclusionStore";
import { useProjectLogic } from "./useProjectLogic";
import { useDataInitialization } from "./useDataInitialization";
import { useUIState } from "./useUIState";
import { useServiceActions } from "./useServiceActions";

/**
 * Refactored main hook that composes smaller, focused hooks
 * This replaces the original useHomePageLogic with better separation of concerns
 */
export function useRefactoredHomePageLogic() {
  // Initialize data and client state
  const { isClient, apiKeyDraft, setApiKeyDraft } = useDataInitialization();
  
  // Manage project-related logic
  const projectLogic = useProjectLogic();
  
  // Manage UI state
  const uiState = useUIState();
  
  // Manage service actions
  const serviceActions = useServiceActions(apiKeyDraft);

  // Additional store selectors that don't fit in other hooks
  const todos = useTodoStore((s) => s.todos);
  const localExclusions = useExclusionStore((s) => s.localExclusions);

  // Combine hasContent logic with file count
  const hasContent = useMemo(
    () => uiState.hasContent || projectLogic.selectedFileCount > 0,
    [uiState.hasContent, projectLogic.selectedFileCount],
  );

  // Return the combined interface that matches the original useHomePageLogic
  return {
    // State from various hooks
    isClient,
    projectPath: projectLogic.projectPath,
    isLoadingTree: projectLogic.isLoadingTree,
    isSelecting: serviceActions.isSelecting,
    activeTab: uiState.activeTab,
    filteredTree: projectLogic.filteredTree,
    selectedFilePaths: projectLogic.selectedFilePaths,
    fileSearchTerm: projectLogic.fileSearchTerm,
    localExclusions,
    todos,
    hasContent,
    selectedFileCount: projectLogic.selectedFileCount,
    totalTokens: projectLogic.totalTokens,
    apiKeyDraft,
    fileTree: projectLogic.fileTree,
    
    // Actions from various hooks
    handlePathSelected: projectLogic.handlePathSelected,
    autoSelect: serviceActions.autoSelect,
    generateActors: serviceActions.generateActors,
    isGeneratingActors: serviceActions.isGeneratingActors,
    openSettingsModal: uiState.openSettingsModal,
    saveApiKey: serviceActions.saveApiKey,
    setApiKeyDraft,
    setActiveTab: uiState.setActiveTab,
    setFileSearchTerm: projectLogic.setFileSearchTerm,
    handleRefresh: projectLogic.handleRefresh,
    handleSelectAll: projectLogic.handleSelectAll,
    deselectAllFiles: projectLogic.deselectAllFiles,
    setSelectedFilePaths: projectLogic.setSelectedFilePaths,
    
    // Refs
    treeRef: uiState.treeRef,
  };
}