// File: views/layout/LeftPanelView.tsx
// NEW FILE
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
import { cn } from "@/lib/utils";

import FileTreeView, { FileTreeViewHandle } from "@/views/FileTreeView";
import SelectedFilesListView from "@/views/SelectedFilesListView";
import SelectionGroupsView from "@/views/SelectionGroupsView";
import ExclusionsManagerView from "@/views/ExclusionsManagerView";
import LocalExclusionsManagerView from "@/views/LocalExclusionsManagerView";
import TodoListView from "@/views/TodoListView";

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
  treeRef: React.RefObject<FileTreeViewHandle>;
  filteredTree: FileNode[];
  selectedFilePaths: string[];
  setSelectedFilePaths: (paths: string[]) => void;
  selectedFileCount: number;
  fileTree: FileNode[]; // Needed for SelectionGroupsView
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
  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as any)}
      className="lg:col-span-2 space-y-6"
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
                    onChange={(e) => setFileSearchTerm(e.target.value)}
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
                    className={cn("mr-1", isLoadingTree && "animate-spin")}
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
                  Select All
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
                <RefreshCw size={24} className="animate-spin mr-2" />
                Loading tree…
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
        {projectPath && <LocalExclusionsManagerView />}
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
  );
};

export default LeftPanelView;