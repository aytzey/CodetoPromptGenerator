// File: pages/index.tsx
// FULL FILE – 2025‑04‑17  (🔧 Fix “Select All” button: use relative paths)

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import Head from "next/head";
import {
  Settings,
  FileCode,
  List,
  Sun,
  Moon,
  Github,
  Search,
  RefreshCw,
  CheckSquare,
  XSquare,
  Code,
  LayoutGrid,
  Zap,
  Flame,
  BookOpen,
  Terminal,
  HelpCircle,
  Rocket,
  Coffee,
  X,
  Folder,
  BarChart2,
  ListChecks,
  ChevronsUp,
  ChevronsDown,
  KeyRound,
  PlusCircle,
} from "lucide-react";

import { useSelectionGroupStore } from "@/stores/useSelectionGroupStore";
import SelectionGroupsView from "@/views/SelectionGroupsView";
import type { FileTreeViewHandle } from "@/views/FileTreeView";

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

import FileTreeView from "@/views/FileTreeView";
import InstructionsInputView from "@/views/InstructionsInputView";
import CopyButtonView from "@/views/CopyButtonView";
import SelectedFilesListView from "@/views/SelectedFilesListView";
import FolderPickerView from "@/views/FolderPickerView";
import ExclusionsManagerView from "@/views/ExclusionsManagerView";
import LocalExclusionsManagerView from "@/views/LocalExclusionsManagerView";
import TodoListView from "@/views/TodoListView";

import {
  applyExtensionFilter,
  applySearchFilter,
  flattenTree,
} from "@/lib/fileFilters";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────── */
/* helpers                                                        */
/* ────────────────────────────────────────────────────────────── */

/**
 * Single source‑of‑truth key for the OpenRouter secret.
 * Now matches the zustand useSettingsStore implementation.
 */
const LS_KEY_OR = "openrouterApiKey";

