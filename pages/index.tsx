// File: pages/index.tsx
// REFACTOR / OVERWRITE
import React, { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import {
  Settings, FileCode, List, Sun, Moon, Github, Search, RefreshCw,
  CheckSquare, XSquare, Code, LayoutGrid, Zap, Flame, BookOpen, Terminal,
  HelpCircle, Rocket, Coffee, X, Folder, BarChart2, ListChecks,ChevronsUp, ChevronsDown
} from "lucide-react";


import { useSelectionGroupStore } from "@/stores/useSelectionGroupStore";         /* NEW */
import SelectionGroupsView from "@/views/SelectionGroupsView";                    /* NEW */
import type { FileTreeViewHandle } from "@/views/FileTreeView"; 
// Import Zustand Stores
import { useAppStore } from "@/stores/useAppStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { usePromptStore } from "@/stores/usePromptStore";
import { useExclusionStore } from "@/stores/useExclusionStore";
import { useTodoStore } from "@/stores/useTodoStore";

// Import Service Hooks
import { useProjectService } from "@/services/projectServiceHooks";
import { usePromptService } from "@/services/promptServiceHooks";
import { useExclusionService } from "@/services/exclusionServiceHooks";
import { useTodoService } from "@/services/todoServiceHooks"; // Needed for initial load trigger maybe?

// Import Views
import FileTreeView from "../views/FileTreeView";
import InstructionsInputView from "../views/InstructionsInputView";
import CopyButtonView from "../views/CopyButtonView";
import SelectedFilesListView from "../views/SelectedFilesListView";
import FolderPickerView from "../views/FolderPickerView";
import ExclusionsManagerView from "../views/ExclusionsManagerView";
import LocalExclusionsManagerView from "../views/LocalExclusionsManagerView";
import TodoListView from "../views/TodoListView";

// Import Libs/Types
import { applyExtensionFilter, applySearchFilter, flattenTree, flattenFilePaths } from "@/lib/fileFilters";
import { FileNode, FileData, TodoItem } from '@/types'; // Use central types

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// Alert for global errors is now in _app.tsx
// import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";


/**
 * Helper to get all descendant paths (files & subfolders) under a given node path.
 * Needed for 'Select All' exclusion logic.
 */
function getAllDescendantsOfPath(tree: FileNode[], targetPath: string): string[] {
    const normTarget = targetPath.replace(/\\/g, "/");
    const stack: FileNode[] = [...tree];
    const results: string[] = [];

    while (stack.length > 0) {
        const node = stack.pop()!;
        const normNodePath = node.relativePath.replace(/\\/g, "/");

        if (normNodePath === normTarget || normNodePath.startsWith(normTarget + "/")) {
            results.push(node.relativePath); // Add the match itself
            // If it's a directory that matches, add all its children too
            if (node.type === 'directory' && node.children) {
                 const childPaths = flattenTree(node.children); // flattenTree returns relative paths
                 results.push(...childPaths);
            }
        } else if (normTarget.startsWith(normNodePath + "/")) {
            // If the target is deeper than the current node, explore children
            if (node.type === 'directory' && node.children) {
                stack.push(...node.children);
            }
        }
         // This simplified version might not find all descendants correctly if targetPath is deep.
         // The original flattenTree approach might be better if needed.
         // Let's revert to the original flattenTree based logic for robustness.
    }
    // Revert to original logic - more reliable
    const allNodes = flattenTree(tree); // Get all paths
    const descendants: string[] = [];
    for (const p of allNodes) {
        const normP = p.replace(/\\/g, "/");
        // Include the target itself and anything starting with target + "/"
        if (normP === normTarget || normP.startsWith(normTarget + "/")) {
            descendants.push(p);
        }
    }
    return descendants;
}


export default function Home() {
  // --- State from Stores ---
  const darkMode = useAppStore((state) => state.darkMode);
  const toggleDarkMode = useAppStore((state) => state.toggleDarkMode);
  // Global error is handled in _app.tsx
  const treeRef = React.useRef<FileTreeViewHandle>(null); 
  const {
    projectPath, setProjectPath, fileTree, selectedFilePaths,
    setSelectedFilePaths, isLoadingTree, filesData, fileSearchTerm,
    setFileSearchTerm, selectAllFiles, deselectAllFiles, toggleFilePathSelection
  } = useProjectStore();

  const {
      metaPrompt, mainInstructions, metaPromptFiles, selectedMetaFile,
      newMetaFileName, isLoadingMetaList, isLoadingMetaContent, isSavingMeta
  } = usePromptStore(); // Assuming prompt store setters are imported if needed directly, but prefer service hooks

   const {
       globalExclusions, localExclusions, extensionFilters,
       isLoadingGlobal, isSavingGlobal, isLoadingLocal, isSavingLocal,
       addExtensionFilter, removeExtensionFilter, clearExtensionFilters // Actions for filters
   } = useExclusionStore();

   const { todos } = useTodoStore(); // Only need todos count for summary maybe

  // --- Service Hooks ---
  const { loadProjectTree, loadSelectedFileContents } = useProjectService();
  const { fetchMetaPromptList, loadMetaPrompt, saveMetaPrompt } = usePromptService();
  const { fetchGlobalExclusions, fetchLocalExclusions } = useExclusionService(); // Update hooks are called by components
  const { loadTodos } = useTodoService(); // Need loadTodos to trigger initial load maybe

  // --- Local UI State ---
  const [activeTab, setActiveTab] = useState<"files" | "options" | "tasks">("files");
  const [extensionInput, setExtensionInput] = useState<string>(""); // Keep extension input local
   const [showWelcome, setShowWelcome] = useState<boolean>(true); // Keep welcome state local


  // --- Effects ---

  // Initial data loading
  useEffect(() => {
    fetchGlobalExclusions();
    fetchMetaPromptList();
    // Load todos if needed on initial load, even without project path? Or wait for path? Wait.
  }, [fetchGlobalExclusions, fetchMetaPromptList]); // Run once on mount

  // Load project-specific data when projectPath changes
  useEffect(() => {
    if (projectPath) {
      setShowWelcome(false); // Hide welcome once path is set
      loadProjectTree();
      fetchLocalExclusions();
      loadTodos(); // Load todos for the selected project
    } else {
        // Clear project specific data if path is removed
        useProjectStore.getState().setFileTree([]);
        useProjectStore.getState().setSelectedFilePaths([]);
        useProjectStore.getState().setFilesData([]);
        useExclusionStore.getState().setLocalExclusions([]);
        useTodoStore.getState().setTodos([]);
    }
  }, [projectPath, loadProjectTree, fetchLocalExclusions, loadTodos]); // Dependencies

  // Load file contents when selection changes
  useEffect(() => {
    if (selectedFilePaths.length > 0 && projectPath) {
      loadSelectedFileContents();
    } else {
      // Clear file data if selection is empty or project path changes
       useProjectStore.getState().setFilesData([]);
    }
  }, [selectedFilePaths, projectPath, loadSelectedFileContents]); // Depend on selection and path


   // Hide welcome screen logic
   useEffect(() => {
        const welcomeHidden = localStorage.getItem("hideWelcomeScreen");
        if (welcomeHidden === "true") {
            setShowWelcome(false);
        }
    }, []);

    function dismissWelcomeScreen() {
        setShowWelcome(false);
        localStorage.setItem("hideWelcomeScreen", "true");
    }

  // --- Memos ---
  const filteredTree = useMemo(() => {
    const afterExtFilter = extensionFilters.length
      ? applyExtensionFilter(fileTree, extensionFilters)
      : fileTree;

    if (!fileSearchTerm.trim()) {
      return afterExtFilter;
    }
    return applySearchFilter(afterExtFilter, fileSearchTerm.toLowerCase());
  }, [fileTree, extensionFilters, fileSearchTerm]);

  const localExclusionsSet = useMemo(() => new Set(localExclusions), [localExclusions]);


  // --- Event Handlers ---
  const handleSelectPaths = (paths: string[]) => setSelectedFilePaths(paths);
  const handlePathSelected = (path: string) => {
      setProjectPath(path); // Update store, which triggers effects
  };

  const handleAddExtension = () => {
      addExtensionFilter(extensionInput); // Use action from store
      setExtensionInput(""); // Clear local input state
  };

  const handleSelectAllClick = () => {
    // files only, no directories
    const allVisibleFiles = flattenFilePaths(filteredTree);
    const globalSet = new Set(globalExclusions);
    const localSet  = localExclusionsSet;
    selectAllFiles(allVisibleFiles, globalSet, localSet);
  };

   const handleRefreshAll = async () => {
        if (!projectPath) return;
        // Primarily reload tree and content
        await loadProjectTree();
        await loadSelectedFileContents(); // Reload content based on current selection
        // Optionally reload other project-specific things if needed
        // await fetchLocalExclusions();
        // await loadTodos();
   };

    // Handler needed by FileTreeView
    const handleSelectFilesInTree = (paths: string[]) => {
        setSelectedFilePaths(paths);
    };


  // --- Derived State / Calculations ---
  const selectedFileCount = useMemo(() => selectedFilePaths.filter(f => !f.endsWith('/')).length, [selectedFilePaths]);
  const totalTokens = useMemo(() => filesData.reduce((acc, file) => acc + file.tokenCount, 0), [filesData]);
  const hasContent = useMemo(() => metaPrompt.trim() || mainInstructions.trim() || selectedFileCount > 0, [metaPrompt, mainInstructions, selectedFileCount]);

  return (
    // No need for outer div with dark mode class, handled in _app.tsx
    <div className="min-h-screen"> {/* Remove outer dark mode class */}
      <Head>
        {/* Title is now set in _app.tsx */}
      </Head>

      {/* Header */}
      <header
        className="
          sticky top-0 z-20 px-6 py-3 shadow-md border-b
          bg-white/80 backdrop-blur-sm dark:bg-gray-900/80
          border-gray-200 dark:border-gray-800
          transition-all duration-200
        "
      >
        <div className="container mx-auto flex justify-between items-center">
          {/* Header Left: Title and Badge */}
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 rounded-lg shadow-sm">
              <Code size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-500 text-transparent bg-clip-text">
                Code to Prompt
              </h1>
              {/* <div className="flex items-center mt-0.5">
                 <Badge variant="outline" className="text-xs font-normal text-gray-500 dark:text-gray-400">v1.0 Refactored</Badge>
              </div> */}
            </div>
          </div>

           {/* Header Right: Theme Toggle and GitHub Link */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="icon" onClick={toggleDarkMode}
                    className="rounded-full h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                   >
                    {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-600" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>{darkMode ? "Light Mode" : "Dark Mode"}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                    onClick={() => window.open("https://github.com/aytzey/CodetoPromptGenerator", "_blank")}
                   >
                    <Github size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>View on GitHub</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 sm:px-6 pt-6 pb-10">
        {/* Global error alert is now in _app.tsx */}

        {/* Folder Picker - Always Visible */}
        <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 overflow-hidden mb-6">
          <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 py-3 px-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
              <Folder size={16} className="text-indigo-500 dark:text-indigo-400" />
              Project Selection
            </CardTitle>
            {/* <CardDescription className="text-gray-500 dark:text-gray-400 text-xs">Choose project folder</CardDescription> */}
          </CardHeader>
          <CardContent className="p-4">
            <FolderPickerView
              currentPath={projectPath}
              onPathSelected={handlePathSelected} // Use the handler
              isLoading={isLoadingTree}
            />
          </CardContent>
        </Card>

         {/* Conditional Rendering: Welcome Screen or Main Layout */}
         {showWelcome && !projectPath ? (
             <Card className="mt-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-100 dark:border-indigo-900/40 shadow-lg overflow-hidden">
               <CardContent className="p-6 md:p-8">
                 <div className="flex flex-col items-center text-center mb-6">
                   <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-lg mb-4">
                     <Rocket size={32} className="text-white" />
                   </div>
                   <h2 className="text-2xl font-bold text-indigo-800 dark:text-indigo-300 mb-2">
                     Code to Prompt Generator
                   </h2>
                   <p className="text-gray-600 dark:text-gray-400 max-w-xl text-sm">
                     Select a project folder above to scan files, add instructions, and generate structured LLM prompts.
                   </p>
                 </div>
                 {/* Simplified feature list */}
                  <div className="flex justify-center mt-6">
                      <Button variant="outline" onClick={dismissWelcomeScreen} className="text-xs">
                          Dismiss Welcome
                      </Button>
                  </div>
               </CardContent>
             </Card>
         ) : (
           // --- Main Three-Column Layout ---
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

             {/* == Left Panel: Files & Options == */}
             <div className="lg:col-span-2 space-y-6">
               <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "files" | "options" | "tasks")} className="w-full">
                 <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg h-10">
                   <TabsTrigger value="files" className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm rounded-md">
                     <FileCode size={16} className="mr-1 sm:mr-2" /> Files
                   </TabsTrigger>
                   <TabsTrigger value="options" className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm rounded-md">
                     <Settings size={16} className="mr-1 sm:mr-2" /> Options
                   </TabsTrigger>
                   <TabsTrigger value="tasks" className="text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm rounded-md">
                     <ListChecks size={16} className="mr-1 sm:mr-2" /> Tasks
                   </TabsTrigger>
                 </TabsList>

                 {/* == Files Tab Content == */}
                 <TabsContent value="files" className="mt-4 space-y-5">
                    <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70">
                     <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                             <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                                 <FileCode size={16} className="text-indigo-500 dark:text-indigo-400" />
                                 Project Files
                             </CardTitle>
                             <div className="flex flex-wrap items-center gap-2">
                               <div className="relative flex-grow sm:flex-grow-0">
                                 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                 <Input
                                   placeholder="Filter files..." value={fileSearchTerm}
                                   onChange={(e) => setFileSearchTerm(e.target.value)}
                                   className="pl-8 pr-2 py-1 h-8 text-sm w-full sm:w-40 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                                 />
                               </div>
                               <TooltipProvider delayDuration={100}>
                                 <Tooltip><TooltipTrigger asChild>
                                   <Button size="sm" variant="outline" className="h-8" onClick={handleRefreshAll} disabled={isLoadingTree || !projectPath}>
                                     <RefreshCw size={14} className={`mr-1 ${isLoadingTree ? "animate-spin" : ""}`} /> Refresh
                                   </Button>
                                 </TooltipTrigger><TooltipContent><p>Refresh file tree & content</p></TooltipContent></Tooltip>
                               </TooltipProvider>
                                <TooltipProvider delayDuration={100}>
                                 <Tooltip><TooltipTrigger asChild>
                                    <Button size="sm" variant="outline" className="h-8 border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950 dark:text-teal-400" onClick={handleSelectAllClick} disabled={!projectPath}>
                                      <CheckSquare size={14} className="mr-1" /> Select All
                                    </Button>
                                  </TooltipTrigger><TooltipContent><p>Select all visible files/folders</p></TooltipContent></Tooltip>
                                </TooltipProvider>
                                <TooltipProvider delayDuration={100}>
                                 <Tooltip><TooltipTrigger asChild>
                                    <Button size="sm" variant="outline" className="h-8 border-rose-500 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 dark:text-rose-400" onClick={deselectAllFiles} disabled={selectedFilePaths.length === 0}>
                                      <XSquare size={14} className="mr-1" /> Deselect
                                    </Button>
                                  </TooltipTrigger><TooltipContent><p>Deselect all</p></TooltipContent></Tooltip>
                                </TooltipProvider>

                                <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 border-gray-300 dark:border-gray-700"
                                      disabled={!projectPath}
                                      onClick={() => treeRef.current?.expandAll()}
                                    >
                                      <ChevronsDown size={14} className="mr-1" /> Expand
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Expand all folders</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 border-gray-300 dark:border-gray-700"
                                      disabled={!projectPath}
                                      onClick={() => treeRef.current?.collapseAll()}
                                    >
                                      <ChevronsUp size={14} className="mr-1" /> Collapse
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Collapse all folders</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                             </div>
                           </div>
                     </CardHeader>
                     <CardContent className="p-3">
                         {isLoadingTree ? (
                             <div className="flex items-center justify-center py-10 text-gray-400">
                                <RefreshCw size={24} className="animate-spin mr-2" /> Loading tree...
                             </div>
                         ) : !projectPath ? (
                             <div className="text-center py-10 text-gray-400 text-sm">Select a project folder above.</div>
                         ) : fileTree.length === 0 && !fileSearchTerm ? (
                              <div className="text-center py-10 text-gray-400 text-sm">No files found in this project (or all excluded).</div>
                         ): filteredTree.length === 0 && fileSearchTerm ? (
                             <div className="text-center py-10 text-gray-400 text-sm">No files match filter "{fileSearchTerm}".</div>
                         ) : (
                              <FileTreeView
                              ref={treeRef}                                  /* NEW */
                              tree={filteredTree}
                              selectedFiles={selectedFilePaths}
                              onSelectFiles={handleSelectFilesInTree}
                            />
                         )}
                     </CardContent>
                    </Card>

                    <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70">
                      <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                         <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                            <CheckSquare size={16} className="text-teal-500 dark:text-teal-400" /> Selected Files
                            {selectedFileCount > 0 && <Badge variant="secondary" className="ml-auto font-normal">{selectedFileCount}</Badge>}
                          </CardTitle>
                      </CardHeader>
                       <CardContent className="p-3">
                           <SelectedFilesListView
                             // Pass necessary props - these now come from stores
                             selectedFiles={selectedFilePaths}
                             filterExtensions={extensionFilters}
                             filesData={filesData}
                           />
                             <SelectionGroupsView
                              projectPath={projectPath}
                              fileTree={fileTree}
                              selectedPaths={selectedFilePaths}
                              onSelectPaths={handleSelectPaths}
                            />
                       </CardContent>
                    </Card>
                 </TabsContent>

                 {/* == Options Tab Content == */}
                 <TabsContent value="options" className="mt-4 space-y-5">
                     <ExclusionsManagerView
                       // Props are now implicitly handled via store/hooks within the component
                       // excludedPaths={globalExclusions} -> Reads from store
                       // onUpdateExclusions={updateGlobalExclusions} -> Uses hook action
                     />
                     {projectPath ? (
                        <LocalExclusionsManagerView
                            // projectPath={projectPath} -> Reads from store implicitly or passed if needed
                            // onChange={handleLocalExclusionsChange} -> Hook updates store
                        />
                     ) : (
                         <div className="p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center text-gray-500 dark:text-gray-400 text-sm">
                            Select a project folder to manage its specific exclusions.
                         </div>
                     )}
                     {/* Extension Filter Card */}
                      <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70">
                         <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                              <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                                 <LayoutGrid size={16} className="text-cyan-500 dark:text-cyan-400" /> File Extension Filters
                              </CardTitle>
                         </CardHeader>
                         <CardContent className="p-4 space-y-3">
                              <div className="flex gap-2">
                                  <Input
                                    value={extensionInput}
                                    onChange={(e) => setExtensionInput(e.target.value)}
                                    placeholder="e.g. .py or tsx (dot optional)"
                                    className="h-9 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddExtension(); }}
                                  />
                                  <Button size="sm" className="h-9" onClick={handleAddExtension} disabled={!extensionInput.trim()}>Add</Button>
                              </div>
                               {extensionFilters.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 items-center">
                                    {extensionFilters.map((ext) => (
                                    <Badge key={ext} variant="secondary" className="px-2 py-0.5 flex items-center gap-1">
                                        {ext}
                                        <button onClick={() => removeExtensionFilter(ext)} className="ml-1 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-200 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 p-0.5" title={`Remove ${ext}`}>
                                            <X size={12} />
                                        </button>
                                    </Badge>
                                    ))}
                                     <Button variant="link" size="sm" className="h-auto p-0 text-xs text-rose-600 dark:text-rose-400 hover:underline ml-2" onClick={clearExtensionFilters}>
                                        Clear All Filters
                                     </Button>
                                </div>
                               ) : (
                                 <p className="text-gray-500 dark:text-gray-400 text-xs italic">No extension filters applied. All files shown in tree.</p>
                               )}
                         </CardContent>
                     </Card>
                 </TabsContent>

                 {/* == Tasks Tab Content == */}
                  <TabsContent value="tasks" className="mt-4 space-y-5">
                     {projectPath ? (
                         <TodoListView /> // Component now fetches its own data using hooks/store
                     ) : (
                         <div className="p-6 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center text-gray-500 dark:text-gray-400">
                             <ListChecks size={32} className="mx-auto mb-3 opacity-50" />
                            <p className="text-sm font-medium mb-1">Project Tasks</p>
                            <p className="text-xs">Select a project folder to view and manage its tasks.</p>
                         </div>
                     )}
                  </TabsContent>
               </Tabs>
             </div>

             {/* == Right Panel: Prompts & Actions == */}
             <div className="space-y-6">
                <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70">
                     <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                         <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                           <BookOpen size={16} className="text-purple-500 dark:text-purple-400" /> Prompt Instructions
                         </CardTitle>
                     </CardHeader>
                     <CardContent className="p-4">
                         <InstructionsInputView
                             // Props are now implicitly handled via store/hooks within the component
                             // Pass any required loading/saving states if not handled internally
                             // Example: isMetaLoading={isLoadingMetaContent || isLoadingMetaList} isMetaSaving={isSavingMeta}
                         />
                     </CardContent>
                </Card>

                <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70">
                     <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                         <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                           <Flame size={16} className="text-orange-500 dark:text-orange-400" /> Generate & Copy
                         </CardTitle>
                     </CardHeader>
                     <CardContent className="p-4">
                         {hasContent ? (
                             <CopyButtonView
                                // Props now read from stores within the component
                                // Need to ensure CopyButtonView reads from stores or receives necessary props
                                // For simplicity, let's assume it reads from stores
                             />
                         ) : (
                           <div className="text-center py-6 text-gray-500 dark:text-gray-400 flex flex-col items-center">
                             <Coffee size={24} className="mb-2 opacity-60" />
                             <p className="text-sm">Select files or add instructions first.</p>
                           </div>
                         )}
                     </CardContent>
                </Card>

                {/* Stats card */}
                 <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70">
                     <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                         <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                            <BarChart2 size={16} className="text-blue-500 dark:text-blue-400" /> Prompt Stats
                         </CardTitle>
                     </CardHeader>
                    <CardContent className="p-4 text-sm">
                         <div className="grid grid-cols-2 gap-3">
                             <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-700/50">
                                 <span className="text-gray-600 dark:text-gray-400">Files:</span>
                                 <span className="font-medium text-indigo-600 dark:text-indigo-400">{selectedFileCount}</span>
                             </div>
                             <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-700/50">
                                 <span className="text-gray-600 dark:text-gray-400">Tokens:</span>
                                 <span className="font-medium text-purple-600 dark:text-purple-400">{totalTokens.toLocaleString()}</span>
                             </div>
                         </div>
                     </CardContent>
                 </Card>
             </div>
           </div>
         )}

         {/* Footer */}
         <footer className="mt-12 border-t border-gray-200 dark:border-gray-800 pt-6 text-center text-gray-500 dark:text-gray-400 text-xs">
            <p>Code to Prompt Generator &copy; {new Date().getFullYear()} Aytzey</p>
         </footer>
      </main>
    </div>
  );
}

