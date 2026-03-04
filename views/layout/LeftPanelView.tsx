import React from "react";
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
  ClipboardList,
  Layers,
  Filter,
  BookOpen,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import FileTreeView, { type FileTreeViewHandle } from "@/views/FileTreeView";
import SelectedFilesListView from "@/views/SelectedFilesListView";
import RefinedSelectionGroupsView from "@/views/RefinedSelectionGroupsView";
import RefinedExclusionsManagerView from "@/views/RefinedExclusionsManagerView";
import RefinedLocalExclusionsManagerView from "@/views/RefinedLocalExclusionsManagerView";
import KanbanBoardView from "@/views/KanbanBoardView";
import UserStoryListView from "@/views/UserStoryListView";
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
  selectedFilePaths: string[];
  setSelectedFilePaths: (paths: string[]) => void;
  selectedFileCount: number;
  rawFileTree: FileNode[];
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
  selectedFilePaths,
  setSelectedFilePaths,
  selectedFileCount,
  rawFileTree,
  fileTree,
}) => {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        if (value === "files" || value === "options" || value === "tasks") {
          setActiveTab(value);
        }
      }}
      className="space-y-4"
    >
      <TabsList className="grid h-auto grid-cols-3 gap-1 rounded-md border border-[rgba(var(--color-border),0.4)] bg-[rgba(var(--color-bg-secondary),0.4)] p-1">
        <TabsTrigger value="files" className="inline-flex items-center gap-2 rounded-md py-2">
          <FileCode size={15} />
          Files
        </TabsTrigger>
        <TabsTrigger value="options" className="inline-flex items-center gap-2 rounded-md py-2">
          <Settings size={15} />
          Options
        </TabsTrigger>
        <TabsTrigger value="tasks" className="inline-flex items-center gap-2 rounded-md py-2">
          <ListChecks size={15} />
          Tasks
        </TabsTrigger>
      </TabsList>

      <TabsContent value="files" className="space-y-4">
        <Card className="glass">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Project Files</CardTitle>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-muted))]"
                  size={14}
                />
                <Input
                  placeholder="Filter files..."
                  value={fileSearchTerm}
                  onChange={(event) => setFileSearchTerm(event.target.value)}
                  className="h-9 pl-9 pr-8"
                />
                {fileSearchTerm ? (
                  <button
                    type="button"
                    onClick={() => setFileSearchTerm("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-primary))]"
                    aria-label="Clear file filter"
                  >
                    <XSquare size={14} />
                  </button>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Filter
                          size={14}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-muted))]"
                        />
                      </TooltipTrigger>
                      <TooltipContent>Wildcard examples: `*.tsx`, `src/**`</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoadingTree || !projectPath}
                className="h-9"
              >
                <RefreshCw size={14} className={cn("mr-1.5", isLoadingTree && "animate-spin")} />
                Refresh
              </Button>

              <Button size="sm" variant="outline" onClick={handleSelectAll} disabled={!projectPath} className="h-9">
                <CheckSquare size={14} className="mr-1.5" />
                Select All
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={deselectAllFiles}
                disabled={!selectedFilePaths.length}
                className="h-9"
              >
                <XSquare size={14} className="mr-1.5" />
                Clear
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => treeRef.current?.expandAll()}
                disabled={!projectPath}
                className="h-9"
              >
                <ChevronsDown size={14} className="mr-1.5" />
                Expand
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => treeRef.current?.collapseAll()}
                disabled={!projectPath}
                className="h-9"
              >
                <ChevronsUp size={14} className="mr-1.5" />
                Collapse
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {isLoadingTree ? (
              <div className="flex items-center justify-center py-10 text-sm text-[rgb(var(--color-text-muted))]">
                Loading project files...
              </div>
            ) : !projectPath ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-[rgb(var(--color-text-muted))]">
                <LayoutGrid size={30} className="opacity-60" />
                <p>Select a project folder to browse files.</p>
              </div>
            ) : (
              <div className="rounded-md border border-[rgba(var(--color-border),0.45)] bg-[rgba(var(--color-bg-secondary),0.25)] p-2">
                <FileTreeView
                  ref={treeRef}
                  tree={fileTree}
                  fullTree={rawFileTree}
                  selectedFiles={selectedFilePaths}
                  onSelectFiles={setSelectedFilePaths}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Selected Files
              <Badge className="ml-auto">{selectedFileCount}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SelectedFilesListView />
            <div className="border-t border-[rgba(var(--color-border),0.35)] pt-4">
              <RefinedSelectionGroupsView
                projectPath={projectPath}
                fileTree={rawFileTree}
                selectedFilePaths={selectedFilePaths}
                setSelectedFilePaths={setSelectedFilePaths}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="options" className="space-y-4">
        <RefinedExclusionsManagerView />
        {projectPath && <RefinedLocalExclusionsManagerView />}
      </TabsContent>

      <TabsContent value="tasks" className="space-y-4">
        {projectPath ? (
          <Tabs defaultValue="kanban-board" className="space-y-3">
            <TabsList className="grid grid-cols-2 rounded-md border border-[rgba(var(--color-border),0.4)] bg-[rgba(var(--color-bg-secondary),0.4)] p-1">
              <TabsTrigger value="kanban-board" className="inline-flex items-center gap-2 rounded-md py-2">
                <ClipboardList size={15} />
                Kanban Board
              </TabsTrigger>
              <TabsTrigger value="user-stories" className="inline-flex items-center gap-2 rounded-md py-2">
                <BookOpen size={15} />
                User Stories
              </TabsTrigger>
            </TabsList>

            <TabsContent value="kanban-board" className="mt-0">
              <KanbanBoardView />
            </TabsContent>
            <TabsContent value="user-stories" className="mt-0">
              <UserStoryListView />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[rgba(var(--color-border),0.45)] bg-[rgba(var(--color-bg-secondary),0.25)] py-12 text-center text-sm text-[rgb(var(--color-text-muted))]">
            <Layers size={28} className="opacity-60" />
            <p>No project selected. Choose a folder to manage tasks and stories.</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default LeftPanelView;
