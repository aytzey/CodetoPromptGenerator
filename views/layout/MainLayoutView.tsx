// File: views/layout/MainLayoutView.tsx
import React from "react";
import LeftPanelView from "./LeftPanelView";
import RightPanelView from "./RightPanelView";
import type { FileNode } from "@/types";
import type { FileTreeViewHandle } from "@/views/FileTreeView";

interface MainLayoutViewProps {
  // Props needed for Left Panel
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
  fileTree: FileNode[]; // Needed for SelectionGroupsView

  // Props needed for Right Panel
  hasContent: boolean;
  selectedFileCount: number;
  totalTokens: number;
}

const MainLayoutView: React.FC<MainLayoutViewProps> = (props) => {
  return (
    <div className="animate-fade-in">
      {/* Main content container with grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 relative">
        {/* Decorative background elements */}
        <div className="absolute -z-10 top-20 left-1/4 w-96 h-96 bg-[rgba(123,147,253,0.05)] rounded-full blur-[120px]"></div>
        <div className="absolute -z-10 bottom-0 right-1/3 w-80 h-80 bg-[rgba(189,147,249,0.05)] rounded-full blur-[100px]"></div>
        
        {/* Left Panel - Takes up 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-6">
          <div className="panel animate-slide-up" style={{animationDelay: "0.1s"}}>
            <LeftPanelView
              activeTab={props.activeTab}
              setActiveTab={props.setActiveTab}
              projectPath={props.projectPath}
              isLoadingTree={props.isLoadingTree}
              fileSearchTerm={props.fileSearchTerm}
              setFileSearchTerm={props.setFileSearchTerm}
              handleRefresh={props.handleRefresh}
              handleSelectAll={props.handleSelectAll}
              deselectAllFiles={props.deselectAllFiles}
              treeRef={props.treeRef}
              filteredTree={props.filteredTree}
              selectedFilePaths={props.selectedFilePaths}
              setSelectedFilePaths={props.setSelectedFilePaths}
              selectedFileCount={props.selectedFileCount}
              fileTree={props.fileTree}
            />
          </div>
        </div>
        
        {/* Right Panel - Takes up 1 column on large screens */}
        <div className="space-y-6 animate-slide-up" style={{animationDelay: "0.2s"}}>
          <div className="panel">
            <RightPanelView
              hasContent={props.hasContent}
              selectedFileCount={props.selectedFileCount}
              totalTokens={props.totalTokens}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayoutView;