// File: views/layout/LeftPanelView.tsx
import React, { useMemo } from "react";
import {
  FileCode,
  Settings,
  ListChecks,
  Search,
  RefreshCw,
  CheckSquare,
  XSquare,
  ChevronsDown,
  ChevronsUp,
  LayoutGrid,
  ClipboardList, // New icon for Kanban
  Layers,
  Filter,
  BookOpen, // New icon for User Stories
} from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import FileTreeView, { FileTreeViewHandle } from "@/views/FileTreeView";
import SelectedFilesListView from "@/views/SelectedFilesListView";
import RefinedSelectionGroupsView from "@/views/RefinedSelectionGroupsView";
import RefinedExclusionsManagerView from "@/views/RefinedExclusionsManagerView";
import RefinedLocalExclusionsManagerView from "@/views/RefinedLocalExclusionsManagerView";
import KanbanBoardView from "@/views/KanbanBoardView";
import TodoListView from "@/views/TodoListView";
import UserStoryListView from "@/views/UserStoryListView";

import {
  applyWildcardFilter,
  parseWildcardInput,
  applySearchFilter,
} from "@/lib/fileFilters";
import type { FileNode } from "@/types";

interface LeftPanelViewProps {
  activeTab: "files" | "options" | "tasks";
  setActiveTab: (tab: "files" | "options" | "tasks") => void;
  projectPath: string;
  isLoadingTree: boolean;
  fileSearchTerm: string;
  setFileSearchTerm: (term: string) => void;
  handleRefresh: () => void;
  handleSelectAll: () => void;
  deselectAllFiles: () => void;
  treeRef: React.RefObject<FileTreeViewHandle | null>;
  /** (Old) filtered tree — retained for backwards compatibility */
  filteredTree: FileNode[];
  selectedFilePaths: string[];
  setSelectedFilePaths: (paths: string[]) => void;
  selectedFileCount: number;
  /** Unfiltered, original project tree */
  fileTree: FileNode[];
}