/* ────────────────────────────────────────────────────────────── */
/* main component                                                 */
/* ────────────────────────────────────────────────────────────── */
export default function Home() {
  /* ————————————————— global state ————————————————— */
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

  /* settings store */
  const setOpenrouterApiKey = useSettingsStore((s) => s.setOpenrouterApiKey);

  /* ————————————————— services ————————————————— */
  const { loadProjectTree, loadSelectedFileContents } = useProjectService();
  const { fetchMetaPromptList } = usePromptService();
  const { fetchGlobalExclusions } = useExclusionService();
  const { loadTodos } = useTodoService();
  const { autoSelect, isSelecting } = useAutoSelectService();

  /* ————————————————— refs & local UI state ————————————————— */
  const treeRef = useRef<FileTreeViewHandle>(null);
  const [activeTab, setActiveTab] = useState<"files" | "options" | "tasks">(
    "files",
  );
  const [extensionInput, setExtensionInput] = useState("");
  const [showWelcome, setShowWelcome] = useState(true);

  /* OpenRouter settings modal */
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState<string>("");

  /* ————————————————— lifecycle ————————————————— */
  /* ① initial load */
  useEffect(() => {
    fetchGlobalExclusions();
    fetchMetaPromptList();
    setApiKeyDraft(localStorage.getItem(LS_KEY_OR) ?? "");
  }, [fetchGlobalExclusions, fetchMetaPromptList]);

  /* ② respond to projectPath change */
  useEffect(() => {
    if (projectPath) {
      setShowWelcome(false);
      loadProjectTree();
      loadTodos();
    } else {
      useProjectStore.setState({
        fileTree: [],
        selectedFilePaths: [],
        filesData: [],
      });
      useTodoStore.setState({ todos: [] });
    }
  }, [projectPath, loadProjectTree, loadTodos]);

  /* ③ load file contents when selection changes */
  useEffect(() => {
    if (projectPath && selectedFilePaths.length) {
      loadSelectedFileContents();
    } else {
      useProjectStore.setState({ filesData: [] });
    }
  }, [selectedFilePaths, projectPath, loadSelectedFileContents]);

  /* ————————————————— derived ————————————————— */
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

  /* ────────────────────────────────────────────────────────── */
  /*              🔑  FIX:  Select All Handler                  */
  /* ────────────────────────────────────────────────────────── */
  const handleSelectAll = () => {
    if (!projectPath) return;

    // 1. Grab every visible *relative* path in the current tree view
    // 2. Ignore directory placeholders (those end with “/”)
    const allVisibleFiles = flattenTree(filteredTree).filter(
      (p) => !p.endsWith("/"),
    );

    // 3. Delegate to the store helper – it will honour global/local exclusions
    selectAllFiles(allVisibleFiles, new Set(globalExclusions), localExclusionsSet);
  };

  const handleRefresh = async () => {
    if (!projectPath) return;
    await loadProjectTree();
    await loadSelectedFileContents();
  };

  /* ╭─────────────────────────────────────────────────────────╮
   * │  OPENROUTER KEY – persist & validate                    │
   * ╰─────────────────────────────────────────────────────────╯ */
  const saveApiKey = () => {
    const trimmed = apiKeyDraft.trim();
    if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(trimmed)) {
      setError("API key format looks invalid.");
      return;
    }
    localStorage.setItem(LS_KEY_OR, trimmed);
    setOpenrouterApiKey(trimmed); // keep zustand & LS in sync
    setShowSettings(false);
  };


  /* ————————————————— render ————————————————— */
  return (
    <div className="min-h-screen">
      <Head>
        <title>Code → Prompt Generator</title>
        <meta
          name="description"
          content="Generate finely‑tuned LLM prompts straight from your code base."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* ────────────── HEADER ────────────── */}
      <header className="sticky top-0 z-20 px-6 py-3 shadow-md border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border-gray-200 dark:border-gray-800">
        <div className="container mx-auto flex justify-between items-center">
          {/* left */}
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-sm">
              <Code size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-500 text-transparent bg-clip-text">
              Code to Prompt
            </h1>
          </div>

          {/* right */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Smart‑select */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!projectPath || isSelecting}
                    onClick={autoSelect}
                    className="border-teal-300 text-teal-600 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-400"
                  >
                    {isSelecting ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Zap size={18} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Smart‑Select files with Gemma‑3
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* theme toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleDark}
                    className="rounded-full h-9 w-9"
                  >
                    {darkMode ? (
                      <Sun size={18} className="text-amber-400" />
                    ) : (
                      <Moon size={18} className="text-indigo-600" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {darkMode ? "Light Mode" : "Dark Mode"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* settings */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(true)}
                    className="rounded-full h-9 w-9"
                  >
                    <Settings size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* GitHub */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      window.open(
                        "https://github.com/aytzey/CodetoPromptGenerator",
                        "_blank",
                      )
                    }
                    className="rounded-full h-9 w-9"
                  >
                    <Github size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">View on GitHub</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      {/* ────────────── MAIN ────────────── */}
      <main className="container mx-auto px-4 sm:px-6 pt-6 pb-10">
        {/* project picker */}
        <Card className="mb-6">
          <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 py-3 px-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Folder size={16} className="text-indigo-500" />
              Project Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <FolderPickerView
              currentPath={projectPath}
              onPathSelected={setProjectPath}
              isLoading={isLoadingTree}
            />
          </CardContent>
        </Card>

        {/* welcome */}
        {showWelcome && !projectPath ? (
          <Card className="mt-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-100 dark:border-indigo-900/40 shadow-lg overflow-hidden">
            <CardContent className="p-6 md:p-8 flex flex-col items-center text-center">
              <Rocket size={48} className="text-indigo-500 mb-4" />
              <h2 className="text-2xl font-bold text-indigo-800 dark:text-indigo-300 mb-2">
                Code to Prompt Generator
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-xl text-sm">
                Select a project folder above to scan files, add instructions,
                and generate structured LLM prompts.
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => setShowWelcome(false)}
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* GRID */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT – Tabs */}
            <div className="lg:col-span-2 space-y-6">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as any)}
              >
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="files">
                    <FileCode size={16} className="mr-1" />
                    Files
                  </TabsTrigger>
                  <TabsTrigger value="options">
                    <Settings size={16} className="mr-1" />
                    Options
                  </TabsTrigger>
                  <TabsTrigger value="tasks">
                    <ListChecks size={16} className="mr-1" />
                    Tasks
                  </TabsTrigger>
                </TabsList>

                {/* FILES TAB */}
                <TabsContent value="files" className="mt-4 space-y-5">
                  {/* file tree */}
                  <Card>
                    <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <FileCode size={16} className="text-indigo-500" />
                          Project Files
                        </CardTitle>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* search */}
                          <div className="relative">
                            <Search
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                              size={14}
                            />
                            <Input
                              placeholder="Filter files…"
                              value={fileSearchTerm}
                              onChange={(e) =>
                                setFileSearchTerm(e.target.value)
                              }
                              className="pl-8 h-8 w-40"
                            />
                          </div>
                          {/* refresh */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleRefresh}
                            disabled={isLoadingTree || !projectPath}
                          >
                            <RefreshCw
                              size={14}
                              className={cn(
                                "mr-1",
                                isLoadingTree && "animate-spin",
                              )}
                            />
                            Refresh
                          </Button>
                          {/* select/deselect */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSelectAll}
                            disabled={!projectPath}
                          >
                            <CheckSquare size={14} className="mr-1" />
                            Select All
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={deselectAllFiles}
                            disabled={!selectedFilePaths.length}
                          >
                            <XSquare size={14} className="mr-1" />
                            Deselect
                          </Button>
                          {/* expand/collapse */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => treeRef.current?.expandAll()}
                            disabled={!projectPath}
                          >
                            <ChevronsDown size={14} className="mr-1" />
                            Expand
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => treeRef.current?.collapseAll()}
                            disabled={!projectPath}
                          >
                            <ChevronsUp size={14} className="mr-1" />
                            Collapse
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      {isLoadingTree ? (
                        <div className="flex items-center justify-center py-10 text-gray-400">
                          <RefreshCw
                            size={24}
                            className="animate-spin mr-2"
                          />
                          Loading tree…
                        </div>
                      ) : !projectPath ? (
                        <div className="text-center py-10 text-gray-400 text-sm">
                          Select a project folder above.
                        </div>
                      ) : (
                        <FileTreeView
                          ref={treeRef}
                          tree={filteredTree}
                          selectedFiles={selectedFilePaths}
                          onSelectFiles={setSelectedFilePaths}
                        />
                      )}
                    </CardContent>
                  </Card>

                  {/* selected files list */}
                  <Card>
                    <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <CheckSquare size={16} className="text-teal-500" />
                        Selected Files
                        {selectedFileCount > 0 && (
                          <Badge variant="secondary" className="ml-auto">
                            {selectedFileCount}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 space-y-3">
                      <SelectedFilesListView />
                      <SelectionGroupsView
                        projectPath={projectPath}
                        fileTree={fileTree}
                        selectedPaths={selectedFilePaths}
                        onSelectPaths={setSelectedFilePaths}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* OPTIONS TAB */}
                <TabsContent value="options" className="mt-4 space-y-5">
                  <ExclusionsManagerView />
                  {projectPath && (
                    <LocalExclusionsManagerView projectPath={projectPath} />
                  )}
                </TabsContent>

                {/* TASKS TAB */}
                <TabsContent value="tasks" className="mt-4">
                  {projectPath ? (
                    <TodoListView />
                  ) : (
                    <div className="p-6 border border-dashed text-center text-gray-500 dark:text-gray-400 rounded-lg">
                      <ListChecks size={32} className="mx-auto mb-2 opacity-50" />
                      Select a project to manage tasks.
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* RIGHT – Prompts & copy */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BookOpen size={16} className="text-purple-500" />
                    Prompt Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <InstructionsInputView />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Flame size={16} className="text-orange-500" />
                    Generate & Copy
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {hasContent ? (
                    <CopyButtonView />
                  ) : (
                    <div className="flex flex-col items-center py-6 text-gray-500">
                      <Coffee size={24} className="mb-2" />
                      Select files or add instructions first.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart2 size={16} className="text-blue-500" />
                    Prompt Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span>Files</span>
                    <span className="font-medium">{selectedFileCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span>Tokens</span>
                    <span className="font-medium">
                      {totalTokens.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* footer */}
        <footer className="mt-12 border-t pt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          Code to Prompt Generator © {new Date().getFullYear()} Aytzey
        </footer>
      </main>

      {/* ────────────── SETTINGS MODAL ────────────── */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={18} className="text-indigo-500" />
              OpenRouter Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 px-1">
            <Label htmlFor="or-key" className="font-medium">
              API Key
            </Label>
            <Input
              id="or-key"
              type="password"
              placeholder="sk-..."
              value={apiKeyDraft}
              onChange={(e) => setApiKeyDraft(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Stored locally in your browser (never sent to our server).
            </p>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={saveApiKey} disabled={!apiKeyDraft.trim()}>
              <PlusCircle size={16} className="mr-1" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
