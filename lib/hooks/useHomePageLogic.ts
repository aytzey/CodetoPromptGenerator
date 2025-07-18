// FILE: lib/hooks/useHomePageLogic.ts
// lib/hooks/useHomePageLogic.ts
// Updated to remove theme and welcome logic
import {
    useState,
    useEffect,
    useMemo,
    useRef,
    useCallback,
  } from "react";
  import { useAppStore } from "@/stores/useAppStore";
  import { useProjectStore } from "@/stores/useProjectStore";
  import { usePromptStore } from "@/stores/usePromptStore";
  import { useExclusionStore } from "@/stores/useExclusionStore";
  import { useTodoStore } from "@/stores/useTodoStore";
  import { useSettingsStore } from "@/stores/useSettingStore";

  import { useProjectService } from "@/services/projectServiceHooks";
  import { usePromptService } from "@/services/promptServiceHooks";
  import { useExclusionService } from "@/services/exclusionServiceHooks";
  import { useTodoService } from "@/services/todoServiceHooks";
  import { useAutoSelectService } from "@/services/autoSelectServiceHooks";
  import { useActorWizardService } from "@/services/actorWizardServiceHooks";
  import {
    applyExtensionFilter,
    applySearchFilter,
    flattenTree,
    filterTextFiles,
  } from "@/lib/fileFilters";
  import type { FileTreeViewHandle } from "@/views/FileTreeView";

  const LS_KEY_OR = "openrouterApiKey";

  export function useHomePageLogic() {
    // --- Global State ---
    const setError = useAppStore((s) => s.setError);
    const openSettingsModal = useAppStore((s) => s.openSettingsModal);   // Get action from store
    const closeSettingsModal = useAppStore((s) => s.closeSettingsModal); // Get action from store

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

    const metaPrompt = usePromptStore((s) => s.metaPrompt);
    const mainInstructions = usePromptStore((s) => s.mainInstructions);

    const globalExclusions = useExclusionStore((s) => s.globalExclusions);
    const localExclusions = useExclusionStore((s) => s.localExclusions);
    const extensionFilters = useExclusionStore((s) => s.extensionFilters);

    const todos = useTodoStore((s) => s.todos);
    const setOpenrouterApiKey = useSettingsStore((s) => s.setOpenrouterApiKey);

    // --- Services ---
    const { loadProjectTree, loadSelectedFileContents } = useProjectService();
    const { fetchMetaPromptList } = usePromptService();
    const { fetchGlobalExclusions, fetchLocalExclusions } = useExclusionService();
    const { loadTodos } = useTodoService();
    const { autoSelect, isSelecting } = useAutoSelectService();
    const { generateActors, isGenerating } = useActorWizardService();

    // --- Refs & Local UI State ---
    const treeRef = useRef<FileTreeViewHandle>(null);
    const [activeTab, setActiveTab] = useState<"files" | "options" | "tasks" | "actors">( 
      "files",
    );
    // showSettings and setShowSettings are removed, managed by useAppStore
    const [apiKeyDraft, setApiKeyDraft] = useState<string>("");
    const [isClient, setIsClient] = useState(false);

    // --- Lifecycle Effects ---
    useEffect(() => {
      setIsClient(true); 
    }, []);

    useEffect(() => {
      fetchGlobalExclusions();
      fetchMetaPromptList();
      const storedKey = localStorage.getItem(LS_KEY_OR) ?? "";
      setApiKeyDraft(storedKey);
      if (storedKey) {
        setOpenrouterApiKey(storedKey);
      }
    }, [fetchGlobalExclusions, fetchMetaPromptList, setOpenrouterApiKey]);

    useEffect(() => {
      if (projectPath) {
        loadProjectTree();
        loadTodos();
        fetchLocalExclusions();
      } else {
        useProjectStore.setState({
          fileTree: [],
          selectedFilePaths: [],
          filesData: [],
        });
        useTodoStore.setState({ todos: [] });
        useExclusionStore.setState({ localExclusions: [] });
      }
    }, [projectPath, loadProjectTree, loadTodos, fetchLocalExclusions]);

    useEffect(() => {
      if (projectPath && selectedFilePaths.length) {
        loadSelectedFileContents();
      } else {
        useProjectStore.setState({ filesData: [] }); 
      }
    }, [selectedFilePaths, projectPath, loadSelectedFileContents]);

    // --- Derived Data ---
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

    const hasContent = useMemo(
      () =>
        metaPrompt.trim() || mainInstructions.trim() || selectedFileCount > 0,
      [metaPrompt, mainInstructions, selectedFileCount],
    );

    // --- Event Handlers ---
    const handleSelectAll = useCallback(() => {
      if (!projectPath) return;
      const allVisibleFiles = flattenTree(filteredTree).filter(
        (p) => !p.endsWith("/"),
      );
      // Filter to only include text files
      const textFilesOnly = filterTextFiles(allVisibleFiles);
      selectAllFiles(
        textFilesOnly,
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

    const saveApiKey = useCallback(() => {
      const trimmed = apiKeyDraft.trim();
      if (!trimmed.startsWith("sk-")) {
        setError("API key format looks invalid. It should start with 'sk-'.");
        return;
      }
      localStorage.setItem(LS_KEY_OR, trimmed);
      setOpenrouterApiKey(trimmed);
      closeSettingsModal(); // Use store action to close
    }, [apiKeyDraft, setOpenrouterApiKey, setError, closeSettingsModal]);

    const handlePathSelected = useCallback((path: string) => {
        setProjectPath(path);
    }, [setProjectPath]);

    // --- Return values needed by the UI ---
    return {
      // State
      isClient,
      projectPath,
      isLoadingTree,
      isSelecting,
      activeTab,
      filteredTree, 
      selectedFilePaths,
      fileSearchTerm,
      localExclusions, 
      todos, 
      hasContent,
      selectedFileCount,
      totalTokens,
      // Settings Modal specific props
      apiKeyDraft,
      // Setters & Handlers
      handlePathSelected,
      autoSelect,
      generateActors,
      isGeneratingActors: isGenerating,
      openSettingsModal, // Expose store action
      saveApiKey,
      setApiKeyDraft,
      setActiveTab,
      setFileSearchTerm,
      handleRefresh,
      handleSelectAll,
      deselectAllFiles,
      setSelectedFilePaths,
      // Refs
      treeRef,
      fileTree, 
    };
  }