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

  import {
    applyExtensionFilter,
    applySearchFilter,
    flattenTree,
  } from "@/lib/fileFilters";
  import type { FileTreeViewHandle } from "@/views/FileTreeView";

  const LS_KEY_OR = "openrouterApiKey";

  export function useHomePageLogic() {
    // --- Global State ---
    // Removed darkMode and toggleDark
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
    // Removed showWelcome state
    // const [showWelcome, setShowWelcome] = useState(true);
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
      // Load API key from localStorage on mount
      const storedKey = localStorage.getItem(LS_KEY_OR) ?? "";
      setApiKeyDraft(storedKey);
      // Also set it in the store if found
      if (storedKey) {
        setOpenrouterApiKey(storedKey);
      }
    }, [fetchGlobalExclusions, fetchMetaPromptList, setOpenrouterApiKey]);

    useEffect(() => {
      // Actions triggered by projectPath change
      if (projectPath) {
        // setShowWelcome(false); // Removed welcome logic
        loadProjectTree();
        loadTodos();
        fetchLocalExclusions();
      } else {
        // setShowWelcome(true); // Removed welcome logic
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
      () => filesData.reduce((a, f) => a + (f.tokenCount ?? 0), 0), // Added nullish coalescing for safety
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
      // Reload content only if there's a selection
      if (useProjectStore.getState().selectedFilePaths.length > 0) {
        await loadSelectedFileContents();
      }
    }, [projectPath, loadProjectTree, loadSelectedFileContents]);

    const saveApiKey = useCallback(() => {
      const trimmed = apiKeyDraft.trim();
      // Basic check, can be improved
      if (!trimmed.startsWith("sk-")) {
        setError("API key format looks invalid. It should start with 'sk-'.");
        return;
      }
      localStorage.setItem(LS_KEY_OR, trimmed);
      setOpenrouterApiKey(trimmed);
      setShowSettings(false);
    }, [apiKeyDraft, setOpenrouterApiKey, setError]);

    const handlePathSelected = useCallback((path: string) => {
        setProjectPath(path);
    }, [setProjectPath]);

    // Removed handleDismissWelcome
    // const handleDismissWelcome = useCallback(() => {
    //     setShowWelcome(false);
    // }, []);

    // --- Return values needed by the UI ---
    return {
      // State
      isClient,
      // showWelcome, // Removed
      projectPath,
      isLoadingTree,
      // darkMode, // Removed
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
      // handleDismissWelcome, // Removed
      // toggleDark, // Removed
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
      fileTree, // Pass down to MainLayout -> LeftPanel -> SelectionGroups
    };
  }