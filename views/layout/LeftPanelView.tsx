// File: views/layout/LeftPanelView.tsx
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
  Layers,
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
      className="space-y-6"
    >
      {/* Enhanced Tab Navigation */}
      <TabsList className="grid grid-cols-3 p-1 bg-[rgba(22,23,46,0.6)] backdrop-blur-sm border border-[rgba(60,63,87,0.5)] rounded-xl">
        <TabsTrigger 
          value="files" 
          className="rounded-lg py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[rgba(123,147,253,0.2)] data-[state=active]:to-[rgba(123,147,253,0.1)] data-[state=active]:backdrop-blur-md data-[state=active]:border data-[state=active]:border-[rgba(123,147,253,0.3)] data-[state=active]:shadow-[0_0_10px_rgba(123,147,253,0.2)] transition-all duration-300"
        >
          <FileCode size={16} className="mr-2 text-[rgb(123,147,253)]" />
          <span className="font-medium">Files</span>
        </TabsTrigger>
        <TabsTrigger 
          value="options"
          className="rounded-lg py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[rgba(80,250,123,0.2)] data-[state=active]:to-[rgba(80,250,123,0.1)] data-[state=active]:backdrop-blur-md data-[state=active]:border data-[state=active]:border-[rgba(80,250,123,0.3)] data-[state=active]:shadow-[0_0_10px_rgba(80,250,123,0.2)] transition-all duration-300"
        >
          <Settings size={16} className="mr-2 text-[rgb(80,250,123)]" />
          <span className="font-medium">Options</span>
        </TabsTrigger>
        <TabsTrigger 
          value="tasks"
          className="rounded-lg py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[rgba(189,147,249,0.2)] data-[state=active]:to-[rgba(189,147,249,0.1)] data-[state=active]:backdrop-blur-md data-[state=active]:border data-[state=active]:border-[rgba(189,147,249,0.3)] data-[state=active]:shadow-[0_0_10px_rgba(189,147,249,0.2)] transition-all duration-300"
        >
          <ListChecks size={16} className="mr-2 text-[rgb(189,147,249)]" />
          <span className="font-medium">Tasks</span>
        </TabsTrigger>
      </TabsList>

      {/* FILES TAB */}
      <TabsContent value="files" className="mt-6 space-y-6 animate-fade-in">
        {/* File Tree Card */}
        <Card className="overflow-hidden border-[rgba(60,63,87,0.7)] bg-[rgba(30,31,61,0.7)] backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <CardHeader className="py-3 px-4 border-b border-[rgba(60,63,87,0.7)] bg-gradient-to-r from-[rgba(22,23,46,0.9)] to-[rgba(30,31,61,0.9)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(123,147,253)] to-[rgb(139,233,253)]">
                <FileCode size={18} className="text-[rgb(123,147,253)]" />
                Project Files
              </CardTitle>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search with enhanced styling */}
                <div className="relative">
                  <Search
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[rgb(140,143,170)]"
                    size={14}
                  />
                  <Input
                    placeholder="Filter files…"
                    value={fileSearchTerm}
                    onChange={(e) => setFileSearchTerm(e.target.value)}
                    className="pl-8 h-8 w-44 bg-[rgba(15,16,36,0.4)] border-[rgba(60,63,87,0.7)] focus:border-[rgb(123,147,253)] focus:ring-[rgb(123,147,253)] transition-all"
                  />
                </div>
                
                {/* Action buttons with improved styling */}
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isLoadingTree || !projectPath}
                    className="h-8 bg-[rgba(15,16,36,0.4)] border-[rgba(60,63,87,0.7)] hover:bg-[rgba(123,147,253,0.1)] hover:border-[rgba(123,147,253,0.5)] text-[rgb(190,192,210)]"
                  >
                    <RefreshCw
                      size={14}
                      className={cn("mr-1.5", isLoadingTree && "animate-spin text-[rgb(123,147,253)]")}
                    />
                    Refresh
                  </Button>
                  
                  <div className="flex">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSelectAll}
                      disabled={!projectPath}
                      className="h-8 px-2.5 rounded-r-none bg-[rgba(15,16,36,0.4)] border-[rgba(60,63,87,0.7)] hover:bg-[rgba(80,250,123,0.1)] hover:border-[rgba(80,250,123,0.5)] text-[rgb(190,192,210)]"
                    >
                      <CheckSquare size={14} className="mr-1.5 text-[rgb(80,250,123)]" />
                      All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={deselectAllFiles}
                      disabled={!selectedFilePaths.length}
                      className="h-8 px-2.5 rounded-l-none border-l-0 bg-[rgba(15,16,36,0.4)] border-[rgba(60,63,87,0.7)] hover:bg-[rgba(255,121,198,0.1)] hover:border-[rgba(255,121,198,0.5)] text-[rgb(190,192,210)]"
                    >
                      <XSquare size={14} className="mr-1.5 text-[rgb(255,121,198)]" />
                      Clear
                    </Button>
                  </div>
                  
                  <div className="flex">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => treeRef.current?.expandAll()}
                      disabled={!projectPath}
                      className="h-8 px-2.5 rounded-r-none bg-[rgba(15,16,36,0.4)] border-[rgba(60,63,87,0.7)] hover:bg-[rgba(139,233,253,0.1)] hover:border-[rgba(139,233,253,0.5)] text-[rgb(190,192,210)]"
                    >
                      <ChevronsDown size={14} className="mr-1.5 text-[rgb(139,233,253)]" />
                      Expand
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => treeRef.current?.collapseAll()}
                      disabled={!projectPath}
                      className="h-8 px-2.5 rounded-l-none border-l-0 bg-[rgba(15,16,36,0.4)] border-[rgba(60,63,87,0.7)] hover:bg-[rgba(139,233,253,0.1)] hover:border-[rgba(139,233,253,0.5)] text-[rgb(190,192,210)]"
                    >
                      <ChevronsUp size={14} className="mr-1.5 text-[rgb(139,233,253)]" />
                      Collapse
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          
          {/* File Tree content area */}
          <CardContent className="p-3 bg-[rgba(22,23,46,0.5)]">
            {isLoadingTree ? (
              <div className="flex items-center justify-center py-10 text-[rgb(140,143,170)]">
                <RefreshCw size={24} className="animate-spin mr-3 text-[rgb(123,147,253)]" />
                Loading tree…
              </div>
            ) : !projectPath ? (
              <div className="flex flex-col items-center justify-center py-16 text-[rgb(140,143,170)]">
                <LayoutGrid size={40} className="mb-3 opacity-40" />
                <p className="text-center">Select a project folder above to begin</p>
              </div>
            ) : (
              <div className="border border-[rgba(60,63,87,0.7)] rounded-md bg-[rgba(15,16,36,0.2)] backdrop-blur-sm">
                <FileTreeView
                  ref={treeRef}
                  tree={filteredTree}
                  selectedFiles={selectedFilePaths}
                  onSelectFiles={setSelectedFilePaths}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Files Card */}
        <Card className="overflow-hidden border-[rgba(60,63,87,0.7)] bg-[rgba(30,31,61,0.7)] backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <CardHeader className="py-3 px-4 border-b border-[rgba(60,63,87,0.7)] bg-gradient-to-r from-[rgba(22,23,46,0.9)] to-[rgba(30,31,61,0.9)]">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(80,250,123)] to-[rgb(139,233,253)]">
              <CheckSquare size={18} className="text-[rgb(80,250,123)]" />
              Selected Files
              {selectedFileCount > 0 && (
                <Badge className="ml-auto py-0.5 px-2 bg-[rgba(80,250,123,0.2)] text-[rgb(80,250,123)] border border-[rgba(80,250,123,0.3)]">
                  {selectedFileCount}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-4 space-y-4 bg-[rgba(22,23,46,0.5)]">
            <SelectedFilesListView />
            
            {/* Divider with label */}
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-[rgba(60,63,87,0.7)]"></div>
              <span className="flex-shrink mx-3 text-xs text-[rgb(140,143,170)]">Selection Groups</span>
              <div className="flex-grow border-t border-[rgba(60,63,87,0.7)]"></div>
            </div>
            
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
      <TabsContent value="options" className="mt-6 space-y-6 animate-fade-in">
        <ExclusionsManagerView />
        {projectPath && <LocalExclusionsManagerView />}
      </TabsContent>

      {/* TASKS TAB */}
      <TabsContent value="tasks" className="mt-6 animate-fade-in">
        {projectPath ? (
          <TodoListView />
        ) : (
          <div className="p-16 border border-dashed border-[rgba(60,63,87,0.7)] rounded-xl bg-[rgba(15,16,36,0.3)] text-center flex flex-col items-center text-[rgb(140,143,170)]">
            <Layers size={48} className="mb-3 opacity-50" />
            <p className="text-lg font-medium mb-2">No Project Selected</p>
            <p className="max-w-md text-sm">Select a project using the folder picker above to manage your tasks.</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default LeftPanelView;