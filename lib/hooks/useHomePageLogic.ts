// File: lib/hooks/useHomePageLogic.ts
// NEW FILE
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
  
  import {
    applyExtensionFilter,
    applySearchFilter,
    flattenTree,
  } from "@/lib/fileFilters";
  import type { FileTreeViewHandle } from "@/views/FileTreeView";
  
  const LS_KEY_OR = "openrouterApiKey";
  
  export function useHomePageLogic() {
    // --- Global State ---
    const darkMode = useAppStore((s) => s.darkMode);
    const toggleDark = useAppStore((s) => s.toggleDarkMode);
    const setError = useAppStore((s) => s.setError);
  
    const {
      projectPath,
      setProjectPath,
      fileTree,
      selectedFilePaths,
      setSelectedFilePaths,
      isLoadingTree,
      filesData,
      fileSearchTerm,
      setFileSearchTerm,
      selectAllFiles,
      deselectAllFiles,
    } = useProjectStore();
  
    const { metaPrompt, mainInstructions } = usePromptStore();
    const { globalExclusions, localExclusions, extensionFilters } =
      useExclusionStore();
    const { todos } = useTodoStore();
    const setOpenrouterApiKey = useSettingsStore((s) => s.setOpenrouterApiKey);
  
    // --- Services ---
    const { loadProjectTree, loadSelectedFileContents } = useProjectService();
    const { fetchMetaPromptList } = usePromptService();
    const { fetchGlobalExclusions, fetchLocalExclusions } = useExclusionService();
    const { loadTodos } = useTodoService();
    const { autoSelect, isSelecting } = useAutoSelectService();
  
    // --- Refs & Local UI State ---
    const treeRef = useRef<FileTreeViewHandle>(null);
    const [activeTab, setActiveTab] = useState<"files" | "options" | "tasks">(
      "files",
    );
    const [showWelcome, setShowWelcome] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [apiKeyDraft, setApiKeyDraft] = useState<string>("");
    const [isClient, setIsClient] = useState(false);
  
    // --- Lifecycle Effects ---
    useEffect(() => {
      setIsClient(true); // Client-side mount detection
    }, []);
  
    useEffect(() => {
      // Initial data load independent of project path
      fetchGlobalExclusions();
      fetchMetaPromptList();
      setApiKeyDraft(localStorage.getItem(LS_KEY_OR) ?? "");
    }, [fetchGlobalExclusions, fetchMetaPromptList]);
  
    useEffect(() => {
      // Actions triggered by projectPath change
      if (projectPath) {
        setShowWelcome(false);
        loadProjectTree();
        loadTodos();
        fetchLocalExclusions();
      } else {
        setShowWelcome(true);
        // Reset project-specific stores
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
      // Load file contents when selection changes
      if (projectPath && selectedFilePaths.length) {
        loadSelectedFileContents();
      } else {
        useProjectStore.setState({ filesData: [] }); // Clear content if selection is empty
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
      () => filesData.reduce((a, f) => a + f.tokenCount, 0),
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
      selectAllFiles(
        allVisibleFiles,
        new Set(globalExclusions),
        localExclusionsSet,
      );
    }, [projectPath, filteredTree, selectAllFiles, globalExclusions, localExclusionsSet]);
  
    const handleRefresh = useCallback(async () => {
      if (!projectPath) return;
      await loadProjectTree();
      await loadSelectedFileContents();
    }, [projectPath, loadProjectTree, loadSelectedFileContents]);
  
    const saveApiKey = useCallback(() => {
      const trimmed = apiKeyDraft.trim();
      if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(trimmed)) {
        setError("API key format looks invalid.");
        return;
      }
      localStorage.setItem(LS_KEY_OR, trimmed);
      setOpenrouterApiKey(trimmed);
      setShowSettings(false);
    }, [apiKeyDraft, setOpenrouterApiKey, setError]);
  
    const handlePathSelected = useCallback((path: string) => {
        setProjectPath(path);
    }, [setProjectPath]);
  
    const handleDismissWelcome = useCallback(() => {
        setShowWelcome(false);
    }, []);
  
    // --- Return values needed by the UI ---
    return {
      // State
      isClient,
      showWelcome,
      projectPath,
      isLoadingTree,
      darkMode,
      isSelecting,
      activeTab,
      filteredTree,
      selectedFilePaths,
      fileSearchTerm,
      localExclusions, // Needed for LocalExclusionsManagerView
      todos, // Needed for TodoListView
      hasContent,
      selectedFileCount,
      totalTokens,
      showSettings,
      apiKeyDraft,
      // Setters & Handlers
      handlePathSelected,
      handleDismissWelcome,
      toggleDark,
      autoSelect,
      setShowSettings,
      saveApiKey,
      setApiKeyDraft,
      setActiveTab,
      setFileSearchTerm,
      handleRefresh,
      handleSelectAll,
      deselectAllFiles,
      setSelectedFilePaths, // Pass down to FileTreeView and SelectionGroupsView
      // Refs
      treeRef,
    };
  }