const LeftPanelView: React.FC<LeftPanelViewProps> = ({
  activeTab,
  setActiveTab,
  projectPath,
  isLoadingTree,
  fileSearchTerm,
  setFileSearchTerm,
  handleRefresh,
  handleSelectAll,
  deselectAllFiles,
  treeRef,
  filteredTree,
  selectedFilePaths,
  setSelectedFilePaths,
  selectedFileCount,
  fileTree,
}) => {

  const effectiveTree = useMemo(() => {
    const term = fileSearchTerm.trim();
    if (!term) return fileTree;

    const hasWildcard = /[*?\[\]]/.test(term);
    if (hasWildcard) {
      const patterns = parseWildcardInput(term);
      return applyWildcardFilter(fileTree, patterns);
    }
    return applySearchFilter(fileTree, term.toLowerCase());
  }, [fileTree, fileSearchTerm]);


  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as any)}
      className="space-y-6"
    >
      {/* Enhanced Tab Navigation with dynamic glows */}
      <TabsList className="grid grid-cols-3 p-1.5 bg-[rgba(var(--color-bg-secondary),0.7)] backdrop-blur-xl border border-[rgba(var(--color-border),0.5)] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
        <TabsTrigger 
          value="files" 
          className="rounded-lg py-2.5 data-[state=active]:bg-gradient-to-br data-[state=active]:from-[rgba(var(--color-primary),0.2)] data-[state=active]:to-[rgba(var(--color-primary),0.05)] data-[state=active]:backdrop-blur-xl data-[state=active]:border data-[state=active]:border-[rgba(var(--color-primary),0.3)] data-[state=active]:shadow-[0_0_15px_rgba(var(--color-primary),0.2)] data-[state=active]:scale-[1.02] transition-all duration-300"
        >
          <div className="p-1 rounded-md bg-[rgba(var(--color-primary),0.1)] mr-2">
            <FileCode size={16} className="text-[rgb(var(--color-primary))]" />
          </div>
          <span className="font-medium">Files</span>
        </TabsTrigger>
        <TabsTrigger 
          value="options"
          className="rounded-lg py-2.5 data-[state=active]:bg-gradient-to-br data-[state=active]:from-[rgba(var(--color-secondary),0.2)] data-[state=active]:to-[rgba(var(--color-secondary),0.05)] data-[state=active]:backdrop-blur-xl data-[state=active]:border data-[state=active]:border-[rgba(var(--color-secondary),0.3)] data-[state=active]:shadow-[0_0_15px_rgba(var(--color-secondary),0.2)] data-[state=active]:scale-[1.02] transition-all duration-300"
        >
          <div className="p-1 rounded-md bg-[rgba(var(--color-secondary),0.1)] mr-2">
            <Settings size={16} className="text-[rgb(var(--color-secondary))]" />
          </div>
          <span className="font-medium">Options</span>
        </TabsTrigger>
        <TabsTrigger 
          value="tasks"
          className="rounded-lg py-2.5 data-[state=active]:bg-gradient-to-br data-[state=active]:from-[rgba(var(--color-tertiary),0.2)] data-[state=active]:to-[rgba(var(--color-tertiary),0.05)] data-[state=active]:backdrop-blur-xl data-[state=active]:border data-[state=active]:border-[rgba(var(--color-tertiary),0.3)] data-[state=active]:shadow-[0_0_15px_rgba(var(--color-tertiary),0.2)] data-[state=active]:scale-[1.02] transition-all duration-300"
        >
          <div className="p-1 rounded-md bg-[rgba(var(--color-tertiary),0.1)] mr-2">
            <ListChecks size={16} className="text-[rgb(var(--color-tertiary))]" />
          </div>
          <span className="font-medium">Tasks</span>
        </TabsTrigger>
      </TabsList>

      {/* FILES TAB */}
      <TabsContent value="files" className="mt-6 space-y-8 animate-fade-in">
        {/* File Tree Card with enhanced glassmorphism */}
        <Card className="overflow-hidden border-[rgba(var(--color-border),0.7)] bg-[rgba(var(--color-bg-tertiary),0.65)] backdrop-blur-xl shadow-card glass">
          <CardHeader className="py-3 px-4 border-b border-[rgba(var(--color-border),0.6)] bg-gradient-to-r from-[rgba(var(--color-bg-secondary),0.9)] to-[rgba(var(--color-bg-tertiary),0.9)] glass-header">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--color-primary))] to-[rgb(var(--color-accent-2))]">
                <div className="p-1.5 rounded-md bg-[rgba(var(--color-primary),0.1)] border border-[rgba(var(--color-primary),0.2)]">
                  <FileCode size={18} className="text-[rgb(var(--color-primary))]" />
                </div>
                Project Files
              </CardTitle>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search with enhanced styling and animation */}
                <div className="relative group">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-muted))] group-focus-within:text-[rgb(var(--color-primary))] transition-colors"
                    size={14}
                  />
                  <Input
                    placeholder="Filter files…"
                    value={fileSearchTerm}
                    onChange={(e) => setFileSearchTerm(e.target.value)}
                    className="pl-9 pr-8 h-9 w-48 bg-[rgba(var(--color-bg-secondary),0.7)] border-[rgba(var(--color-border),0.7)] focus:border-[rgb(var(--color-primary))] focus:ring-[rgb(var(--color-primary))] transition-all focus-within:shadow-[0_0_8px_rgba(var(--color-primary),0.15)]"
                  />
                  {fileSearchTerm && (
                    <button
                      onClick={() => setFileSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-primary))] transition-colors"
                    >
                      <XSquare size={14} />
                    </button>
                  )}
                  {/* Show wildcard hint if empty */}
                  {!fileSearchTerm && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Filter
                            size={14}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-muted))] opacity-50"
                          />
                        </TooltipTrigger>
                        <TooltipContent>Supports wildcards: *.js, src/**, etc.</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                
                {/* Action buttons with improved styling */}
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isLoadingTree || !projectPath}
                    className="h-9 bg-[rgba(var(--color-bg-secondary),0.7)] border-[rgba(var(--color-border),0.7)] hover:bg-[rgba(var(--color-primary),0.1)] hover:border-[rgba(var(--color-primary),0.5)] text-[rgb(var(--color-text-secondary))] transition-all"
                  >
                    <RefreshCw
                      size={14}
                      className={cn("mr-1.5", isLoadingTree && "animate-spin text-[rgb(var(--color-primary))]")}
                    />
                    Refresh
                  </Button>
                  
                  <div className="flex">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSelectAll}
                      disabled={!projectPath}
                      className="h-9 px-3 rounded-r-none bg-[rgba(var(--color-bg-secondary),0.7)] border-[rgba(var(--color-border),0.7)] hover:bg-[rgba(var(--color-secondary),0.1)] hover:border-[rgba(var(--color-secondary),0.5)] text-[rgb(var(--color-text-secondary))] transition-all"
                    >
                      <CheckSquare size={14} className="mr-1.5 text-[rgb(var(--color-secondary))]" />
                      All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={deselectAllFiles}
                      disabled={!selectedFilePaths.length}
                      className="h-9 px-3 rounded-l-none border-l-0 bg-[rgba(var(--color-bg-secondary),0.7)] border-[rgba(var(--color-border),0.7)] hover:bg-[rgba(var(--color-accent-1),0.1)] hover:border-[rgba(var(--color-accent-1),0.5)] text-[rgb(var(--color-text-secondary))] transition-all"
                    >
                      <XSquare size={14} className="mr-1.5 text-[rgb(var(--color-accent-1))]" />
                      Clear
                    </Button>
                  </div>
                  
                  <div className="flex">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => treeRef.current?.expandAll()}
                      disabled={!projectPath}
                      className="h-9 px-3 rounded-r-none bg-[rgba(var(--color-bg-secondary),0.7)] border-[rgba(var(--color-border),0.7)] hover:bg-[rgba(var(--color-accent-2),0.1)] hover:border-[rgba(var(--color-accent-2),0.5)] text-[rgb(var(--color-text-secondary))] transition-all"
                    >
                      <ChevronsDown size={14} className="mr-1.5 text-[rgb(var(--color-accent-2))]" />
                      Expand
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => treeRef.current?.collapseAll()}
                      disabled={!projectPath}
                      className="h-9 px-3 rounded-l-none border-l-0 bg-[rgba(var(--color-bg-secondary),0.7)] border-[rgba(var(--color-border),0.7)] hover:bg-[rgba(var(--color-accent-2),0.1)] hover:border-[rgba(var(--color-accent-2),0.5)] text-[rgb(var(--color-text-secondary))] transition-all"
                    >
                      <ChevronsUp size={14} className="mr-1.5 text-[rgb(var(--color-accent-2))]" />
                      Collapse
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          {/* File Tree content area */}
          <CardContent className="p-3 bg-[rgba(var(--color-bg-secondary),0.3)]">
            {isLoadingTree ? (
              /* Enhanced loading state */
              <div className="flex flex-col items-center justify-center py-12 text-[rgb(var(--color-text-muted))]">
                <div className="relative mb-4">
                  <div className="w-12 h-12 rounded-full border-2 border-[rgba(var(--color-primary),0.2)] border-t-[rgb(var(--color-primary))] animate-spin"></div>
                  <div className="w-12 h-12 rounded-full border-2 border-[rgba(var(--color-secondary),0.1)] border-r-[rgb(var(--color-secondary))] animate-spin absolute top-0 left-0" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                </div>
                <p className="text-[rgb(var(--color-text-secondary))] animate-pulse">Loading project files...</p>
              </div>
            ) : !projectPath ? (
              /* Enhanced no‑project state */
              <div className="flex flex-col items-center justify-center py-16 text-[rgb(var(--color-text-muted))]">
                <div className="w-16 h-16 rounded-full bg-[rgba(var(--color-bg-tertiary),0.7)] flex items-center justify-center mb-4 border border-[rgba(var(--color-border),0.3)]">
                  <LayoutGrid size={36} className="opacity-40 text-[rgb(var(--color-text-muted))]" />
                </div>
                <p className="text-center mb-2">Select a project folder to begin</p>
                <div className="text-xs opacity-60 max-w-xs text-center">
                  Choose a folder using the project selector at the top of the page
                </div>
              </div>
            ) : (
              /* Enhanced tree container */
              <div className="border border-[rgba(var(--color-border),0.7)] rounded-md bg-[rgba(var(--color-bg-secondary),0.3)] backdrop-blur-sm shadow-inner">
                <FileTreeView
                  ref={treeRef}
                  tree={effectiveTree}
                  fullTree={fileTree}
                  selectedFiles={selectedFilePaths}
                  onSelectFiles={setSelectedFilePaths}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Files Card with enhanced styling */}
        <Card className="overflow-hidden border-[rgba(var(--color-border),0.7)] bg-[rgba(var(--color-bg-tertiary),0.65)] backdrop-blur-xl shadow-card glass">
          <CardHeader className="py-3 px-4 border-b border-[rgba(var(--color-border),0.6)] bg-gradient-to-r from-[rgba(var(--color-bg-secondary),0.9)] to-[rgba(var(--color-bg-tertiary),0.9)] glass-header">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--color-secondary))] to-[rgb(var(--color-accent-2))]">
              <div className="p-1.5 rounded-md bg-[rgba(var(--color-secondary),0.1)] border border-[rgba(var(--color-secondary),0.2)]">
                <CheckSquare size={18} className="text-[rgb(var(--color-secondary))]" />
              </div>
              Selected Files
              {selectedFileCount > 0 && (
                <Badge className="ml-auto py-0.5 px-2.5 bg-[rgba(var(--color-secondary),0.15)] text-[rgb(var(--color-secondary))] border border-[rgba(var(--color-secondary),0.3)] shadow-[0_0_10px_rgba(var(--color-secondary),0.1)]">
                  {selectedFileCount}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-4 space-y-4 bg-[rgba(var(--color-bg-secondary),0.3)]">
            <SelectedFilesListView />
            
            {/* Enhanced divider with label */}
            <div className="relative flex items-center py-3">
              <div className="flex-grow h-px bg-[rgba(var(--color-border),0.6)]"></div>
              <div className="flex-shrink mx-3 px-2 py-0.5 rounded-full text-xs text-[rgb(var(--color-text-muted))] bg-[rgba(var(--color-bg-tertiary),0.7)] border border-[rgba(var(--color-border),0.3)]">
                Selection Groups
              </div>
              <div className="flex-grow h-px bg-[rgba(var(--color-border),0.6)]"></div>
            </div>
            
            <RefinedSelectionGroupsView
              projectPath={projectPath}
              fileTree={fileTree}
              selectedFilePaths={selectedFilePaths}
              setSelectedFilePaths={setSelectedFilePaths}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* OPTIONS TAB */}
      <TabsContent value="options" className="mt-6 space-y-8 animate-fade-in">
        <RefinedExclusionsManagerView />
        {projectPath && <RefinedLocalExclusionsManagerView />}
      </TabsContent>

      {/* TASKS TAB */}
      {/* Nested Tabs for Kanban and User Stories */}
      <TabsContent value="tasks" className="mt-6 h-full flex flex-col animate-fade-in">
        {projectPath ? (
          <Tabs defaultValue="kanban-board" className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-2 p-1.5 bg-[rgba(var(--color-bg-secondary),0.7)] backdrop-blur-xl border border-[rgba(var(--color-border),0.5)] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-4">
              <TabsTrigger 
                value="kanban-board" 
                className="rounded-lg py-2.5 data-[state=active]:bg-gradient-to-br data-[state=active]:from-[rgba(var(--color-primary),0.2)] data-[state=active]:to-[rgba(var(--color-primary),0.05)] data-[state=active]:backdrop-blur-xl data-[state=active]:border data-[state=active]:border-[rgba(var(--color-primary),0.3)] data-[state=active]:shadow-[0_0_15px_rgba(var(--color-primary),0.2)] data-[state=active]:scale-[1.02] transition-all duration-300"
              >
                <div className="p-1 rounded-md bg-[rgba(var(--color-primary),0.1)] mr-2">
                  <ClipboardList size={16} className="text-[rgb(var(--color-primary))]" />
                </div>
                <span className="font-medium">Kanban Board</span>
              </TabsTrigger>
              <TabsTrigger 
                value="user-stories" 
                className="rounded-lg py-2.5 data-[state=active]:bg-gradient-to-br data-[state=active]:from-[rgba(var(--color-tertiary),0.2)] data-[state=active]:to-[rgba(var(--color-tertiary),0.05)] data-[state=active]:backdrop-blur-xl data-[state=active]:border data-[state=active]:border-[rgba(var(--color-tertiary),0.3)] data-[state=active]:shadow-[0_0_15px_rgba(var(--color-tertiary),0.2)] data-[state=active]:scale-[1.02] transition-all duration-300"
              >
                <div className="p-1 rounded-md bg-[rgba(var(--color-tertiary),0.1)] mr-2">
                  <BookOpen size={16} className="text-[rgb(var(--color-tertiary))]" />
                </div>
                <span className="font-medium">User Stories</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="kanban-board" className="flex-1 pt-0 mt-0">
              <KanbanBoardView />
            </TabsContent>
            <TabsContent value="user-stories" className="flex-1 pt-0 mt-0">
              <UserStoryListView />
            </TabsContent>
          </Tabs>
        ) : (
          // Moved to a common 'no project selected' message within the nested tabs
          <div className="p-16 border border-dashed border-[rgba(var(--color-border),0.5)] rounded-xl bg-[rgba(var(--color-bg-secondary),0.3)] backdrop-blur-sm text-center flex flex-col items-center text-[rgb(var(--color-text-muted))] h-full justify-center">
            <div className="w-16 h-16 rounded-full bg-[rgba(var(--color-bg-tertiary),0.7)] flex items-center justify-center mb-4 border border-[rgba(var(--color-border),0.3)]">
              <Layers size={36} className="opacity-40 text-[rgb(var(--color-text-muted))]" />
            </div>
            <p className="text-lg font-medium mb-2 text-[rgb(var(--color-text-secondary))]">No Project Selected</p>
            <p className="max-w-md text-sm">Select a project using the folder picker at the top to manage your tasks and user stories.</p>
          </div>
          
        )}
      </TabsContent>

    </Tabs>
  );
};

export default LeftPanelView;
